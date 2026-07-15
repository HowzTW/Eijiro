# 《哈太郎首爾美食朝聖指南：黑白大廚篇》資料包

這是一份可直接交給 Codex 建立 Web App 的資料包，聚焦《黑白大廚：料理階級大戰》第一、二季中目前可在首爾造訪、且具代表性的餐廳；另保留一間重要已歇業餐廳作歷史資訊。

## 檔案

- `restaurants.json`：Web App 主資料，共 18 筆餐廳資料。
- `restaurants.csv`：方便試算表檢視與人工校對的扁平版。
- `data-schema.md`：欄位、列舉值、評分與缺值規則。
- `source-notes.md`：查核方式、來源層級、已知限制與逐筆備註。

## 收錄範圍

- 第一季：8 間目前營業餐廳。
- 第二季：9 間目前營業餐廳。
- 歷史資料：崔康祿的 Neo（2024 年歇業）1 間。
- 地理範圍：首爾市內；不收錄濟州、釜山、京畿與海外分店。

## 重要使用提醒

1. `status = "open"` 表示查核時有近期官方、CatchTable、Naver Maps 或權威旅遊／餐飲來源支持其仍營業，不代表當天一定營業。
2. 餐廳營業時間、套餐價格與開放訂位日經常變動；App 應把 CatchTable、Naver Maps 與官方 Instagram 按鈕放在醒目位置。
3. `catchTableAvailable = true` 代表存在可用的店家頁，不一定代表目前有可訂時段；Via Toledo 在查核時的 CatchTable 頁仍存在，但公開資訊顯示預約曾暫停，應以 Instagram 公告為準。
4. Naver Maps 欄位均使用店家短連結或已解析的店家頁；短連結仍可能由 Naver 重新導向。
5. 價格數字是規劃預算用的約值或公開可見價格，不應當成即時菜單。前端建議顯示「約」及「請以店家頁為準」。
6. 座標在這一版刻意保留為 `null`：沒有可靠地逐筆取得官方座標時，不用地址推估，以免地圖釘錯店。Web App 可先以 Naver Maps 連結開啟位置。

## 建議 Web App 功能

- 依季別、黑／白湯匙、行政區、料理類型、價位、推薦分級、營業狀態篩選。
- 預設隱藏 `closed`，提供「顯示歷史名店」切換。
- 可依 `hataroScore`、`bookingDifficulty`、`averagePerPersonKrw` 排序。
- 每張卡片顯示 Naver Maps、Google Maps、CatchTable、Instagram／官網按鈕。
- 對 `bookingNotes`、`cautions`、`chef.affiliationNotes` 使用明顯提示。
- 收藏功能可先使用瀏覽器 `localStorage`。

## 更新資訊

- 資料版本：`1.0.0`
- 主要查核日期：`2026-07-14`
- 語言：繁體中文（zh-TW），並保留韓文與英文名稱
- 幣別：韓元（KRW）
