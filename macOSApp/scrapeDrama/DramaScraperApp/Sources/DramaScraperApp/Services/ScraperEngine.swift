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
                    
                    // 強制轉為 https
                    if coverImageURL.hasPrefix("http://") {
                        coverImageURL = coverImageURL.replacingOccurrences(of: "http://", with: "https://")
                    } else if coverImageURL.hasPrefix("//") {
                        coverImageURL = "https:" + coverImageURL
                    }
                    
                    let introduction = try document.select(".stui-content__desc").first()?.text().trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                    
                    // 解析播放線路
                    var rawSourcesArr: [(lineName: String, episodes: [(name: String, playPageUrl: String)])] = []
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
                                var episodesList: [(name: String, playPageUrl: String)] = []
                                let episodeLinks = try playlistEl.select("li a")
                                
                                for el in episodeLinks.array() {
                                    let epName = try el.text().trimmingCharacters(in: .whitespacesAndNewlines)
                                    let epUrl = try el.attr("href")
                                    
                                    episodesList.append((name: epName, playPageUrl: epUrl))
                                    totalEpisodesToFetch += 1
                                }
                                
                                if !episodesList.isEmpty {
                                    rawSourcesArr.append((lineName: lineName, episodes: episodesList))
                                }
                            }
                        }
                    }
                    
                    continuation.yield(.processing(message: "找到 \(rawSourcesArr.count) 條線路，準備抓取影片串流位址..."))
                    
                    // 遍歷所有集數並獲取真實的 m3u8 url
                    var processedCount = 0
                    var finalLines: [DramaLine] = []
                    
                    for rawLine in rawSourcesArr {
                        var resolvedEpisodes: [DramaEpisode] = []
                        
                        for rawEp in rawLine.episodes {
                            processedCount += 1
                            continuation.yield(.parsing(message: "正在抓取", current: processedCount, total: totalEpisodesToFetch, line: rawLine.lineName, episode: rawEp.name))
                            
                            // 組合完整的播放頁面 URL 用於抓取
                            var fullPlayPageUrlString = rawEp.playPageUrl
                            if fullPlayPageUrlString.hasPrefix("//") {
                                fullPlayPageUrlString = "https:" + fullPlayPageUrlString
                            } else if fullPlayPageUrlString.hasPrefix("/") {
                                fullPlayPageUrlString = "https://play.777tv.ai" + fullPlayPageUrlString
                            } else if !fullPlayPageUrlString.hasPrefix("http") {
                                fullPlayPageUrlString = "https://777tv.ai/" + fullPlayPageUrlString
                            }
                            
                            // 格式化所需的 playPageUrl (相對協定 //)
                            let formattedPlayPageUrl: String
                            if rawEp.playPageUrl.hasPrefix("//") {
                                formattedPlayPageUrl = rawEp.playPageUrl
                            } else if rawEp.playPageUrl.hasPrefix("/") {
                                formattedPlayPageUrl = "//play.777tv.ai" + rawEp.playPageUrl
                            } else {
                                formattedPlayPageUrl = rawEp.playPageUrl
                            }
                            
                            var finalPlayUrl = ""
                            // 抓取真實連結
                            if let playURLObj = URL(string: fullPlayPageUrlString) {
                                var playReq = URLRequest(url: playURLObj)
                                playReq.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", forHTTPHeaderField: "User-Agent")
                                
                                if let (playData, _) = try? await URLSession.shared.data(for: playReq),
                                   let playHtml = String(data: playData, encoding: .utf8) {
                                    
                                    // 尋找變數宣告位置
                                    if let range = playHtml.range(of: "var player_data=") ?? playHtml.range(of: "var MacPlayer=") {
                                        let searchStartIndex = range.upperBound
                                        
                                        // 尋找第一個 '{'
                                        if let openBraceIndex = playHtml[searchStartIndex...].firstIndex(of: "{") {
                                            var braceCount = 0
                                            var closeBraceIndex: String.Index? = nil
                                            
                                            // 遍歷以找到對應的 '}'
                                            for index in playHtml.indices[openBraceIndex...] {
                                                let char = playHtml[index]
                                                if char == "{" {
                                                    braceCount += 1
                                                } else if char == "}" {
                                                    braceCount -= 1
                                                    if braceCount == 0 {
                                                        closeBraceIndex = index
                                                        break
                                                    }
                                                }
                                            }
                                            
                                            if let closeIndex = closeBraceIndex {
                                                let jsonRange = openBraceIndex...closeIndex
                                                let jsonStr = String(playHtml[jsonRange])
                                                
                                                if let jsonData = jsonStr.data(using: .utf8),
                                                   let jsonObject = try? JSONSerialization.jsonObject(with: jsonData, options: []) as? [String: Any] {
                                                    finalPlayUrl = (jsonObject["url"] as? String) ?? (jsonObject["PlayUrl"] as? String) ?? ""
                                                }
                                            }
                                        }
                                    }

                                }
                            }
                            
                            resolvedEpisodes.append(DramaEpisode(
                                name: rawEp.name,
                                playPageUrl: formattedPlayPageUrl,
                                play_url: finalPlayUrl
                            ))
                            
                            // 微小延遲避免被伺服器封鎖
                            try await Task.sleep(nanoseconds: 200_000_000)
                        }
                        
                        finalLines.append(DramaLine(
                            line_name: rawLine.lineName,
                            episodes: resolvedEpisodes
                        ))
                    }
                    
                    continuation.yield(.saving)
                    let drama = Drama(
                        id: id,
                        name: title,
                        introduction: introduction,
                        cover_image: coverImageURL,
                        update_time: "", // GAS 會覆寫
                        sources: finalLines
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

