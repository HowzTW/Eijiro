# 來源與查核備註

## 查核原則

本資料包不把前述 ChatGPT 對話中的餐廳資訊視為事實，而是重新核對。來源優先順序如下：

1. 餐廳官方網站、官方 Instagram、飯店官方頁。
2. CatchTable 直接店家頁與近期官方編輯頁。
3. Michelin Guide、韓國觀光公社／VISITKOREA、Netflix 官方資料。
4. Naver Maps／Google Maps 直接店家連結。
5. 近期整理頁只用來定位連結；營業與價格仍盡量由前四類交叉確認。

所有來源均保存於 `restaurants.json` 各筆資料的 `sources`。`checkedAt` 是本次檢查日期，不表示來源內容在該日發布。

## 全域判斷

- CatchTable 店家頁是 JavaScript 應用；可確認網址存在，但空位、價格、開放日需使用者在 App／網頁即時查看。
- Naver Maps 使用 `naver.me` 短連結時，仍是店家直達連結；部分短連結可解析出 place ID，部分會受 robots 或快取限制，因此保留原短連結最穩妥。
- Google Maps 同樣保留來源提供的 `maps.app.goo.gl` 店家短連結。
- 行政區與英文道路地址多由 CatchTable 近期頁面核對；未取得可信地址者（Original Numbers）保留行政區並把完整地址設為 `null`。
- 價格容易變動。只有具明確近期公開價格者填入較精確數字；其餘為行程預算約值，皆在 `priceNotes` 標示。
- 座標未逐筆以官方座標核實，故全數為 `null`。這比用地址自動地理編碼後可能釘錯同名店更安全。

## 逐筆重要備註

- **Restaurant EVETT**：CatchTable 近期頁仍列為營業，地址為江南區 Dosan-daero 45-gil 10-5；近期編輯頁將其標示為 Michelin 2 Stars。
- **Yun Seoul**：近期 CatchTable 資訊顯示晚餐需每人至少點一杯飲料，包廂另有酒水條件。
- **CHOI.**：餐廳仍營業；前述對話把它寫作 Choi Dot，本資料保留常見英文 `CHOI.`，並在別名標籤加入 Choi Dot／쵸이닷。
- **NEGI Dining Lounge**：VISITKOREA 與 CatchTable 均提供相同地址；近期公開菜單可見晚餐套餐曾為 ₩130,000，但仍以即時頁面為準。
- **VIA TOLEDO Pasta Bar**：店家仍有 CatchTable 頁，但 CatchTable 近期編輯頁註明預約曾暫停，需追蹤官方 Instagram；因此 `catchTableAvailable` 是 true，而 `bookingMode` 同時包含 Instagram 公告。
- **trid**：CatchTable 近期頁仍列營業；地址與直接連結已核對。
- **Doryang**：近期 CatchTable 多篇編輯頁一致列出地址、營業時段與個人鍋／包廂規則。
- **ChoKwang201**：CatchTable 近期頁註明僅透過 CatchTable 預約、用餐 100 分鐘、招牌東坡肉可能售罄。
- **SOUL**：第二季白湯匙金熙恩主理；CatchTable 近期頁列海放村地址與營業資訊。
- **Eatanic Garden**：位於 Josun Palace 36 樓；CatchTable 近期頁註明自 2025-12-01 起由 CatchTable 處理一般訂位。
- **Soigné**：第二季白湯匙李駿主理；本版使用新沙 Sinsa Square 的現址，避免沿用早年盤浦舊址。
- **CheonSang**：CatchTable 近期頁列出良才 High Brand 6 樓地址；大型團體或當日訂位可能需電話確認。
- **Haobin**：位於 Ambassador Seoul Pullman 2 樓；酒店餐廳規範與價格應以飯店／CatchTable 即時頁為準。
- **Original Numbers**：確認有 Naver、Google 與 CatchTable 直接連結且位於江南，但本次未取得可交叉核對的完整道路地址，故不臆填。
- **SUPERPAN**：官方網站列出 Nonhyeon-ro 167-gil 15、2 樓，並說明為現代首爾料理與酒搭配。
- **YUNJUDANG**：近期 CatchTable 頁列海放村地址，並註明每桌至少點一杯酒；熱門程度高。
- **Okdongsik**：官方網站與 Michelin Guide 地址一致；只有約 10 席、每日限量，主要使用遠端候位而非傳統預約。
- **Neo**：已於 2024 年歇業。2026 年崔康祿受訪表示關店因租約期滿，近期沒有重開計畫；此筆僅供歷史顯示。

## 建議下次更新

若在實際旅行前 30 天更新，優先重新查：`status`、`bookingNotes`、`averagePerPersonKrw`、`openingHours`（目前未設獨立欄位）、CatchTable 是否開放、以及主廚是否仍常駐。
