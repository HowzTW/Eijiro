/**
 * NavermapsMemo Google Sheets 初始化腳本
 * 
 * 使用方式：
 * 1. 在 Google 試算表中，點擊「擴充功能」 > 「Apps Script」。
 * 2. 刪除原有程式碼，貼入此腳本。
 * 3. 點擊「執行」 (Run)。
 * 4. 根據提示授予權限。
 */

function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 定義資料表與欄位
  var sheets = {
    'Attractions': ['id', 'name_cn', 'name_orig', 'naver_map_url', 'description'],
    'Tags': ['id', 'tag_name'],
    'Attraction_Tags': ['attraction_id', 'tag_id'],
    'Reference_URLs': ['attraction_id', 'url', 'url_description']
  };
  
  // 建立分頁並設定標題
  for (var name in sheets) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    } else {
      sheet.clear(); // 清空舊資料
    }
    sheet.getRange(1, 1, 1, sheets[name].length).setValues([sheets[name]])
         .setFontWeight('bold')
         .setBackground('#f3f3f3');
    sheet.setFrozenRows(1);
  }
  
  // 2. 匯入範例資料
  
  // Attractions
  var attractionsData = [
    ['attr01', '景福宮', '경복궁', 'https://naver.me/Fw7iyAYH', '朝鮮王朝的主要皇宮。'],
    ['attr02', '明洞商圈', '명동', 'https://naver.me/xWIcPz8f', '熱鬧的購物與美食街。']
  ];
  ss.getSheetByName('Attractions').getRange(2, 1, attractionsData.length, 5).setValues(attractionsData);
  
  // Tags
  var tagsData = [
    ['tag01', '歷史景點'],
    ['tag02', '購物'],
    ['tag03', '美食']
  ];
  ss.getSheetByName('Tags').getRange(2, 1, tagsData.length, 2).setValues(tagsData);
  
  // Attraction_Tags
  var attractionTagsData = [
    ['attr01', 'tag01'],
    ['attr02', 'tag02'],
    ['attr02', 'tag03']
  ];
  ss.getSheetByName('Attraction_Tags').getRange(2, 1, attractionTagsData.length, 2).setValues(attractionTagsData);
  
  // Reference_URLs
  var referenceUrlsData = [
    ['attr01', 'https://www.royalpalace.go.kr', '景福宮官網'],
    ['attr02', 'https://catchtable.co.kr/example', 'CatchTable 訂位網址'],
    ['attr02', 'https://www.myeongdong.co.kr', '明洞指南']
  ];
  ss.getSheetByName('Reference_URLs').getRange(2, 1, referenceUrlsData.length, 3).setValues(referenceUrlsData);
  
  SpreadsheetApp.getUi().alert('初始化完成！已建立 4 個分頁並匯入範例資料。');
}
