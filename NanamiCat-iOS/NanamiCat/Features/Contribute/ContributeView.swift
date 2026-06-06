import SwiftUI

struct ContributeView: View {
    @EnvironmentObject private var store: UserDefaultsStore
    @StateObject private var viewModel = ContributeViewModel()
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var entranceStage = 0

    private let entranceTotal = 8

    var body: some View {
        let palette = AppPalette.palette(for: store.theme, colorScheme: colorScheme)

        ZStack {
            CrayonPaperBackground(palette: palette)
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HStack(spacing: 10) {
                        Text(L10n.t(.contribute, locale: store.locale))
                            .font(.largeTitle.weight(.medium))
                            .foregroundStyle(palette.ink)
                        NanamiCatMascot(size: .header)
                    }
                    .crayonUnderline(palette: palette)
                    .padding(.bottom, 4)
                    .pageEntrance(stage: entranceStage, order: 0, reduceMotion: reduceMotion)

                    introCard(palette: palette)
                        .pageEntrance(stage: entranceStage, order: 1, reduceMotion: reduceMotion)

                    ForEach(0..<4, id: \.self) { index in
                        groupCard(index: index, palette: palette)
                            .pageEntrance(stage: entranceStage, order: 2 + index, reduceMotion: reduceMotion)
                    }

                    Button(L10n.t(.savePuzzle, locale: store.locale)) {
                        Task { await viewModel.submit(store: store) }
                    }
                    .buttonStyle(PrimaryButtonStyle(accent: palette.accent, palette: palette))
                    .frame(maxWidth: .infinity)
                    .pageEntrance(stage: entranceStage, order: 6, reduceMotion: reduceMotion)

                    if !viewModel.notice.isEmpty {
                        Text(viewModel.notice)
                            .font(.footnote)
                            .foregroundStyle(palette.muted)
                            .noticeTransition(reduceMotion: reduceMotion)
                            .pageEntrance(stage: entranceStage, order: 7, reduceMotion: reduceMotion)
                    }
                }
                .padding(20)
                .animation(reduceMotion ? nil : PageMotion.status, value: viewModel.notice)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { triggerEntrance() }
        .onChange(of: store.locale) { _, _ in triggerEntrance() }
    }

    private func triggerEntrance() {
        PageMotion.runEntrance(stage: $entranceStage, total: entranceTotal, reduceMotion: reduceMotion)
    }

    @ViewBuilder
    private func introCard(palette: AppPalette) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                NanamiCatMascot(size: .mini)
                Text(L10n.t(.contributeLead, locale: store.locale))
                    .font(.footnote)
                    .foregroundStyle(palette.muted)
            }
            TextField(L10n.t(.puzzleTitle, locale: store.locale), text: $viewModel.title)
                .font(.body)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color.white.opacity(0.9), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(palette.muted.opacity(0.25), lineWidth: 1)
                }
            TextField(L10n.t(.contactEmail, locale: store.locale), text: $viewModel.email)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
                .font(.body)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color.white.opacity(0.9), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(palette.muted.opacity(0.25), lineWidth: 1)
                }
        }
        .padding(16)
        .crayonCard(palette: palette, cornerRadius: 14, seed: 401)
    }

    @ViewBuilder
    private func groupCard(index: Int, palette: AppPalette) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("\(L10n.t(.groupName, locale: store.locale)) \(index + 1)")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(palette.ink)
            TextField(L10n.t(.groupName, locale: store.locale), text: $viewModel.groups[index].name)
                .font(.body)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color.white.opacity(0.9), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(palette.muted.opacity(0.25), lineWidth: 1)
                }
            TextField(L10n.t(.wordsPlaceholder, locale: store.locale), text: $viewModel.groups[index].words, axis: .vertical)
                .lineLimit(2...4)
                .font(.body)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color.white.opacity(0.9), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(palette.muted.opacity(0.25), lineWidth: 1)
                }
        }
        .padding(16)
        .crayonCard(palette: palette, cornerRadius: 14, seed: UInt64(410 + index))
    }
}
