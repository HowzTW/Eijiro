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
    var data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (error) {
        // 如果無法解析為 JSON，則嘗試從 parameters 取得 (處理某些 form 提交)
        data = e.parameter || {};
      }
    } else {
      data = e.parameter || {};
    }

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
    } else if (action === 'addReferenceURL') {
      res = addReferenceURL(data.payload);
    } else if (action === 'deleteReferenceURL') {
      res = deleteReferenceURL(data.payload);
    } else if (action === 'deleteAttraction') {
      res = deleteAttraction(data.payload);
    } else if (action === 'updateAttraction') {
      res = updateAttraction(data.payload);
    } else {
      // 移除危險的 else { addAttraction(data) }，改為報錯以利串接偵錯
      res = { success: false, error: '未知的操作類型: ' + (action || '未定義') };
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
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 等待最多 30 秒
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Attractions');
    if (!sheet) throw new Error('找不到 Attractions 工作表');

    // 優先使用前端傳入的 ID，若無則才自行生成
    var id = attractionData.id || ('attr' + new Date().getTime());
    
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
  } finally {
    lock.releaseLock();
  }
}

/**
 * 在試算表中建立新標籤
 * @param {Object} tagData 包含 tag_name 的物件
 */
function addNewTag(tagData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Tags');
    if (!sheet) throw new Error('找不到 Tags 工作表');

    // 優先使用前端傳入的 ID
    var id = tagData.id || ('tag' + new Date().getTime());
    sheet.appendRow([id, tagData.tag_name]);

    return { success: true, id: id };
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 批次更新景點與標籤的關聯
 * @param {Object} data 包含 attractionId 與 tagIds (陣列) 的物件
 */
function updateAttractionTags(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
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

    // 寫入新的關聯對應 (增加安全檢查：確保 tagId 存在於 Tags 表中)
    var tagsSheet = ss.getSheetByName('Tags');
    var existingTags = tagsSheet.getDataRange().getValues().slice(1).map(function(row) { return row[0]; });
    var validTagIds = new Set(existingTags);

    tagIds.forEach(function(tagId) {
      if (validTagIds.has(tagId)) {
        relSheet.appendRow([attractionId, tagId]);
      }
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 修改標籤名稱
 * @param {Object} data 包含 tagId 與 newName 的物件
 */
function renameTag(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
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
  } finally {
    lock.releaseLock();
  }
}

/**
 * 刪除標籤及其所有關聯
 * @param {Object} data 包含 tagId 的物件
 */
function deleteTag(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
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
  } finally {
    lock.releaseLock();
  }
}

/**
 * 新增參考資訊
 * @param {Object} data 包含 attraction_id, url, url_description 的物件
 */
function addReferenceURL(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Reference_URLs');
    if (!sheet) throw new Error('找不到 Reference_URLs 工作表');

    sheet.appendRow([
      data.attraction_id,
      data.url,
      data.url_description || ''
    ]);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 刪除參考資訊
 * @param {Object} data 包含 attraction_id 與 url 的物件
 */
function deleteReferenceURL(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Reference_URLs');
    if (!sheet) throw new Error('找不到 Reference_URLs 工作表');

    var values = sheet.getDataRange().getValues();
    for (var i = values.length - 1; i >= 1; i--) {
      // 比對景點 ID 與 URL 來精準刪除
      if (values[i][0] === data.attraction_id && values[i][1] === data.url) {
        sheet.deleteRow(i + 1);
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 刪除景點及其所有相關資料 (連鎖刪除)
 * @param {Object} data 包含 attraction_id 的物件
 */
function deleteAttraction(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var attractionId = data.attraction_id;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. 從 Attractions 表刪除
    var attrSheet = ss.getSheetByName('Attractions');
    if (attrSheet) {
      var attrData = attrSheet.getDataRange().getValues();
      for (var i = attrData.length - 1; i >= 1; i--) {
        if (attrData[i][0] === attractionId) {
          attrSheet.deleteRow(i + 1);
          break;
        }
      }
    }

    // 2. 從 Attraction_Tags 表刪除關聯
    var relSheet = ss.getSheetByName('Attraction_Tags');
    if (relSheet) {
      var relData = relSheet.getDataRange().getValues();
      for (var i = relData.length - 1; i >= 1; i--) {
        if (relData[i][0] === attractionId) {
          relSheet.deleteRow(i + 1);
        }
      }
    }

    // 3. 從 Reference_URLs 表刪除參考連結
    var refSheet = ss.getSheetByName('Reference_URLs');
    if (refSheet) {
      var refData = refSheet.getDataRange().getValues();
      for (var i = refData.length - 1; i >= 1; i--) {
        if (refData[i][0] === attractionId) {
          refSheet.deleteRow(i + 1);
        }
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 更新景點主資訊
 * @param {Object} attractionData 包含 id, name_cn, name_orig, naver_map_url, description 的物件
 * @return {Object} 回傳操作結果
 */
function updateAttraction(attractionData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Attractions');
    if (!sheet) throw new Error('找不到 Attractions 工作表');

    var data = sheet.getDataRange().getValues();
    var id = attractionData.id;

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        // 更新該列資料：id, name_cn, name_orig, naver_map_url, description
        // 注意 getRange 是從 1 開始，且 i 是陣列索引
        sheet.getRange(i + 1, 2).setValue(attractionData.name_cn);
        sheet.getRange(i + 1, 3).setValue(attractionData.name_orig || '');
        sheet.getRange(i + 1, 4).setValue(attractionData.naver_map_url);
        sheet.getRange(i + 1, 5).setValue(attractionData.description || '');
        return { success: true };
      }
    }
    throw new Error('找不到該景點 ID: ' + id);
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}
