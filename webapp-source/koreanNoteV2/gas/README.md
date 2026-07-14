# KoreanNote Content API

這個資料夾保存 Google 試算表綁定的 Apps Script 原始碼，讓 API 與前端一起進行版本控管。

- 試算表：[KoreanNote Content Database](https://docs.google.com/spreadsheets/d/1qPUjq5dY-rYekMKFWomcHvh8bd-fSubHOm83ykvxkxc/edit)
- 正式 API：`https://script.google.com/macros/s/AKfycbzGO29bI1z02CvF-RZsPDyZjrx63kQ3m_FYg9bMfmuP83FRUeIJ2eJxkJ-fAWhLSPPRGg/exec?action=content`
- 健康檢查：在網址最後使用 `?action=health`

## 維護方式

線上 Apps Script 是目前正式執行版本。若未來要用 clasp 同步，先在專案根目錄執行 `npm run gas:login`，再於本資料夾建立只供本機使用的 `.clasp.json` 並填入綁定專案的 Script ID。這個檔案已排除於 Git 版本控管之外，避免把個人環境設定提交進儲存庫。
