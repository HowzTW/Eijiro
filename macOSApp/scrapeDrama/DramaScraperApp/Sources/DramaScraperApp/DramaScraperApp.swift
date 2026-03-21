import SwiftUI

class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }
}

@main
struct DramaScraperApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @State private var showSplash = true
    
    var body: some Scene {
        WindowGroup {
            ZStack {
                if showSplash {
                    SplashView()
                        .transition(.opacity)
                } else {
                    SidebarView()
                        .frame(minWidth: 800, minHeight: 600)
                        .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.8), value: showSplash)
            .onAppear {
                Task {
                    try? await Task.sleep(nanoseconds: 2_500_000_000)
                    showSplash = false
                }
            }
        }
        .windowStyle(.titleBar)
        .commands {
            TextEditingCommands()
            SidebarCommands()
        }
    }
}
