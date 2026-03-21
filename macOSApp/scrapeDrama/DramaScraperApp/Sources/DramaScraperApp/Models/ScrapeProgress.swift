import Foundation

enum ScrapeStatus {
    case idle
    case processing(message: String)
    case parsing(message: String, current: Int, total: Int, line: String, episode: String)
    case saving
    case success(coverImgUrl: String?, title: String)
    case error(message: String)
}

struct ScrapeLog: Identifiable {
    let id = UUID()
    let timestamp = Date()
    let message: String
}
