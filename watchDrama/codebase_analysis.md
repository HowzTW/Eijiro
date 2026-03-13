# 「追劇小幫手」(Watch Drama Assistant) 程式碼解讀

這個專案是一個現代化的、以使用者為中心的追劇 Web App，專為簡單易用且具備跨裝置同步進度而設計。

## 🏗️ 系統架構

該系統採用 **SPA (單頁式應用程式)** 架構，並結合 Google Apps Script (GAS) 作為後端。

*   **前端 (Frontend):** 純 HTML/CSS/JS (Vanilla JS)，支援 PWA，可安裝至桌面或手機。
*   **後端 (Backend - GAS):**
    *   **GAS-1:** 提供全球劇集資料庫（片名、封面、播放來源線路）。
    *   **GAS-2:** 處理使用者私有資料（追蹤清單、播放進度）。
*   **資料存儲 (Storage):**
    *   **雲端:** Google Sheets (Users, UserLibrary, UserProgress 工作表)。
    *   **本地:** `localStorage` 用於快取資料與記憶使用者身份。

---

## 📱 前端邏輯分析 (`index.html`)

### 1. 導覽與檢視管理
程式透過 `showView(viewId)` 切換不同的畫面（Views），包括：
*   `userView`: 使用者登入/選擇畫面。
*   `homeView`: 個人追劇清單（依最後觀看時間排序）。
*   `libraryView`: 管理介面，可從全球資料庫中「追蹤」或「取消追蹤」劇集。
*   `playerView`: 影音播放頁面。

### 2. 播放器與 HLS 支援
*   使用了 `hls.js` 庫來支援 `.m3u8` 格式的串流播放。
*   **續播功能:** 開啟播放頁面時，會自動讀取該劇集的 `UserProgress`，定位到上次看的線路與集數，並從記錄的 `timestamp` 處繼續播放。
*   **自動連播:** 影片結束 (`onended`) 時自動跳轉至下一集。

### 3. 進度同步機制
*   **本地更新:** 播放時每秒更新 `localStorage` 中的進度。
*   **雲端同步:** 影片暫停或切換頁面時，透過 `fetch` 並開啟 `keepalive: true` 確保進度即時寫回 GAS-2。

---

## ⚙️ 後端邏輯分析 (`funcWatchDrama.gs`)

這是一個簡單且強大的 API，定義了以下操作：
*   **`get_users`**: 取得所有可選的使用者。
*   **`get_user_data`**: 一次取得該使用者的追蹤清單與各劇進度。
*   **`toggle_follow`**: 處理追蹤/取消追蹤邏輯。取消追蹤時會同步清理播放進度以節省空間。
*   **`update_progress`**: 記錄使用者在特定劇集的線路、集數與播放秒數。

---

## 🎨 UI/UX 特色
*   **長輩友善:** 使用了 `Outfit` 字體與 `Material Symbols`，按鈕與文字都經過加大處理，操作直覺。
*   **回饋感強:** 追蹤中、播放中、已看過的集數都有明顯的高亮 (Highlight) 顯示。
*   **快取機制:** 即使在網路不穩時，也能先透過 `localStorage` 顯示首頁內容，提升加載速度感。

---

## 📂 相關檔案說明
*   [index.html](file:///Users/Howz/Documents/Eijiro/watchDrama/index.html): 核心前端程式。
*   [funcWatchDrama.gs](file:///Users/Howz/Documents/Eijiro/watchDrama/funcWatchDrama.gs): GAS 後端 API 邏輯。
*   [setupDatabase.gs](file:///Users/Howz/Documents/Eijiro/watchDrama/setupDatabase.gs): 初始化 Google Sheets 資料庫結構。
*   [requirement.md](file:///Users/Howz/Documents/Eijiro/watchDrama/requirement.md): 詳細功能開發需求文件。
