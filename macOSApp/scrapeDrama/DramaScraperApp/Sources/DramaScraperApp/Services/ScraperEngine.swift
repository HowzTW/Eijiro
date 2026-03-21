import Foundation
import SwiftSoup

class ScraperEngine {
    
    func scrape(id: String) -> AsyncStream<ScrapeStatus> {
        AsyncStream { continuation in
            Task {
                do {
                    continuation.yield(.processing(message: "🚀 任務啟動：串接 ID \(id)"))
                    
                    let targetURL = "https://777tv.ai/vod/detail/id/\(id).html"
                    guard let url = URL(string: targetURL) else {
                        throw URLError(.badURL)
                    }
                    
                    continuation.yield(.processing(message: "正在取得網頁原始碼..."))
                    var request = URLRequest(url: url)
                    request.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", forHTTPHeaderField: "User-Agent")
                    
                    let (data, response) = try await URLSession.shared.data(for: request)
                    
                    if let httpResponse = response as? HTTPURLResponse,
                       !(200...299).contains(httpResponse.statusCode) {
                        throw NSError(domain: "ScraperEngine", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "遠端伺服器回傳錯誤代碼: \(httpResponse.statusCode) (可能是 404 找不到該劇集)"])
                    }
                    
                    guard let html = String(data: data, encoding: .utf8) else {
                        throw URLError(.cannotDecodeContentData)
                    }
                    
                    continuation.yield(.processing(message: "正在使用 SwiftSoup 解析..."))
                    let document = try SwiftSoup.parse(html)
                    
                    var title = try document.select("h1").first()?.text().trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                    if title.isEmpty {
                        title = try document.title()
                    }
                    if title.isEmpty || title.contains("404") {
                        throw NSError(domain: "ScraperEngine", code: 404, userInfo: [NSLocalizedDescriptionKey: "找不到影片標題或網頁已被移除"])
                    }
                    
                    // 抓取照片與簡介
                    var coverImageURL = ""
                    if let imgEle = try document.select(".stui-content__thumb .lazyload").first() {
                        coverImageURL = try imgEle.attr("data-original")
                    } else if let metaImg = try document.select("meta[property=og:image]").first() {
                        coverImageURL = try metaImg.attr("content")
                    }
                    
                    let introduction = try document.select(".stui-content__desc").first()?.text().trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                    
                    // 解析播放線路
                    var sourcesArr: [[String: Any]] = []
                    let panels = try document.select(".stui-pannel")
                    let blackList = ["劇情介紹", "猜你喜歡", "熱門推薦", "相關推薦", "系列", "評論"]
                    
                    var totalEpisodesToFetch = 0
                    
                    for panel in panels.array() {
                        let titleEl = try panel.select(".stui-pannel__head .title")
                        let playlistEl = try panel.select(".stui-content__playlist")
                        
                        if !titleEl.isEmpty() && !playlistEl.isEmpty() {
                            let lineName = try titleEl.text().trimmingCharacters(in: .whitespacesAndNewlines)
                            let isBlacklisted = blackList.contains { lineName.contains($0) }
                            
                            if !isBlacklisted {
                                var episodesList: [[String: String]] = []
                                let episodeLinks = try playlistEl.select("li a")
                                
                                for el in episodeLinks.array() {
                                    let epName = try el.text().trimmingCharacters(in: .whitespacesAndNewlines)
                                    var epUrl = try el.attr("href")
                                    
                                    if epUrl.hasPrefix("//") {
                                        epUrl = "https:" + epUrl
                                    } else if epUrl.hasPrefix("/") {
                                        epUrl = "https://play.777tv.ai" + epUrl
                                    } else if !epUrl.hasPrefix("http") {
                                        epUrl = "https://777tv.ai/" + epUrl
                                    }
                                    
                                    episodesList.append([
                                        "name": epName,
                                        "playPageUrl": epUrl
                                    ])
                                    totalEpisodesToFetch += 1
                                }
                                
                                if !episodesList.isEmpty {
                                    sourcesArr.append([
                                        "line_name": lineName,
                                        "episodes": episodesList
                                    ])
                                }
                            }
                        }
                    }
                    
                    continuation.yield(.processing(message: "找到 \(sourcesArr.count) 條線路，準備抓取影片串流位址..."))
                    
                    // 遍歷所有集數並獲取真實的 m3u8 url
                    var processedCount = 0
                    var finalSourcesArr: [[String: Any]] = []
                    
                    for source in sourcesArr {
                        if let lineName = source["line_name"] as? String,
                           let episodes = source["episodes"] as? [[String: String]] {
                            
                            var resolvedEpisodes: [[String: String]] = []
                            
                            for ep in episodes {
                                processedCount += 1
                                let epName = ep["name"] ?? ""
                                let playPageUrl = ep["playPageUrl"] ?? ""
                                
                                continuation.yield(.parsing(message: "正在抓取", current: processedCount, total: totalEpisodesToFetch, line: lineName, episode: epName))
                                
                                var finalPlayUrl = ""
                                // 抓取真實連結
                                if let playURLObj = URL(string: playPageUrl) {
                                    var playReq = URLRequest(url: playURLObj)
                                    playReq.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", forHTTPHeaderField: "User-Agent")
                                    
                                    if let (playData, _) = try? await URLSession.shared.data(for: playReq),
                                       let playHtml = String(data: playData, encoding: .utf8) {
                                        
                                        // 用正則匹配 MacPlayer 變數
                                        let pattern = "var\\s+(?:player_data|MacPlayer)\\s*=\\s*({.*?})[\\s;]*</script>"
                                        if let regex = try? NSRegularExpression(pattern: pattern, options: .dotMatchesLineSeparators) {
                                            let nsString = playHtml as NSString
                                            if let match = regex.firstMatch(in: playHtml, options: [], range: NSRange(location: 0, length: nsString.length)) {
                                                let jsonStr = nsString.substring(with: match.range(at: 1))
                                                if let jsonData = jsonStr.data(using: .utf8),
                                                   let jsonObject = try? JSONSerialization.jsonObject(with: jsonData, options: []) as? [String: Any] {
                                                    finalPlayUrl = (jsonObject["url"] as? String) ?? (jsonObject["PlayUrl"] as? String) ?? ""
                                                }
                                            }
                                        }
                                    }
                                }
                                
                                resolvedEpisodes.append([
                                    "name": epName,
                                    "playPageUrl": playPageUrl,
                                    "play_url": finalPlayUrl
                                ])
                                
                                // 微小延遲避免被伺服器封鎖
                                try await Task.sleep(nanoseconds: 100_000_000)
                            }
                            
                            finalSourcesArr.append([
                                "line_name": lineName,
                                "episodes": resolvedEpisodes
                            ])
                        }
                    }
                    
                    let sourcesJsonData = try JSONSerialization.data(withJSONObject: finalSourcesArr, options: [])
                    let sourcesJsonString = String(data: sourcesJsonData, encoding: .utf8) ?? "[]"

                    
                    continuation.yield(.saving)
                    let drama = Drama(
                        id: id,
                        name: title,
                        introduction: introduction,
                        cover_image: coverImageURL,
                        update_time: "", // GAS 會覆寫
                        sources: sourcesJsonString
                    )
                    
                    _ = try await GASNetworkManager.shared.syncDrama(drama: drama)
                    
                    continuation.yield(.success(coverImgUrl: coverImageURL, title: title))
                    continuation.finish()
                    
                } catch {
                    continuation.yield(.error(message: error.localizedDescription))
                    continuation.finish()
                }
            }
        }
    }
}
