# 資料結構說明

主檔為 `restaurants.json`，最外層包含 `metadata`、`enums` 與 `restaurants`。

## metadata

| 欄位 | 型別 | 說明 |
|---|---|---|
| `title` | string | 資料集名稱 |
| `version` | string | 語意版本 |
| `lastUpdated` | date | 主要查核日期，`YYYY-MM-DD` |
| `language` | string | 主要內容語言 |
| `currency` | string | 價格幣別 |
| `recordCount` | integer | 餐廳筆數 |

## restaurant record

| 路徑 | 型別 | 說明 |
|---|---|---|
| `id` | string | 穩定、唯一、URL 友善的主鍵 |
| `name.zhTw/ko/en` | string | 多語餐廳名稱；無正式中文名時沿用英文 |
| `chef.nameZhTw/nameKo/nameEn` | string | 主廚多語姓名 |
| `chef.season` | integer | 1 或 2 |
| `chef.team` | enum | `white-spoon`、`black-spoon` |
| `chef.showNickname.*` | object/null | 黑湯匙節目稱號的多語名稱 |
| `chef.affiliationStatus` | enum | `owner-chef`、`executive-chef`、`operator`、`historical` |
| `chef.affiliationNotes` | string/null | 主廚與餐廳關係的補充 |
| `restaurant.status` | enum | `open`、`temporarily-closed`、`closed`、`upcoming`、`unknown` |
| `restaurant.cuisine` | string[] | 料理類型 |
| `restaurant.description` | string | 簡短介紹，不取代正式菜單 |
| `restaurant.district.*` | object | 行政區多語名稱 |
| `restaurant.neighborhood.*` | object | 街區多語名稱；不確定時可為 `null` |
| `restaurant.address.*` | object | 地址；韓文地址可為 `null` |
| `restaurant.coordinates` | object | `latitude`、`longitude`；未核實時為 `null` |
| `booking.required` | boolean | 一般情況是否建議／需要預約 |
| `booking.catchTableAvailable` | boolean | 是否有店家頁或等候頁 |
| `booking.catchTableUrl` | string/null | CatchTable 直接店家頁 |
| `booking.bookingMode` | string[] | 如 `reservation`、`remote-waitlist`、`walk-in`、`instagram-announcement` |
| `booking.bookingDifficulty` | integer | 1–5，數值愈高愈難 |
| `booking.bookingNotes` | string | 開放規則、限制或注意事項 |
| `maps.naverMapUrl` | string/null | Naver Maps 店家短連結或直接店家頁 |
| `maps.naverLinkType` | enum | `direct-place`、`short-direct`、`search`、`missing` |
| `maps.googleMapsUrl` | string/null | Google Maps 店家短連結 |
| `pricing.priceLevel` | integer | 1–5 |
| `pricing.lunchKrw/dinnerKrw` | integer/null | 已知套餐價格或預算參考 |
| `pricing.averagePerPersonKrw` | integer/null | 規劃預算的約值 |
| `pricing.priceNotes` | string | 是否為套餐、酒水另計等 |
| `features.*` | boolean/null | Fine dining、單人友善、酒搭餐、英文友善等特性 |
| `recommendation.hataroScore` | number | 1–5，可有 0.5 |
| `recommendation.priorityTier` | enum | `S`、`A`、`B`、`C` |
| `recommendation.worthDetour` | boolean | 是否值得專程前往 |
| `recommendation.bestFor` | string[] | 適合情境 |
| `recommendation.eijiroComment` | string | 衛次郎短評 |
| `recommendation.cautions` | string[] | 使用者應先知道的限制 |
| `media.officialWebsite` | string/null | 官方網站 |
| `media.instagramUrl` | string/null | 官方 Instagram |
| `sources[]` | object[] | 來源名稱、網址、查核日與用途 |
| `tags` | string[] | 顯示與搜尋輔助標籤 |

## 評分規則

### `bookingDifficulty`

| 值 | 意義 |
|---:|---|
| 1 | 多半可現場候位或短期內安排 |
| 2 | 建議提前數日 |
| 3 | 建議提前 1–2 週 |
| 4 | 熱門，需要掌握開放時間 |
| 5 | 極難預約或大量搶位 |

### `priceLevel`

| 值 | 約略人均 |
|---:|---:|
| 1 | ₩20,000 以下 |
| 2 | ₩20,000–50,000 |
| 3 | ₩50,000–100,000 |
| 4 | ₩100,000–200,000 |
| 5 | ₩200,000 以上 |

### `priorityTier`

- `S`：若只能選少數餐廳，值得優先考慮。
- `A`：值得安排，餐廳本身具有足夠特色。
- `B`：順路、預算適合或特別喜歡主廚時再去。
- `C`：資訊保留，但不優先；歷史名店通常歸此級。

`hataroScore` 偏重作品與體驗本身，不只看主廚名氣；`priorityTier` 另考慮價格、交通、可訂性與首爾獨特性，因此兩者不必完全同步。

## 缺值與前端處理

- 未可靠核實的資料一律使用 `null`，不可用空字串冒充已知值。
- `coordinates` 為 `null` 時，不應在內建地圖上自行插針；改顯示 Naver Maps 按鈕。
- `status != "open"` 時，卡片需有醒目狀態標籤，且不可顯示「立即預約」。
- `catchTableAvailable = true` 只表示店家頁存在；是否有位需使用者開啟頁面即時確認。
- CSV 中陣列以 `|` 分隔，布林值使用 `true/false`，缺值留空。
