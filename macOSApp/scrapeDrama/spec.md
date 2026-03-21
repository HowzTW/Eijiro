# 抓劇小幫手 (Drama Scraper Assistant) - macOS App 設計規格書

## 1. 專案概述
本專案旨在將現有的 `scrapeDrama` Web 應用程式 (抓劇小幫手) 轉換並原生化為 macOS 桌面應用程式。該應用程式允許用戶檢視已抓取的劇集庫、刪除不需要的劇集，以及透過 777TV 的劇集 ID 啟動新的抓取任務並即時監控抓取進度。

## 2. 技術選型 (Tech Stack)
* **UI 框架**: SwiftUI (為 macOS 提供現代化與原生的使用者體驗)
* **架構模式**: MVVM (Model-View-ViewModel)
* **網路層**: `URLSession` (用於呼叫 GAS API 以及抓取目標網站 HTML)
* **HTML 解析**: `SwiftSoup` 或類似套件 (用於在本地端直連解析目標網站結構)
* **非同步處理**: Swift Concurrency (`async/await`, `Task`)
* **最低系統需求**: macOS 13.0 (Ventura) 或以上版本 (建議)

## 3. 核心功能與行為映射

### 3.1 導覽結構 (Navigation)
*   **Web 實作**: 頂部 Header 包含導覽按鈕切換「新增劇集」與「返回管理」，以及前往「小鴨影音」的外連按鈕。
*   **macOS 實作**: 採用 macOS 標準的 **Sidebar (側邊欄)** 或 **TabView (頂部標籤)** 進行導覽，並在 Toolbar 中放置「開啟小鴨影音 (777TV)」的捷徑按鈕。
    *   選項一：管理劇集 (Dashboard / Library)
    *   選項二：新增劇集 (Scraper)

### 3.2 畫面一：管理劇集 (Dashboard View)
*   **功能**:
    *   啟動時呼叫 `GET /api/list-dramas` 獲取劇集清單。
    *   若無資料或載入中，顯示對應的 Empty State 或 ProgressView。
    *   依據 `update_time` 將清單進行降冪排序（最新更新的排在前面）。
    *   使用 `LazyVGrid` 呈現劇集卡片 (Drama Card)。
*   **卡片設計**:
    *   顯示劇集封面 (`cover_image`，若無則顯示佔位圖)。可以使用 `AsyncImage`。
    *   顯示劇集名稱 (`name`)，限制最多顯示兩行 (`lineLimit(2)`)。
    *   提供一個刪除按鈕 (Trash Icon)。
*   **刪除流程**:
    *   點選刪除時，跳出 macOS 標準 Confirmation Dialog (`.confirmationDialog` 或是 `Alert`)，詢問「確定要從資料庫中移除這部劇集嗎？」。
    *   確認後呼叫 `POST /api/delete-drama`，傳入 `{ id }`。
    *   伺服器回傳成功後，將該項目從 ViewModel 的陣列中移除，搭配 SwiftUI 預設的動畫效果。

### 3.3 畫面二：新增劇集 (Scrape View)
*   **功能**:
    *   提供一個 `TextField` 讓用戶輸入「777TV 劇集 ID」(例如 `351808`)。
    *   點擊「啟動任務」按鈕開始抓取。
*   **任務執行狀態 (Progress & Logs)**:
    *   點擊按鈕後，按鈕反灰 (Disabled)，並顯示狀態區塊。
    *   在背景透過 `URLSession` 直接請求 777TV 目標網頁 HTML，並使用 `SwiftSoup` 進行解析。
    *   應用程式內部藉由 `async/await` 與 `AsyncStream` 實作自定義的進度匯報機制 (取代原本的 SSE)。
    *   更新狀態：隨著解析器每處理完一集，即時推進 `ProgressView` (進度條) 與百分比文字；並將當前處理的「線路」與「集數」資訊附加到下方的 Console 終端機日誌。
    *   **終端機日誌 (Console Log)**: 實作一個 ScrollView 包覆的 Text 列表，背景設定為黑色，字體為綠色等寬字體，模擬原 Web 版本黑窗的 Hacker 感。每當收到日誌更新，自動滾動到最底層。
*   **任務完成**:
    *   當所有線路與集數解析完畢，將結果彙整為 JSON 格式並呼叫 GAS API (`POST`) 寫入試算表。
    *   若成功寫入：恢復「啟動任務」按鈕狀態，顯示成功面板 (Success Panel)，展示劇集封面與名稱。
    *   若過程中發生網路或解析失敗：透過 alert 顯示錯誤訊息。

## 4. 資料庫介面規格 (GAS Backend)

本 macOS App 作為完全獨立 (Standalone) 的應用程式，資料存取將直接與後端 Google Apps Script (GAS) 溝通，不再依賴任何 Node.js 中介伺服器。

*   **Google Apps Script (GAS) 網址:**
    `https://script.google.com/macros/s/AKfycbzwHa2fa4e_QdyfD3z01tXepwY9ZyY98UlS_6mjVGOsPZaoHVloSyEc9_kJniuNn2_X/exec`

### 4.1 資料庫操作 (CRUD)

*   **讀取劇集清單:**
    *   **Method:** `GET` (呼叫 GAS 網址)
    *   **Response:** JSON 陣列。包含欄位：`id`, `name`, `introduction`, `cover_image`, `update_time`, `sources`。

*   **刪除劇集:**
    *   **Method:** `POST` (呼叫 GAS 網址)
    *   **Content-Type:** `application/json`
    *   **Body:**
        ```json
        {
          "action": "delete",
          "id": "劇集ID"
        }
        ```
    *   **Response:** 字串回覆 (例如 `"Deleted ID: {id}"` 或 `"ID Not Found"`)。

*   **新增/更新劇集 (本地爬蟲完成後的寫入):**
    *   **註**: 應用程式在本地完成對 777TV 的 HTML 解析後，會將最終結果透過此 API 寫入雲端資料庫。
    *   **Method:** `POST` (呼叫 GAS 網址)
    *   **Body:**
        ```json
        {
          "id": "劇集ID",
          "name": "劇集名稱",
          "introduction": "簡介",
          "cover_image": "圖片網址",
          "sources": [{"name": "線路一", "episode": "01", "url": "..."}] 
        }
        ```
    *   **Response:** 字串回覆 (例如 `"Inserted ID: {id}"` 或 `"Updated ID: {id}"`)。

## 5. UI/UX 建議與細節
*   **深色模式適配**: 原 Web 版使用了深藍底色 (`#0f172a`) 與琥珀色主色 (`#f59e0b`)。在 macOS 版中，可以考慮預設支援全系統的深色/淺色模式，或強制使用帶有原風格的客製化 Color Scheme。
*   **Hover Effects**: 針對 macOS 鼠標體驗，在 `DramaCard` 實作 `.onHover` 效果。
*   **Window Management**: 允許使用者調整視窗大小，`LazyVGrid` 應設定合適的 `GridItem(.adaptive(minimum: 180))` 以流暢響應視窗寬度變化。

## 6. 後續開發步驟建議
1.  建立 Xcode macOS 專案，將 Deployment Target 設為 macOS 13.0+。
2.  透過 Swift Package Manager (SPM) 引入 `SwiftSoup` 模組。
3.  建立 `Models` 來映射 GAS API JSON 結構與網頁 HTML 節點結構。
4.  實作 `NetworkManager` 處理與 GAS 之間的 REST API 通訊。
5.  實作 `ScraperManager` 處理解析邏輯 (HTML Fetching, DOM Traversal)。
6.  實作 `DashboardViewModel` 與 `ScrapeViewModel` (串接狀態與 UI 進度條)。
7.  開發 SwiftUI 畫面進行最終串接測試。
