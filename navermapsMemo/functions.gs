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
 * 處理 POST 請求 (用於新增資料)
 */
function doPost(e) {
  try {
    var attractionData = JSON.parse(e.postData.contents);
    var res = addAttraction(attractionData);
    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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

/**
 * 新增景點資料至試算表
 * @param {Object} attractionData 包含 name_cn, name_orig, naver_map_url, description 的物件
 * @return {Object} 回傳操作結果
 */
function addAttraction(attractionData) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Attractions');
    if (!sheet) throw new Error('找不到 Attractions 工作表');

    // 以 Timestamp 作為 ID
    var id = 'attr_' + new Date().getTime();
    
    // 依據試算表標題排序寫入資料碼：id, name_cn, name_orig, naver_map_url, description
    sheet.appendRow([
      id,
      attractionData.name_cn,
      attractionData.name_orig || '',
      attractionData.naver_map_url,
      attractionData.description || ''
    ]);

    return { success: true, id: id };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
