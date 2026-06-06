import Foundation

@MainActor
final class UserDefaultsStore: ObservableObject {
    @Published var locale: AppLocale {
        didSet { defaults.set(locale.rawValue, forKey: UserDefaultsKeys.locale) }
    }

    @Published var theme: AppThemeID {
        didSet { defaults.set(theme.rawValue, forKey: UserDefaultsKeys.theme) }
    }

    @Published var nickname: String {
        didSet { defaults.set(nickname, forKey: UserDefaultsKeys.nickname) }
    }

    @Published var playerId: String {
        didSet { defaults.set(playerId, forKey: UserDefaultsKeys.playerId) }
    }

    @Published var playedPuzzleIDs: [String] {
        didSet { defaults.set(playedPuzzleIDs, forKey: UserDefaultsKeys.playedPuzzleIDs) }
    }

    @Published var hintBalance: Int {
        didSet { defaults.set(hintBalance, forKey: UserDefaultsKeys.hintBalance) }
    }

    @Published var completedPuzzleCount: Int {
        didSet { defaults.set(completedPuzzleCount, forKey: UserDefaultsKeys.completedPuzzleCount) }
    }

    private let defaults = UserDefaults.standard

    init() {
        locale = AppLocale(rawValue: defaults.string(forKey: UserDefaultsKeys.locale) ?? "") ?? .zh
        theme = AppThemeID.resolved(from: defaults.string(forKey: UserDefaultsKeys.theme) ?? "")
        nickname = defaults.string(forKey: UserDefaultsKeys.nickname) ?? ""
        playerId = defaults.string(forKey: UserDefaultsKeys.playerId) ?? ""
        playedPuzzleIDs = defaults.stringArray(forKey: UserDefaultsKeys.playedPuzzleIDs) ?? []
        if defaults.object(forKey: UserDefaultsKeys.hintBalance) == nil {
            hintBalance = HintEconomy.initialBalance
        } else {
            hintBalance = max(0, defaults.integer(forKey: UserDefaultsKeys.hintBalance))
        }
        completedPuzzleCount = max(0, defaults.integer(forKey: UserDefaultsKeys.completedPuzzleCount))
    }
}
