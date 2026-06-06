import SwiftUI

@main
struct NanamiCatApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var store = UserDefaultsStore()

    var body: some Scene {
        WindowGroup {
            SplashGateView()
                .environmentObject(store)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .task {
                    await PuzzleCatalog.syncWithBackend()
                }
        }
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active else { return }
            Task {
                await PuzzleCatalog.syncWithBackend()
            }
        }
    }
}
