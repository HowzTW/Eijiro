# LinkPass V2 Apps Script 部署

## 1. 建立試算表

建立一份 Google 試算表。Apps Script 可以綁定在這份試算表，或使用獨立專案並設定 `SPREADSHEET_ID` Script Property。

## 2. 建立 Apps Script 專案

將此資料夾內的 `.gs` 與 `appsscript.json` 上傳至 Apps Script。若使用 clasp，先在此資料夾建立 `.clasp.json`，再執行：

```bash
npm run gas:login
npm run gas:push
```

## 3. 設定 Script Properties

在 Apps Script「專案設定 → 指令碼屬性」設定：

- `SPREADSHEET_ID`：獨立 Apps Script 專案必填。
- `SHEET_NAME`：選填，預設為 `links`。
- `ACCESS_KEY_SHA256`：選填；建議不要手動計算，改在 Apps Script 編輯器執行 `setAccessKey('你的裝置密碼')`。

接著在編輯器手動執行一次 `authorizeLinkPass()`，授權試算表與外部網頁讀取權限；若只需要建立或修復表頭，也可執行 `setupLinkPass()`。

## 4. 部署 Web App

1. 選擇「部署 → 新增部署作業」。
2. 類型選擇「網頁應用程式」。
3. 執行身分選擇部署者。
4. 存取權選擇所有人。
5. 複製結尾為 `/exec` 的網址。

將網址填入 `public/config.json`：

```json
{
  "apiUrl": "https://script.google.com/macros/s/.../exec",
  "requiresAccessKey": true,
  "refreshIntervalMs": 30000
}
```

若後端沒有設定裝置密碼，`requiresAccessKey` 必須保持 `false`。

## 工作表欄位

| 欄位 | 說明 |
| --- | --- |
| `id` | UUID |
| `created_at` | ISO 8601 UTC 時間 |
| `created_at_ms` | 排序用毫秒時間戳 |
| `url` | 完整網址 |
| `label` | 選填名稱；留空時會優先擷取目標網頁的 `<title>`，擷取不到則由前端顯示網域名稱 |
| `client_request_id` | 新增請求的冪等識別碼 |

API 只支援 `list`、`create`、`delete`。所有資料修改都由 `LockService` 保護，避免並行寫入互相衝突。自動擷取網頁標題使用 `UrlFetchApp`，私人網路與本機位址不會被請求。
