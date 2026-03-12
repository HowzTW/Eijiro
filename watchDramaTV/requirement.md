# 追劇小幫手 (Watch Drama Assistant) TV App 系統需求規格書 (SRS)

## 1. 專案簡述
本專案旨在將現有的網頁版「追劇小幫手」移植並開發為 **Android TV 原生應用程式**。該應用程式將提供電視遙控器友善的介面 (DPad Navigation)，讓使用者能在 Android TV 裝置上無縫接軌網頁版的追劇進度，享受大螢幕的觀影體驗。

## 2. 系統架構與資料來源
App 將不直接連接傳統資料庫，而是透過串接現有的兩組 Google Apps Script (GAS) API 來取得全域劇庫資料與個人使用者狀態。

### 2.1 API 通訊協定
- 所有 API 回應格式均為 `JSON`。
- 跨來源資源共用 (CORS) 均已於 GAS 端處理，可直接發起 HTTP 請求。

---

## 3. API 介接規格說明

### 3.1 GAS 1 (Global Drama Database)
- **用途**：取得所有爬蟲擷取的劇集名稱、劇情介紹、封面圖片與播放線路 (m3u8 解析網址)。
- **Endpoint URL**: `https://script.google.com/macros/s/AKfycbzwHa2fa4e_QdyfD3z01tXepwY9ZyY98UlS_6mjVGOsPZaoHVloSyEc9_kJniuNn2_X/exec`
- **Method**: `GET`
- **Request Body**: 無
- **Response Format**:
  ```json
  [
    {
      "id": "351808",
      "name": "劇名",
      "introduction": "劇情介紹...",
      "cover_image": "https://...",
      "time": "2024-03-12T...",
      "sources": "[{\"line_name\":\"南亞線路\",\"episodes\":[{\"name\":\"第01集\",\"play_url\":\"https://.../index.m3u8\"}]}]" 
    }
  ]
  ```
  *(註：`sources` 欄位為 Stringified JSON Array，需在客戶端再次 Parse)*

### 3.2 GAS 2 (User State & Progress)
- **用途**：管理「使用者切換」、「我的追蹤清單」以及「精確的觀看進度 (集數與秒數)」。
- **Endpoint URL**: `https://script.google.com/macros/s/AKfycbzw88UmoJlK2n8CNn65QsitfC0N4OUk3I4WbDB72gCwj7ptR4i_A5hoI8aDuEGpHfks/exec`

#### 3.2.1 取得所有使用者清單
- **Method**: `GET`
- **Query Parameter**: `?action=get_users`
- **Response**: `[{"userId": "UUID", "userName": "用戶名"}]`

#### 3.2.2 取得單一使用者的追劇清單與進度
- **Method**: `GET`
- **Query Parameter**: `?action=get_user_data&userId={userId}`
- **Response**:
  ```json
  {
    "library": [
      { "dramaId": "351808", "lastWatchedDate": "2024-03-12T..." }
    ],
    "progress": [
      { 
        "dramaId": "351808", 
        "lineName": "南亞線路", 
        "episodeName": "第01集", 
        "timestamp": 125 
      }
    ]
  }
  ```
  *(註：`timestamp` 單位為秒)*

#### 3.2.3 更新追蹤清單 (加入 / 移除)
- **Method**: `POST`
- **Body Content-Type**: `application/json`或字串化的 JSON
- **Payload**:
  ```json
  {
    "action": "toggle_library",
    "userId": "UUID",
    "dramaId": "351808"
  }
  ```
- **Response**: `{"status": "success", "message": "..."}`

#### 3.2.4 更新觀看進度 (含續播秒數)
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "action": "update_progress",
    "userId": "UUID",
    "dramaId": "351808",
    "lineName": "南亞線路",
    "episodeName": "第01集",
    "timestamp": 125
  }
  ```

---

## 4. 功能需求 (Functional Requirements)

### 4.1 使用者切換 (User Switcher)
- 首次開啟 App 時，需顯示全螢幕的使用者選擇介面 (`get_users` API)。
- 支援方向鍵聚焦 (Focus) 與選擇。
- 選定後記住該使用者 UUID 作為 API 參數，並可透過選單隨時登出/切換帳號。

### 4.2 首頁：我的追劇清單 (Dashboard)
- 進入 App 後的主畫面。
- 讀取 GAS 2 的 `library`，對應 GAS 1 的 `globalDramaList` 渲染成網格 (Grid) 列表。
- 電視版卡片排版：
  - 需支援 Focus 狀態 (放大、邊框高亮)。
  - 顯示封面圖、劇名、最新觀看進度 (`lineName` + `episodeName`)。
- 排序邏輯：依據 GAS 2 的 `lastWatchedDate` 降冪排列。

### 4.3 找劇 / 管理清單 (Global Library API)
- 提供一個獨立頁面列出 GAS 1 的所有劇集。
- 可用方向鍵瀏覽，按下 OK 鍵觸發 `toggle_library` (加入或移除追蹤)。
- 需有明顯的 UI 標示哪些劇集已經在「我的追劇清單」中。

### 4.4 播放器視圖與選集介面 (Player & Episodic UI)
- **進入點**：從首頁點擊卡片。
- **介面佈局**：
  - 上方：影片播放器預覽區 (可全螢幕切換)。
  - 下方：選集列表 (以 Horizontal 或是 Grid 呈現，需支援遙控器快速導覽)。
  - 右側/特定區：顯示該戲劇的簡介。
- **續播與預載還原功能**：
  - 基於 GAS 2 下載的 `progress`，自動 Focus 上次觀看的線路與集數按鈕。
  - 當開始播放該集時，若有大於 0 的 `timestamp` 紀錄，播放器必須自動 `SeekTo` 該秒數開始播放。
- **進度回報**：
  - 當使用者暫停播放，或按下遙控器「返回鍵(Back)」離開播放介面時，觸發 API 呼叫 `update_progress`，上報影片當前的秒數。
- **自動下一集**：
  - 監聽 ExoPlayer / MediaPlayer 的 `onCompletion` 事件，若該線路有下一集，自動切換播放資源並開始播放。

## 5. 非功能需求 (Non-Functional Requirements)
- **遙控器兼容 (DPad Navigation)**：所有的按鈕、卡片、清單必須能夠透過 Android TV 原生的 `KEYCODE_DPAD_UP/DOWN/LEFT/RIGHT` 輕易導航，並有明顯的 `.focused` UI 反饋。
- **影片解碼支持**：必需使用支援 HLS (`.m3u8`) 直播串流協定的播放器核心，建議使用 Google 原生的 **ExoPlayer** (目前為 Media3 專案)。
- **資料快取 (Caching)**：雖然本機空間不如網頁 LocalStorage 直覺，但建議實作基礎的 API Response Cache，加速首頁冷啟動 (Cold Start) 的渲染速度。
