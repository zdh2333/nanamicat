import SwiftUI

/// 冷启动入口：系统 Launch Screen（纯色）→ 品牌开屏 →（未来）第三方开屏广告 → 主界面。
struct SplashGateView: View {
    @EnvironmentObject private var store: UserDefaultsStore
    @StateObject private var splashCoordinator = SplashAdCoordinator()

    var body: some View {
        ZStack {
            // 主界面始终挂载并占满屏幕，避免开屏结束后再插入 TabView 导致整页被压成卡片。
            RootTabView()

            if splashCoordinator.phase == .presenting {
                SplashScreenView()
                    .zIndex(1)
                    .transition(.opacity)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .animation(.easeOut(duration: 0.35), value: splashCoordinator.phase)
        .task {
            await splashCoordinator.start()
        }
    }
}

/// 与 Launch Screen 视觉一致的品牌开屏（项目吉祥物 + 文案 + Morandi 纸纹底）。
struct SplashScreenView: View {
    @EnvironmentObject private var store: UserDefaultsStore
    @Environment(\.colorScheme) private var colorScheme

    /// 开屏固定使用默认锌雾灰，避免与用户主题切换产生闪烁。
    private var palette: AppPalette {
        AppPalette.palette(for: .zincMist, colorScheme: colorScheme)
    }

    var body: some View {
        ZStack {
            CrayonPaperBackground(palette: palette)

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: 20) {
                    PuzzleBrandMark(palette: palette)

                    NanamiCatMascot(size: .celebration)
                        .accessibilityHidden(true)

                    VStack(spacing: 10) {
                        Text(L10n.t(.appName, locale: store.locale))
                            .font(.system(size: 34, weight: .medium, design: .rounded))
                            .foregroundStyle(palette.ink)
                            .tracking(0.5)

                        Text(L10n.t(.kicker, locale: store.locale))
                            .font(.subheadline.weight(.regular))
                            .foregroundStyle(palette.muted)
                            .tracking(1.2)
                    }
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel("\(L10n.t(.appName, locale: store.locale)), \(L10n.t(.kicker, locale: store.locale))")

                Spacer()
                Spacer(minLength: 48)
            }
            .padding(.horizontal, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .ignoresSafeArea()
    }
}

private struct PuzzleBrandMark: View {
    let palette: AppPalette
    private let colors = [
        Color(red: 0.969, green: 0.788, blue: 0.282),
        Color(red: 0.482, green: 0.776, blue: 0.482),
        Color(red: 0.427, green: 0.714, blue: 0.910),
        Color(red: 0.718, green: 0.533, blue: 0.839)
    ]

    var body: some View {
        LazyVGrid(columns: [GridItem(.fixed(24), spacing: 3), GridItem(.fixed(24), spacing: 3)], spacing: 3) {
            ForEach(colors.indices, id: \.self) { index in
                RoundedRectangle(cornerRadius: 5, style: .continuous)
                    .fill(colors[index])
                    .frame(width: 24, height: 24)
                    .overlay {
                        CrayonBorder(cornerRadius: 5, jitter: 0.7, seed: UInt64(100 + index))
                            .stroke(palette.crayonInk, lineWidth: 2)
                    }
            }
        }
        .padding(8)
        .background(palette.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .shadow(color: palette.crayonInk.opacity(0.9), radius: 0, x: 3, y: 4)
        .rotationEffect(.degrees(-2))
        .accessibilityHidden(true)
    }
}

#if DEBUG
#Preview("Splash") {
    SplashScreenView()
        .environmentObject(UserDefaultsStore())
}
#endif
