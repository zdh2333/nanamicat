import SwiftUI

struct RootTabView: View {
    @EnvironmentObject private var store: UserDefaultsStore
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var selection = 0

    var body: some View {
        let palette = AppPalette.palette(for: store.theme, colorScheme: colorScheme)

        TabView(selection: $selection) {
            NavigationStack {
                GameView(store: store)
                    .toolbar(.hidden, for: .navigationBar)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .tabPageMotion(isSelected: selection == 0, reduceMotion: reduceMotion)
            .tabItem {
                Label(L10n.t(.appName, locale: store.locale), systemImage: "cat.fill")
            }
            .tag(0)

            NavigationStack {
                LeaderboardView()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .tabPageMotion(isSelected: selection == 1, reduceMotion: reduceMotion)
            .tabItem {
                Label(L10n.t(.leaderboard, locale: store.locale), systemImage: "trophy.fill")
            }
            .tag(1)

            NavigationStack {
                ContributeView()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .tabPageMotion(isSelected: selection == 2, reduceMotion: reduceMotion)
            .tabItem {
                Label(L10n.t(.contribute, locale: store.locale), systemImage: "pawprint.fill")
            }
            .tag(2)

            NavigationStack {
                SettingsView()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .tabPageMotion(isSelected: selection == 3, reduceMotion: reduceMotion)
            .tabItem {
                Label(L10n.t(.settings, locale: store.locale), systemImage: "gearshape")
            }
            .tag(3)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .tint(palette.accent)
        .animation(reduceMotion ? nil : .spring(response: 0.35, dampingFraction: 0.88), value: selection)
    }
}
