import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var store: UserDefaultsStore
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var showRules = false
    @State private var showSponsor = false
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
            SettingsSheetContent(
                palette: palette,
                reduceMotion: reduceMotion,
                entranceTotal: 1,
                navigationTitle: L10n.t(.rulesTitle, locale: store.locale),
                dismiss: { showRules = false }
            ) { stage in
                Text(L10n.t(.rulesBody, locale: store.locale))
                    .font(.body)
                    .foregroundStyle(palette.ink)
                    .pageEntrance(stage: stage, order: 0, reduceMotion: reduceMotion)
            }
        }
        .sheet(isPresented: $showSponsor) {
            SettingsSheetContent(
                palette: palette,
                reduceMotion: reduceMotion,
                entranceTotal: 2,
                navigationTitle: L10n.t(.sponsorTitle, locale: store.locale),
                dismiss: { showSponsor = false }
            ) { stage in
                VStack(spacing: 16) {
                    Text(L10n.t(.sponsorBody, locale: store.locale))
                        .font(.footnote)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(palette.muted)
                        .pageEntrance(stage: stage, order: 0, reduceMotion: reduceMotion)
                    if let image = UIImage(named: "wechat-pay") ?? loadSponsorImage() {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFit()
                            .frame(maxWidth: 280)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .overlay {
                                CrayonBorder(cornerRadius: 12, seed: 66)
                                    .stroke(palette.crayonInk.opacity(0.3), lineWidth: 2)
                            }
                            .pageEntrance(stage: stage, order: 1, reduceMotion: reduceMotion)
                    }
                }
            }
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
        VStack(spacing: 0) {
            CrayonSettingsRow(icon: "list.clipboard", title: L10n.t(.rulesTitle, locale: store.locale), palette: palette) {
                showRules = true
            }
            CrayonDottedLine(seed: 301)
                .stroke(palette.crayonInk.opacity(0.25), lineWidth: 1.5)
                .frame(height: 2)
            CrayonSettingsRow(icon: "heart", title: L10n.t(.sponsorTitle, locale: store.locale), palette: palette) {
                showSponsor = true
            }
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

    private func loadSponsorImage() -> UIImage? {
        guard let url = Bundle.main.url(forResource: "wechat-pay", withExtension: "jpg") else { return nil }
        guard let data = try? Data(contentsOf: url) else { return nil }
        return UIImage(data: data)
    }
}

private struct SettingsSheetContent<Content: View>: View {
    let palette: AppPalette
    let reduceMotion: Bool
    let entranceTotal: Int
    let navigationTitle: String
    let dismiss: () -> Void
    @ViewBuilder let content: (_ entranceStage: Int) -> Content
    @State private var entranceStage = 0

    var body: some View {
        NavigationStack {
            ScrollView {
                content(entranceStage)
                    .padding()
            }
            .background(CrayonPaperBackground(palette: palette))
            .navigationTitle(navigationTitle)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("OK", action: dismiss)
                }
            }
            .onAppear {
                PageMotion.runEntrance(stage: $entranceStage, total: entranceTotal, reduceMotion: reduceMotion)
            }
        }
    }
}
