import Foundation

// 對應 GAS 回傳的資料結構
struct Drama: Identifiable, Codable {
    var id: String
    var name: String
    var introduction: String
    var cover_image: String
    var update_time: String
    var sources: [DramaLine]
    
    enum CodingKeys: String, CodingKey {
        case id, name, introduction, cover_image, update_time, sources
    }
    
    init(id: String, name: String, introduction: String, cover_image: String, update_time: String, sources: [DramaLine]) {
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
        
        // 如果 sources 是字串（舊格式），則嘗試解析它；否則直接解碼為陣列
        if let sourcesStr = try? container.decode(String.self, forKey: .sources) {
            if let data = sourcesStr.data(using: .utf8),
               let decodedSources = try? JSONDecoder().decode([DramaLine].self, from: data) {
                sources = decodedSources
            } else {
                sources = []
            }
        } else {
            sources = try container.decode([DramaLine].self, forKey: .sources)
        }
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

struct DramaLine: Codable, Identifiable {
    var id: String { line_name }
    var line_name: String
    var episodes: [DramaEpisode]
}

struct DramaEpisode: Codable, Identifiable {
    var id: String { playPageUrl }
    var name: String
    var playPageUrl: String
    var play_url: String
}

