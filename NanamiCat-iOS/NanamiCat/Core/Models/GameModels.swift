import Foundation

enum AppLocale: String, CaseIterable, Identifiable, Codable {
    case zh
    case en

    var id: String { rawValue }
}

enum PuzzleMode: String, Identifiable, Codable {
    case text

    var id: String { rawValue }
}

enum AppThemeID: String, CaseIterable, Identifiable, Codable {
    case zincMist
    case roseDust
    case sageCalm
    case blueHaze

    var id: String { rawValue }

    /// Migrates legacy theme keys persisted before Morandi rename.
    static func resolved(from raw: String) -> AppThemeID {
        switch raw {
        case "default", "zincMist", "": return .zincMist
        case "clay", "roseDust": return .roseDust
        case "sage", "sageCalm": return .sageCalm
        case "mist", "blueHaze": return .blueHaze
        default: return AppThemeID(rawValue: raw) ?? .zincMist
        }
    }

    func displayName(locale: AppLocale) -> String {
        switch (self, locale) {
        case (.zincMist, .zh): return "锌雾灰"
        case (.roseDust, .zh): return "玫瑰尘"
        case (.sageCalm, .zh): return "鼠尾草"
        case (.blueHaze, .zh): return "薄雾蓝"
        case (.zincMist, .en): return "Zinc Mist"
        case (.roseDust, .en): return "Rose Dust"
        case (.sageCalm, .en): return "Sage Calm"
        case (.blueHaze, .en): return "Blue Haze"
        }
    }
}

struct PuzzleItem: Identifiable, Hashable, Codable {
    let id: String
    var label: String?
    var sheet: String?
    var cell: Int?
    var alt: String?
}

struct PuzzleGroup: Identifiable, Hashable, Codable {
    let id: String
    let name: String
    let level: Int
    let items: [PuzzleItem]
}

struct Puzzle: Identifiable, Hashable, Codable {
    let id: String
    let label: String
    let theme: String
    let type: PuzzleMode
    let difficulty: Int
    let redHerring: String
    let groups: [PuzzleGroup]
}

struct Player: Codable, Hashable {
    let id: String
    var nickname: String
    var textClears: Int
    var totalScore: Int
    var createdAt: String?
    var updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, nickname
        case textClears = "text_clears"
        case totalScore = "total_score"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct LeaderboardEntry: Identifiable, Hashable, Codable {
    var id: String { entryID }
    let entryID: String
    let nickname: String
    let textClears: Int
    let totalScore: Int
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case entryID = "id"
        case nickname
        case textClears = "text_clears"
        case totalScore = "total_score"
        case updatedAt = "updated_at"
    }
}

struct PuzzleSubmissionGroup: Codable, Hashable {
    var name: String
    var words: [String]
}

struct PuzzleSubmissionPayload: Codable {
    var nickname: String
    var playerId: String?
    var email: String?
    var groups: [PuzzleSubmissionGroup]
}

struct PuzzleSubmissionResponse: Codable {
    struct Submission: Codable {
        let id: String
        let status: String
    }

    struct EmailResult: Codable {
        let attempted: Bool?
        let sent: Bool?
        let reason: String?
    }

    let submission: Submission
    let email: EmailResult?
}

enum UserDefaultsKeys {
    static let locale = "nanamicat.locale"
    static let theme = "nanamicat.theme"
    static let nickname = "nanamicat.nickname"
    static let playerId = "nanamicat.playerId"
    static let playedPuzzleIDs = "nanamicat.playedPuzzleIds"
    static let hintBalance = "nanamicat.hintBalance"
    static let completedPuzzleCount = "nanamicat.completedPuzzleCount"
}

enum HintEconomy {
    static let initialBalance = 3
    static let clearsPerReward = 3
}
