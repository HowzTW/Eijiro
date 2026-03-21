import SwiftUI

class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        // 設定 App 為正常視窗模式 (避免變成背景 App)
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
        
        // 強制設定 Dock 圖示 (針對 SPM Executable)
        // 使用延遲確保 Dock 已經準備好接收圖示更新
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            // 優先嘗試從 SPM 模組裡加載這張圖片
            if let iconURL = Bundle.module.url(forResource: "icon-app", withExtension: "png"),
               let iconImage = NSImage(contentsOf: iconURL) {
                NSApp.applicationIconImage = iconImage
            } else if let iconImage = NSImage(named: NSImage.Name("icon-app")) {
                NSApp.applicationIconImage = iconImage
            }
        }
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
