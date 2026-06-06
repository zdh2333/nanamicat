import Foundation

/// 开屏广告配置。接入 AdMob / AppLovin 等时改 `provider` 与 `enabled` 即可。
struct SplashAdConfiguration: Sendable {
    enum Provider: String, Sendable {
        case none
        // case googleAdMob
    }

    static let current = SplashAdConfiguration(
        provider: .none,
        enabled: false,
        minimumBrandDisplaySeconds: 1.6,
        adLoadTimeoutSeconds: 3.0
    )

    let provider: Provider
    let enabled: Bool
    let minimumBrandDisplaySeconds: TimeInterval
    let adLoadTimeoutSeconds: TimeInterval
}

enum SplashAdLoadResult: Sendable {
    case disabled
    case timedOut
    case loadedPlaceholder
}

protocol SplashAdServing: Sendable {
    func loadSplashAd(timeout: TimeInterval) async -> SplashAdLoadResult
}

struct NoOpSplashAdService: SplashAdServing {
    func loadSplashAd(timeout: TimeInterval) async -> SplashAdLoadResult {
        .disabled
    }
}

@MainActor
final class SplashAdCoordinator: ObservableObject {
    enum Phase: Equatable {
        case presenting
        case finished
    }

    @Published private(set) var phase: Phase = .presenting

    private let configuration: SplashAdConfiguration
    private let adService: any SplashAdServing

    init(
        configuration: SplashAdConfiguration = .current,
        adService: any SplashAdServing = NoOpSplashAdService()
    ) {
        self.configuration = configuration
        self.adService = adService
    }

    func start() async {
        let minimum = configuration.minimumBrandDisplaySeconds
        if minimum > 0 {
            try? await Task.sleep(for: .seconds(minimum))
        }
        if configuration.enabled, configuration.provider != .none {
            _ = await adService.loadSplashAd(timeout: configuration.adLoadTimeoutSeconds)
        }
        phase = .finished
    }
}
