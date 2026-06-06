# 谜题生成规范 v2（无重复 · 含难度）

> 供在外部（LLM / 脚本 / 表格）生成题库后导入 NanamiCat。  
> 生成结果需与 Web `src/main.jsx`、iOS `puzzle-data.json` 对齐。

---

## 1. 目标

| 要求 | 说明 |
|------|------|
| 题目总数 | 100 道，ID 固定 `text-001` … `text-100` |
| 难度分档 | 每档 25 道：`text-001–025`→1，`026–050`→2，`051–075`→3，`076–100`→4 |
| **不重复** | 任意两道题的 **4 个题组集合** 不能完全相同（与难度标签无关） |
| 确定性 | 同一 manifest 在 Web / iOS 解析后 `puzzleId`、16 个 `item.id` 完全一致 |
| 词源 | 16 个格子上的词 **只能** 来自题组库，禁止运行时拼接（如「词+甲乙丙丁」） |

---

## 2. 数据结构

### 2.1 题组库 `textGroupBank`

每组必须有 **全局唯一** `id`（slug，仅 `a-z0-9-`）：

```json
{
  "id": "breakfast-staples",
  "level": 1,
  "name": "早餐主食",
  "words": ["油条", "包子", "豆浆", "烧饼"]
}
```

| 字段 | 规则 |
|------|------|
| `id` | 唯一；建议 `kebab-case` 英文，不要用序号糊弄 |
| `level` | 整数 1–4，表示该组本身难度 |
| `name` | 中文组名（解出后展示） |
| `words` | **恰好 4 个**中文词；长度不限（1–4 字均可）；组内互不相同 |

**建议题库规模（保证 100 道不重复仍有足够组合空间）：**

| level | 最少组数 | 说明 |
|-------|----------|------|
| 1 | 12 | 与现网一致即可支撑 25 道 |
| 2 | +8（累计 20） | 每道 D≥2 的题至少含 1 个 level=2 组 |
| 3 | +10（累计 30） | 每道 D≥3 的题至少含 1 个 level=3 组 |
| 4 | +10（累计 40） | 每道 D=4 的题至少含 1 个 level=4 组 |

### 2.2 题目清单 `textPuzzleManifest`

100 条，**顺序即 ID**（第 1 条 → `text-001`）：

```json
{
  "version": 2,
  "textPuzzleCount": 100,
  "textGroupBank": [ /* 见 2.1 */ ],
  "textPuzzleManifest": [
    {
      "difficulty": 1,
      "theme": "烟火中国",
      "redHerring": "有些词共享场景，但真正分组看的是用途。",
      "groupIds": [
        "breakfast-staples",
        "hotpot-ingredients",
        "traditional-festivals",
        "chinese-cities"
      ]
    }
  ]
}
```

| 字段 | 规则 |
|------|------|
| `difficulty` | 1–4；第 n 题（1-based）应为 `min(4, floor((n-1)/25) + 1)`，**必须与槽位一致** |
| `groupIds` | 长度 **必须 = 4**；元素互不相同；均存在于 `textGroupBank` |
| `theme` | 从 `puzzleThemes` 轮询或手写，按 `manifest` 条目标记 |
| `redHerring` | 提示语，从 `redHerringNotes` 轮询或手写 |

**`groupIds` 顺序有意义**：按 **展示难度从低到高** 排列（见 §3.4）。第 1 个对应棋盘「最易」色，第 4 个对应「最难」色。

### 2.3 难度类型文案（UI 用，不进 manifest）

| difficulty | 中文 | English |
|------------|------|---------|
| 1 | 直观分类 | Direct sets |
| 2 | 常识联想 | Familiar links |
| 3 | 跨域关系 | Cross-domain |
| 4 | 细节线索 | Detail clues |

---

## 3. 生成算法（在外部执行）

### 3.1 唯一性键

对一道题：

```
canonicalKey(groupIds) = sort(groupIds).join("|")
```

全局维护 `usedKeys: Set<string>`。每入选一道题，将 `canonicalKey` 写入；若已存在则 **拒绝** 该组合。

> 例：`[A,B,C,D]` 与 `[D,C,B,A]` 视为同一道题，只能出现一次。

### 3.2 候选池

对难度 `D`：

```
pool(D) = { g ∈ textGroupBank | g.level ≤ D }
high(D) = { g ∈ textGroupBank | g.level = D }   // D ≥ 2 时使用
```

### 3.3 单题合法性（全部满足才可入选）

1. `groupIds` 中 4 个 id 互异，且均在 `pool(D)` 内  
2. `canonicalKey` ∉ `usedKeys`  
3. **高档题含高档组**：若 `D ≥ 2`，则 `groupIds ∩ high(D)` 非空  
4. **排序约束**：将选中的 4 个组按 `level` 升序排列后，依次填入 `groupIds[0..3]`（同 level 时按 `id` 字母序打破平局）

### 3.4 运行时展示难度（与现网 UI 一致）

manifest 中第 `slot` 个组（0-based）在客户端计算：

```
displayLevel = min(4, max(group.level, slot + 1))
```

即第 1 组至少为黄(1)，第 4 组至少为紫(4)；用于已解组配色，**不需要写进 manifest**。

### 3.5 分档生成流程（推荐）

```
usedKeys ← ∅
manifest ← []

for D in 1..4:
  need ← 25
  candidateIndex ← 0

  while need > 0:
    combo ← SelectFourGroups(D, candidateIndex)   // 见 §3.6
    if combo 不满足 §3.3:
      candidateIndex++
      continue

    key ← canonicalKey(combo)
    if key ∈ usedKeys:
      candidateIndex++
      continue

    usedKeys.add(key)
    manifest.append({
      difficulty: D,
      theme: puzzleThemes[(manifest.length) % len(puzzleThemes)],
      redHerring: redHerringNotes[(manifest.length) % len(redHerringNotes)],
      groupIds: SortByLevelThenId(combo)
    })
    need--
    candidateIndex++

assert len(manifest) == 100
```

### 3.6 确定性选题 `SelectFourGroups(D, candidateIndex)`

保证同一输入永远得到同一组合，便于复现与排查：

```
seed = "nanamicat-puzzle-v2"
pool = sorted(pool(D), by id)          // 稳定顺序
size = len(pool)

// 用 seed + D + candidateIndex 派生伪随机，在 [0, size) 中选 4 个不重复下标
indices = HashPick4(seed, D, candidateIndex, size)
return [ pool[i].id for i in indices ]
```

**`HashPick4` 示例（任意语言可实现）：**

```
h = SHA256(seed + "|" + D + "|" + candidateIndex)
依次从 h 的各字节取模得到下标，冲突则读下一字节，直到凑满 4 个互异下标
```

**备选（更可读）：** 预先生成 `pool(D)` 的全部 4-组合，按 `canonicalKey` 字典序排序，用 `candidateIndex` 取下标。逻辑更直观，组合量大时占内存。

### 3.7 数量可行性（数学检查）

| 档位 D | 池大小 | 4-组合上限 C(n,4) | 需要 |
|--------|--------|-------------------|------|
| 1 | 12 | 495 | 25 |
| 2 | 20 | 4,845 | 25（且需含 level-2 组） |
| 3 | 30 | 27,405 | 25 |
| 4 | 40 | 91,390 | 25 |

在 **全局去重** 下，先消耗 25 个纯 level-1 组合，后续档位因必须引入更高 level 组，新 `canonicalKey` 充足。

---

## 4. 客户端解析（导入后逻辑）

给定 manifest 第 `index` 条（0-based）：

```
puzzleId     = "text-" + pad3(index + 1)
difficulty   = entry.difficulty
theme        = entry.theme
redHerring   = entry.redHerring

for slot, groupId in enumerate(entry.groupIds):
  source     = bank[groupId]
  displayLevel = min(4, max(source.level, slot + 1))
  items      = [ { id: puzzleId + "-" + word, label: word } for word in source.words ]
  group      = { name: source.name, level: displayLevel, items }
```

**`item.id` 规则**：`{puzzleId}-{word}`（word 为原文，与现网一致）。

**棋盘**：16 个 item 在展示前 `shuffle`（每局随机，不影响题目身份）。

---

## 5. 导入检查清单（生成后必跑）

```text
□ textGroupBank 每条 id 唯一，words 长度均为 4
□ manifest 长度 = 100
□ 第 1–25 条 difficulty=1，26–50=2，51–75=3，76–100=4
□ 每条 groupIds 长度=4 且无重复 id
□ 全局 canonicalKey 100 个互不相同
□ 对 D≥2：每条至少一个 group.level === D
□ 每条 4 个 group 的 level 均 ≤ D
□ 无「甲乙丙丁」后缀、无「扩展001」类占位组名
```

可用仓库脚本校验（生成 manifest 后）：

```bash
node scripts/validate-puzzle-manifest.mjs path/to/manifest.json
```

---

## 6. 与旧算法对比

| | 旧算法（v1） | 新算法（v2 manifest） |
|--|-------------|----------------------|
| 题组来源 | 仅 `textGroupBank` | 同左 |
| 100 题如何定 | `offsets` 取模，易撞车 | 显式 manifest，**组合唯一** |
| 重复 | 多题可能同一 4 组 | 构造时禁止 |
| 难度 | 按题号分段 + 组 level 上限 | 分段 + **必须含当档组** |
| 扩展方式 | 改公式 | 增 bank + 重跑生成器 |

---

## 7. 外部生成工作流（推荐）

1. **编写题组**：按 §2.1 产出 40+ 组，分配 `id` / `level` / `name` / `words`  
2. **跑分档选题**：按 §3.5–3.6 生成 100 条 `groupIds`  
3. **挂主题与红鲱鱼**：轮询或人工润色 `theme`、`redHerring`  
4. **校验**：§5 清单 + `validate-puzzle-manifest.mjs`  
5. **导出**：合并进 `puzzle-data.json`，Web 改为读 manifest 构建（与 iOS 共用）

### 英文翻译

`englishPuzzleTerms` 仍为 `{ "中文": "English" }` 扁平表，覆盖所有 `name` 与 `words`。manifest 本身不含英文。

---

## 8. 示例（难度 1 的前 2 道）

```json
{
  "difficulty": 1,
  "theme": "烟火中国",
  "redHerring": "有些词共享场景，但真正分组看的是用途。",
  "groupIds": ["breakfast-staples", "hotpot-ingredients", "traditional-festivals", "chinese-cities"]
}
```

```json
{
  "difficulty": 1,
  "theme": "街头日常",
  "redHerring": "有一组会被近义动作干扰，别只看字面。",
  "groupIds": ["travel-modes", "kitchen-tools", "campus-places", "fruits"]
}
```

两题的 `canonicalKey` 不同 → 合法。

---

## 9. 禁止事项

- 不要用同一 `canonicalKey` 生成两道题（即使 `difficulty` 不同）  
- 不要用程序给词加后缀区分组（甲/乙/丙/丁、A/B/C/D）  
- 不要让 `groupIds` 引用不存在的 `id`  
- 不要改变 `puzzleId` 编号规则（排行榜、已做题记录依赖 `text-XXX`）
