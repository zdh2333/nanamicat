# Design System: NanamiCat iOS

## 1. Visual Theme & Atmosphere

原生 iOS 每日分类谜题 App。**定稿方向：C Soft Geometry**，叠加 **Cute Black Cat**（NanamiCat 品牌吉祥物）与 **Morandi 可调色盘**。

语言 sharp / calm / playful：棋盘是第一视觉焦点，留白充足，动效只服务反馈（选中、解锁、失误、通关）。禁止营销式 hero、霓虹渐变、暖纸 beige 套色、装饰 eyebrow。

**Dial:** DESIGN_VARIANCE 7 · MOTION_INTENSITY 7 · VISUAL_DENSITY 3

**Design Read:** 原生 iOS 每日解谜，面向碎片时间玩家，Soft Geometry + 低饱和 Morandi 色 + 克制黑猫点缀，leaning Apple HIG + 棋盘优先信息架构。

## 2. Primary Direction — C Soft Geometry

- **形状：** 统一圆角体系（Tile 12 · Button 10 · Card 16 · Sheet 20），禁止 pill tile + square card 混用
- **布局：** 4×4 等分棋盘，间距 8pt，max width 390pt 居中
- **气质：** Zinc 中性底 + 低饱和 Morandi accent，premium 而非儿童向

### 2.1 Cute Black Cat Layer（品牌吉祥物）

黑猫 **Nanami** 为点缀层，不抢棋盘焦点。出现位置固定：

| 位置 | 形态 | 说明 |
|------|------|------|
| 游戏页 Header | `NanamiCatMascot` size `.header`（28pt） | 与标题并列，替代纯几何 BrandMark |
| 组解锁瞬间 | size `.celebration`（44pt）+ 爪印 `PawAccent` | 答对一组时 overlay 1.2s 后淡出 |
| 排行榜空态 | size `.empty`（36pt） | 「还没有成绩」旁小插图 |
| 设置页主题预览 | size `.mini`（20pt） | 主题卡片角标 |
| Tab Bar | 无独立图标；选中态使用当前 Morandi `accent` tint | 爪印仅作解锁/空态，不铺满 Tab |

**禁止：** 全屏猫动画、每 Tile 贴猫、营销 banner 式吉祥物。

矢量实现：`NanamiCatMascot`（SwiftUI Shape，近黑 `#1C1C1E`），无 asset 时可用 SF Symbol `cat.fill` 作 accessibility 标签备用。

## 3. Morandi Theme Presets（用户可调主色）

用户在 **设置 → 主题** 选择一套 Morandi preset；**游戏 / 解锁 / 排行榜 / 贡献 / 设置** 全部从同一 `AppPalette` token 派生，持久化于 `UserDefaults`（`AppThemeID`，Codable）。

| Preset ID | 中文名 | Primary | Secondary | Surface (L) | Accent | 气质 |
|-----------|--------|---------|-----------|-------------|--------|------|
| `zincMist` | 锌雾灰 | `#6B7280` | `#9CA3AF` | `#FFFFFF` | `#5B8A9A` | 默认 C，冷灰青 |
| `roseDust` | 玫瑰尘 | `#A68B93` | `#C4ABB0` | `#FFFCFC` | `#B08A93` | 灰粉 |
| `sageCalm` | 鼠尾草 | `#8A9B8C` | `#B5C0B6` | `#FBFCFA` | `#7A9480` | 灰绿 |
| `blueHaze` | 薄雾蓝 | `#8A9BB5` | `#A8B4C8` | `#FAFBFD` | `#7A8FA8` | 灰蓝 |

### Token 映射（`AppPalette`）

| Token | Role |
|-------|------|
| `canvas` | 页面底（light：各 preset 浅灰 tint；dark：`#121214`） |
| `surface` | Tile / 卡片底 |
| `ink` | 主文字 |
| `muted` | 副文案 |
| `primary` | 主品牌色（Morandi 主色） |
| `secondary` | 次要色带、swatch 辅色 |
| `accent` | CTA、选中描边、Tab tint |
| `accentSoft` | 选中 Tile 浅底 |

**Dark mode：** 同一 preset 的 accent/primary 略提亮，canvas/surface 深灰，保持低饱和。

**Legacy 迁移：** 旧 `default`→`zincMist`，`mist`→`blueHaze`，`sage`→`sageCalm`，`clay`→`roseDust`。

### 方向 A / B（归档参考，非默认）

- **A Native Instrument：** 系统分组 + cyan `#0891B2`
- **B Ink & Signal：** 高对比 + emerald `#10B981`

SwiftUI 实现 **仅** 跟随 C + Morandi；不再暴露 A/B 切换。

## 4. Difficulty Colors（跨主题共享）

四档难度色带与主题 independent，略降饱和以配合 Morandi：

| Level | Background | Border |
|-------|------------|--------|
| 1 明黄 | `#FDE68A` | `#CA8A04` |
| 2 青绿 | `#BBF7D0` | `#16A34A` |
| 3 靛蓝 | `#BFDBFE` | `#2563EB` |
| 4 紫玄 | `#E9D5FF` | `#9333EA` |

## 5. Typography

- **Display / 标题:** SF Pro Display, Semibold, tracking tight
- **Body / Tile 词:** SF Pro Text, Regular/Medium, Dynamic Type
- **Caption / 元信息:** SF Pro Text, 13pt, `muted`
- **Mono / 分数:** SF Mono 用于排行榜数字

Tile 内中文词：最小 15pt，最大 2 行截断。

## 6. Shape & Spacing

- **Corner radius：** Tile 12 · Button 10 · Card 16 · Sheet 20
- **Grid：** 4×4，间距 8pt
- **Touch：** 最小 44×44pt
- **Section padding：** 水平 20pt，棋盘上下 24pt

## 7. Motion & Haptic

| 事件 | 动画 | 时长 | Haptic |
|------|------|------|--------|
| Tile 选中 | scale 1.0→1.03 spring | 0.25s | light |
| 组解锁 | tile 飞入色带 + 猫 overlay | 0.45s | success |
| 失误 | horizontal shake | 0.35s | warning |
| 通关 | 色带 stagger | 0.6s | success |
| Tab 切换 | system default | — | none |

**Reduce Motion：** opacity crossfade，无 shake/scale。

## 8. Component Notes

- **Tile：** 实底 + 1px border；选中 2px `accent` ring + `accentSoft` fill
- **Primary button：** `accent` fill，白字
- **Ghost button：** 1px border，`muted` 25% opacity
- **MorandiThemePicker：** 2×2 swatch 网格 + 选中 checkmark

## 9. Anti-Patterns (Banned)

- 三等分 feature 卡片、假 3D、Lucide 堆砌
- AI 紫蓝霓虹、beige `#f5f1ea` 暖纸默认、纯黑 `#000000`
- 无动机 infinite 动画、全屏吉祥物

## 10. Prototype Index

见 `docs/prototypes/`：

- 原型历史图已清理，当前以 iOS 代码中的设计系统与组件实现为准。

SwiftUI：`AppThemeID` + `AppPalette.palette(for:colorScheme:)` + `NanamiCatMascot`。
