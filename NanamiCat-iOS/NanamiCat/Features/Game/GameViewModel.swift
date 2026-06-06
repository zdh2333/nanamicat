import Foundation
import UIKit

@MainActor
final class GameViewModel: ObservableObject {
    @Published private(set) var puzzle: Puzzle
    @Published private(set) var boardItems: [PuzzleItem] = []
    @Published var selectedIDs: Set<String> = []
    @Published private(set) var solvedGroups: [PuzzleGroup] = []
    @Published var mistakes = 0
    @Published var mistakeShakeTick = 0
    @Published var message = ""
    @Published var notice = ""
    @Published private(set) var isComplete = false
    @Published var hintIndex = 0

    private let store: UserDefaultsStore
    private var textIndex: Int

    var maxMistakes: Int { PuzzleCatalog.shared.maxMistakes }

    init(store: UserDefaultsStore) {
        self.store = store
        let textPool = PuzzleCatalog.textPuzzles
        let preferred = PuzzleEngine.todayIndex(count: textPool.count)
        
        let textIndex = Self.calcNextUnplayedIndex(startingAt: preferred, in: textPool, store: store)
        self.textIndex = textIndex
        self.puzzle = Self.puzzle(at: textIndex, in: textPool)
        
        self.boardItems = PuzzleEngine.shuffleItems(PuzzleEngine.allItems(in: self.puzzle))
        self.message = L10n.t(.intro, locale: store.locale)
    }

    private static func puzzle(at index: Int, in pool: [Puzzle]) -> Puzzle {
        guard !pool.isEmpty else {
            return Puzzle(
                id: "fallback",
                label: "文字题 1",
                theme: "默认",
                type: .text,
                difficulty: 1,
                redHerring: "",
                groups: []
            )
        }
        return pool[index % pool.count]
    }

    func reloadForSettingsChange() {
        loadPuzzle()
    }

    private func loadPuzzle() {
        let pool = PuzzleCatalog.textPuzzles
        puzzle = Self.puzzle(at: textIndex, in: pool)
        resetRound()
        message = L10n.t(.intro, locale: store.locale)
    }

    func toggleSelection(_ item: PuzzleItem) {
        guard !isComplete, !solvedGroups.contains(where: { $0.items.contains(where: { $0.id == item.id }) }) else { return }
        if selectedIDs.contains(item.id) {
            selectedIDs.remove(item.id)
        } else if selectedIDs.count < 4 {
            selectedIDs.insert(item.id)
            Haptics.light()
        }
    }

    func clearSelection() {
        selectedIDs.removeAll()
        message = store.locale == .zh ? "已取消当前选择。" : "Selection cleared."
    }

    func submitGuess() {
        guard selectedIDs.count == 4 else {
            message = L10n.t(.chooseFour, locale: store.locale)
            return
        }

        if let matched = puzzle.groups.first(where: { group in
            !solvedGroups.contains(where: { $0.name == group.name }) &&
            Set(group.items.map(\.id)) == selectedIDs
        }) {
            solvedGroups.append(matched)
            selectedIDs.removeAll()
            if solvedGroups.count == puzzle.groups.count {
                isComplete = true
                message = L10n.t(.complete, locale: store.locale)
                Haptics.success()
                Task { await submitScoreIfPossible() }
            } else {
                message = store.locale == .zh ? "答对一组：\(matched.name)" : "Correct group: \(PuzzleLocalization.term(matched.name, locale: store.locale))"
                Haptics.success()
            }
            return
        }

        mistakes += 1
        message = mistakes >= maxMistakes ? L10n.t(.out, locale: store.locale) : nearMissMessage()
        if message == L10n.t(.wrong, locale: store.locale) {
            mistakeShakeTick += 1
        }
        Haptics.warning()
    }

    func useHint() {
        let unsolved = puzzle.groups.filter { group in !solvedGroups.contains(where: { $0.name == group.name }) }
        guard !unsolved.isEmpty else { return }
        let group = unsolved[hintIndex % unsolved.count]
        hintIndex += 1
        let name = PuzzleLocalization.term(group.name, locale: store.locale)
        if store.locale == .zh {
            message = "提示：有一组与「\(name)」有关。\(puzzle.redHerring)"
        } else {
            message = "Hint: one group relates to \"\(name)\". \(puzzle.redHerring)"
        }
    }

    func shuffleBoard() {
        let solvedIDs = Set(solvedGroups.flatMap { $0.items.map(\.id) })
        let unsolvedItems = boardItems.filter { !solvedIDs.contains($0.id) }
        let solvedItems = boardItems.filter { solvedIDs.contains($0.id) }
        boardItems = PuzzleEngine.shuffleItems(unsolvedItems) + solvedItems

        // 保留当前选择状态，只移除任何不在当前棋盘里的异常 id
        let boardIDs = Set(boardItems.map(\.id))
        selectedIDs = selectedIDs.intersection(boardIDs)

        message = store.locale == .zh ? "已打乱未解锁项目。" : "Unsolved items shuffled."
    }

    func nextPuzzle() {
        let pool = PuzzleCatalog.textPuzzles
        guard !pool.isEmpty else { return }
        advanceToNextUnplayed(startingAt: textIndex + 1, in: pool)
        resetRound()
        message = L10n.t(.intro, locale: store.locale)
    }

    func shareText() -> String {
        let abstract = PuzzleEngine.mostAbstractGroup(in: puzzle).map { PuzzleLocalization.term($0.name, locale: store.locale) } ?? "-"
        return """
        \(L10n.t(.appName, locale: store.locale)) \(PuzzleLocalization.puzzleLabel(puzzle, locale: store.locale))
        \(solvedGroups.count)/4
        \(L10n.t(.mistakes, locale: store.locale)): \(mistakes)
        \(L10n.t(.abstractTitle, locale: store.locale)): \(abstract)
        https://nanamicat.com
        """
    }

    private func nearMissMessage() -> String {
        let counts = puzzle.groups.map { group -> (String, Int) in
            let count = group.items.filter { selectedIDs.contains($0.id) }.count
            return (PuzzleLocalization.term(group.name, locale: store.locale), count)
        }.sorted { $0.1 > $1.1 }

        if counts.first?.1 == 3, let name = counts.first?.0 {
            return store.locale == .zh
                ? "红鲱鱼出现：你摸到了「\(name)」的边，但有一个项目在误导你。"
                : "Red herring: you are close to \"\(name)\", but one item is pulling you away."
        }
        return L10n.t(.wrong, locale: store.locale)
    }

    private func submitScoreIfPossible() async {
        let trimmed = store.nickname.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            notice = L10n.t(.needsName, locale: store.locale)
            return
        }
        do {
            let player = try await APIClient.shared.registerPlayer(nickname: trimmed, playerId: store.playerId.nilIfEmpty)
            store.playerId = player.id
            store.nickname = player.nickname
            try await APIClient.shared.submitScore(
                playerId: player.id,
                nickname: player.nickname,
                mode: puzzle.type,
                puzzleId: puzzle.id
            )
            notice = L10n.t(.savedScore, locale: store.locale)
        } catch {
            notice = error.localizedDescription
        }
    }

    private func resetRound() {
        solvedGroups = []
        selectedIDs = []
        mistakes = 0
        mistakeShakeTick = 0
        isComplete = false
        hintIndex = 0
        resetBoard()
    }

    private func resetBoard() {
        boardItems = PuzzleEngine.shuffleItems(PuzzleEngine.allItems(in: puzzle))
    }

    func markCurrentPuzzleAsPlayed() {
        let pool = PuzzleCatalog.textPuzzles
        guard !pool.isEmpty else { return }
        
        var played = normalizedPlayedSet(in: pool)
        played.insert(puzzle.id)
        store.playedPuzzleIDs = Array(played)
    }

    private static func calcNextUnplayedIndex(startingAt preferred: Int, in pool: [Puzzle], store: UserDefaultsStore) -> Int {
        guard !pool.isEmpty else { return 0 }
        
        let validIDs = Set(pool.map(\.id))
        var played = Set(store.playedPuzzleIDs.filter { validIDs.contains($0) })
        if played.count >= pool.count {
            played.removeAll()
        }
        
        let unplayedIndexes = pool.indices.filter { !played.contains(pool[$0].id) }
        let candidateIndexes = unplayedIndexes.isEmpty ? Array(pool.indices) : unplayedIndexes

        let preferredIndex = ((preferred % pool.count) + pool.count) % pool.count
        let nextIndex = candidateIndexes.first(where: { $0 >= preferredIndex }) ?? candidateIndexes[0]
        
        return nextIndex
    }

    private func advanceToNextUnplayed(startingAt preferred: Int, in pool: [Puzzle]) {
        guard !pool.isEmpty else { return }

        var played = normalizedPlayedSet(in: pool)
        let unplayedIndexes = pool.indices.filter { !played.contains(pool[$0].id) }
        let candidateIndexes = unplayedIndexes.isEmpty ? Array(pool.indices) : unplayedIndexes

        let preferredIndex = ((preferred % pool.count) + pool.count) % pool.count
        let nextIndex = candidateIndexes.first(where: { $0 >= preferredIndex }) ?? candidateIndexes[0]

        textIndex = nextIndex
        puzzle = pool[nextIndex]
        played.insert(puzzle.id)
        store.playedPuzzleIDs = Array(played)
    }

    private func normalizedPlayedSet(in pool: [Puzzle]) -> Set<String> {
        let validIDs = Set(pool.map(\.id))
        var played = Set(store.playedPuzzleIDs.filter { validIDs.contains($0) })
        if played.count >= pool.count {
            played.removeAll()
        }
        if played.count != store.playedPuzzleIDs.count {
            store.playedPuzzleIDs = Array(played)
        }
        return played
    }
}

private extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}

@MainActor
final class LeaderboardViewModel: ObservableObject {
    @Published var entries: [LeaderboardEntry] = []
    @Published var notice = ""
    @Published var isLoading = false

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            entries = try await APIClient.shared.fetchLeaderboard()
        } catch {
            notice = error.localizedDescription
        }
    }

    func saveNickname(store: UserDefaultsStore) async {
        let trimmed = store.nickname.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        do {
            let player = try await APIClient.shared.registerPlayer(nickname: trimmed, playerId: store.playerId.nilIfEmpty)
            store.playerId = player.id
            store.nickname = player.nickname
            notice = store.locale == .zh ? "昵称已保存。" : "Nickname saved."
            await load()
        } catch {
            notice = error.localizedDescription
        }
    }
}

@MainActor
final class ContributeViewModel: ObservableObject {
    @Published var title = ""
    @Published var email = ""
    @Published var groups: [DraftGroup] = (0..<4).map { _ in DraftGroup() }
    @Published var notice = ""

    struct DraftGroup {
        var name = ""
        var words = ""
    }

    func submit(store: UserDefaultsStore) async {
        do {
            var playerId: String?
            let trimmed = store.nickname.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty {
                let player = try await APIClient.shared.registerPlayer(nickname: trimmed, playerId: store.playerId.nilIfEmpty)
                store.playerId = player.id
                store.nickname = player.nickname
                playerId = player.id
            }
            let parsedGroups = groups.enumerated().map { index, group in
                let name = group.name.trimmingCharacters(in: .whitespacesAndNewlines)
                let words = group.words
                    .split(whereSeparator: { ",，\n".contains($0) })
                    .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
                    .filter { !$0.isEmpty }
                return (index: index, name: name, words: words)
            }

            let filledGroups = parsedGroups.filter { !$0.name.isEmpty || !$0.words.isEmpty }
            guard !filledGroups.isEmpty else {
                notice = store.locale == .zh
                    ? "最少填写 1 组，每组 4 个词。"
                    : "Add at least one group with exactly four words."
                return
            }

            guard filledGroups.allSatisfy({ $0.words.count == 4 }) else {
                notice = store.locale == .zh
                    ? "每个已填写分组必须恰好 4 个词。"
                    : "Each filled group must contain exactly four words."
                return
            }

            let payloadGroups = filledGroups.map { group in
                PuzzleSubmissionGroup(
                    name: group.name.isEmpty
                        ? (store.locale == .zh ? "未命名分组 \(group.index + 1)" : "Group \(group.index + 1)")
                        : group.name,
                    words: group.words
                )
            }
            let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
            _ = try await APIClient.shared.submitPuzzle(PuzzleSubmissionPayload(
                nickname: trimmed.isEmpty ? "Guest" : trimmed,
                playerId: playerId,
                email: trimmedEmail.isEmpty ? nil : trimmedEmail,
                title: title.trimmingCharacters(in: .whitespacesAndNewlines),
                groups: payloadGroups
            ))
            title = ""
            email = ""
            groups = (0..<4).map { _ in DraftGroup() }
            notice = L10n.t(.pendingSaved, locale: store.locale)
        } catch {
            notice = error.localizedDescription
        }
    }
}
