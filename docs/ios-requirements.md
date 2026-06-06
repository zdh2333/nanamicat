# NanamiCat iOS 产品需求文档（PRD）

| 项 | 内容 |
|---|---|
| 产品 | 四格寻踪 / FourFind |
| 平台 | iOS 17+，SwiftUI |
| 后端 | `https://nanamicat.com` Cloudflare Pages API |
| 版本 | v1.0 规划 |
| 设计 | 见 [DESIGN.md](./DESIGN.md) |

## 1. 背景与目标

Web 版 NanamiCat 是每日词语分类谜题（类似 Connections）。iOS 版**不追求 Web UI 1:1 复刻**，在保持玩法、谜题 ID、计分规则与 API 契约一致的前提下，提供原生动效、触觉反馈与 taste-skill 审核过的界面。

## 2. 用户故事

| ID | 描述 | 优先级 |
|----|------|--------|
| US-01 | 打开 App 即见今日文字题 | P0 |
| US-02 | 点选 4 项并提交验证 | P0 |
| US-03 | 失误计数与红鲱鱼近失提示 | P0 |
| US-04 | 纯文字题模式（无图片模式） | P0 |
| US-05 | 昵称 + 排行榜 Top 20 | P1 |
| US-06 | 通关自动记分 | P1 |
| US-07 | 投稿谜题 pending | P2 |
| US-08 | 分享本局结果 | P2 |
| US-09 | 中/英、四主题 | P1 |
| US-10 | 离线可玩谜题 | P0 |

## 3. 功能需求

### FR-1 游戏核心（P0）

- FR-1.1 4×4 棋盘，文字 tile
- FR-1.2 多选最多 4 项，已解不可选
- FR-1.3 提交匹配未解组则锁定并着色
- FR-1.4 错误 +1 失误；3/4 近失显示红鲱鱼
- FR-1.5 四组全解揭示最抽象组（level 最高）
- FR-1.6 失误上限 4，用尽仍可继续
- FR-1.7 每日题 UTC：`(year*372 + month*31 + day) % count`
- FR-1.8 打乱、换题

### FR-2 谜题引擎（P0）

见 [puzzle-port-spec.md](./puzzle-port-spec.md)。当前为 100 文字题。

### FR-9 动效（P0 iOS 差异化）

- 选中 spring、组解锁飞入、失误 shake + haptic、通关 reveal
- Reduce Motion 降级

### FR-3 ~ FR-8

模式/语言/主题、提示、排行榜、投稿、分享、Tab 导航：与计划文档 2.5 节一致。

## 4. API

Base: `https://nanamicat.com`

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/player` | 昵称注册 |
| POST | `/api/score` | 通关记分 |
| GET | `/api/leaderboard` | Top 20 |
| POST | `/api/puzzles` | 投稿 |

请求/响应字段与 Web `functions/api/*` 一致。

## 5. 本地存储

| Key | 说明 |
|-----|------|
| nanamicat.locale | zh / en |
| nanamicat.theme | default / mist / sage / clay |
| nanamicat.nickname | 昵称 |
| nanamicat.playerId | 玩家 ID |

## 6. 架构

```
NanamiCat-iOS/NanamiCat/
├── App/
├── Features/{Game,Leaderboard,Contribute,Settings}/
├── Core/{PuzzleEngine,Models,Networking,Persistence}/
├── DesignSystem/
└── Resources/
```

## 7. 非功能需求

- NFR-01 iOS 17+
- NFR-02 谜题 ID 与 Web 一致
- NFR-03 API 失败不阻塞本地游玩
- NFR-04 仅昵称与成绩，无第三方登录
- NFR-06 主界面纯 SwiftUI，无 WebView

## 8. 范围外

后台管理、Widget、Game Center、IAP。

## 9. 验收标准

1. 同 UTC 日期 iOS/Web 默认 `puzzleId` 一致  
2. iOS 通关分数出现在 Web 排行榜  
3. 失误/红鲱鱼/提示/去重与 Web 一致  
4. 选定设计语言一致（默认 Soft Geometry）  
5. FR-9 动效 + Reduce Motion  
6. Dynamic Type、VoiceOver 基本可用  
7. 中英文与主题持久化  

## 10. 实施分期

| Phase | 内容 |
|-------|------|
| 0 | DESIGN.md + 三套原型 |
| 1 | PuzzleEngine + 文字题 Game |
| 2 | API |
| 3 | 投稿/分享/赞助/设置 |
| 4 | 无障碍 + TestFlight 素材 |

## 11. 原型

原型目录已清理，当前实现以 iOS 工程内设计系统为准。
