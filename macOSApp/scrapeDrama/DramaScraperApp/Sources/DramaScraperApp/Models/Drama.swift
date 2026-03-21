import Foundation

// 對應 GAS 回傳的資料結構
struct Drama: Identifiable, Codable {
    var id: String
    var name: String
    var introduction: String
    var cover_image: String
    var update_time: String
    var sources: String // 為 JSON 格式的來源列表字串
    
    enum CodingKeys: String, CodingKey {
        case id, name, introduction, cover_image, update_time, sources
    }
    
    init(id: String, name: String, introduction: String, cover_image: String, update_time: String, sources: String) {
        self.id = id
        self.name = name
        self.introduction = introduction
        self.cover_image = cover_image
        self.update_time = update_time
        self.sources = sources
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // 嘗試解碼成 Int，若不行再解碼成 String (兼容 GAS 傳回 Number)
        if let intId = try? container.decode(Int.self, forKey: .id) {
            id = String(intId)
        } else {
            id = try container.decode(String.self, forKey: .id)
        }
        
        name = try container.decode(String.self, forKey: .name)
        introduction = try container.decode(String.self, forKey: .introduction)
        cover_image = try container.decode(String.self, forKey: .cover_image)
        update_time = try container.decode(String.self, forKey: .update_time)
        sources = try container.decode(String.self, forKey: .sources)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(introduction, forKey: .introduction)
        try container.encode(cover_image, forKey: .cover_image)
        try container.encode(update_time, forKey: .update_time)
        try container.encode(sources, forKey: .sources)
    }
}

// 用於解析 sources JSON 字串
struct DramaSource: Codable, Identifiable {
    var id: String { url }
    var name: String
    var episode: String
    var url: String
}
