import Foundation
import SwiftSoup

class ScraperEngine {

    func scrape(id: String, source: ScraperSource) -> AsyncStream<ScrapeStatus> {
        switch source {
        case .tv777:
            return scrape777tv(id: id)
        case .gimyplus:
            return scrapeGimyplus(id: id)
        }
    }

    // MARK: - 777TV

    private func scrape777tv(id: String) -> AsyncStream<ScrapeStatus> {
        AsyncStream { continuation in
            Task {
                do {
                    continuation.yield(.processing(message: "🚀 任務啟動：串接 777TV ID \(id)"))

                    let targetURL = "https://777tv.ai/vod/detail/id/\(id).html"
                    guard let url = URL(string: targetURL) else { throw URLError(.badURL) }

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
                    if title.isEmpty { title = try document.title() }
                    if title.isEmpty || title.contains("404") {
                        throw NSError(domain: "ScraperEngine", code: 404, userInfo: [NSLocalizedDescriptionKey: "找不到影片標題或網頁已被移除"])
                    }

                    var coverImageURL = ""
                    if let imgEle = try document.select(".stui-content__thumb .lazyload").first() {
                        coverImageURL = try imgEle.attr("data-original")
                    } else if let metaImg = try document.select("meta[property=og:image]").first() {
                        coverImageURL = try metaImg.attr("content")
                    }
                    coverImageURL = normalizeURL(coverImageURL)

                    let introduction = try document.select(".stui-content__desc").first()?.text().trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

                    var rawSourcesArr: [(lineName: String, episodes: [(name: String, playPageUrl: String)])] = []
                    let panels = try document.select(".stui-pannel")
                    let blackList = ["劇情介紹", "猜你喜歡", "熱門推薦", "相關推薦", "系列", "評論"]
                    var totalEpisodesToFetch = 0

                    for panel in panels.array() {
                        let titleEl = try panel.select(".stui-pannel__head .title")
                        let playlistEl = try panel.select(".stui-content__playlist")
                        if !titleEl.isEmpty() && !playlistEl.isEmpty() {
                            let lineName = try titleEl.text().trimmingCharacters(in: .whitespacesAndNewlines)
                            if blackList.contains(where: { lineName.contains($0) }) { continue }
                            var episodesList: [(name: String, playPageUrl: String)] = []
                            for el in try playlistEl.select("li a").array() {
                                episodesList.append((name: try el.text().trimmingCharacters(in: .whitespacesAndNewlines), playPageUrl: try el.attr("href")))
                                totalEpisodesToFetch += 1
                            }
                            if !episodesList.isEmpty {
                                rawSourcesArr.append((lineName: lineName, episodes: episodesList))
                            }
                        }
                    }

                    if rawSourcesArr.isEmpty {
                        throw NSError(domain: "ScraperEngine", code: -1, userInfo: [NSLocalizedDescriptionKey: "找不到任何播放線路，網站結構可能已再次改版"])
                    }

                    continuation.yield(.processing(message: "找到 \(rawSourcesArr.count) 條線路，準備抓取影片串流位址..."))

                    var processedCount = 0
                    var finalLines: [DramaLine] = []
                    var totalSourcesJsonChars = 0
                    let sourcesJsonLimit = 50000
                    var hitLimit = false

                    for rawLine in rawSourcesArr {
                        if hitLimit { break }
                        var resolvedEpisodes: [DramaEpisode] = []
                        for rawEp in rawLine.episodes {
                            processedCount += 1
                            continuation.yield(.parsing(message: "正在抓取", current: processedCount, total: totalEpisodesToFetch, line: rawLine.lineName, episode: rawEp.name))

                            var fullPlayPageUrlString = rawEp.playPageUrl
                            if fullPlayPageUrlString.hasPrefix("//") {
                                fullPlayPageUrlString = "https:" + fullPlayPageUrlString
                            } else if fullPlayPageUrlString.hasPrefix("/") {
                                fullPlayPageUrlString = "https://play.777tv.ai" + fullPlayPageUrlString
                            } else if !fullPlayPageUrlString.hasPrefix("http") {
                                fullPlayPageUrlString = "https://777tv.ai/" + fullPlayPageUrlString
                            }

                            let formattedPlayPageUrl: String
                            if rawEp.playPageUrl.hasPrefix("//") {
                                formattedPlayPageUrl = rawEp.playPageUrl
                            } else if rawEp.playPageUrl.hasPrefix("/") {
                                formattedPlayPageUrl = "//play.777tv.ai" + rawEp.playPageUrl
                            } else {
                                formattedPlayPageUrl = rawEp.playPageUrl
                            }

                            let finalPlayUrl = await fetchPlayUrl(from: fullPlayPageUrlString)

                            resolvedEpisodes.append(DramaEpisode(name: rawEp.name, playPageUrl: formattedPlayPageUrl, play_url: finalPlayUrl))
                            try await Task.sleep(nanoseconds: 200_000_000)
                        }
                        let resolvedLine = DramaLine(line_name: rawLine.lineName, episodes: resolvedEpisodes)
                        let lineJsonChars = (try? JSONEncoder().encode(resolvedLine)).flatMap { String(data: $0, encoding: .utf8) }?.count ?? 0
                        if totalSourcesJsonChars + lineJsonChars + 200 > sourcesJsonLimit {
                            continuation.yield(.processing(message: "⚠️ 線路「\(rawLine.lineName)」加入後將超過 \(sourcesJsonLimit) 字元限制，已捨棄此條及後續線路"))
                            hitLimit = true
                            break
                        }
                        finalLines.append(resolvedLine)
                        totalSourcesJsonChars += lineJsonChars
                    }

                    continuation.yield(.processing(message: "📊 實際儲存 \(finalLines.count) 條線路，線路資料 JSON 約 \(totalSourcesJsonChars) 字元"))
                    continuation.yield(.saving)
                    let drama = Drama(
                        id: ScraperSource.tv777.idPrefix + id,
                        name: title,
                        introduction: introduction,
                        cover_image: coverImageURL,
                        update_time: "",
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

    // MARK: - Gimyplus

    private func scrapeGimyplus(id: String) -> AsyncStream<ScrapeStatus> {
        AsyncStream { continuation in
            Task {
                do {
                    continuation.yield(.processing(message: "🚀 任務啟動：串接 Gimy+ ID \(id)"))

                    let targetURL = "https://gimyai.tw/detail/\(id).html"
                    guard let url = URL(string: targetURL) else { throw URLError(.badURL) }

                    continuation.yield(.processing(message: "正在取得網頁原始碼..."))
                    var request = URLRequest(url: url)
                    request.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", forHTTPHeaderField: "User-Agent")

                    let (data, response) = try await URLSession.shared.data(for: request)
                    if let httpResponse = response as? HTTPURLResponse,
                       !(200...299).contains(httpResponse.statusCode) {
                        throw NSError(domain: "ScraperEngine", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "遠端伺服器回傳錯誤代碼: \(httpResponse.statusCode)"])
                    }

                    guard let html = String(data: data, encoding: .utf8) else {
                        throw URLError(.cannotDecodeContentData)
                    }

                    continuation.yield(.processing(message: "正在使用 SwiftSoup 解析..."))
                    let document = try SwiftSoup.parse(html)

                    var title = try document.select("h1").first()?.text().trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                    if title.isEmpty { title = try document.title() }
                    if title.isEmpty || title.contains("404") {
                        throw NSError(domain: "ScraperEngine", code: 404, userInfo: [NSLocalizedDescriptionKey: "找不到影片標題或網頁已被移除"])
                    }

                    var coverImageURL = ""
                    if let metaImg = try document.select("meta[property=og:image]").first() {
                        coverImageURL = try metaImg.attr("content")
                    }
                    coverImageURL = normalizeURL(coverImageURL)

                    let introduction = try document.select("#desc .desc").first()?.text().trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

                    var rawSourcesArr: [(lineName: String, episodes: [(name: String, playPageUrl: String)])] = []
                    // 網站改版後：線路名稱在 .route-title，集數容器 .episodes-route 是它的下一個兄弟節點
                    let routeBlocks = try document.select(".episodes-route")
                    var totalEpisodesToFetch = 0

                    for block in routeBlocks.array() {
                        guard let titleEl = try block.previousElementSibling(), titleEl.hasClass("route-title") else { continue }
                        let lineName = try titleEl.text().trimmingCharacters(in: .whitespacesAndNewlines)
                        if lineName.isEmpty { continue }

                        var episodesList: [(name: String, playPageUrl: String)] = []
                        for el in try block.select("a.ep").array() {
                            episodesList.append((name: try el.text().trimmingCharacters(in: .whitespacesAndNewlines), playPageUrl: try el.attr("href")))
                            totalEpisodesToFetch += 1
                        }
                        if !episodesList.isEmpty {
                            rawSourcesArr.append((lineName: lineName, episodes: episodesList))
                        }
                    }

                    if rawSourcesArr.isEmpty {
                        throw NSError(domain: "ScraperEngine", code: -1, userInfo: [NSLocalizedDescriptionKey: "找不到任何播放線路，網站結構可能已再次改版"])
                    }

                    continuation.yield(.processing(message: "找到 \(rawSourcesArr.count) 條線路，準備抓取影片串流位址..."))

                    var processedCount = 0
                    var finalLines: [DramaLine] = []
                    var totalSourcesJsonChars = 0
                    let sourcesJsonLimit = 50000
                    var hitLimit = false

                    for rawLine in rawSourcesArr {
                        if hitLimit { break }
                        var resolvedEpisodes: [DramaEpisode] = []
                        for rawEp in rawLine.episodes {
                            processedCount += 1
                            continuation.yield(.parsing(message: "正在抓取", current: processedCount, total: totalEpisodesToFetch, line: rawLine.lineName, episode: rawEp.name))

                            let fullPlayPageUrl: String
                            if rawEp.playPageUrl.hasPrefix("/") {
                                fullPlayPageUrl = "https://gimyai.tw" + rawEp.playPageUrl
                            } else {
                                fullPlayPageUrl = rawEp.playPageUrl
                            }

                            let finalPlayUrl = await fetchPlayUrl(from: fullPlayPageUrl)

                            resolvedEpisodes.append(DramaEpisode(name: rawEp.name, playPageUrl: rawEp.playPageUrl, play_url: finalPlayUrl))
                            try await Task.sleep(nanoseconds: 200_000_000)
                        }
                        let resolvedLine = DramaLine(line_name: rawLine.lineName, episodes: resolvedEpisodes)
                        let lineJsonChars = (try? JSONEncoder().encode(resolvedLine)).flatMap { String(data: $0, encoding: .utf8) }?.count ?? 0
                        if totalSourcesJsonChars + lineJsonChars + 200 > sourcesJsonLimit {
                            continuation.yield(.processing(message: "⚠️ 線路「\(rawLine.lineName)」加入後將超過 \(sourcesJsonLimit) 字元限制，已捨棄此條及後續線路"))
                            hitLimit = true
                            break
                        }
                        finalLines.append(resolvedLine)
                        totalSourcesJsonChars += lineJsonChars
                    }

                    continuation.yield(.processing(message: "📊 實際儲存 \(finalLines.count) 條線路，線路資料 JSON 約 \(totalSourcesJsonChars) 字元"))
                    continuation.yield(.saving)
                    let drama = Drama(
                        id: ScraperSource.gimyplus.idPrefix + id,
                        name: title,
                        introduction: introduction,
                        cover_image: coverImageURL,
                        update_time: "",
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

    // MARK: - Shared helpers

    private func fetchPlayUrl(from urlString: String) async -> String {
        guard let url = URL(string: urlString) else { return "" }
        var req = URLRequest(url: url)
        req.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", forHTTPHeaderField: "User-Agent")

        guard let (playData, _) = try? await URLSession.shared.data(for: req),
              let playHtml = String(data: playData, encoding: .utf8) else { return "" }

        guard let range = playHtml.range(of: "var player_data=") ?? playHtml.range(of: "var MacPlayer=") else { return "" }

        if let openBraceIndex = playHtml[range.upperBound...].firstIndex(of: "{") {
            var braceCount = 0
            var closeBraceIndex: String.Index? = nil
            for index in playHtml.indices[openBraceIndex...] {
                switch playHtml[index] {
                case "{": braceCount += 1
                case "}":
                    braceCount -= 1
                    if braceCount == 0 { closeBraceIndex = index; break }
                default: break
                }
                if closeBraceIndex != nil { break }
            }
            if let closeIndex = closeBraceIndex,
               let jsonData = String(playHtml[openBraceIndex...closeIndex]).data(using: .utf8),
               let jsonObject = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
                return (jsonObject["url"] as? String) ?? (jsonObject["PlayUrl"] as? String) ?? ""
            }
        }
        return ""
    }

    private func normalizeURL(_ url: String) -> String {
        if url.hasPrefix("http://") {
            return url.replacingOccurrences(of: "http://", with: "https://")
        } else if url.hasPrefix("//") {
            return "https:" + url
        }
        return url
    }
}
