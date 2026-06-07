import SwiftUI

struct GameView: View {
    @EnvironmentObject private var store: UserDefaultsStore
    @StateObject private var viewModel: GameViewModel
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    init(store: UserDefaultsStore) {
        _viewModel = StateObject(wrappedValue: GameViewModel(store: store))
    }

    @State private var unlockCelebrationTick = 0
    @State private var entranceStage = 0
    @State private var solvedPulseTick = 0
    @State private var boardRevealToken = 0
    @State private var completionCelebrationTick = 0
    @State private var showRules = false

    var body: some View {
        let palette = AppPalette.palette(for: store.theme, colorScheme: colorScheme)

        ZStack {
            CrayonPaperBackground(palette: palette)
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        header(palette: palette)
                            .pageEntrance(stage: entranceStage, order: 0, reduceMotion: reduceMotion)
                        statusLine(palette: palette)
                            .pageEntrance(stage: entranceStage, order: 1, reduceMotion: reduceMotion)
                        board(palette: palette)
                            .pageEntrance(stage: entranceStage, order: 2, reduceMotion: reduceMotion)
                        controls(palette: palette)
                            .pageEntrance(stage: entranceStage, order: 3, reduceMotion: reduceMotion)
                        if viewModel.isComplete {
                            if let abstract = PuzzleEngine.mostAbstractGroup(in: viewModel.puzzle) {
                                completionCard(group: abstract, palette: palette)
                                    .pageEntrance(stage: entranceStage, order: 4, reduceMotion: reduceMotion)
                            }
                            solvedSection(palette: palette)
                                .pageEntrance(stage: entranceStage, order: 5, reduceMotion: reduceMotion)
                            completionFooter(palette: palette)
                                .id("completion-footer")
                                .pageEntrance(stage: entranceStage, order: 6, reduceMotion: reduceMotion)
                        }
                    }
                    .padding(20)
                }
                .onChange(of: viewModel.isComplete) { _, complete in
                    guard complete else { return }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                        withAnimation(reduceMotion ? nil : PageMotion.reveal) {
                            proxy.scrollTo("completion-footer", anchor: .bottom)
                        }
                    }
                }
            }
        }
        .unlockCelebration(tick: unlockCelebrationTick, palette: palette, reduceMotion: reduceMotion)
        .completionCelebration(tick: completionCelebrationTick, palette: palette, reduceMotion: reduceMotion)
        .onChange(of: viewModel.solvedGroups.count) { oldCount, newCount in
            guard newCount > oldCount else { return }
            solvedPulseTick += 1
            if newCount < viewModel.puzzle.groups.count {
                unlockCelebrationTick += 1
            } else if newCount == viewModel.puzzle.groups.count {
                completionCelebrationTick += 1
            }
        }
        .onChange(of: store.locale) { _, _ in viewModel.reloadForSettingsChange() }
        .shake(tick: viewModel.mistakeShakeTick, reducedMotion: reduceMotion)
        .onAppear {
            PageMotion.runEntrance(stage: $entranceStage, total: 7, reduceMotion: reduceMotion)
            boardRevealToken += 1
            applyDebugLaunchArgs()
        }
        .onChange(of: viewModel.puzzle.id) { _, _ in
            PageMotion.runEntrance(stage: $entranceStage, total: 7, reduceMotion: reduceMotion)
            boardRevealToken += 1
        }
        .onReceive(NotificationCenter.default.publisher(for: .puzzleCatalogDidUpdate)) { _ in
            viewModel.handleCatalogUpdate()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .sheet(isPresented: $showRules) {
            RulesHelpPopup(locale: store.locale, palette: palette) {
                showRules = false
            }
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
        }
    }

    @ViewBuilder
    private func header(palette: AppPalette) -> some View {
        HStack(alignment: .top, spacing: 12) {
            NanamiCatMascot(size: .gameHeader)
                .layoutPriority(1)

            VStack(alignment: .leading, spacing: 4) {
                Text(L10n.t(.kicker, locale: store.locale))
                    .font(.caption.weight(.medium))
                    .foregroundStyle(palette.muted)
                Text(L10n.t(.appName, locale: store.locale))
                    .font(.title2.weight(.medium))
                    .foregroundStyle(palette.ink)
                    .crayonUnderline(palette: palette)
                Text(metaLine)
                    .font(.footnote)
                    .foregroundStyle(palette.muted)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
            }

            Spacer(minLength: 4)

            VStack(alignment: .trailing, spacing: 10) {
                Button {
                    showRules = true
                } label: {
                    Image(systemName: "questionmark.circle")
                        .font(.title3.weight(.medium))
                        .foregroundStyle(palette.muted)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(L10n.t(.rulesTitle, locale: store.locale))

                HStack(spacing: 6) {
                    NanamiCatMascot(size: .mini)
                    Text("\(L10n.t(.mistakes, locale: store.locale)) \(viewModel.mistakes)/\(viewModel.maxMistakes)")
                        .font(.caption.monospacedDigit().weight(.medium))
                        .foregroundStyle(viewModel.mistakes >= viewModel.maxMistakes ? .red : palette.muted)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .crayonCard(palette: palette, cornerRadius: 8, seed: 12, fill: Color(red: 0.91, green: 0.71, blue: 0.69).opacity(0.25))
                    Text("\(L10n.t(.hint, locale: store.locale)) \(store.hintBalance)")
                        .font(.caption.monospacedDigit().weight(.medium))
                        .foregroundStyle(store.hintBalance == 0 ? .red : palette.muted)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .crayonCard(palette: palette, cornerRadius: 8, seed: 13, fill: Color(red: 0.78, green: 0.86, blue: 0.94).opacity(0.35))
                }
            }
        }
    }

    private var metaLine: String {
        [
            PuzzleLocalization.puzzleLabel(viewModel.puzzle, locale: store.locale),
            PuzzleLocalization.puzzleTheme(viewModel.puzzle, locale: store.locale),
            DifficultyStyle.label(level: viewModel.puzzle.difficulty, locale: store.locale)
        ].joined(separator: " · ")
    }

    /// Honor `--demo-complete` / `--demo-solved N` launch args for screenshot QA.
    private func applyDebugLaunchArgs() {
        let args = ProcessInfo.processInfo.arguments
        if args.contains("--demo-complete") {
            viewModel.debugForceComplete()
        } else if let idx = args.firstIndex(of: "--demo-solved"),
                  idx + 1 < args.count,
                  let n = Int(args[idx + 1]) {
            viewModel.debugMarkSolvedGroups(n)
        }
    }

    @ViewBuilder
    private func solvedSection(palette: AppPalette) -> some View {
        VStack(spacing: 10) {
            ForEach(viewModel.solvedGroups) { group in
                let colors = DifficultyStyle.colors(level: group.level)
                HStack(alignment: .top, spacing: 10) {
                    NanamiCatMascot(size: .mini)
                    VStack(alignment: .leading, spacing: 6) {
                        Text(PuzzleLocalization.term(group.name, locale: store.locale))
                            .font(.subheadline.weight(.medium))
                        Text(group.items.map { PuzzleLocalization.itemLabel($0, locale: store.locale) }.joined(separator: " · "))
                            .font(.footnote)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(colors.background, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                .overlay {
                    CrayonBorder(cornerRadius: 10, seed: crayonSeed(group.id))
                        .stroke(colors.border, lineWidth: 2)
                }
                .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(reduceMotion ? nil : .spring(response: 0.45, dampingFraction: 0.82), value: viewModel.solvedGroups.count)
    }

    @ViewBuilder
    private func statusLine(palette: AppPalette) -> some View {
        HStack(alignment: .center, spacing: 10) {
            NanamiCatMascot(size: .header)
            ZStack(alignment: .leading) {
                Text(viewModel.message)
                    .id(viewModel.message)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(palette.ink)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .transition(reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity))
                    .accessibilityAddTraits(.updatesFrequently)
            }
            .animation(reduceMotion ? nil : .spring(response: 0.35, dampingFraction: 0.86), value: viewModel.message)
        }
        .accessibilityElement(children: .combine)
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .crayonCard(palette: palette, cornerRadius: 12, seed: 55)
    }

    @ViewBuilder
    private func board(palette: AppPalette) -> some View {
        GameBoardFrame(palette: palette) {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 4), spacing: 10) {
                ForEach(Array(viewModel.boardItems.enumerated()), id: \.element.id) { index, item in
                    let solved = viewModel.solvedGroups.contains { $0.items.contains(where: { $0.id == item.id }) }
                    let selected = viewModel.selectedIDs.contains(item.id)
                    Button {
                        viewModel.toggleSelection(item)
                    } label: {
                        tileContent(item: item, selected: selected, solved: solved, palette: palette)
                    }
                    .buttonStyle(.plain)
                    .disabled(solved || viewModel.isComplete)
                    .accessibilityLabel(PuzzleLocalization.itemLabel(item, locale: store.locale))
                    .accessibilityAddTraits(selected ? .isSelected : [])
                    .staggeredEntrance(index: index, token: boardRevealToken, reduceMotion: reduceMotion)
                    .transition(.scale(scale: 0.94).combined(with: .opacity))
                }
            }
            .frame(maxWidth: 390)
            .frame(maxWidth: .infinity)
            .animation(reduceMotion ? nil : PageMotion.status, value: viewModel.boardItems.map(\.id))
        }
    }

    @ViewBuilder
    private func tileContent(item: PuzzleItem, selected: Bool, solved: Bool, palette: AppPalette) -> some View {
        ZStack {
            Text(PuzzleLocalization.itemLabel(item, locale: store.locale))
                .font(.subheadline.weight(.regular))
                .multilineTextAlignment(.center)
                .minimumScaleFactor(0.7)
                .lineLimit(2)
                .padding(8)
                .frame(maxWidth: .infinity, minHeight: 72)
            .frame(maxWidth: .infinity)
            .background(selected ? palette.accentSoft : palette.surface, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay {
                CrayonBorder(cornerRadius: 10, seed: crayonSeed(item.id))
                    .stroke(selected ? palette.accent : palette.crayonInk.opacity(0.45), lineWidth: selected ? 2.5 : 2)
            }

            if selected {
                CrayonSmearBackground(color: palette.accent)
                CrayonCircle(seed: crayonSeed(item.id, offset: 7))
                    .stroke(palette.accent, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                    .padding(3)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .opacity(solved ? 0.35 : 1)
        .scaleEffect(selected && !reduceMotion ? 1.05 : 1)
        .rotationEffect(.degrees(selected && !reduceMotion ? -0.45 : 0))
        .animation(reduceMotion ? nil : .spring(response: 0.25, dampingFraction: 0.72), value: selected)
    }

    @ViewBuilder
    private func controls(palette: AppPalette) -> some View {
        VStack(spacing: 12) {
            if !viewModel.notice.isEmpty {
                Text(viewModel.notice)
                    .font(.footnote)
                    .foregroundStyle(palette.muted)
                    .noticeTransition(reduceMotion: reduceMotion)
            }

            if viewModel.isComplete {
                EmptyView()
            } else {
                HStack(alignment: .top, spacing: 10) {
                    Button(L10n.t(.submit, locale: store.locale)) { viewModel.submitGuess() }
                        .buttonStyle(PrimaryButtonStyle(role: .submit, font: CrayonFont.buttonLarge(24), height: 112, cornerRadius: 20))
                        .frame(height: 112)
                        .frame(maxWidth: .infinity)
                        .pulseOnTick(solvedPulseTick, reduceMotion: reduceMotion)

                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
                        Button {
                            viewModel.useHint()
                        } label: {
                            HStack(spacing: 4) {
                                Text(L10n.t(.hint, locale: store.locale))
                                    .lineLimit(1)
                                Text("·\(store.hintBalance)")
                                    .lineLimit(1)
                                    .monospacedDigit()
                            }
                        }
                        .buttonStyle(SecondaryButtonStyle(role: .hint, height: 52))
                        .frame(height: 52)
                        .disabled(store.hintBalance == 0)
                        Button(L10n.t(.shuffle, locale: store.locale)) { viewModel.shuffleBoard() }
                            .buttonStyle(SecondaryButtonStyle(role: .shuffle, height: 52))
                            .frame(height: 52)
                        Button(L10n.t(.clear, locale: store.locale)) { viewModel.clearSelection() }
                            .buttonStyle(SecondaryButtonStyle(role: .cancel, height: 52))
                            .frame(height: 52)
                        Button(L10n.t(.next, locale: store.locale)) { viewModel.nextPuzzle() }
                            .buttonStyle(SecondaryButtonStyle(role: .next, height: 52))
                            .frame(height: 52)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .animation(reduceMotion ? nil : PageMotion.status, value: viewModel.isComplete)
        .animation(reduceMotion ? nil : PageMotion.status, value: viewModel.notice)
    }

    @ViewBuilder
    private func completionFooter(palette: AppPalette) -> some View {
        VStack(spacing: 10) {
            Button(L10n.t(.nextAfterComplete, locale: store.locale)) { viewModel.nextPuzzle() }
                .buttonStyle(PrimaryButtonStyle(role: .submit, font: CrayonFont.buttonLarge(22), height: 60))
                .frame(maxWidth: .infinity, minHeight: 60)

            ShareLink(item: viewModel.shareText()) {
                Text(L10n.t(.share, locale: store.locale))
                    .frame(maxWidth: .infinity, minHeight: 48)
            }
            .buttonStyle(SecondaryButtonStyle(role: .next, height: 48))
        }
        .padding(.top, 4)
    }

    @ViewBuilder
    private func completionCard(group: PuzzleGroup, palette: AppPalette) -> some View {
        let colors = DifficultyStyle.colors(level: group.level)
        HStack(alignment: .top, spacing: 12) {
            NanamiCatMascot(size: .celebration, showCelebration: true)
            VStack(alignment: .leading, spacing: 8) {
                Text(L10n.t(.abstractTitle, locale: store.locale))
                    .font(.headline.weight(.medium))
                Text(PuzzleLocalization.term(group.name, locale: store.locale))
                    .font(.title3.weight(.medium))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(colors.background, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            CrayonBorder(cornerRadius: 14, seed: 88)
                .stroke(colors.border, lineWidth: 2.5)
        }
        .transition(reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity))
        .animation(reduceMotion ? nil : PageMotion.reveal, value: viewModel.isComplete)
    }
}
