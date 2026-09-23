# LinkPass V2

LinkPass V2 是以手機與電視瀏覽器為主要使用情境的共用連結清單。前端部署在 GitHub Pages，資料由 Google Apps Script API 寫入 Google 試算表。

## 本機開發

```bash
npm install
npm run dev
```

`public/config.json` 的 `apiUrl` 必須填入已部署的 Apps Script Web App `/exec` 網址。

## 建置 GitHub Pages 版本

```bash
npm run build
```

建置結果會輸出到 repository 根目錄的 `linkPassV2/`。提交原始碼與建置結果後，push `main` 即可沿用現有 GitHub Pages 部署方式。

## 測試

```bash
npm test
```

## Apps Script

部署步驟請參考 [gas/README.md](gas/README.md)。
