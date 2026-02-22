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
 * 處理 POST 請求 (支援多種操作)
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var res;

    if (action === 'addAttraction') {
      res = addAttraction(data.payload);
    } else if (action === 'addNewTag') {
      res = addNewTag(data.payload);
    } else if (action === 'updateAttractionTags') {
      res = updateAttractionTags(data.payload);
    } else if (action === 'renameTag') {
      res = renameTag(data.payload);
    } else if (action === 'deleteTag') {
      res = deleteTag(data.payload);
    } else {
      // 向後相容：直接接收 attractionData 的舊版邏輯
      res = addAttraction(data);
    }

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
    var id = 'attr' + new Date().getTime();
    
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

/**
 * 在試算表中建立新標籤
 * @param {Object} tagData 包含 tag_name 的物件
 */
function addNewTag(tagData) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Tags');
    if (!sheet) throw new Error('找不到 Tags 工作表');

    var id = 'tag' + new Date().getTime();
    sheet.appendRow([id, tagData.tag_name]);

    return { success: true, id: id };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 批次更新景點與標籤的關聯
 * @param {Object} data 包含 attractionId 與 tagIds (陣列) 的物件
 */
function updateAttractionTags(data) {
  try {
    var attractionId = data.attractionId;
    var tagIds = data.tagIds; 

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var relSheet = ss.getSheetByName('Attraction_Tags');
    if (!relSheet) throw new Error('找不到 Attraction_Tags 工作表');

    var relData = relSheet.getDataRange().getValues();
    // 從最後一行往回刪除該景點的舊有關聯
    for (var i = relData.length - 1; i >= 1; i--) {
      if (relData[i][0] === attractionId) {
        relSheet.deleteRow(i + 1);
      }
    }

    // 寫入新的關聯對應
    tagIds.forEach(function(tagId) {
      relSheet.appendRow([attractionId, tagId]);
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 修改標籤名稱
 * @param {Object} data 包含 tagId 與 newName 的物件
 */
function renameTag(data) {
  try {
    var tagId = data.tagId;
    var newName = data.newName;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Tags');
    var values = sheet.getDataRange().getValues();
    
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] === tagId) {
        sheet.getRange(i + 1, 2).setValue(newName);
        return { success: true };
      }
    }
    throw new Error('找不到該標籤 ID');
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 刪除標籤及其所有關聯
 * @param {Object} data 包含 tagId 的物件
 */
function deleteTag(data) {
  try {
    var tagId = data.tagId;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. 從 Tags 表刪除
    var tagSheet = ss.getSheetByName('Tags');
    var tagData = tagSheet.getDataRange().getValues();
    for (var i = tagData.length - 1; i >= 1; i--) {
      if (tagData[i][0] === tagId) {
        tagSheet.deleteRow(i + 1);
        break;
      }
    }
    
    // 2. 從 Attraction_Tags 表刪除關聯
    var relSheet = ss.getSheetByName('Attraction_Tags');
    var relData = relSheet.getDataRange().getValues();
    for (var i = relData.length - 1; i >= 1; i--) {
      if (relData[i][1] === tagId) {
        relSheet.deleteRow(i + 1);
      }
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
