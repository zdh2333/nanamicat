import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var store: UserDefaultsStore
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var showRules = false
    @State private var entranceStage = 0

    private let entranceTotal = 5

    var body: some View {
        let palette = AppPalette.palette(for: store.theme, colorScheme: colorScheme)

        ZStack {
            CrayonPaperBackground(palette: palette)
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    HStack(spacing: 8) {
                        NanamiCatMascot(size: .header)
                        Text(L10n.t(.settings, locale: store.locale))
                            .font(.largeTitle.weight(.medium))
                            .foregroundStyle(palette.ink)
                    }
                    .crayonUnderline(palette: palette)
                    .padding(.bottom, 4)
                    .pageEntrance(stage: entranceStage, order: 0, reduceMotion: reduceMotion)

                    languageSection(palette: palette)
                        .pageEntrance(stage: entranceStage, order: 1, reduceMotion: reduceMotion)
                    themeSection(palette: palette)
                        .pageEntrance(stage: entranceStage, order: 2, reduceMotion: reduceMotion)
                    actionsSection(palette: palette)
                        .pageEntrance(stage: entranceStage, order: 3, reduceMotion: reduceMotion)
                    linkSection(palette: palette)
                        .pageEntrance(stage: entranceStage, order: 4, reduceMotion: reduceMotion)
                }
                .padding(20)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { triggerEntrance() }
        .onChange(of: store.locale) { _, _ in triggerEntrance() }
        .sheet(isPresented: $showRules) {
            RulesHelpPopup(locale: store.locale, palette: palette) {
                showRules = false
            }
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
        }
    }

    private func triggerEntrance() {
        PageMotion.runEntrance(stage: $entranceStage, total: entranceTotal, reduceMotion: reduceMotion)
    }

    @ViewBuilder
    private func languageSection(palette: AppPalette) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(L10n.t(.language, locale: store.locale))
                .font(.headline.weight(.medium))
                .foregroundStyle(palette.ink)
            CrayonLanguageToggle(locale: $store.locale, palette: palette)
        }
        .padding(16)
        .crayonCard(palette: palette, cornerRadius: 14, seed: 201)
    }

    @ViewBuilder
    private func themeSection(palette: AppPalette) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(L10n.t(.theme, locale: store.locale))
                    .font(.headline.weight(.medium))
                    .foregroundStyle(palette.ink)
                Spacer()
                NanamiCatMascot(size: .mini)
            }
            MorandiThemePicker(selection: $store.theme, locale: store.locale, palette: palette)
            Text(L10n.t(.themeFooter, locale: store.locale))
                .font(.footnote)
                .foregroundStyle(palette.muted)
        }
        .padding(16)
        .crayonCard(palette: palette, cornerRadius: 14, seed: 202)
    }

    @ViewBuilder
    private func actionsSection(palette: AppPalette) -> some View {
        CrayonSettingsRow(icon: "list.clipboard", title: L10n.t(.rulesTitle, locale: store.locale), palette: palette) {
            showRules = true
        }
        .padding(.horizontal, 12)
        .crayonCard(palette: palette, cornerRadius: 14, seed: 203)
    }

    @ViewBuilder
    private func linkSection(palette: AppPalette) -> some View {
        Link(destination: URL(string: "https://nanamicat.com")!) {
            HStack(spacing: 12) {
                Image(systemName: "link")
                    .font(.body.weight(.medium))
                    .foregroundStyle(palette.accent)
                    .frame(width: 28)
                Text("nanamicat.com")
                    .font(.body)
                    .foregroundStyle(palette.ink)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(palette.muted)
            }
            .padding(.vertical, 14)
            .padding(.horizontal, 16)
        }
        .crayonCard(palette: palette, cornerRadius: 14, seed: 204)
    }
}
