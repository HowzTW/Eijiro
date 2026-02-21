# NavmapMemo 資料模型設計 (Data Model Design)

本文件定義了 NavmapMemo 網頁應用的資料模型。資料將儲存於 Google Sheets 中。

## 1. 資料實體 (Data Entities)

### A. 景點 (Attractions)
記錄旅遊景點的詳細資訊。

| 欄位名稱 | 類型 | 必要性 | 說明 |
| :--- | :--- | :--- | :--- |
| `id` | ID | 必要 | 唯一識別碼 |
| `name_cn` | 字串 | 必要 | 景點中文名稱 |
| `name_orig` | 字串 | 選填 | 景點原文名稱 (例如：韓文或英文) |
| `naver_map_url` | URL | 必要 | NaverMap 網址 |
| `description` | 文字 | 選填 | 景點簡介 |

### B. 標籤 (Tags)
用於分類與篩選景點。

| 欄位名稱 | 類型 | 必要性 | 說明 |
| :--- | :--- | :--- | :--- |
| `id` | ID | 必要 | 唯一識別碼 |
| `tag_name` | 字串 | 必要 | 標籤名稱 |

### C. 參考資訊 (Reference URLs)
記錄景點的外部相關連結。一個景點可以有多個參考資訊。

| 欄位名稱 | 類型 | 必要性 | 說明 |
| :--- | :--- | :--- | :--- |
| `attraction_id` | ID | 必要 | 關聯的景點 ID |
| `url` | URL | 必要 | 參考網址 |
| `url_description` | 字串 | 選填 | 網址說明 (例如：官網、訂位網址) |

## 2. 關係模型 (Relationship Model)

### 2.1 景點與標籤 (Many-to-Many)
一個景點可以擁有多個標籤，一個標籤也可以關聯到多個景點。

#### 關係表：景點標籤關聯 (Attraction_Tags)
| 欄位名稱 | 類型 | 說明 |
| :--- | :--- | :--- |
| `attraction_id` | ID | 對應到「景點」的 ID |
| `tag_id` | ID | 對應到「標籤」的 ID |

### 2.2 景點與參考資訊 (One-to-Many)
一個景點可以擁有 0 到多個參考資訊。透過 `attraction_id` 進行關聯。

---

## 3. 資料範例 (Example Data)

### 景點表 (Attractions)
| id | name_cn | name_orig | naver_map_url | description |
| :--- | :--- | :--- | :--- | :--- |
| `attr01` | 景福宮 | 경복궁 | https://naver.me/Fw7iyAYH | 朝鮮王朝的主要皇宮。 |
| `attr02` | 明洞商圈 | 명動 | https://naver.me/xWIcPz8f | 熱鬧的購物與美食街。 |

### 標籤表 (Tags)
| id | tag_name |
| :--- | :--- |
| `tag01` | 歷史景點 |
| `tag02` | 購物 |
| `tag03` | 美食 |

### 景點標籤關聯表 (Attraction_Tags)
| attraction_id | tag_id |
| :--- | :--- |
| `attr01` | `tag01` |
| `attr02` | `tag02` |
| `attr02` | `tag03` |

### 參考資訊表 (Reference URLs)
| attraction_id | url | url_description |
| :--- | :--- | :--- |
| `attr01` | https://www.royalpalace.go.kr | 景福宮官網 |
| `attr02` | https://catchtable.co.kr/example | CatchTable 訂位網址 |
| `attr02` | https://www.myeongdong.co.kr | 明洞指南 |
