import SwiftUI

@main
struct NanamiCatApp: App {
    @StateObject private var store = UserDefaultsStore()

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environmentObject(store)
        }
    }
}
