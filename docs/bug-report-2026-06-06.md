# NanamiCat Bug 检测报告（v1.0）

**日期：** 2026-06-06
**模式：** READ-ONLY — 仅检测，未修改任何文件
**扫描范围：** Web (`src/`) + iOS (`NanamiCat-iOS/`) + Functions (`functions/api/`, `worker/`) + Scripts + Migrations + Config
**总 bug 数：** 47（Critical 5 · High 9 · Medium 17 · Low 16）

---

## TL;DR — 4 件最紧急的事

| # | 严重度 | 位置 | 现象 | 影响 |
|---|--------|------|------|------|
| **B-1** | 🔴 CRITICAL | `functions/api/*` + `worker/*` | D1 表名跟 query 完全不匹配，`no such table: players` | 生产端**所有 API 立即 500** |
| **B-2** | 🔴 CRITICAL | `src/main.jsx` line 199-425 | Web 端 v1 算法每道题 3/4 组重复 | 玩家看到 16 格棋盘只有 **8 个不同词** |
| **B-3** | 🔴 CRITICAL | `PuzzleEngine.swift:144-157` | v2 manifest 路径丢失 `displayLevel` 公式 | iOS 端 **75/100 题颜色错** |
| **B-4** | 🔴 CRITICAL | `puzzle-data.json` | `索引` 在 `compressed-information` 和 `map-of-itself` 都出现 | 重生成可能出非法题，验证器抓不到 |

第 5 个 critical 是 iOS 端 `Dictionary(uniqueKeysWithValues:)` 会在 CDN 数据有重复 `id` 时硬崩溃（详见 §1.5），目前数据干净但脆。

---

## 1. CRITICAL (5)

### 1.1 [B-1] D1 表不存在 → 生产 API 100% 失败

**文件：**
- `migrations/0002_text_only_cleanup.sql` 引用 `players`、`score_events`
- `migrations/0003_submission_contact_email.sql` 引用 `puzzle_submissions`
- `functions/api/{player,score,puzzles,admin/*}.js` 都 query 上面 3 个表
- `worker/nanamicat-api.js` **同时**混用两套命名（`submissions`+`scores` 一套，`puzzle_submissions`+`score_events` 一套）
- `worker/schema.sql` 定义 `submissions` 和 `scores`（孤儿文件，从未跑过）

**现象：** 跑 `wrangler d1 migrations apply` 在空库上 → migrations 通过（因为只 `CREATE` archive 表）→ 任何 D1 调用都报 `D1_ERROR: no such table: players`。

**根本原因：** 没有 `0001_initial.sql`，且 schema 文件与 migrations 文件命名不一致。

**修复方向：**
1. 写 `migrations/0001_initial.sql` 创建 `players` / `score_events` / `puzzle_submissions`（按代码实际引用的命名）
2. 删 `worker/schema.sql`（孤儿）
3. 把 `worker/nanamicat-api.js` 统一到一套命名

### 1.2 [B-2] Web 端 v1 算法产出废题（8 词棋盘）

**文件：** `src/main.jsx:199-425`（committed HEAD 仍是 v1）
**位置：** `buildTextPuzzles()` 用 `offsets = [0, 7, 19, 31]` 公式选 4 个组

**实测：**
```
text-001 (D=1): 候选 12 组，offsets=[3,10,10,10] → 选 ['中国城市', '运动项目', '运动项目', '运动项目']
                  ↑ 3/4 是同一组
```
玩家每题看到 4 组×4 词 = 16 格，但只有 8 个不同词（4 个重复 2 次）。

**根本原因：** v1 算法假设 `offsets` 跨足够大的 step 能选中不同组，但公式 `(index * 5 + step + difficulty * 3) % candidates.length` 的 step 间隔（0/7/19/31）**不够大**，因为 mod 12 后碰撞率高。

**修复方向：**
- 工作树已有 `src/puzzleEngine.js` 用 v2 manifest 解决（但还没 commit）
- 删除 v1 `buildTextPuzzles`，commit v2 工作树

### 1.3 [B-3] iOS `displayLevel` 公式在 v2 路径丢失 → 75/100 题颜色错

**文件：** `NanamiCat-iOS/NanamiCat/Core/PuzzleEngine/PuzzleEngine.swift:144-157`
**spec §3.4：** `displayLevel = min(4, max(group.level, slot + 1))`
**iOS v2 路径：**
```swift
return PuzzleGroup(..., level: source.level, ...)  // ❌ 用了 source.level，丢掉 slot 信息
```
**v1 路径：**
```swift
let level = min(4, max(source.level, groupSlot + 1))  // ✅ 正确
```

**实测：** D=1 的 25 道题全 4 组都是 level=1，按 spec 应渲染成 黄/绿/蓝/紫（slot 0/1/2/3），但 v2 路径全部渲染成黄。

**修复方向：** line 154 `level: source.level` → `level: min(4, max(source.level, slot + 1))`

### 1.4 [B-4] `索引` 词在 2 个组出现（验证器不查）

**文件：** `puzzle-data.json`
- `compressed-information` (L3) 含「摘要、图标、缩略图、**索引**」
- `map-of-itself` (L4) 含「目录、**索引**、导航、坐标系」

**现状：** 当前 100 道 manifest 没有任何一道题同时选了这两个组，**所以暂未爆发**。
**风险：** 未来重跑生成器若选了「compressed-information + map-of-itself + 任意 2 组」，玩家棋盘上会出现两个「索引」tile。游戏逻辑（iOS `Set(items.id)` 和 Web `selected.join('|')`）会因 ID 冲突判错。

**修复方向：**
- 改 `map-of-itself` 的「索引」为「检索」或「书签」
- 在 `validate-puzzle-manifest.mjs` 加跨组 word 唯一性检查

### 1.5 [B-5] iOS `Dictionary(uniqueKeysWithValues:)` 重复 id 必崩

**文件：** `PuzzleEngine.swift:137-142`
```swift
let bankById: [String: PuzzleDataBundle.TextGroup] = Dictionary(
    uniqueKeysWithValues: data.textGroupBank.compactMap { ... }
)
```
**v2 数据全 40 组 id 唯一**——不崩。
**风险：** 一旦 CMS 误改让 2 组共享 id（且 `id` 字段在 v2 是 Optional `String?`），下次启动 `fatalError` 崩溃。

**修复方向：**
```swift
let bankById: [String: PuzzleDataBundle.TextGroup] = Dictionary(
    data.textGroupBank.compactMap { ($0.id, $0) },
    uniquingKeysWith: { first, _ in first }
)
```

---

## 2. HIGH (9)

### 2.1 [B-6] dev-API admin auth bypass
**文件：** `server/dev-api.js:232-270`
**现象：** `if (!request.get("x-admin-key") && !cfaccess)` 检查**存在性**不是值，任意字符串通过
**风险：** 开发/测试环境暴露了所有 admin 端点
**修复：** `crypto.timingSafeEqual` 对比 env.ADMIN_KEY（同 server.js:149 模式）

### 2.2 [B-7] Web working-tree 同样 displayLevel bug
**文件：** `src/puzzleEngine.js:14-26`（untracked）
**现象：** `level: source.level` 同样丢掉 slot，跟 iOS 完全一样
**修复：** 同 §1.3

### 2.3 [B-8] Item.id 格式 v1/v2 不一致
**文件：**
- Web v1 committed: `text-001-0-油条`（带 groupSlot 前缀）
- iOS v2: `text-001-油条`
- Web v2 working-tree: `text-001-油条`

**风险：** 任何持久化 item 级历史（重玩种子、棋盘布局）跨版本不兼容
**修复：** 删 v1 算法后自动消解。**不要**持久化 item.id

### 2.4 [B-9] D1 `INSERT OR IGNORE` 没有 UNIQUE 约束 → 重复计分
**文件：** `functions/api/score.js:22-25`, `worker/nanamicat-api.js:472-475`
**现象：** `INSERT OR IGNORE` 需要 UNIQUE 目标，但 `score_events` 表当前**没有 `UNIQUE (player_id, mode, puzzle_id)`**（这表本身还没建）
**风险：** 同一玩家对同一题可无限重复刷分
**修复：** `0001_initial.sql` 加 `UNIQUE (player_id, mode, puzzle_id)`

### 2.5 [B-10] 后端 CORS 全面暴露 admin key
**文件：** `worker/nanamicat-api.js:6-16`
**现象：** `access-control-allow-origin: *` + `access-control-allow-headers: content-type,x-admin-key`
**风险：** 任意跨域源可发起 admin 请求（preflight 通过）。若 admin key 泄露（XSS、网络嗅探），全平台被接管
**修复：**
- 改 `*` 为站点 origin
- 把 admin 端点放到同源 reverse proxy（`/control-panel`）
- 不在 CORS 头里 advertise `x-admin-key`

### 2.6 [B-11] CORS preflight 返 200 而非 204
**文件：** `worker/nanamicat-api.js:387`
**现象：** `if (request.method === 'OPTIONS') return json({});` 返 200 + body
**风险：** 配合 [B-10]，部分 CORS 库把 200 当 preflight 通过，发起跨域请求
**修复：** `return new Response(null, { status: 204, headers: corsHeaders })`

### 2.7 [B-12] `functions/api/*` 是死代码（wrangler 配的是 worker）
**文件：** `functions/api/*` 共 5 个文件 + `_utils.js`
**现象：** `wrangler.toml main = "worker/nanamicat-api.js"`，`functions/*` 永不跑
**风险：** 代码 review 看的是死代码（不同 auth 模型、不同 query 写法），看不到生产 bug
**修复：** 删 `functions/` 或改成 router 代理到共享模块

### 2.8 [B-13] iOS `L10n.t` 双 force-unwrap（开发期必崩）
**文件：** `DesignSystem/L10n.swift:5`
**现象：** `table[.zh]![key]!` — Key 加新枚举但中文表忘加条目 → 每次调用 force-unwrap nil
**修复：** `table[.zh]?[key] ?? "<\(key)>"`

### 2.9 [B-14] iOS `PuzzleEngine.loadFromBundle` 用 `fatalError`
**文件：** `PuzzleEngine.swift:108-110`
**现象：** JSON 解码失败 = 直接 crash
**修复：** log + 返回空 bundle + 启动时显示「题库加载失败」

---

## 3. MEDIUM (17)

### 3.1 [B-15] 后端 `worker.json()` 泄露原始错误消息
**文件：** `worker/nanamicat-api.js:451, 489, 548, 688`
**现象：** `return json({ error: error.message }, 500)` 把 D1 错误、Resend body 透传给客户端
**修复：** 已知错误映射成安全字符串，未知错误返 `"Internal error"`，真实 message 服务端 log

### 3.2 [B-16] `THANK_YOU_EMAIL_FROM` 未在 wrangler.toml 配置
**文件：** `functions/_utils.js:62, 65` vs `wrangler.toml:19-21`
**现象：** wrangler 配的是 `MAIL_FROM`，但代码读 `THANK_YOU_EMAIL_FROM`，用户感谢邮件功能**静默死掉**
**修复：** 统一变量名 + 补 wrangler.toml

### 3.3 [B-17] 缺 D1 索引
**文件：** 代码用的查询 vs migrations 现有索引
**现象：** 关键查询（`WHERE player_id` / `ORDER BY created_at DESC`）全表扫
**修复：** 在 `0001_initial.sql` 加 `idx_score_events_player`、`idx_submissions_created` 等

### 3.4 [B-18] iOS 同步后端数据零校验
**文件：** `PuzzleEngine.swift:46-65`
**现象：** `syncWithBackend` 只检查 `bank.count > 0` 和 `puzzleCount > 0`，不校验 id 唯一、不校验 manifest 引用、不校验 word 数
**修复：** 加 `validate()` 步骤（见 §1.5）

### 3.5 [B-19] nick rename 静默覆盖原主人
**文件：** `functions/api/player.js:11-19`
**现象：** 拿到 `playerId` 的人都能改 `nickname`
**修复：** 加 cooldown + opt-in 改名流

### 3.6 [B-20] `groups_json` 可超 D1 1MB 行限制
**文件：** `functions/api/puzzles.js:18`
**现象：** 提交 10 组 × 4 词 × 无长度限制的 word
**修复：** `JSON.stringify(groups).length > 16KB` 直接拒

### 3.7 [B-21] rate limit 信任反向代理 IP
**文件：** `server.js:62-75`
**现象：** `app.set('trust proxy', 1)` 未配 → request.ip 永远是反代 IP，整个反代被节流或绕过
**修复：** 加 trust proxy 配置

### 3.8 [B-22] timing-attack admin key 比对
**文件：** `server.js:154`, `worker/nanamicat-api.js:158`
**现象：** `===` 字符串比较泄露长度信息
**修复：** `crypto.subtle.timingSafeEqual` 等长 buffer

### 3.9 [B-23] `daily/generate.mjs` 改本地 git config
**文件：** `daily/generate.mjs:336-337`
**现象：** `git config user.name ...` 改了用户本仓库的 git config
**修复：** 用 `git -c user.name=... commit` 单命令覆盖

### 3.10 [B-24] Web docs 与 working tree 不同步
**文件：** `docs/puzzle-manifest-upgrade.md:108-115`
**现象：** 文档说「Web 未升级」，但 working tree 已有 v2 改造
**修复：** commit working tree + 更新文档

### 3.11 [B-25] spec 示例有 typo
**文件：** `docs/puzzle-generation-spec.md:292`
**现象：** 用了 `campus-places`（不存在），实际是 `campus-spaces`
**修复：** 改一个字符

### 3.12 [B-26] v2 upgrade 文档事实错
**文件：** `docs/puzzle-manifest-upgrade.md:27`
**现象：** 说「v1 是 `puzzles: []`」，实际 v1 完全没有 `puzzles` 键
**修复：** 改文档措辞

### 3.13 [B-27] `redHerringNotes` 没英文翻译
**文件：** 6 条 redHerringNotes 在 `englishPuzzleTerms` 找不到
**现象：** 切到 en locale，红鲱鱼提示仍中文
**修复：** 补 6 个翻译条目

### 3.14 [B-28] iOS `TextGroup.id` 建模为 Optional → v2 静默丢数据
**文件：** `PuzzleEngine.swift:8-13`
**现象：** v2 spec 要求 `id` 必填，但 Swift 模型是 `String?` → 某组丢了 id，棋盘只渲染 3 组
**修复：** 解码后做 `guard !manifestReferencedGroups.contains(where: { $0.id == nil })` 否则拒加载

### 3.15 [B-29] iOS 难度标签硬编码中英文
**文件：** `DesignSystem.swift:647-652`
**现象：** `locale == .zh ? "直观分类" : "Direct sets"` 4 对硬编码
**修复：** 加 `L10n.Key.difficulty1...4`

### 3.16 [B-30] iOS 16-tile 棋盘假设 4 word/组
**文件：** `Features/Game/GameView.swift:204-220`
**现象：** `LazyVGrid count: 4` + `submitGuess` 强制 4 选 → 若某组 3 或 5 词，棋盘坏
**修复：** 同 §1.5/3.4，在 sync 时校验 word 数

### 3.17 [B-31] iOS `submitScore` 丢弃 server `duplicate` flag
**文件：** `APIClient.swift:37-54`
**现象：** 后端返 `duplicate: true` 表示「这题刷过了」，前端无视，永远显示「成绩已写入」
**修复：** 用 `if response.duplicate` 弹不同 toast

---

## 4. LOW (16)

### 4.1 i18n / 硬编码字符串（9 处）

| 文件:行 | 字符串 | 建议 |
|---------|--------|------|
| `PuzzleEngine.swift:160` | `"文字题 \(index + 1)"` | 加 L10n.Key |
| `PuzzleEngine.swift:230` | `"Text puzzle \(number)"` | 同上 |
| `GameViewModel.swift:39-45` | `"文字题 1"`, `"默认"` | 同上 |
| `GameViewModel.swift:56-58` | `"题库已更新..."` | 同上 |
| `GameViewModel.swift:80` | `"已取消当前选择。"` | 同上 |
| `GameViewModel.swift:102` | `"答对一组：\(matched.name)"` | 同上 |
| `GameViewModel.swift:128-130` | `"提示：有一组与..."` | 同上 |
| `GameViewModel.swift:144` | `"已打乱未解锁项目。"` | 同上 |
| `GameViewModel.swift:174-175` | `"红鲱鱼出现：..."` | 同上 |
| `DesignSystem.swift:541` | `"NanamiCat"` a11y label | 用 L10n |
| `DesignSystem.swift:720-721` | `"中文"`, `"English"` | 用 L10n |
| `SettingsView.swift:183` | `"OK"` | 用 L10n.rulesClose |

### 4.2 [B-32] `englishPuzzleTerms` 80 个 stale 条目
**文件：** `puzzle-data.json:694-773`
**现象：** ~80 词找不到对应 group（如「收纳容器」「方向移动」），纯死数据
**修复：** 从 bank+manifest 自动生成，不手维护

### 4.3 [B-33] `englishPuzzleTerms`「Interface」双重映射
**文件：** `puzzle-data.json:598, 622`
**现象：** `接口→Interface` 和 `界面→Interface` 都是 Interface，应区分
**修复：** 界面→"UI" 或 "Interface (UI)"

### 4.4 iOS `PuzzleItem` 等 `Codable` 是死代码
**文件：** `GameModels.swift:49-72`
**现象：** 没有任何 JSON 来源 decode 这些类型，添加误导
**修复：** 删 Codable 或加 `// Engine-internal` 注释

### 4.5 iOS 多处 `@State` 在 `asyncAfter` 闭包内被持有
**文件：** `DesignSystem.swift:914, 936, 940, 996, 1028, 1095-1100`
**修复：** 用 `Task { try await Task.sleep ... }` 自动取消

### 4.6 iOS `mostAbstractGroup` 选错组
**文件：** `PuzzleEngine.swift:207-209`
**现象：** D=1 题 4 组都 level=1 → `max(by:)` 返回第一个；应该返回 `groupIds[3]`（最抽象 = slot 3）
**修复：** 改用 `puzzle.groups.last` 或按 slot 取

### 4.7 iOS `ShakeEffect` 等 a11y 缺 label
**文件：** `DesignSystem.swift:802-812`
**修复：** 加 `.accessibilityHidden(true)`

### 4.8 iOS `crayonSeed` 每次启动不同
**文件：** `DesignSystem.swift:128-132`
**现象：** Swift `Hasher` 用 per-process random seed，蜡笔形状每次冷启都变
**评估：** 设计意图就是变体（visual variety），不算 bug，列出来知情

### 4.9 iOS `splashProgress` 等 `DispatchQueue.main.asyncAfter` 持有 `@State`
**文件：** 同 §4.5
**修复：** 改 `Task { ... }`

### 4.10 iOS `GameViewModel` 同时在 `onAppear` 和 `onChange(puzzle.id)` 标 played
**文件：** `GameView.swift:73-82`
**修复：** 删 onAppear 那行

### 4.11 iOS `normalizedPlayedSet` 在 getter 里写 store
**文件：** `GameViewModel.swift:266-276`
**修复：** 拆 `pruneIfNeeded()` + `currentSet()`

### 4.12 iOS `PuzzleCatalog.textPuzzles` 每次重算
**文件：** `PuzzleEngine.swift:37, 126-131`
**修复：** 加缓存，sync 时失效

### 4.13 iOS `Resources/` fallback 永远走不到
**文件：** `PuzzleEngine.swift:95-98`
**修复：** 删 dead branch

### 4.14 后端 migration 时间格式混用
**文件：** `migrations/0002_text_only_cleanup.sql:28, 62`
**现象：** D1 `datetime('now')` 是 `YYYY-MM-DD HH:MM:SS`，但代码用 `new Date().toISOString()` → 一致性靠运气
**修复：** 用 `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`

### 4.15 后端 in-memory rate limit 重启即丢
**文件：** `server.js:18, 62-75`
**现象：** `Map` 重启清空，允许 20x burst
**修复：** 改用 KV/Redis，或 eager evict

### 4.16 后端无 `package.json` engines 限制
**文件：** `package.json:1-23`
**现象：** `--env-file-if-exists` 需要 Node 22.3+，无 engines 声明
**修复：** 加 `"engines": {"node": ">=22.3"}`

---

## 5. 数据流验证结果

**v1→v2 数据升级整体兼容 ✓**（4 份 JSON 解析、字段、英文翻译全部 OK）：

| 检查项 | 结果 |
|--------|------|
| iOS decoder 兼容 v2 `id` 字段 | ✅ `TextGroup.id: String?` 兼容 |
| iOS decoder 兼容 v2 `textPuzzleManifest` | ✅ Optional 字段，缺则 fallback |
| JSON 有效性 | ✅ 4 份副本全部 parse 通过 |
| 40 组 id 全部 kebab-case | ✅ |
| 100 道 manifest canonicalKey 唯一 | ✅ |
| 难度分布 25/25/25/25 | ✅ |
| 所有 D≥2 题含 high-D 锚点 | ✅ |
| englishPuzzleTerms 覆盖 40 组名 + 160 词 + 20 themes | ✅ |
| Xcode Copy Bundle Resources 含 v2 文件 | ✅ |
| Puzzle ID 跨端一致（`text-001..text-100`） | ✅ |

---

## 6. 修复优先级建议

### P0 — 立即修（生产已坏或即将坏）

1. **B-1** D1 表不存在 → 写 `0001_initial.sql` + 统一命名
2. **B-2** Web v1 算法 → commit working tree 的 `puzzleEngine.js`
3. **B-3** iOS displayLevel → 一行修复
4. **B-4** `索引` 词冲突 → 改一个词

### P1 — 本周修（高危但暂未爆发）

5. **B-6** dev-API auth bypass
6. **B-5/B-14** iOS 崩溃风险（uniqueKeysWithValues / L10n force-unwrap）
7. **B-9** UNIQUE 约束缺失
8. **B-10/B-11** CORS 暴露 + preflight 200
9. **B-12** functions/ 死代码
10. **B-7** Web working-tree 同样 displayLevel bug

### P2 — 下一版本前修

11. **B-15 ~ B-22** 错误泄露 / 邮件配置 / 索引 / 校验 / nick rename / D1 1MB / trust proxy / timing
12. **B-24 ~ B-27** 文档与 working tree 不同步 / spec typo / 翻译缺失
13. **B-28 ~ B-31** iOS 模型硬编码 / 棋盘 word 数硬编码

### P3 — 排期做

14. **B-13** fatalError 改 graceful
15. **B-18** sync 校验
16. **B-32/B-33** 翻译表清理
17. **B-23** git config 副作用
18. **4.1** 9 处 i18n 硬编码

---

## 7. 备注

- **本报告未修改任何文件**
- **4 个 explore agent 并行跑的结果已整合**（Web / iOS / Functions / 数据流）
- **建议下一步：** 你拍板 P0 修哪些，我可以拉个修复 PR（按 P0 顺序一个一个）
- **或者：** 我把 P0 单独写到 `docs/bug-fix-tickets-p0.md` 作为可执行 ticket
