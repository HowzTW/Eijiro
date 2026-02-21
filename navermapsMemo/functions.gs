/**
 * NaverMaps Memo API
 * 回傳景點資料資料庫的所有內容
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = {
    attractions: getSheetData(ss.getSheetByName('Attractions')),
    tags: getSheetData(ss.getSheetByName('Tags')),
    relationships: getSheetData(ss.getSheetByName('Attraction_Tags')),
    references: getSheetData(ss.getSheetByName('Reference_URLs'))
  };
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 將試算表分頁轉換為物件陣列
 * 假設第一列為標題列
 */
function getSheetData(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  var headers = data[0];
  var rows = data.slice(1);
  
  return rows.map(function(row) {
    var obj = {};
    headers.forEach(function(header, i) {
      obj[header] = row[i];
    });
    return obj;
  });
}
