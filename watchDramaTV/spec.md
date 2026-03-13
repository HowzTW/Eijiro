# 追劇小幫手 (Watch Drama Assistant) - Google TV App 系統開發設計規格書

## 1. 專案概述
本專案為「追劇小幫手」的 Android TV (Google TV) 版本開發設計規格書。目標是移植現有 Web 版的核心功能，利用相同的 Google Apps Script (GAS) 後端，為電視大螢幕提供最佳化的追劇體驗。

### 1.1 核心目標
- **精簡化移植**：僅移植 `userView` (使用者切換)、`homeView` (個人清單)、`playerView` (播放器) 三大核心功能。
- **後端一致性**：直接介接現有的 GAS-1 與 GAS-2 API，確保進度在網頁與電視間無縫同步。
- **電視原生體驗**：採用 Leanback 介面規範或現代的電視網格排版，完全支援遙控器 (DPad) 操作。

---

## 2. 系統架構
本 App 採用 **Kotlin** 與 **Jetpack Compose for TV** (或傳統 Leanback UI) 開發。

- **網路層**：使用 `Retrofit` 或 `OkHttp` 介接 GAS API。
- **資料層**：整合 `SharedPreferences` (儲存 `userId`) 與 `Room` (可選，作為 API 快取)。
- **播放核心**：使用 **Media3 ExoPlayer**，支援 HLS (`.m3u8`)。

---

## 3. 介面設計規格 (UI/UX)

### 3.1 導航與交互規範
- **遙控器導覽**：所有元素必須具備清晰的 `Focus` 狀態（如：縮放、邊框高亮、陰影加深）。
- **色彩系統**：延續網頁版暗色系風格 (`#0f172a`, `#1e293b`)，搭配品牌色 `#f59e0b`。

### 3.2 功能模組詳細規格

#### A. 使用者選擇頁面 (User Selection View)
- **進入邏輯**：App 啟動時若無緩存 `userId`，或點擊「切換帳號」時進入。
- **UI 佈局**：畫面中心水平排列使用者卡片。
- **資料來源**：`GAS-2?action=get_users`。
- **行為**：點擊卡片後將 `userId` 存入 `SharedPreferences` 並跳轉至首頁。

#### B. 首頁：我的追劇清單 (Home View)
- **UI 佈局**：上方顯示品牌 Logo，下方為劇集網格 (Grid)。
- **資料同步**：
    1. 從 `GAS-2?action=get_user_data&userId={userId}` 取得 `library` 與 `progress`。
    2. 與 `GAS-1` 取得的全域劇清單進行比對，過濾出該使用者追蹤的劇。
- **卡片顯示**：
    - 封面圖片。
    - 劇名（放大字體）。
    - 播放進度標籤（例如：「第 05 集」或「上次觀看到 12:30」）。
- **排序**：嚴格依照 `lastWatchedDate` 由新到舊排序。

#### C. 播放頁面 (Player View)
- **進入點**：從首頁點擊劇集卡片進入。
- **播放邏輯**：
    1. 自動讀取該劇集的 `progress` 資料。
    2. 直接載入對應線路與集數的 `play_url`。
    3. **自動續播**：若 `timestamp` > 0，則 `seekTo` 該秒數。
- **選集控制 (Overlay UI)**：
    - 播放時按下遙控器「向下」或「OK」鍵呼叫出選集選單。
    - 顯示線路切換標籤。
    - 以單列水平清單顯示所有集數，並高亮當前播放集。
- **進度回報**：
    - 當「暫停」、「按返回鍵離開」或「App 進入背景」時，立即發送 `update_progress` POST 請求至 GAS-2。
- **自動播放下一集**：當影片結束時，若有下一集則自動切換 URL 播放。

---

## 4. 資料介接 (Shared Backend)

本 App 完全共用 `watchDrama/` 之 API 邏輯：

| 功能 | 方法 | 參數 | 說明 |
| :--- | :--- | :--- | :--- |
| **讀取劇集** | `GET` | (GAS-1 URL) | 取得所有劇集資訊與 JSON 線路 |
| **使用者清單** | `GET` | `action=get_users` | |
| **個人狀態** | `GET` | `action=get_user_data` | 獲取 `library` 與 `progress` |
| **更新進度** | `POST` | `action=update_progress` | 回傳 `dramaId`, `lineName`, `episodeName`, `timestamp` |

---

## 5. 技術重點與挑戰
1. **WebView 依賴排除**：由於是電視 App，應使用 Android 原生 `ExoPlayer` 以保證播放流暢度，避免使用 Webview。
2. **大字體設計**：所有文字級距需符合電視觀看距離 (10-foot UI)。
3. **穩定性**：GAS API 連線時間有時較長，需實作良好的 Loading 動態效果與超時重新嘗試機制。
