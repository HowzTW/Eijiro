import Foundation
import SwiftUI

@MainActor
class ScrapeViewModel: ObservableObject {
    @Published var targetId: String = ""
    @Published var isRunning: Bool = false
    @Published var logs: [ScrapeLog] = []
    
    @Published var statusMessage: String = "等待輸入..."
    @Published var progressPercent: Double = 0.0
    
    @Published var successData: (coverImgUrl: String?, title: String)? = nil
    
    private let engine = ScraperEngine()
    
    func startScraping() {
        guard !targetId.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        
        isRunning = true
        logs.removeAll()
        progressPercent = 0.0
        successData = nil
        
        Task {
            for await status in engine.scrape(id: targetId) {
                handleStatus(status)
            }
            isRunning = false
            if logs.isEmpty {
                statusMessage = "等待輸入..."
            }
        }
    }
    
    private func handleStatus(_ status: ScrapeStatus) {
        switch status {
        case .idle:
            break
        case .processing(let message):
            self.statusMessage = message
            addLog(message)
        case .parsing(let message, let current, let total, let line, let ep):
            self.statusMessage = message
            self.progressPercent = Double(current) / Double(total)
            addLog("擷取中: \(line) → \(ep)")
        case .saving:
            self.statusMessage = "正在同步至資料庫..."
            addLog("正在儲存資料到 GAS...")
        case .success(let coverImgUrl, let title):
            self.statusMessage = "完成"
            self.progressPercent = 1.0
            addLog("✨ 任務成功結束")
            self.successData = (coverImgUrl: coverImgUrl, title: title)
        case .error(let message):
            self.statusMessage = "發生錯誤"
            addLog("❌ 任務失敗: \(message)")
        }
    }
    
    private func addLog(_ text: String) {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss"
        let timestampStr = formatter.string(from: Date())
        logs.append(ScrapeLog(message: "[\(timestampStr)] \(text)"))
    }
}
