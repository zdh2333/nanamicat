import Foundation

struct PuzzleDataBundle: Codable {
    struct TextGroup: Codable {
        let level: Int
        let name: String
        let words: [String]
    }

    let textGroupBank: [TextGroup]
    let puzzleThemes: [String]
    let redHerringNotes: [String]
    let englishPuzzleTerms: [String: String]
    let maxMistakes: Int
    let textPuzzleCount: Int
}

enum PuzzleCatalog {
    static let shared: PuzzleDataBundle = {
        let url = Bundle.main.url(forResource: "puzzle-data", withExtension: "json")
            ?? Bundle.main.url(forResource: "puzzle-data", withExtension: "json", subdirectory: "Resources")
        guard let url else {
            fatalError("Missing puzzle-data.json in bundle")
        }
        let data = try! Data(contentsOf: url)
        return try! JSONDecoder().decode(PuzzleDataBundle.self, from: data)
    }()

    static var textPuzzles: [Puzzle] { PuzzleEngine.buildTextPuzzles(from: shared) }
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
        (0..<data.textPuzzleCount).map { index in
            let difficulty = min(4, index / 25 + 1)
            let candidates = data.textGroupBank.filter { $0.level <= difficulty }
            let offsets = [0, 7, 19, 31].map { step in
                (index * 5 + step + difficulty * 3) % max(candidates.count, 1)
            }
            let puzzleID = String(format: "text-%03d", index + 1)
            let groups: [PuzzleGroup] = offsets.enumerated().map { groupSlot, groupIndex in
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
