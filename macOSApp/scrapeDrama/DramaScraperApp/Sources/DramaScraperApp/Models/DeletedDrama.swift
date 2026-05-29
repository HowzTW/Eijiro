import Foundation

struct DeletedDrama: Identifiable, Codable {
    var id: String
    var name: String
    var deleted_at: String

    var source: String {
        if id.hasPrefix("gimyplus_") { return "Gimy+" }
        if id.hasPrefix("777tv_") { return "777TV" }
        return "777TV"
    }

    var numericId: String {
        if let range = id.range(of: "_") {
            return String(id[range.upperBound...])
        }
        return id
    }

    var deletedAtFormatted: String {
        // GAS 回傳格式多樣（Date 物件序列化），嘗試多種 parse
        let formatters: [DateFormatter] = {
            let f1 = DateFormatter()
            f1.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
            let f2 = DateFormatter()
            f2.dateFormat = "yyyy-MM-dd HH:mm:ss"
            let f3 = DateFormatter()
            f3.dateFormat = "M/d/yyyy HH:mm:ss"
            return [f1, f2, f3]
        }()

        let output = DateFormatter()
        output.dateFormat = "yyyy-MM-dd HH:mm:ss"

        for formatter in formatters {
            if let date = formatter.date(from: deleted_at) {
                return output.string(from: date)
            }
        }
        return deleted_at
    }
}
