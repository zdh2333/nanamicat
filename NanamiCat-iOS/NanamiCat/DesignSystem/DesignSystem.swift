import SwiftUI

// MARK: - Typography (Caveat, bundled)

enum CrayonFont {
    /// Bundled Caveat variable font — family name "Caveat".
    /// Variable axis: wght (400–700). Use `.weight(.bold)` etc. to switch.
    static let family = "Caveat"

    static func display(_ size: CGFloat) -> Font {
        .custom(family, size: size, relativeTo: .largeTitle).weight(.bold)
    }

    static func title(_ size: CGFloat = 22) -> Font {
        .custom(family, size: size, relativeTo: .title2).weight(.bold)
    }

    static func body(_ size: CGFloat = 17) -> Font {
        .custom(family, size: size, relativeTo: .body).weight(.semibold)
    }

    static func button(_ size: CGFloat = 17) -> Font {
        .custom(family, size: size, relativeTo: .body).weight(.bold)
    }

    static func buttonLarge(_ size: CGFloat = 22) -> Font {
        .custom(family, size: size, relativeTo: .title2).weight(.bold)
    }

    static func caption(_ size: CGFloat = 13) -> Font {
        .custom(family, size: size, relativeTo: .caption).weight(.semibold)
    }
}

// MARK: - Button Role Palette
// 4-color button roles from the brand reference (paper notebook style).
// These are intentionally **not** driven by Morandi theme — they mirror Web's
// styles.css four-button contract (submit yellow / hint blue / shuffle green
// / cancel cream / next-or-share navy).

enum ButtonRole {
    case submit    // 提交黄 — primary submit
    case hint      // 提示蓝
    case shuffle   // 洗牌绿
    case cancel    // 取消米白
    case next      // 下一题深蓝 (also used by share)
    case accent    // 通用 Morandi accent (used by 排行榜保存昵称, 投稿主按钮)

    var fill: Color {
        switch self {
        case .submit:  return Color(red: 0.969, green: 0.788, blue: 0.282)   // #F7C948
        case .hint:    return Color(red: 0.427, green: 0.714, blue: 0.910)   // #6DB6E8
        case .shuffle: return Color(red: 0.482, green: 0.776, blue: 0.482)   // #7BC67B
        case .cancel:  return Color(red: 1.000, green: 0.976, blue: 0.933)   // #FFF9EE
        case .next:    return Color(red: 0.071, green: 0.204, blue: 0.373)   // #12345F
        case .accent:  return Color(red: 0.969, green: 0.788, blue: 0.282)   // fallback to submit yellow
        }
    }

    var foreground: Color {
        switch self {
        case .submit, .hint, .shuffle, .cancel, .accent:
            return Color(red: 0.071, green: 0.204, blue: 0.373)               // #12345F navy
        case .next:
            return Color(red: 1.000, green: 0.976, blue: 0.933)               // #FFF9EE cream
        }
    }

    /// Used for the inset dashed border on the button face (Web `button::after`).
    /// Slightly stronger on the dark `next` button so the dashes read against navy.
    var dashColor: Color {
        switch self {
        case .next:    return Color(red: 1.000, green: 0.976, blue: 0.933).opacity(0.22)
        default:       return Color(red: 0.071, green: 0.204, blue: 0.373).opacity(0.16)
        }
    }
}

// MARK: - Palette

/// Page-surface tokens pinned to Web's `styles.css` warm-cream contract.
/// These are intentionally **not** driven by the Morandi theme so that
/// nanamicat.com and the iOS app share an identical canvas / surface
/// background, no matter which Morandi preset the user has picked.
private enum WebSurfaceTokens {
    /// Web `--bg` (#f8f1e4).
    static let canvas = Color(red: 0.973, green: 0.945, blue: 0.894)
    /// Web `--surface` (#fff9ee).
    static let surface = Color(red: 1.0, green: 0.976, blue: 0.933)
}

struct AppPalette {
    let canvas: Color
    let surface: Color
    let ink: Color
    let muted: Color
    let primary: Color
    let secondary: Color
    let accent: Color
    let accentSoft: Color
    let crayonPaper: Color
    let crayonInk: Color
    let crayonJitter: CGFloat

    static func palette(for theme: AppThemeID, colorScheme: ColorScheme) -> AppPalette {
        let tokens = MorandiTokens.forTheme(theme)
        if colorScheme == .dark {
            return AppPalette(
                canvas: Color(red: 0.07, green: 0.07, blue: 0.08),
                surface: Color(red: 0.14, green: 0.14, blue: 0.15),
                ink: Color(red: 0.96, green: 0.96, blue: 0.97),
                muted: Color(red: 0.63, green: 0.64, blue: 0.67),
                primary: tokens.primaryDark,
                secondary: tokens.secondaryDark,
                accent: tokens.accentDark,
                accentSoft: tokens.accentDark.opacity(0.22),
                crayonPaper: Color(red: 0.12, green: 0.12, blue: 0.13),
                crayonInk: Color(red: 0.78, green: 0.77, blue: 0.75),
                crayonJitter: 1.5
            )
        }

        return AppPalette(
            // Canvas + surface + crayonPaper are pinned to Web's warm-cream
            // tokens (styles.css `--bg` / `--surface`) so the page surface
            // looks identical on Web and iOS regardless of which Morandi
            // theme the user picks.  The Morandi token's `crayonPaper`
            // differs per theme (roseDust's pink, sageCalm's green, etc.)
            // which broke the visual contract that iOS should look like
            // nanamicat.com at all times.
            canvas: WebSurfaceTokens.canvas,
            surface: WebSurfaceTokens.surface,
            ink: Color(red: 0.071, green: 0.204, blue: 0.373),
            muted: Color(red: 0.373, green: 0.443, blue: 0.518),
            primary: tokens.primary,
            secondary: tokens.secondary,
            accent: tokens.accent,
            accentSoft: tokens.accent.opacity(0.12),
            crayonPaper: WebSurfaceTokens.canvas,
            crayonInk: Color(red: 0.071, green: 0.204, blue: 0.373),
            crayonJitter: 1.5
        )
    }

    func previewSwatch(for theme: AppThemeID) -> (primary: Color, secondary: Color, accent: Color) {
        let tokens = MorandiTokens.forTheme(theme)
        return (tokens.primary, tokens.secondary, tokens.accent)
    }
}

private struct MorandiTokens {
    let crayonPaper: Color
    let surface: Color
    let primary: Color
    let secondary: Color
    let accent: Color
    let primaryDark: Color
    let secondaryDark: Color
    let accentDark: Color

    static func forTheme(_ theme: AppThemeID) -> MorandiTokens {
        switch theme {
        case .zincMist:
            return MorandiTokens(
                crayonPaper: Color(red: 0.973, green: 0.945, blue: 0.894),
                surface: Color(red: 1.0, green: 0.976, blue: 0.933),
                primary: Color(red: 0.969, green: 0.788, blue: 0.282),
                secondary: Color(red: 0.482, green: 0.776, blue: 0.482),
                accent: Color(red: 0.427, green: 0.714, blue: 0.910),
                primaryDark: Color(red: 0.68, green: 0.71, blue: 0.75),
                secondaryDark: Color(red: 0.52, green: 0.55, blue: 0.58),
                accentDark: Color(red: 0.52, green: 0.72, blue: 0.78)
            )
        case .roseDust:
            return MorandiTokens(
                crayonPaper: Color(red: 0.949, green: 0.902, blue: 0.878),
                surface: Color(red: 1.0, green: 0.99, blue: 0.99),
                primary: Color(red: 0.65, green: 0.55, blue: 0.58),
                secondary: Color(red: 0.77, green: 0.67, blue: 0.69),
                accent: Color(red: 0.69, green: 0.54, blue: 0.58),
                primaryDark: Color(red: 0.82, green: 0.72, blue: 0.75),
                secondaryDark: Color(red: 0.68, green: 0.58, blue: 0.61),
                accentDark: Color(red: 0.85, green: 0.68, blue: 0.72)
            )
        case .sageCalm:
            return MorandiTokens(
                crayonPaper: Color(red: 0.910, green: 0.922, blue: 0.878),
                surface: Color(red: 0.98, green: 0.99, blue: 0.98),
                primary: Color(red: 0.54, green: 0.61, blue: 0.55),
                secondary: Color(red: 0.71, green: 0.75, blue: 0.71),
                accent: Color(red: 0.48, green: 0.58, blue: 0.50),
                primaryDark: Color(red: 0.72, green: 0.78, blue: 0.73),
                secondaryDark: Color(red: 0.58, green: 0.64, blue: 0.59),
                accentDark: Color(red: 0.62, green: 0.76, blue: 0.66)
            )
        case .blueHaze:
            return MorandiTokens(
                crayonPaper: Color(red: 0.886, green: 0.906, blue: 0.925),
                surface: Color(red: 0.98, green: 0.98, blue: 0.99),
                primary: Color(red: 0.54, green: 0.61, blue: 0.71),
                secondary: Color(red: 0.66, green: 0.71, blue: 0.78),
                accent: Color(red: 0.48, green: 0.56, blue: 0.66),
                primaryDark: Color(red: 0.72, green: 0.77, blue: 0.85),
                secondaryDark: Color(red: 0.58, green: 0.64, blue: 0.72),
                accentDark: Color(red: 0.58, green: 0.68, blue: 0.82)
            )
        }
    }
}

// MARK: - Crayon Shapes

private func crayonNoise(_ index: Int, seed: UInt64, amplitude: CGFloat) -> CGFloat {
    var s = seed &+ UInt64(index &* 2_654_435_761)
    s = (s ^ (s >> 16)) &* 0x45d9f3b
    s = (s ^ (s >> 16)) &* 0x45d9f3b
    s = s ^ (s >> 16)
    let unit = Double(s % 1000) / 500.0 - 1.0
    return CGFloat(unit) * amplitude
}

func crayonSeed(_ value: some Hashable, offset: UInt64 = 0) -> UInt64 {
    var hasher = Hasher()
    hasher.combine(value)
    return UInt64(truncatingIfNeeded: hasher.finalize()) &+ offset
}

struct CrayonBorder: Shape {
    var cornerRadius: CGFloat = 10
    var jitter: CGFloat = 1.5
    var seed: UInt64 = 0
    var inset: CGFloat = 1.25

    func path(in rect: CGRect) -> Path {
        guard rect.width > 2, rect.height > 2 else { return Path() }

        let maxRadius = min(rect.width, rect.height) / 2 - inset
        let r = max(1, min(cornerRadius, maxRadius))
        let inner = rect.insetBy(dx: inset, dy: inset)
        let segments = 56
        var path = Path()

        for i in 0..<segments {
            let t = CGFloat(i) / CGFloat(segments)
            let point = pointOnRoundedRect(inner, cornerRadius: r, t: t)
            let jittered = CGPoint(
                x: point.x + crayonNoise(i * 2, seed: seed, amplitude: jitter),
                y: point.y + crayonNoise(i * 2 + 1, seed: seed, amplitude: jitter)
            )
            if i == 0 { path.move(to: jittered) } else { path.addLine(to: jittered) }
        }
        path.closeSubpath()
        return path
    }

    private func pointOnRoundedRect(_ rect: CGRect, cornerRadius r: CGFloat, t: CGFloat) -> CGPoint {
        let straightW = max(rect.width - 2 * r, 0)
        let straightH = max(rect.height - 2 * r, 0)
        let perimeter = 2 * (straightW + straightH) + 2 * .pi * r
        guard perimeter > 0 else { return CGPoint(x: rect.midX, y: rect.midY) }
        var distance = t * perimeter

        func walk(_ length: CGFloat, from: CGPoint, to: CGPoint) -> CGPoint? {
            guard length > 0 else { return nil }
            if distance <= length {
                let fraction = distance / length
                return CGPoint(x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction)
            }
            distance -= length
            return nil
        }

        func walkArc(center: CGPoint, start: CGFloat, sweep: CGFloat, radius: CGFloat) -> CGPoint? {
            let length = abs(sweep) * radius
            guard length > 0 else { return nil }
            if distance <= length {
                let angle = start + sweep * (distance / length)
                return CGPoint(x: center.x + cos(angle) * radius, y: center.y + sin(angle) * radius)
            }
            distance -= length
            return nil
        }

        let topLeft = CGPoint(x: rect.minX + r, y: rect.minY)
        let topRight = CGPoint(x: rect.maxX - r, y: rect.minY)
        let bottomRight = CGPoint(x: rect.maxX - r, y: rect.maxY)
        let bottomLeft = CGPoint(x: rect.minX + r, y: rect.maxY)

        if let p = walk(straightW, from: topLeft, to: topRight) { return p }
        if let p = walkArc(center: CGPoint(x: rect.maxX - r, y: rect.minY + r), start: -.pi / 2, sweep: .pi / 2, radius: r) { return p }
        if let p = walk(straightH, from: CGPoint(x: rect.maxX, y: rect.minY + r), to: CGPoint(x: rect.maxX, y: rect.maxY - r)) { return p }
        if let p = walkArc(center: CGPoint(x: rect.maxX - r, y: rect.maxY - r), start: 0, sweep: .pi / 2, radius: r) { return p }
        if let p = walk(straightW, from: bottomRight, to: bottomLeft) { return p }
        if let p = walkArc(center: CGPoint(x: rect.minX + r, y: rect.maxY - r), start: .pi / 2, sweep: .pi / 2, radius: r) { return p }
        if let p = walk(straightH, from: CGPoint(x: rect.minX, y: rect.maxY - r), to: CGPoint(x: rect.minX, y: rect.minY + r)) { return p }
        if let p = walkArc(center: CGPoint(x: rect.minX + r, y: rect.minY + r), start: .pi, sweep: .pi / 2, radius: r) { return p }
        return topLeft
    }
}

struct CrayonCircle: Shape {
    var gapDegrees: CGFloat = 8
    var jitter: CGFloat = 1.5
    var seed: UInt64 = 42

    func path(in rect: CGRect) -> Path {
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let radius = min(rect.width, rect.height) / 2 - 2
        let segments = 48
        let gap = gapDegrees * .pi / 180
        let start = -.pi / 2 + gap / 2
        let end = start + 2 * .pi - gap
        var path = Path()

        for i in 0...segments {
            let t = CGFloat(i) / CGFloat(segments)
            let angle = start + (end - start) * t
            let point = CGPoint(
                x: center.x + cos(angle) * radius + crayonNoise(i, seed: seed, amplitude: jitter),
                y: center.y + sin(angle) * radius + crayonNoise(i + 100, seed: seed, amplitude: jitter)
            )
            if i == 0 { path.move(to: point) } else { path.addLine(to: point) }
        }
        return path
    }
}

struct CrayonDottedLine: Shape {
    var seed: UInt64 = 7

    func path(in rect: CGRect) -> Path {
        var path = Path()
        let count = 12
        for i in 0..<count {
            let x0 = rect.minX + rect.width * CGFloat(i) / CGFloat(count)
            let x1 = x0 + rect.width / CGFloat(count) * 0.55
            let y = rect.midY + crayonNoise(i, seed: seed, amplitude: 0.8)
            path.move(to: CGPoint(x: x0, y: y))
            path.addLine(to: CGPoint(x: x1, y: y))
        }
        return path
    }
}

// MARK: - Crayon Decorations

struct CrayonPaperBackground: View {
    let palette: AppPalette

    var body: some View {
        ZStack {
            palette.crayonPaper
            CrayonShavings(palette: palette)
        }
        .ignoresSafeArea()
    }
}

private struct CrayonShavings: View {
    let palette: AppPalette
    private let colors: [Color]

    init(palette: AppPalette) {
        self.palette = palette
        colors = [palette.accent, palette.primary, palette.secondary, palette.accent.opacity(0.6)]
    }

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            ForEach(0..<18, id: \.self) { i in
                let x = w * positions[i].x
                let y = h * positions[i].y
                RoundedRectangle(cornerRadius: 1.5, style: .continuous)
                    .fill(colors[i % colors.count].opacity(0.35))
                    .frame(width: sizes[i].width, height: sizes[i].height)
                    .rotationEffect(.degrees(rotations[i]))
                    .position(x: x, y: y)
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private let positions: [(x: CGFloat, y: CGFloat)] = [
        (0.08, 0.06), (0.92, 0.05), (0.04, 0.22), (0.96, 0.18),
        (0.12, 0.88), (0.88, 0.92), (0.06, 0.55), (0.94, 0.48),
        (0.18, 0.12), (0.82, 0.78), (0.72, 0.08), (0.28, 0.94),
        (0.50, 0.04), (0.38, 0.72), (0.62, 0.32), (0.15, 0.38),
        (0.85, 0.62), (0.48, 0.96)
    ]
    private let sizes: [CGSize] = [
        CGSize(width: 5, height: 3), CGSize(width: 4, height: 2), CGSize(width: 6, height: 2),
        CGSize(width: 3, height: 3), CGSize(width: 5, height: 2), CGSize(width: 4, height: 4),
        CGSize(width: 3, height: 2), CGSize(width: 6, height: 3), CGSize(width: 4, height: 2),
        CGSize(width: 5, height: 3), CGSize(width: 3, height: 3), CGSize(width: 4, height: 2),
        CGSize(width: 5, height: 2), CGSize(width: 3, height: 4), CGSize(width: 6, height: 2),
        CGSize(width: 4, height: 3), CGSize(width: 5, height: 2), CGSize(width: 3, height: 3)
    ]
    private let rotations: [Double] = [-12, 18, -25, 8, 15, -18, 22, -8, 30, -15, 5, -22, 12, -5, 20, -30, 8, -12]
}

struct CrayonSplash: View {
    let accent: Color
    var count: Int = 8
    var progress: CGFloat = 1

    var body: some View {
        ZStack {
            ForEach(0..<count, id: \.self) { i in
                RoundedRectangle(cornerRadius: 2, style: .continuous)
                    .fill(accent.opacity(0.45 * Double(progress)))
                    .frame(width: splashSizes[i].width, height: splashSizes[i].height)
                    .rotationEffect(.degrees(splashRotations[i] * Double(progress)))
                    .offset(
                        x: splashOffsets[i].width * progress,
                        y: splashOffsets[i].height * progress
                    )
            }
        }
        .accessibilityHidden(true)
    }

    private let splashSizes: [CGSize] = [
        CGSize(width: 8, height: 5), CGSize(width: 6, height: 4), CGSize(width: 7, height: 3),
        CGSize(width: 5, height: 5), CGSize(width: 9, height: 4), CGSize(width: 6, height: 6),
        CGSize(width: 7, height: 4), CGSize(width: 5, height: 3)
    ]
    private let splashRotations: [Double] = [-20, 15, 35, -10, 25, -30, 8, -18]
    private let splashOffsets: [CGSize] = [
        CGSize(width: -40, height: -30), CGSize(width: 35, height: -25), CGSize(width: -20, height: 28),
        CGSize(width: 42, height: 18), CGSize(width: -35, height: 8), CGSize(width: 18, height: -35),
        CGSize(width: -8, height: 35), CGSize(width: 30, height: 30)
    ]
}

private struct CelebrationParticle: Identifiable {
    let id: Int
    let startX: CGFloat
    let driftX: CGFloat
    let startY: CGFloat
    let liftY: CGFloat
    let rotation: Double
    let size: CGSize
    let isPaw: Bool
}

private struct CrayonCelebrationParticles: View {
    let accent: Color
    let active: Bool
    let reduceMotion: Bool

    @State private var progress: CGFloat = 0

    private let particles: [CelebrationParticle] = [
        CelebrationParticle(id: 0, startX: -0.34, driftX: -0.08, startY: 0.12, liftY: -0.22, rotation: -18, size: CGSize(width: 7, height: 4), isPaw: false),
        CelebrationParticle(id: 1, startX: 0.28, driftX: 0.06, startY: 0.18, liftY: -0.28, rotation: 24, size: CGSize(width: 6, height: 5), isPaw: false),
        CelebrationParticle(id: 2, startX: -0.12, driftX: -0.14, startY: 0.08, liftY: -0.18, rotation: 12, size: CGSize(width: 5, height: 5), isPaw: true),
        CelebrationParticle(id: 3, startX: 0.38, driftX: 0.12, startY: 0.14, liftY: -0.24, rotation: -28, size: CGSize(width: 8, height: 3), isPaw: false),
        CelebrationParticle(id: 4, startX: -0.42, driftX: -0.04, startY: 0.16, liftY: -0.30, rotation: 32, size: CGSize(width: 5, height: 4), isPaw: true),
        CelebrationParticle(id: 5, startX: 0.08, driftX: 0.16, startY: 0.10, liftY: -0.20, rotation: -8, size: CGSize(width: 6, height: 3), isPaw: false),
        CelebrationParticle(id: 6, startX: -0.22, driftX: 0.10, startY: 0.20, liftY: -0.26, rotation: 16, size: CGSize(width: 4, height: 4), isPaw: true),
        CelebrationParticle(id: 7, startX: 0.44, driftX: -0.10, startY: 0.06, liftY: -0.16, rotation: -22, size: CGSize(width: 7, height: 4), isPaw: false)
    ]

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            ZStack {
                ForEach(particles) { particle in
                    Group {
                        if particle.isPaw {
                            Circle()
                                .fill(accent.opacity(0.34))
                                .frame(width: particle.size.width * 3, height: particle.size.width * 3)
                        } else {
                            RoundedRectangle(cornerRadius: 1.5, style: .continuous)
                                .fill(accent.opacity(0.42))
                                .frame(width: particle.size.width, height: particle.size.height)
                        }
                    }
                    .rotationEffect(.degrees(particle.rotation * Double(progress)))
                    .position(
                        x: w * (0.5 + particle.startX + particle.driftX * progress),
                        y: h * (0.5 + particle.startY + particle.liftY * progress)
                    )
                    .opacity(Double(1 - progress * 0.35))
                    .scaleEffect(0.85 + progress * 0.25)
                }
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .onChange(of: active) { _, isActive in
            guard isActive else {
                progress = 0
                return
            }
            progress = 0
            if reduceMotion {
                progress = 1
            } else {
                withAnimation(.spring(response: 0.72, dampingFraction: 0.72)) {
                    progress = 1
                }
            }
        }
    }
}

struct CrayonSmearBackground: View {
    let color: Color

    var body: some View {
        RoundedRectangle(cornerRadius: 6, style: .continuous)
            .fill(color.opacity(0.14))
            .rotationEffect(.degrees(45))
            .scaleEffect(x: 1.15, y: 0.75)
            .padding(4)
    }
}

struct CrayonCheckmark: View {
    let color: Color

    var body: some View {
        Canvas { context, size in
            let w = size.width
            let h = size.height
            var path = Path()
            path.move(to: CGPoint(x: w * 0.15, y: h * 0.52))
            path.addLine(to: CGPoint(x: w * 0.38, y: h * 0.78))
            path.addLine(to: CGPoint(x: w * 0.88, y: h * 0.22))
            context.stroke(path, with: .color(color), style: StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))
        }
        .frame(width: 18, height: 18)
        .accessibilityHidden(true)
    }
}

struct CrayonTitleDecorations: View {
    let palette: AppPalette

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "star.fill")
                .font(.caption2)
                .foregroundStyle(palette.accent)
                .rotationEffect(.degrees(-12))
            Image(systemName: "sparkle")
                .font(.caption2)
                .foregroundStyle(palette.muted)
            CrayonDottedLine()
                .stroke(palette.crayonInk.opacity(0.35), lineWidth: 1.5)
                .frame(width: 28, height: 4)
        }
        .accessibilityHidden(true)
    }
}

extension View {
    func crayonCard(
        palette: AppPalette,
        cornerRadius: CGFloat = 14,
        seed: UInt64 = 0,
        fill: Color? = nil
    ) -> some View {
        background(fill ?? palette.surface, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay {
                CrayonBorder(cornerRadius: cornerRadius, jitter: palette.crayonJitter, seed: seed)
                    .stroke(palette.crayonInk, style: StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))
            }
    }

    func crayonUnderline(palette: AppPalette) -> some View {
        overlay(alignment: .bottom) {
            CrayonDottedLine()
                .stroke(palette.crayonInk.opacity(0.4), lineWidth: 1.5)
                .frame(height: 3)
                .offset(y: 6)
        }
    }
}

// MARK: - Mascot

enum NanamiCatMascotSize {
    case mini, header, gameHeader, empty, celebration

    var dimension: CGFloat {
        switch self {
        case .mini: return 28
        case .header: return 28
        case .gameHeader: return 52
        case .empty: return 72
        case .celebration: return 120
        }
    }

    var cardSize: CGFloat? {
        switch self {
        case .gameHeader: return 64
        default: return nil
        }
    }
}

struct NanamiCatMascot: View {
    var size: NanamiCatMascotSize = .header
    var accent: Color = Color(red: 0.11, green: 0.11, blue: 0.12)
    var showCelebration: Bool = false

    var body: some View {
        Group {
            if let card = size.cardSize {
                mascotImage
                    .resizable()
                    .scaledToFit()
                    .frame(width: card, height: card)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay {
                        CrayonBorder(cornerRadius: 14, seed: 11)
                            .stroke(Color(red: 0.227, green: 0.227, blue: 0.235), lineWidth: 2)
                    }
            } else {
                mascotImage
                    .resizable()
                    .scaledToFit()
                    .frame(width: size.dimension, height: size.dimension)
            }
        }
        .fixedSize()
        .accessibilityLabel("NanamiCat")
    }

    private var mascotImage: Image {
        if size == .empty {
            return Image("nanamicat_mascot_empty")
        }
        if size == .celebration || showCelebration {
            return Image("nanamicat_mascot_celebration")
        }
        return Image("nanamicat_mascot_standard")
    }
}

struct PawAccent: View {
    var color: Color
    var size: CGFloat = 14

    var body: some View {
        HStack(spacing: size * 0.18) {
            ForEach(0..<4, id: \.self) { i in
                Circle()
                    .fill(color.opacity(0.32))
                    .frame(width: size * (0.32 + CGFloat(i % 2) * 0.06), height: size * (0.32 + CGFloat(i % 2) * 0.06))
                    .offset(y: CGFloat(i % 3) * 1.5 - 1.5)
            }
        }
        .accessibilityHidden(true)
    }
}

// MARK: - Components

struct GameBoardFrame<Content: View>: View {
    let palette: AppPalette
    @ViewBuilder var content: () -> Content

    var body: some View {
        content()
            .padding(14)
            .crayonCard(palette: palette, cornerRadius: 14, seed: 99, fill: palette.surface.opacity(0.75))
    }
}

struct MorandiThemePicker: View {
    @Binding var selection: AppThemeID
    let locale: AppLocale
    let palette: AppPalette

    private let columns = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 12) {
            ForEach(AppThemeID.allCases) { theme in
                let swatch = AppPalette.palette(for: theme, colorScheme: .light).previewSwatch(for: theme)
                let isSelected = selection == theme
                Button {
                    selection = theme
                    Haptics.light()
                } label: {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 6) {
                            Circle().fill(swatch.primary).frame(width: 18, height: 18)
                            Circle().fill(swatch.secondary).frame(width: 18, height: 18)
                            Circle().fill(swatch.accent).frame(width: 18, height: 18)
                            Spacer()
                            if isSelected {
                                CrayonCheckmark(color: palette.accent)
                            }
                        }
                        Text(theme.displayName(locale: locale))
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(palette.ink)
                        if isSelected {
                            HStack {
                                Spacer()
                                NanamiCatMascot(size: .mini)
                            }
                        }
                    }
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .crayonCard(
                        palette: palette,
                        cornerRadius: 12,
                        seed: crayonSeed(theme.rawValue),
                        fill: isSelected ? palette.accentSoft : palette.surface
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }
}

enum DifficultyStyle {
    static func colors(level: Int) -> (background: Color, border: Color) {
        switch level {
        case 1: return (Color(red: 0.992, green: 0.902, blue: 0.627), Color(red: 0.792, green: 0.541, blue: 0.016))
        case 2: return (Color(red: 0.773, green: 0.910, blue: 0.784), Color(red: 0.086, green: 0.639, blue: 0.290))
        case 3: return (Color(red: 0.773, green: 0.851, blue: 0.933), Color(red: 0.145, green: 0.388, blue: 0.922))
        default: return (Color(red: 0.898, green: 0.824, blue: 0.941), Color(red: 0.576, green: 0.200, blue: 0.918))
        }
    }

    static func label(level: Int, locale: AppLocale) -> String {
        switch min(max(level, 1), 4) {
        case 1: return locale == .zh ? "直观分类" : "Direct sets"
        case 2: return locale == .zh ? "常识联想" : "Familiar links"
        case 3: return locale == .zh ? "跨域关系" : "Cross-domain"
        default: return locale == .zh ? "细节线索" : "Detail clues"
        }
    }

    /// 四色阶梯，barFill 为已解组的 level 集合（高亮），其余淡显。
    static let barColors: [Color] = [
        Color(red: 0.969, green: 0.788, blue: 0.282), // yellow  level 1
        Color(red: 0.482, green: 0.776, blue: 0.482), // green   level 2
        Color(red: 0.427, green: 0.714, blue: 0.910), // blue    level 3
        Color(red: 0.664, green: 0.471, blue: 0.820), // purple  level 4
    ]
}

/// 难易程度阶梯图示：4 根柱子从低到高，已解组亮显，未解组淡显。
struct DifficultyStairs: View {
    /// 已解锁的 group level 集合（1-4）。
    let solvedLevels: Set<Int>
    var barWidth: CGFloat = 8
    var maxHeight: CGFloat = 26

    var body: some View {
        HStack(alignment: .bottom, spacing: 3) {
            ForEach(1...4, id: \.self) { level in
                let h = CGFloat(level) * (maxHeight / 4)
                let color = DifficultyStyle.barColors[level - 1]
                let solved = level == 1 || solvedLevels.contains(level)
                RoundedRectangle(cornerRadius: 2, style: .continuous)
                    .fill(color.opacity(solved ? 1 : 0.22))
                    .frame(width: barWidth, height: h)
                    .overlay(
                        RoundedRectangle(cornerRadius: 2, style: .continuous)
                            .strokeBorder(Color(red: 0.071, green: 0.204, blue: 0.373), lineWidth: 1.5)
                    )
                    .scaleEffect(y: solved ? 1.08 : 1, anchor: .bottom)
                    .animation(.spring(response: 0.3, dampingFraction: 0.65), value: solved)
            }
        }
        .accessibilityLabel("难易程度：\(solvedLevels.count)/4 组已解")
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    let role: ButtonRole
    var font: Font = CrayonFont.button()
    var height: CGFloat? = 56
    var cornerRadius: CGFloat = 18

    init(role: ButtonRole, font: Font = CrayonFont.button(), height: CGFloat? = 56, cornerRadius: CGFloat = 18) {
        self.role = role
        self.font = font
        self.height = height
        self.cornerRadius = cornerRadius
    }

    func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        let ink = Color(red: 0.071, green: 0.204, blue: 0.373)

        return ZStack {
            // 1. Box layer — gets the offset ink shadow (Web's `box-shadow`).
            ZStack {
                role.fill
                CrayonPaperNoise()
                    .opacity(role == .next ? 0.40 : 0.55)
            }
            .clipShape(shape)
            .overlay {
                // Outer 3px solid ink border (Web: border: 3px solid var(--ink))
                shape.strokeBorder(ink, lineWidth: 3)
            }
            .overlay {
                // Inset dashed accent border (Web: button::after).  Pushed 7pt
                // inward so the dashes never collide with the label glyphs —
                // Caveat's wide advance on CJK was previously causing the
                // dashes to thread through the empty channels between chars.
                RoundedRectangle(cornerRadius: max(cornerRadius - 8, 1), style: .continuous)
                    .strokeBorder(role.dashColor, style: StrokeStyle(lineWidth: 1, dash: [3, 3]))
                    .padding(7)
            }
            .shadow(color: ink.opacity(0.9), radius: 0, x: pressed ? 1 : 3, y: pressed ? 1 : 4)

            // 2. Label layer — no shadow, no anti-aliasing halo.
            configuration.label
                .font(font)
                .foregroundStyle(role.foreground)
                .lineLimit(1)
                .minimumScaleFactor(0.65)
                .truncationMode(.tail)
                .padding(.horizontal, 16)
                .frame(maxWidth: .infinity)
                .frame(height: height)
        }
        .offset(x: pressed ? 2 : 0, y: pressed ? 3 : 0)
        .animation(.spring(response: 0.18, dampingFraction: 0.78), value: pressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    let role: ButtonRole
    var font: Font = CrayonFont.button()
    var height: CGFloat? = 52
    var cornerRadius: CGFloat = 16

    init(role: ButtonRole, font: Font = CrayonFont.button(), height: CGFloat? = 52, cornerRadius: CGFloat = 16) {
        self.role = role
        self.font = font
        self.height = height
        self.cornerRadius = cornerRadius
    }

    func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        let ink = Color(red: 0.071, green: 0.204, blue: 0.373)

        return ZStack {
            // Box layer with offset shadow (Web's `box-shadow`).
            ZStack {
                role.fill
                CrayonPaperNoise()
                    .opacity(role == .next ? 0.40 : 0.55)
            }
            .clipShape(shape)
            .overlay { shape.strokeBorder(ink, lineWidth: 3) }
            .overlay {
                // Inset dashed accent (Web: button::after).  See PrimaryButtonStyle
                // for why the 7pt inset is important with Caveat.
                RoundedRectangle(cornerRadius: max(cornerRadius - 8, 1), style: .continuous)
                    .strokeBorder(role.dashColor, style: StrokeStyle(lineWidth: 1, dash: [3, 3]))
                    .padding(7)
            }
            .shadow(color: ink.opacity(0.9), radius: 0, x: pressed ? 1 : 3, y: pressed ? 1 : 4)

            // Label layer — no shadow so Caveat glyphs render clean.
            configuration.label
                .font(font)
                .foregroundStyle(role.foreground)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .truncationMode(.tail)
                .padding(.horizontal, 12)
                .frame(maxWidth: .infinity)
                .frame(height: height)
        }
        .offset(x: pressed ? 2 : 0, y: pressed ? 3 : 0)
        .animation(.spring(response: 0.18, dampingFraction: 0.78), value: pressed)
    }
}

/// Two-layer dot noise that mirrors Web's
/// `radial-gradient(...) 0.7px, transparent 0.8px` over the button face.
struct CrayonPaperNoise: View {
    var body: some View {
        Canvas { ctx, size in
            let step: CGFloat = 5
            let light = Color(red: 1.0, green: 1.0, blue: 1.0).opacity(0.45)
            let dark = Color(red: 0.071, green: 0.204, blue: 0.373).opacity(0.07)
            var y: CGFloat = 0
            while y < size.height {
                var x: CGFloat = 0
                while x < size.width {
                    let dot = Path(ellipseIn: CGRect(x: x, y: y, width: 0.9, height: 0.9))
                    ctx.fill(dot, with: .color(((Int(x) + Int(y)) & 1 == 0) ? dark : light))
                    x += step
                }
                y += step
            }
            // a single hairline diagonal to mimic the Web `linear-gradient(105deg,...)`
            var diag = Path()
            diag.move(to: CGPoint(x: 0, y: size.height * 0.5))
            diag.addLine(to: CGPoint(x: size.width, y: size.height * 0.5 - size.width * 0.22))
            ctx.stroke(
                diag,
                with: .color(Color(red: 0.071, green: 0.204, blue: 0.373).opacity(0.04)),
                style: StrokeStyle(lineWidth: 0.7)
            )
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

struct CrayonLanguageToggle: View {
    @Binding var locale: AppLocale
    let palette: AppPalette

    var body: some View {
        HStack(spacing: 0) {
            langButton(.zh, label: "中文")
            langButton(.en, label: "English")
        }
        .padding(4)
        .crayonCard(palette: palette, cornerRadius: 10, seed: 44, fill: palette.surface)
    }

    private func langButton(_ value: AppLocale, label: String) -> some View {
        Button {
            locale = value
            Haptics.light()
        } label: {
            Text(label)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(locale == value ? palette.ink : palette.muted)
                .frame(maxWidth: .infinity, minHeight: 40)
                .background(
                    locale == value ? palette.accentSoft : Color.clear,
                    in: RoundedRectangle(cornerRadius: 8, style: .continuous)
                )
        }
        .buttonStyle(.plain)
    }
}

struct RulesHelpPopup: View {
    let locale: AppLocale
    let palette: AppPalette
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .center) {
                NanamiCatMascot(size: .mini)
                Text(L10n.t(.rulesTitle, locale: locale))
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(palette.ink)
                Spacer(minLength: 0)
            }

            Text(L10n.t(.rulesBody, locale: locale))
                .font(.body)
                .foregroundStyle(palette.ink)
                .fixedSize(horizontal: false, vertical: true)

            VStack(alignment: .leading, spacing: 6) {
                Text(L10n.t(.rulesExampleTitle, locale: locale))
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(palette.muted)
                Text(L10n.t(.rulesExampleName, locale: locale))
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(palette.ink)
                Text(L10n.t(.rulesExampleWords, locale: locale))
                    .font(.footnote)
                    .foregroundStyle(palette.muted)
                Text(L10n.t(.rulesExampleNote, locale: locale))
                    .font(.caption.weight(.medium))
                    .foregroundStyle(palette.accent)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .crayonCard(palette: palette, cornerRadius: 12, seed: 88, fill: palette.surface.opacity(0.92))

            Button(L10n.t(.rulesClose, locale: locale), action: onDismiss)
                .buttonStyle(PrimaryButtonStyle(role: .submit, height: 48))
                .frame(maxWidth: .infinity)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(CrayonPaperBackground(palette: palette))
    }
}

struct CrayonSettingsRow: View {
    let icon: String
    let title: String
    let palette: AppPalette
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.body.weight(.medium))
                    .foregroundStyle(palette.accent)
                    .frame(width: 28)
                Text(title)
                    .font(.body)
                    .foregroundStyle(palette.ink)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(palette.muted)
            }
            .padding(.vertical, 14)
            .padding(.horizontal, 4)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Motion

enum PageMotion {
    static let entrance = Animation.spring(response: 0.45, dampingFraction: 0.84)
    static let tabSwitch = Animation.spring(response: 0.38, dampingFraction: 0.86)
    static let stagger = Animation.spring(response: 0.32, dampingFraction: 0.84)
    static let status = Animation.spring(response: 0.35, dampingFraction: 0.86)
    static let reveal = Animation.spring(response: 0.42, dampingFraction: 0.8)

    static func runEntrance(stage: Binding<Int>, total: Int, reduceMotion: Bool) {
        stage.wrappedValue = 0
        if reduceMotion {
            stage.wrappedValue = total
        } else {
            withAnimation(entrance) {
                stage.wrappedValue = total
            }
        }
    }
}

extension View {
    func shake(tick: Int, reducedMotion: Bool) -> some View {
        modifier(ShakeEffect(tick: tick, reducedMotion: reducedMotion))
    }

    func unlockCelebration(tick: Int, palette: AppPalette, reduceMotion: Bool) -> some View {
        modifier(UnlockCelebrationModifier(tick: tick, palette: palette, reduceMotion: reduceMotion))
    }

    func completionCelebration(tick: Int, palette: AppPalette, reduceMotion: Bool) -> some View {
        modifier(CompletionCelebrationModifier(tick: tick, palette: palette, reduceMotion: reduceMotion))
    }

    func tabPageMotion(isSelected: Bool, reduceMotion: Bool) -> some View {
        modifier(TabPageMotion(isSelected: isSelected, reduceMotion: reduceMotion))
    }

    func pageEntrance(stage: Int, order: Int, reduceMotion: Bool) -> some View {
        modifier(PageEntranceMotion(stage: stage, order: order, reduceMotion: reduceMotion))
    }

    func staggeredEntrance(index: Int, token: Int, reduceMotion: Bool) -> some View {
        modifier(StaggeredEntranceMotion(index: index, token: token, reduceMotion: reduceMotion))
    }

    func pulseOnTick(_ tick: Int, reduceMotion: Bool) -> some View {
        modifier(PulseOnTickMotion(tick: tick, reduceMotion: reduceMotion))
    }

    func noticeTransition(reduceMotion: Bool) -> some View {
        modifier(NoticeTransitionMotion(reduceMotion: reduceMotion))
    }
}

private struct PageEntranceMotion: ViewModifier {
    let stage: Int
    let order: Int
    let reduceMotion: Bool

    func body(content: Content) -> some View {
        let visible = stage >= order + 1
        content
            .opacity(visible ? 1 : 0)
            .offset(y: visible || reduceMotion ? 0 : 10 + CGFloat(order * 3))
            .scaleEffect(reduceMotion ? 1 : (visible ? 1 : 0.985))
    }
}

private struct StaggeredEntranceMotion: ViewModifier {
    let index: Int
    let token: Int
    let reduceMotion: Bool
    @State private var visible = false

    func body(content: Content) -> some View {
        content
            .opacity(visible ? 1 : (reduceMotion ? 1 : 0))
            .offset(y: visible ? 0 : (reduceMotion ? 0 : 6))
            .scaleEffect(visible ? 1 : (reduceMotion ? 1 : 0.98))
            .onAppear {
                visible = reduceMotion
                scheduleReveal()
            }
            .onChange(of: token) { _, _ in
                visible = reduceMotion
                scheduleReveal()
            }
    }

    private func scheduleReveal() {
        guard !reduceMotion else { return }
        let delay = 0.012 * Double(index)
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            withAnimation(PageMotion.stagger) {
                visible = true
            }
        }
    }
}

private struct PulseOnTickMotion: ViewModifier {
    let tick: Int
    let reduceMotion: Bool
    @State private var active = false

    func body(content: Content) -> some View {
        content
            .scaleEffect(active && !reduceMotion ? 1.04 : 1)
            .brightness(active && !reduceMotion ? 0.05 : 0)
            .onChange(of: tick) { _, newValue in
                guard newValue > 0, !reduceMotion else { return }
                withAnimation(.spring(response: 0.2, dampingFraction: 0.7)) {
                    active = true
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.18) {
                    withAnimation(.spring(response: 0.25, dampingFraction: 0.82)) {
                        active = false
                    }
                }
            }
    }
}

private struct NoticeTransitionMotion: ViewModifier {
    let reduceMotion: Bool

    func body(content: Content) -> some View {
        content
            .transition(reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity))
    }
}

private struct UnlockCelebrationModifier: ViewModifier {
    let tick: Int
    let palette: AppPalette
    let reduceMotion: Bool
    @State private var visible = false
    @State private var splashProgress: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .overlay {
                if visible {
                    VStack(spacing: 10) {
                        CrayonSplash(accent: palette.accent, progress: splashProgress)
                            .frame(width: 120, height: 80)
                        NanamiCatMascot(size: .celebration, showCelebration: true)
                            .scaleEffect(reduceMotion ? 1 : (0.92 + splashProgress * 0.08))
                        PawAccent(color: palette.accent, size: 18)
                            .offset(y: reduceMotion ? 0 : -4 * splashProgress)
                        Text("太棒了！")
                            .font(.headline.weight(.medium))
                            .foregroundStyle(palette.ink)
                    }
                    .padding(20)
                    .crayonCard(palette: palette, cornerRadius: 16, seed: 77, fill: palette.surface.opacity(0.96))
                    .shadow(color: palette.ink.opacity(0.08), radius: 12, y: 4)
                    .transition(reduceMotion ? .opacity : .scale(scale: 0.94).combined(with: .opacity))
                }
            }
            .onChange(of: tick) { _, newValue in
                guard newValue > 0 else { return }
                splashProgress = 0
                withAnimation(reduceMotion ? .easeInOut(duration: 0.2) : .spring(response: 0.4, dampingFraction: 0.72)) {
                    visible = true
                }
                if reduceMotion {
                    splashProgress = 1
                } else {
                    withAnimation(.spring(response: 0.55, dampingFraction: 0.66)) {
                        splashProgress = 1
                    }
                }
                Haptics.success()
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) {
                    withAnimation(.easeOut(duration: 0.25)) {
                        visible = false
                        splashProgress = 0
                    }
                }
            }
    }
}

private struct CompletionCelebrationModifier: ViewModifier {
    let tick: Int
    let palette: AppPalette
    let reduceMotion: Bool
    @State private var active = false

    func body(content: Content) -> some View {
        content
            .overlay {
                if active {
                    CrayonCelebrationParticles(
                        accent: palette.accent,
                        active: active,
                        reduceMotion: reduceMotion
                    )
                    .transition(.opacity)
                }
            }
            .onChange(of: tick) { _, newValue in
                guard newValue > 0 else { return }
                active = true
                Haptics.success()
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
                    withAnimation(.easeOut(duration: 0.3)) {
                        active = false
                    }
                }
            }
    }
}

private struct TabPageMotion: ViewModifier {
    let isSelected: Bool
    let reduceMotion: Bool
    @State private var revealed = true

    func body(content: Content) -> some View {
        content
            .opacity(revealed ? 1 : (reduceMotion ? 1 : 0.9))
            .offset(y: revealed ? 0 : (reduceMotion ? 0 : 10))
            .scaleEffect(revealed ? 1 : (reduceMotion ? 1 : 0.992))
            .onChange(of: isSelected) { _, selected in
                guard selected else { return }
                if reduceMotion {
                    revealed = true
                    return
                }
                revealed = false
                withAnimation(PageMotion.tabSwitch) {
                    revealed = true
                }
            }
            .onAppear {
                guard isSelected else { return }
                if reduceMotion {
                    revealed = true
                } else {
                    revealed = false
                    withAnimation(PageMotion.tabSwitch) {
                        revealed = true
                    }
                }
            }
    }
}

private struct ShakeEffect: ViewModifier {
    let tick: Int
    let reducedMotion: Bool
    @State private var offset: CGFloat = 0
    @State private var showCross = false

    func body(content: Content) -> some View {
        content
            .offset(x: offset)
            .overlay(alignment: .topTrailing) {
                if showCross {
                    Text("✕")
                        .font(.title2.weight(.medium))
                        .foregroundStyle(.red.opacity(0.7))
                        .rotationEffect(.degrees(-8))
                        .offset(x: 8, y: -8)
                        .transition(.opacity)
                }
            }
            .onChange(of: tick) { _, newValue in
                guard newValue > 0, !reducedMotion else { return }
                showCross = true
                withAnimation(.default) { offset = -5 }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) { offset = 5 }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.16) { offset = -3 }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.24) { offset = 0 }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                    withAnimation { showCross = false }
                }
            }
    }
}

enum Haptics {
    static func light() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    static func warning() {
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
    }

    static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
}
