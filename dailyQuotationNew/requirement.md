# 每日箴言新版 (dailyQuotationNew) 系統設計規格書

## 專案目標
將原有的 `dailyQuotation/index.html` 改寫為一個具備「引導式 (Wizard)」流程的現代化 Web 應用程式。使用者將透過五個明確的步驟，逐步完成每日箴言小卡的設計與生成。

## 技術規格
- **存儲位置**: `dailyQuotationNew/`
- **主要檔案**: `index.html`, `style.css`, `script.js` (建議拆分以利維護)
- **資料來源**: `dailyQuotationNew/data-cht.json`
- **第三方函式庫**: 
  - `html2canvas`: 用於產生小卡截圖。
  - `Google Fonts`: Noto Sans TC, Montserrat。
  - `Material Symbols`: 圖示系統。

## UI/UX 設計原則
- **華麗動畫**: 步驟切換時應有流暢的轉場動畫（如：Fade, Slide, 或 Glassmorphism 效果）。
- **進度指示**: 畫面上方或側邊應顯示當前步驟。
- **直覺操作**: 按鈕與輸入框需具備高品質的視覺反饋。

---

## 流程步驟說明

### 第 1 步：選擇日期
- **功能**: 使用者選擇目標日期。
- **預設值**: 進入頁面時預設為「當日」。
- **動作**: 選擇日期後，顯示「下一步」按鈕。

### 第 2 步：編輯箴言內容
- **功能**: 從 `data-cht.json` 讀取選定日期的資訊。
- **讀取欄位**: `<content>`, `<source>`, `<background>`, `<background-eng>`。
- **UI 元素**: 顯示一個多行文字方塊 (Textarea)，預填該日期的 `<content>`。
- **動作**: 允許使用者修改文字。不論是否修改，均可點擊「下一步」。

### 第 3 步：生成 AI 提示詞 (Prompt)
- **功能**: 建立用於生成背景圖片的提示詞。
- **提示詞模板**: 
  > A professional 3:4 vertical masterpiece photography featuring {{background-eng}} ({{background}}). Focus only on the scenery and atmosphere. Strictly prohibit any text, writing, alphabets, or signatures. Cinematic lighting, photorealistic, 8k resolution, clean background.
- **邏輯**: 自動將預留位替換為該日期的背景描述。
- **UI 元素**: 
  - 多行文字方塊：顯示生成的提示詞，允許手動微調。
  - 「送給 ChatGPT」按鈕：將提示詞複製到剪貼簿並跳轉到 ChatGPT。實作參考：
    ```javascript
    function sendToChatGPT(promptText) {
      // 先複製到剪貼板（備用）
      navigator.clipboard.writeText(promptText).catch(() => {});
      
      // 再跳轉到 ChatGPT（Universal Link）
      const url = `https://chat.openai.com/?q=${encodeURIComponent(promptText)}`;
      window.location.href = url;
    }
    ```
  - 「下一步」按鈕。

### 第 4 步：上傳與預覽圖片
- **功能**: 使用者提供背景圖片。
- **操作**: 提供上傳功能（點擊或拖放）。
- **預覽**: 上傳後立即在畫面顯示圖片預覽。
- **動作**: 確認圖片滿意後，點擊「下一步」。

### 第 5 步：產生與下載小卡
- **功能**: 生成最終的每日箴言小卡。
- **規格**: 固定尺寸 **1500x2000** 像素。
- **樣式**: 完全沿用 `dailyQuotation/index.html` 的視覺設定（字體、間距、裝飾、Logo 等）。
- **動作**: 提供「下載截圖」按鈕，執行 `html2canvas` 擷取並存檔。

---

## 通用操作規則
- **返回功能**: 從第 2 步到第 5 步，皆提供「回上一步」按鈕。
- **重來功能**: 從第 2 步到第 5 步，皆提供「取消並重來」按鈕，點擊後直接回到「第 1 步」並重設所有暫存狀態。
- **高度與自適應**: 小卡顯示不需考慮不同螢幕尺寸，顯示及下載時必須維持 1500x2000 的比例與解析度。
