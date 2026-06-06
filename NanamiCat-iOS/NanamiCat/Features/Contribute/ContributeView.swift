import SwiftUI

struct ContributeView: View {
    @EnvironmentObject private var store: UserDefaultsStore
    @StateObject private var viewModel = ContributeViewModel()
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var entranceStage = 0

    private var entranceTotal: Int { 2 + viewModel.groups.count + 2 }

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

                    ForEach(Array(viewModel.groups.enumerated()), id: \.element.id) { index, group in
                        groupCard(index: index, groupID: group.id, palette: palette)
                            .pageEntrance(stage: entranceStage, order: 2 + index, reduceMotion: reduceMotion)
                    }

                    if viewModel.groups.count < ContributeViewModel.maxGroups {
                        Button(L10n.t(.addGroup, locale: store.locale)) {
                            viewModel.addGroup()
                        }
                        .buttonStyle(SecondaryButtonStyle(palette: palette))
                        .frame(maxWidth: .infinity)
                        .pageEntrance(stage: entranceStage, order: 2 + viewModel.groups.count, reduceMotion: reduceMotion)
                    }

                    Button(L10n.t(.savePuzzle, locale: store.locale)) {
                        Task { await viewModel.submit(store: store) }
                    }
                    .buttonStyle(PrimaryButtonStyle(accent: palette.accent, palette: palette))
                    .frame(maxWidth: .infinity)
                    .pageEntrance(stage: entranceStage, order: 3 + viewModel.groups.count, reduceMotion: reduceMotion)

                    if !viewModel.notice.isEmpty {
                        Text(viewModel.notice)
                            .font(.footnote)
                            .foregroundStyle(palette.muted)
                            .noticeTransition(reduceMotion: reduceMotion)
                            .pageEntrance(stage: entranceStage, order: 4 + viewModel.groups.count, reduceMotion: reduceMotion)
                    }
                }
                .padding(20)
                .animation(reduceMotion ? nil : PageMotion.status, value: viewModel.notice)
                .animation(reduceMotion ? nil : PageMotion.status, value: viewModel.groups.count)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { triggerEntrance() }
        .onChange(of: store.locale) { _, _ in triggerEntrance() }
        .onChange(of: viewModel.groups.count) { _, _ in triggerEntrance() }
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
            TextField(L10n.t(.playerName, locale: store.locale), text: $store.nickname)
                .onChange(of: store.nickname) { _, newValue in
                    if newValue.count > 24 {
                        store.nickname = String(newValue.prefix(24))
                    }
                }
                .font(.body)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(palette.surface.opacity(0.95), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
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
                .background(palette.surface.opacity(0.95), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(palette.muted.opacity(0.25), lineWidth: 1)
                }
        }
        .padding(16)
        .crayonCard(palette: palette, cornerRadius: 14, seed: 401)
    }

    @ViewBuilder
    private func groupCard(index: Int, groupID: UUID, palette: AppPalette) -> some View {
        let binding = Binding(
            get: {
                viewModel.groups.first(where: { $0.id == groupID }) ?? ContributeViewModel.DraftGroup()
            },
            set: { updated in
                guard let slot = viewModel.groups.firstIndex(where: { $0.id == groupID }) else { return }
                viewModel.groups[slot] = updated
            }
        )

        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("\(L10n.t(.groupName, locale: store.locale)) \(index + 1)")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(palette.ink)
                Spacer()
                if viewModel.groups.count > 1 {
                    Button(L10n.t(.removeGroup, locale: store.locale)) {
                        viewModel.removeGroup(id: groupID)
                    }
                    .font(.caption.weight(.medium))
                    .foregroundStyle(palette.muted)
                }
            }
            TextField(L10n.t(.groupName, locale: store.locale), text: Binding(
                get: { binding.wrappedValue.name },
                set: { newValue in
                    var updated = binding.wrappedValue
                    updated.name = newValue
                    binding.wrappedValue = updated
                }
            ))
                .font(.body)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(palette.surface.opacity(0.95), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(palette.muted.opacity(0.25), lineWidth: 1)
                }
            TextField(L10n.t(.wordsPlaceholder, locale: store.locale), text: Binding(
                get: { binding.wrappedValue.words },
                set: { newValue in
                    var updated = binding.wrappedValue
                    updated.words = newValue
                    binding.wrappedValue = updated
                }
            ), axis: .vertical)
                .lineLimit(2...4)
                .font(.body)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(palette.surface.opacity(0.95), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(palette.muted.opacity(0.25), lineWidth: 1)
                }
        }
        .padding(16)
        .crayonCard(palette: palette, cornerRadius: 14, seed: UInt64(410 + index))
    }
}
