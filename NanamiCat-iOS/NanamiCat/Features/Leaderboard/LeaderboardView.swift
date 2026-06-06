import SwiftUI

struct LeaderboardView: View {
    @EnvironmentObject private var store: UserDefaultsStore
    @StateObject private var viewModel = LeaderboardViewModel()
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var entranceStage = 0
    @State private var listRevealToken = 0

    private let entranceTotal = 4

    var body: some View {
        let palette = AppPalette.palette(for: store.theme, colorScheme: colorScheme)

        ZStack {
            CrayonPaperBackground(palette: palette)
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    titleSection(palette: palette)
                        .pageEntrance(stage: entranceStage, order: 0, reduceMotion: reduceMotion)
                    nicknameCard(palette: palette)
                        .pageEntrance(stage: entranceStage, order: 1, reduceMotion: reduceMotion)

                    if viewModel.entries.isEmpty {
                        emptyCard(palette: palette)
                            .pageEntrance(stage: entranceStage, order: 2, reduceMotion: reduceMotion)
                    } else {
                        scoresSection(palette: palette)
                            .pageEntrance(stage: entranceStage, order: 2, reduceMotion: reduceMotion)
                    }

                    if !viewModel.notice.isEmpty {
                        Text(viewModel.notice)
                            .font(.footnote)
                            .foregroundStyle(palette.muted)
                            .noticeTransition(reduceMotion: reduceMotion)
                            .pageEntrance(stage: entranceStage, order: 3, reduceMotion: reduceMotion)
                    }
                }
                .padding(20)
                .animation(reduceMotion ? nil : PageMotion.status, value: viewModel.notice)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await viewModel.load() }
        .task { await viewModel.load() }
        .onAppear { triggerEntrance() }
        .onChange(of: store.locale) { _, _ in triggerEntrance() }
        .onChange(of: viewModel.entries.count) { _, _ in listRevealToken += 1 }
    }

    private func triggerEntrance() {
        PageMotion.runEntrance(stage: $entranceStage, total: entranceTotal, reduceMotion: reduceMotion)
        listRevealToken += 1
    }

    @ViewBuilder
    private func titleSection(palette: AppPalette) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                NanamiCatMascot(size: .header)
                Text(L10n.t(.leaderboard, locale: store.locale))
                    .font(.largeTitle.weight(.medium))
                    .foregroundStyle(palette.ink)
                CrayonTitleDecorations(palette: palette)
            }
            Text(L10n.t(.leaderboardLead, locale: store.locale))
                .font(.footnote)
                .foregroundStyle(palette.muted)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    @ViewBuilder
    private func nicknameCard(palette: AppPalette) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            TextField(L10n.t(.playerName, locale: store.locale), text: $store.nickname)
                .font(.body)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color.white.opacity(0.9), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(palette.muted.opacity(0.25), lineWidth: 1)
                }

            Button(L10n.t(.saveName, locale: store.locale)) {
                Task { await viewModel.saveNickname(store: store) }
            }
            .buttonStyle(PrimaryButtonStyle(accent: palette.accent, palette: palette))
            .frame(maxWidth: .infinity)
        }
        .padding(16)
        .crayonCard(palette: palette, cornerRadius: 14, seed: 101, fill: palette.surface.opacity(0.92))
        .overlay {
            CrayonBorder(cornerRadius: 14, seed: 101)
                .stroke(palette.accent.opacity(0.55), lineWidth: 2.5)
        }
    }

    @ViewBuilder
    private func emptyCard(palette: AppPalette) -> some View {
        VStack(spacing: 14) {
            NanamiCatMascot(size: .empty)
            Text(L10n.t(.emptyLeaderboard, locale: store.locale))
                .font(.subheadline)
                .foregroundStyle(palette.muted)
                .multilineTextAlignment(.center)
            CrayonSplash(accent: palette.secondary.opacity(0.7))
                .frame(height: 40)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 28)
        .padding(.horizontal, 16)
        .crayonCard(palette: palette, cornerRadius: 14, seed: 102, fill: palette.surface.opacity(0.88))
        .overlay {
            CrayonBorder(cornerRadius: 14, seed: 102)
                .stroke(palette.secondary.opacity(0.55), lineWidth: 2.5)
        }
    }

    @ViewBuilder
    private func scoresSection(palette: AppPalette) -> some View {
        VStack(spacing: 0) {
            HStack {
                Text(L10n.t(.playerName, locale: store.locale))
                    .font(.caption.weight(.medium))
                    .foregroundStyle(palette.muted)
                Spacer()
                Text(L10n.t(.totalScore, locale: store.locale))
                    .font(.caption.weight(.medium))
                    .foregroundStyle(palette.muted)
            }
            .padding(.horizontal, 4)
            .padding(.bottom, 8)

            ForEach(Array(viewModel.entries.enumerated()), id: \.element.id) { index, entry in
                HStack {
                    Text("\(index + 1)")
                        .font(.caption.monospacedDigit().weight(.medium))
                        .frame(width: 24)
                        .foregroundStyle(palette.muted)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(entry.nickname).font(.body.weight(.medium))
                        Text("\(L10n.t(.textClears, locale: store.locale)) \(entry.textClears)")
                            .font(.caption)
                            .foregroundStyle(palette.muted)
                    }
                    Spacer()
                    Text("\(entry.totalScore)")
                        .font(.headline.monospacedDigit().weight(.medium))
                }
                .padding(.vertical, 12)
                .padding(.horizontal, 4)
                .staggeredEntrance(index: index, token: listRevealToken, reduceMotion: reduceMotion)
                if index < viewModel.entries.count - 1 {
                    CrayonDottedLine(seed: UInt64(index))
                        .stroke(palette.crayonInk.opacity(0.2), lineWidth: 1.5)
                        .frame(height: 2)
                }
            }
        }
        .padding(16)
        .crayonCard(palette: palette, cornerRadius: 14, seed: 103)
    }
}
