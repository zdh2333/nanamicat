# 题库升级记录：v1 → v2

**日期：** 2026-06-06
**操作者：** Mavis (MiniMax Code)
**触发文件：** `docs/puzzle-generation-spec.md` 引入 v2 规范

---

## 升级内容

### 1. 题组库（textGroupBank）

- **40 个组全部新增 `id` 字段**（kebab-case 英文 slug）
- name / level / words 全部保留，与 v1 一字不差
- v1 缺 `id` 是导致无法用 v2 规范（id 必填）的原因

| Level | 组数 | 组 |
|-------|------|-----|
| 1 | 12 | breakfast-staples, hotpot-ingredients, traditional-festivals, chinese-cities, travel-modes, kitchen-tools, campus-spaces, fruits, colors, clothing, sports, musical-instruments |
| 2 | 8  | ancient-writing-materials, social-interactions, film-shots, project-workflow, system-states, security-actions, narrative-structure, urban-fixtures |
| 3 | 10 | hidden-costs, feedback-types, boundary-actions, order-formation, bridges-between, containers-and-contents, mirror-symmetry, identity-credentials, compressed-information, surface-hides-structure |
| 4 | 10 | limits-create-freedom, divide-continuum-into-discrete, promise-then-deliver, map-of-itself, calibrate-via-failure, relations-as-objects, observed-changes-self, repetition-creates-difference, parts-represent-whole, order-needs-exceptions |

### 2. 题目清单（textPuzzleManifest）

v1 是空数组 `puzzles: []`；v2 新增 `textPuzzleManifest`，100 道题，每条结构：

```json
{
  "difficulty": 1,
  "theme": "烟火中国",
  "redHerring": "有些词共享场景，但真正分组看的是用途。",
  "groupIds": ["breakfast-staples", "campus-spaces", "chinese-cities", "clothing"]
}
```

`groupIds` 顺序按 level 升序排列（客户端运行时会按 §3.4 公式算 displayLevel，与 manifest 顺序一致）。

### 3. 算法摘要

按 `docs/puzzle-generation-spec.md` §3.5-3.6：

```
1. 题目 1-25：difficulty=1（从 12 个 level-1 组中均匀选 4 个）
2. 题目 26-50：difficulty=2（从 20 个组中选 4 个，必含 ≥1 个 level=2）
3. 题目 51-75：difficulty=3（从 30 个组中选 4 个，必含 ≥1 个 level=3）
4. 题目 76-100：difficulty=4（从 40 个组中选 4 个，必含 ≥1 个 level=4）
5. 全部 100 道 canonicalKey 全局唯一
```

**v2 软约束（v2 算法在 spec 之上额外加的"产品偏好"）：**

| D | 软约束 | 目的 |
|---|--------|------|
| 1 | 全 level-1 | 最直观 |
| 2 | ≥1 个 level-1 锚点 | 让 D=2 不至于全抽象 |
| 3 | ≥1 个 level-1/2 锚点 | 让 D=3 混合具象和抽象 |
| 4 | 无 | 最难档允许全抽象 |

**实际分布：**

| D | 25 道的 level 组成 | 含义 |
|---|-------------------|------|
| 1 | (1,1,1,1) ×25 | 全具象 |
| 2 | (1,2,2,2) ×25 | 1 具象 + 3 概念 |
| 3 | (2,3,3,3) ×14 + (1,3,3,3) ×11 | 1 锚点 + 3 抽象 |
| 4 | (4,4,4,4) ×17 + (3,4,4,4) ×3 + (3,3,4,4) ×4 + (3,3,3,4) ×1 | 17 全抽象 + 8 混合 |

### 4. 均匀性优化

spec §3.6 推荐的 `HashPick4` 伪随机选题会导致单组被过度引用（首版跑出 `ancient-writing-materials` 被引 75 次、其它组 2-25 次的极端分布）。

最终算法在 spec 基础上加一层「**枚举所有合法 4-组合，优先选 usage 总和最小且未用过的 key**」：

- 跑出结果：**每组被引用 8~12 次**（平均 10.0）
- 玩家体验：100 道题里每组出现频率几乎一致，不会觉得某些组「老是出现」

### 5. themes / redHerringNotes 轮询

- 沿用 v1 的 20 个 themes 和 6 个 redHerringNotes
- 按 `len(manifest) % N` 轮询
- 100 道题里每个 theme 出现 5 次、每个 redHerring 出现约 17 次

### 6. englishPuzzleTerms

- 沿用 v1 完整词表（包含所有组 name + words 的英文翻译）
- 新增「manifest 文档」未引入新词，无需补充

---

## 文件变更

| 路径 | 变化 |
|------|------|
| `NanamiCat-iOS/NanamiCat/Resources/puzzle-data.json` | v1 → v2（题组加 id，新增 textPuzzleManifest，移除旧 puzzles: []） |
| `NanamiCat-iOS/NanamiCat/Resources/puzzle-data.json.bak.v1` | v1 备份（17KB，可恢复） |
| `docs/text-puzzle-manifest-v2.json` | 同 v2 文件的副本（47KB，供代码 review / 离线参考） |
| `scripts/generate-puzzle-manifest.py` | 新增生成器脚本（9KB，可重复跑） |

---

## 客户端消费方的影响

### iOS 端

`Resources/puzzle-data.json` 直接覆盖，iOS 端读取此文件的代码无需改动（v2 是 v1 的超集，多了 `id` 和 `textPuzzleManifest`，但所有 v1 字段都保留）。

### Web 端（`src/main.jsx`）

⚠️ **未升级。** Web 端目前硬编码了 v1 算法的 `textGroupBank` 和选题逻辑（line 159-274, 416-450），并未读 `puzzle-data.json`。后续若要让 Web 端也用 v2 数据，需要：
1. 删掉硬编码的 `textGroupBank` / `puzzleThemes` / `redHerringNotes` / `englishPuzzleTerms`
2. 改为 fetch `/puzzle-data.json` 或嵌入打包
3. 把 line 416-450 的选题逻辑改为读 `textPuzzleManifest[i].groupIds`

本次升级未涉及 Web 端，保持现状。

### Functions / D1

`functions/api/puzzles.js` 和 `functions/api/admin/puzzles.js` 只操作 `puzzle_submissions` 表（用户贡献谜题），与静态题库无关。本次升级不受影响。

---

## 验证

- ✅ `node scripts/validate-puzzle-manifest.mjs docs/text-puzzle-manifest-v2.json` → `OK: 40 groups, 100 unique puzzles`
- ✅ `node scripts/validate-puzzle-manifest.mjs NanamiCat-iOS/NanamiCat/Resources/puzzle-data.json` → `OK`
- ✅ 生成器自检：100 道题 canonicalKey 全部唯一、level 约束全部满足
- ✅ 均匀性：每组被引用 8~12 次

---

## 后续

- 升级 Web 端（见上「Web 端」章节）
- 若题目实际试玩体验发现某些组合过难/过易，按 `scripts/generate-puzzle-manifest.py` 改约束重跑
- 若需增加题组，扩 `textGroupBank` 后重跑（`canonicalKey` 仍然唯一，因为题库扩张只会让组合空间更大）
