import Foundation

enum ScraperSource: String, CaseIterable, Identifiable {
    case tv777 = "777tv"
    case gimyplus = "gimyplus"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .tv777: return "777TV"
        case .gimyplus: return "Gimy+"
        }
    }

    var idPrefix: String { rawValue + "_" }
}

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
