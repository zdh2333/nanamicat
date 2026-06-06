# 每日题目生成 — 定时任务说明

> 给定时任务调度器（Windows Task Scheduler / GitHub Actions / Codex Scheduler / 任意 cron）用的完整 spec。
> 把这一份交出去就能配。

---

## 1. 一句话任务

`daily/generate.mjs` 可以调用 OpenAI 生成新文字题和真实图片题，自动校验唯一解并写入项目仓库。当前仓库尚未配置 `OPENAI_API_KEY` 或定时工作流，因此它不会自动运行，`daily/data/` 目前也是空题库。

---

## 2. 输出位置（自动落盘路径）

| 类型 | 路径 | 说明 |
|---|---|---|
| **图题元数据** | `daily/data/image-puzzles.json` | JSON，含 4 档难度数组，每档当日新增的题。spec 格式与 `puzzles.js` 一致：`name\|url1,url2,url3,url4` |
| **文字题元数据** | `daily/data/text-puzzles.json` | JSON，结构同 `main.jsx` 的 `simpleTextPuzzles`（4 维数组，每维 4 项） |
| **生成的图片** | `public/daily-puzzles/<YYYY-MM-DD>/<difficulty>-<puzzleIndex>/g<groupIndex>-<variant>.jpg` | 每天 1 个子目录，10 道图题 × 16 张 = 160 张/天 |
| **构建产物** | `dist/` | 由 Cloudflare Pages 在下次 push 时自动重建（无需本任务触碰） |

### 路径示例

```
daily/
├── README.md                                    ← 本文件
├── generate.mjs                                 ← 调度器要执行的脚本
└── data/
    ├── image-puzzles.json                       ← 4 档 + 元信息
    └── text-puzzles.json                        ← 文字题专用

public/daily-puzzles/
  2026-06-04/
    yellow-0/
      g0-1.jpg, g0-2.jpg, g0-3.jpg, g0-4.jpg   ← 球类 4 张
      g1-1.jpg ... g1-4.jpg                     ← 自然景观 4 张
      g2-1.jpg ... g2-4.jpg                     ← 城市地标 4 张
      g3-1.jpg ... g3-4.jpg                     ← 乐器 4 张
    green-0/ ... blue-0/ ... purple-0/ ...      ← 其余 3 档
    yellow-1/ ... purple-2/                     ← 10 道题全部铺开
```

---

## 3. 触发命令

```bash
# 完整跑（连真 API）
node daily/generate.mjs

# 干跑（验证脚本结构，不调 API）
node daily/generate.mjs --dry-run

# 自定义数量（默认 10 文字 + 10 图题）
node daily/generate.mjs --text=10 --image=10

# 指定要往哪一档难度加图题（默认循环分配）
node daily/generate.mjs --image-distribution=2,3,3,2  # yellow,green,blue,purple
```

工作目录必须是 **项目根** `C:\Users\qwe\Documents\Codex\2026-06-03\build-web-apps-plugin-build-web`（或 git 仓库根），脚本会自己定位 `daily/` 和 `public/daily-puzzles/`。

---

## 4. 调度时间与频率

- **频率**：每天 1 次
- **推荐时间**：**UTC 00:00**（即 **JST 09:00**，**北京时间 08:00**），全球用户都能在天亮时看到新题
- **时区无关**：脚本内部以 UTC 日期为目录名，避免跨时区重复

cron 表达式（5 段）：`0 0 * * *`
GitHub Actions：`cron: '0 0 * * *'`
Windows Task Scheduler：每天 00:00:00

---

## 5. 环境变量 / Secrets

| 变量 | 必填 | 说明 |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | OpenAI 官方 key，付费账户。`gpt-4o-mini` 调题，`gpt-image-2` 出图 |
| `GIT_AUTHOR_NAME` | ⭕ | git commit 作者名，默认 `nanamicat-bot` |
| `GIT_AUTHOR_EMAIL` | ⭕ | git commit 作者邮箱，默认 `bot@nanamicat.com` |
| `DAILY_IMAGE_DISTRIBUTION` | ⭕ | 例 `2,3,3,2`，不传则循环分配 4 档 |

### 配在哪里

| 调度器 | 位置 |
|---|---|
| GitHub Actions | repo → Settings → Secrets and variables → Actions |
| Codex Scheduler | 任务配置的 env 字段 |
| Windows Task Scheduler | 任务属性 → 环境（用 `setx` 提前设） |

---

## 6. Pipeline 步骤（自动）

```
1. 读 data/daily-puzzles.json + daily-text-puzzles.json（已有内容）
2. 用 gpt-4o-mini 出 10 道文字题 spec
   ↓
3. LLM-as-judge 校验：唯一解 + red herring + 词不歧义
   ↓ 不通过则带反馈重试 1 次
4. 用 gpt-4o-mini 出 10 道图题 spec（4 档难度 × 2-3 道循环）
   ↓
5. 同样 LLM-as-judge 校验
   ↓
6. 对每道图题用 gpt-image-2 出 16 张图（4 组 × 4 张）
   ↓ 限速 3 并发
7. 落盘：
   - public/puzzles/<date>/<diff>-<idx>/g<g>-<v>.jpg
   - 追加到 data/daily-puzzles.json
   - 追加到 data/daily-text-puzzles.json
8. git add + commit + push（如配置了远端）
9. Cloudflare Pages 收到 push 自动 rebuild
```

---

## 7. 题目（文字 + 图片）限制要求

### 7.1 文字题

- **结构**：16 项分 4 组 × 4 项，**唯一解**
- **4 档难度**（与项目色板/黄绿蓝紫严格对齐）：
  - **明黄 直觉分类**：单层语义、具体物件（"球类"、"动物"、"工具"…）
  - **青绿 常识联想**：概念/用途/场景（"会飞的东西"、"可以切开的食物"…）
  - **靛蓝 跨域关系**：跨类别抽象关联（"入口"、"时间"、"保存"、"方向"…）
  - **紫玄 细节线索**：抽象/视觉/关系型（"对称 vs 偏移"、"完整 vs 碎片"…）
- **品牌反例**（PRODUCT.md 明确禁用）：冷 SaaS dashboard / 灰度工具 / 卡通幼稚 / 彩虹装饰
- **拒绝项**：
  - 含义重叠的近义词组
  - 一词多义但语境模糊的（pumpkin 算菜/水果/万圣节？）
  - 中文生僻字 / 同音字
  - 跨语言歧义

### 7.2 图片题 + gpt-image-2 限制

- **出图策略**：每张图独立 call（gpt-image-2 多主体 sprite sheet 一致性差，per-image 更稳）；每道题 16 张 = 4 组 × 4 张
- **prompt 结构**（与项目历史一致）：
  ```
  Use case: product visual reference
  Asset type: single photographic subject for a 16-tile puzzle grid
  Subject: <keyword>（如 soccer-ball）
  Style: high quality realistic photography, bright neutral lighting,
         strong object recognition, clean uncluttered background
  Composition: square crop, single centered subject, no overlap
  Constraints: no people, no text, no labels, no logos, no watermark,
              no decorative border
  ```
- **尺寸**：1024×1024，输出 JPG，目标 < 200KB
- **美学一致**：图像本身保持摄影感；"蜡笔"风由 UI 边框（`paper-texture.png` + dashed border）负责，**不污染图像本身**。当前只有 2 道完整真实照片题，其余图片题定义仍使用 SVG 插画占位。
- **16 张/题 × 10 题 = 160 张/天**，`gpt-image-2 medium` 约 $0.04/张 → **~$6.4/天，~$190/月**

---

## 8. 校验规则

- **唯一解校验**：LLM-as-judge 跑 2 轮 prompt：
  1. "这 16 个词除了 4 个组，还有没有其他合理的分法？" — 是 → 拒
  2. "随机抽 3 个词，是否容易被错放到另一组？" — 是 → 拒
- **难度档位一致性**：每道题必须明确归到 4 档之一，prompt 里显式要求输出 `difficulty` 字段
- **失败重试**：单道题最多 2 次重试；2 次都失败 → 跳过该道，本日少出 1 道，下日补齐
- **图题额外校验**：
  - 每张图必须能被目视识别（4 个同组主题在视觉上属于同一类）
  - 失败回退：直接用 loremflickr 兜底（保留 URL，不重试）

---

## 9. 失败处理 / 回滚

- **重试**：网络/API 错误 3 次指数退避
- **部分成功**：当日 JSON 只追加成功的题目，失败的留待次日
- **回滚**：`git revert HEAD`（单次提交是原子化的，干净回滚）
- **不提交空跑**：如果当日一道题都没成功，跳过 git commit

---

## 10. 成本估算

| 项 | 单价 | 日用量 | 日费 | 月费 |
|---|---|---|---|---|
| gpt-4o-mini（出题） | ~$0.15/Mtok | ~30k tok | ~$0.01 | ~$0.3 |
| gpt-4o-mini（校验） | ~$0.15/Mtok | ~20k tok | ~$0.01 | ~$0.3 |
| gpt-image-2 medium 1024² | ~$0.04/张 | 160 张 | ~$6.4 | ~$192 |
| **合计** | | | **~$6.4** | **~$192** |

调档位：把图换成 `gpt-image-2 low`（$0.02/张）能压到 ~$100/月，质量略降。

---

## 11. 手动触发 / 调试

```bash
# 干跑 — 不调任何 API，只打印 pipeline 步骤和文件结构
node daily/generate.mjs --dry-run

# 单跑图题 / 单跑文字题
node daily/generate.mjs --only=image
node daily/generate.mjs --only=text

# 用更便宜的模型
OPENAI_MODEL=gpt-4.1-nano node daily/generate.mjs
```

---

## 12. 已有 / 待办

### 已就位

- ✅ `daily/` 目录建好（spec / 脚本 / 数据三件套）
- ✅ `daily/data/image-puzzles.json` + `text-puzzles.json`（空架子，结构定好）
- ✅ `src/puzzles.js` 已接入合并（`makeGroup` 支持 `name|url1,url2,url3,url4` 格式）
- ✅ git 仓库在 `C:\Users\qwe\Documents\Codex\2026-06-03\build-web-apps-plugin-build-web`

### 待你接

- ⏳ 配 `OPENAI_API_KEY` 到调度器的 secrets
- ⏳ 在调度器里加一条每日 00:00 UTC 的任务，命令是 `node daily/generate.mjs`
- ⏳ 第一次干跑验证（`--dry-run`）

### 留待我接 / 留待你把 bilingual 库稳了再接

- ⏳ `src/main.jsx` 文字题 daily 合并（你正在把 simpleTextPuzzles 改写成中英双语，daily 这边等你的新结构稳定后再挂）
