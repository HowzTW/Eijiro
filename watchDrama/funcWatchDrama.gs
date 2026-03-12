/**
 * Watch Drama Assistant - Main API (GAS-2)
 * 處理使用者切換、劇集收藏及進度同步
 */

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    if (action === "get_users") {
      return jsonResponse(getTableData(ss, "Users"));
    }
    
    if (action === "get_user_data") {
      var userId = e.parameter.userId;
      if (!userId) throw new Error("Missing userId");
      
      var library = getTableData(ss, "UserLibrary").filter(r => r.userId === userId);
      var progress = getTableData(ss, "UserProgress").filter(r => r.userId === userId);
      
      return jsonResponse({
        library: library,
        progress: progress
      });
    }
    
    return jsonResponse({ error: "Invalid GET action" });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    
    if (action === "toggle_follow") {
      return jsonResponse(handleToggleFollow(ss, data));
    }
    
    if (action === "update_progress") {
      return jsonResponse(handleUpdateProgress(ss, data));
    }
    
    return jsonResponse({ error: "Invalid POST action" });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// --- 邏輯處理函式 ---

function handleToggleFollow(ss, data) {
  var sheet = ss.getSheetByName("UserLibrary");
  var rows = sheet.getDataRange().getValues();
  var userId = data.userId;
  var dramaId = data.dramaId.toString();
  
  var foundIndex = -1;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === userId && rows[i][1].toString() === dramaId) {
      foundIndex = i + 1;
      break;
    }
  }
  
  if (foundIndex > -1) {
    sheet.deleteRow(foundIndex);
    return { success: true, status: "removed" };
  } else {
    sheet.appendRow([userId, dramaId, new Date(), ""]);
    return { success: true, status: "added" };
  }
}

function handleUpdateProgress(ss, data) {
  var sheet = ss.getSheetByName("UserProgress");
  var libSheet = ss.getSheetByName("UserLibrary");
  var rows = sheet.getDataRange().getValues();
  var userId = data.userId;
  var dramaId = data.dramaId.toString();
  var now = new Date();
  
  // 1. 更新播放詳細進度
  var foundIndex = -1;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === userId && rows[i][1].toString() === dramaId) {
      foundIndex = i + 1;
      break;
    }
  }
  
  var progressRow = [userId, dramaId, data.lineName, data.episodeName, data.timestamp, now];
  if (foundIndex > -1) {
    sheet.getRange(foundIndex, 1, 1, 6).setValues([progressRow]);
  } else {
    sheet.appendRow(progressRow);
  }
  
  // 2. 同時更新 UserLibrary 中的 lastWatchedDate，以便排序
  var libRows = libSheet.getDataRange().getValues();
  for (var j = 1; j < libRows.length; j++) {
    if (libRows[j][0] === userId && libRows[j][1].toString() === dramaId) {
      libSheet.getRange(j + 1, 4).setValue(now);
      break;
    }
  }
  
  return { success: true };
}

// --- 通用工具 ---

function getTableData(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  return data.slice(1).map(row => {
    var obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
