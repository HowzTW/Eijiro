# Hatarō KoreanNote

新版 KoreanNote 的 Vue 原始碼。內容由 Google Sheets 與 Apps Script API 提供，並產生可直接放在 GitHub Pages 的靜態網站。

## 目錄分工

- `src/`：網站畫面、互動與固定主題內容
- `gas/`：Google Apps Script API 的版本控管副本
- `../../koreanNoteV2/`：執行正式建置後產生的 GitHub Pages 靜態檔案

## 本機指令

```sh
npm install
npm run dev
npm run build
```

正式建置會更新儲存庫根目錄下的 `koreanNoteV2/`，不會碰觸既有的 `koreanNote/`。
