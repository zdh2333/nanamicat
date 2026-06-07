import Foundation

extension Notification.Name {
    static let puzzleCatalogDidUpdate = Notification.Name("puzzleCatalogDidUpdate")
}

struct PuzzleDataBundle: Codable {
    struct TextGroup: Codable {
        let level: Int
        let name: String
        let words: [String]
        let id: String?
    }

    struct TextPuzzleManifestEntry: Codable {
        let difficulty: Int
        let theme: String
        let redHerring: String
        let groupIds: [String]
    }

    let textGroupBank: [TextGroup]
    let puzzleThemes: [String]
    let redHerringNotes: [String]
    let englishPuzzleTerms: [String: String]
    let maxMistakes: Int
    let textPuzzleCount: Int
    let textPuzzleManifest: [TextPuzzleManifestEntry]?
    let communityPuzzles: [Puzzle]?

    func mergingCommunity(_ response: CommunityPuzzleResponse?) -> PuzzleDataBundle {
        guard let response else { return self }
        var mergedTerms = englishPuzzleTerms
        response.englishPuzzleTerms.forEach { key, value in
            mergedTerms[key] = value
        }
        return PuzzleDataBundle(
            textGroupBank: textGroupBank,
            puzzleThemes: puzzleThemes,
            redHerringNotes: redHerringNotes,
            englishPuzzleTerms: mergedTerms,
            maxMistakes: maxMistakes,
            textPuzzleCount: textPuzzleCount,
            textPuzzleManifest: textPuzzleManifest,
            communityPuzzles: response.puzzles
        )
    }
}

struct CommunityPuzzleResponse: Codable {
    let puzzles: [Puzzle]
    let englishPuzzleTerms: [String: String]
}

enum PuzzleCatalog {
    private static let cacheFileName = "puzzle-data.json"
    private static let remoteURL = URL(string: "https://nanamicat.com/puzzle-data.json")!
    private static let communityURL = URL(string: "https://nanamicat.com/api/puzzles")!

    private(set) static var shared: PuzzleDataBundle = loadCatalog()

    static var textPuzzles: [Puzzle] { PuzzleEngine.buildTextPuzzles(from: shared) }

    /// 启动时或进入前台时调用：从 CDN 拉取最新题库，校验后写入沙盒并刷新内存。
    static func syncWithBackend() async {
        do {
            let (data, response) = try await URLSession.shared.data(from: remoteURL)
            guard let http = response as? HTTPURLResponse, (200 ... 299).contains(http.statusCode) else {
                return
            }
            let decoded = try JSONDecoder().decode(PuzzleDataBundle.self, from: data)
            guard decoded.textGroupBank.count > 0, decoded.textPuzzleCount > 0 else {
                return
            }
            let merged = decoded.mergingCommunity(await fetchCommunityPuzzles())
            let mergedData = (try? JSONEncoder().encode(merged)) ?? data
            let cachePath = cacheURL()
            let isNewContent: Bool
            if let cached = try? Data(contentsOf: cachePath) {
                isNewContent = cached != mergedData
            } else if let bundled = bundleData() {
                isNewContent = bundled != mergedData
            } else {
                isNewContent = true
            }
            guard isNewContent else { return }

            try mergedData.write(to: cachePath, options: .atomic)
            await MainActor.run {
                shared = merged
                NotificationCenter.default.post(name: .puzzleCatalogDidUpdate, object: nil)
            }
        } catch {
            // 保留包内或沙盒缓存，静默失败
        }
    }

    private static func fetchCommunityPuzzles() async -> CommunityPuzzleResponse? {
        do {
            let (data, response) = try await URLSession.shared.data(from: communityURL)
            guard let http = response as? HTTPURLResponse, (200 ... 299).contains(http.statusCode) else {
                return nil
            }
            let decoded = try JSONDecoder().decode(CommunityPuzzleResponse.self, from: data)
            return decoded
        } catch {
            return nil
        }
    }

    private static func loadCatalog() -> PuzzleDataBundle {
        if let cached = loadFromDocuments() {
            return cached
        }
        return loadFromBundle()
    }

    private static func cacheURL() -> URL {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return dir.appendingPathComponent(cacheFileName)
    }

    private static func loadFromDocuments() -> PuzzleDataBundle? {
        let url = cacheURL()
        guard FileManager.default.fileExists(atPath: url.path),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode(PuzzleDataBundle.self, from: data),
              !decoded.textGroupBank.isEmpty
        else {
            return nil
        }
        return decoded
    }

    private static func bundleURL() -> URL? {
        Bundle.main.url(forResource: "puzzle-data", withExtension: "json")
            ?? Bundle.main.url(forResource: "puzzle-data", withExtension: "json", subdirectory: "Resources")
    }

    private static func bundleData() -> Data? {
        guard let url = bundleURL() else { return nil }
        return try? Data(contentsOf: url)
    }

    private static func loadFromBundle() -> PuzzleDataBundle {
        guard let data = bundleData(),
              let decoded = try? JSONDecoder().decode(PuzzleDataBundle.self, from: data)
        else {
            fatalError("Missing or invalid puzzle-data.json in bundle")
        }
        return decoded
    }
}

enum PuzzleEngine {
    static func todayIndex(count: Int, date: Date = Date()) -> Int {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let year = calendar.component(.year, from: date)
        let month = calendar.component(.month, from: date)
        let day = calendar.component(.day, from: date)
        guard count > 0 else { return 0 }
        return (year * 372 + month * 31 + day) % count
    }

    static func buildTextPuzzles(from data: PuzzleDataBundle) -> [Puzzle] {
        let builtIn: [Puzzle]
        if let manifest = data.textPuzzleManifest, !manifest.isEmpty {
            builtIn = buildFromManifest(manifest, data: data)
        } else {
            builtIn = buildLegacyPuzzles(from: data)
        }
        return builtIn + (data.communityPuzzles ?? [])
    }

    private static func buildFromManifest(
        _ manifest: [PuzzleDataBundle.TextPuzzleManifestEntry],
        data: PuzzleDataBundle
    ) -> [Puzzle] {
        let bankById: [String: PuzzleDataBundle.TextGroup] = Dictionary(
            uniqueKeysWithValues: data.textGroupBank.compactMap { group -> (String, PuzzleDataBundle.TextGroup)? in
                guard let id = group.id else { return nil }
                return (id, group)
            }
        )

        return manifest.enumerated().compactMap { index, entry in
            let puzzleID = String(format: "text-%03d", index + 1)
            let groups: [PuzzleGroup] = entry.groupIds.compactMap { groupId in
                guard let source = bankById[groupId] else { return nil }
                let items = source.words.map { word in
                    PuzzleItem(id: "\(puzzleID)-\(word)", label: word)
                }
                return PuzzleGroup(
                    id: "\(puzzleID)-g\(groupId)",
                    name: source.name,
                    level: source.level,
                    items: items
                )
            }
            guard groups.count == 4 else { return nil }
            return Puzzle(
                id: puzzleID,
                label: "文字题 \(index + 1)",
                theme: entry.theme,
                type: .text,
                difficulty: entry.difficulty,
                redHerring: entry.redHerring,
                groups: groups
            )
        }
    }

    private static func buildLegacyPuzzles(from data: PuzzleDataBundle) -> [Puzzle] {
        (0 ..< data.textPuzzleCount).compactMap { index in
            let difficulty = min(4, index / 25 + 1)
            let candidates = data.textGroupBank.filter { $0.level <= difficulty }
            guard candidates.count >= 4 else { return nil }
            let offsets = [0, 7, 19, 31].map { step in
                (index * 5 + step + difficulty * 3) % candidates.count
            }
            let puzzleID = String(format: "text-%03d", index + 1)
            let groups: [PuzzleGroup] = offsets.enumerated().compactMap { groupSlot, groupIndex in
                guard groupIndex < candidates.count else { return nil }
                let source = candidates[groupIndex]
                let level = min(4, max(source.level, groupSlot + 1))
                let items = source.words.map { word in
                    PuzzleItem(id: "\(puzzleID)-\(word)", label: word)
                }
                return PuzzleGroup(
                    id: "\(puzzleID)-g\(groupSlot)",
                    name: source.name,
                    level: level,
                    items: items
                )
            }
            guard groups.count == 4 else { return nil }
            return Puzzle(
                id: puzzleID,
                label: "文字题 \(index + 1)",
                theme: data.puzzleThemes[index % data.puzzleThemes.count],
                type: .text,
                difficulty: difficulty,
                redHerring: data.redHerringNotes[index % data.redHerringNotes.count],
                groups: groups
            )
        }
    }

    static func allItems(in puzzle: Puzzle) -> [PuzzleItem] {
        puzzle.groups.flatMap(\.items)
    }

    static func mostAbstractGroup(in puzzle: Puzzle) -> PuzzleGroup? {
        puzzle.groups.max(by: { $0.level < $1.level })
    }

    static func shuffleItems(_ items: [PuzzleItem]) -> [PuzzleItem] {
        var copy = items
        for index in stride(from: copy.count - 1, through: 1, by: -1) {
            let swap = Int.random(in: 0...index)
            copy.swapAt(index, swap)
        }
        return copy
    }
}

enum PuzzleLocalization {
    static func term(_ value: String, locale: AppLocale) -> String {
        guard locale == .en else { return value }
        return PuzzleCatalog.shared.englishPuzzleTerms[value] ?? value
    }

    static func puzzleLabel(_ puzzle: Puzzle, locale: AppLocale) -> String {
        let number = Int(puzzle.id.split(separator: "-").last ?? "0") ?? 0
        if locale == .en {
            return "Text puzzle \(number)"
        }
        return puzzle.label
    }

    static func puzzleTheme(_ puzzle: Puzzle, locale: AppLocale) -> String {
        return term(puzzle.theme, locale: locale)
    }

    static func itemLabel(_ item: PuzzleItem, locale: AppLocale) -> String {
        if let label = item.label {
            return term(label, locale: locale)
        }
        guard let alt = item.alt else { return item.id }
        if locale == .zh { return alt }
        let parts = alt.split(separator: " ")
        if parts.count >= 2, let last = parts.last, Int(last) != nil {
            let base = parts.dropLast().joined(separator: " ")
            return "\(term(base, locale: locale)) \(last)"
        }
        return term(alt, locale: locale)
    }
}
