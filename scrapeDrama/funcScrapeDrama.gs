function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var type = (e && e.parameter && e.parameter.type) ? e.parameter.type : "";
  var id = (e && e.parameter && e.parameter.id) ? e.parameter.id.toString() : "";

  if (type === "deleted") {
    var sheet = ss.getSheetByName("deleted");
    if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    var headers = ["id", "name", "deleted_at"];
    var rows = data.slice(1);
    var result = rows.map(function(row) {
      var obj = {};
      headers.forEach(function(header, i) { obj[header] = row[i]; });
      return obj;
    });
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = ss.getActiveSheet();
  var headers = ["id", "name", "introduction", "cover_image", "update_time", "sources"];

  // 單劇模式（?id=xxx）：只回傳該劇一列，供播放頁取用線路資料
  if (id) {
    var lastRowForId = sheet.getLastRow();
    if (lastRowForId <= 1) return jsonOut(null);
    var idColumn = sheet.getRange(2, 1, lastRowForId - 1, 1).getValues();
    for (var n = 0; n < idColumn.length; n++) {
      if (idColumn[n][0].toString() === id) {
        var oneRow = sheet.getRange(n + 2, 1, 1, headers.length).getValues()[0];
        var oneObj = {};
        headers.forEach(function(header, i) { oneObj[header] = oneRow[i]; });
        return jsonOut(oneObj);
      }
    }
    return jsonOut(null);
  }

  // 輕量模式（?type=light）：只讀前 5 欄，略過體積最大的 sources 欄
  // 首頁與劇庫只需要片名與封面，可將回應由約 900 KB 降到約 90 KB
  if (type === "light") {
    var lightHeaders = headers.slice(0, 5);
    var lastRowLight = sheet.getLastRow();
    if (lastRowLight <= 1) return jsonOut([]);
    var lightRows = sheet.getRange(2, 1, lastRowLight - 1, lightHeaders.length).getValues();
    return jsonOut(lightRows.map(function(row) {
      var obj = {};
      lightHeaders.forEach(function(header, i) { obj[header] = row[i]; });
      return obj;
    }));
  }

  // 預設：回傳完整資料（維持原行為，抓劇小幫手前端仍在使用）
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);

  var rows = data.slice(1);

  var result = rows.map(function(row) {
    var obj = {};
    headers.forEach(function(header, i) {
      obj[header] = row[i];
    });
    return obj;
  });

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // 避免同時寫入衝突
  
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var postData = JSON.parse(e.postData.contents);
    
    // 處理刪除動作
    if (postData.action === 'delete') {
      var idToDelete = postData.id.toString();
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return ContentService.createTextOutput("Sheet is empty");
      
      var data = sheet.getRange(1, 1, lastRow, 2).getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0].toString() === idToDelete) {
          var deletedName = data[i][1] ? data[i][1].toString() : "";
          sheet.deleteRow(i + 1);

          // 寫入 deleted Sheet（upsert by id）
          var deletedSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("deleted");
          if (deletedSheet) {
            var now = new Date();
            var deletedLastRow = deletedSheet.getLastRow();
            var deletedIdCol = deletedSheet.getRange(1, 1, deletedLastRow || 1, 1).getValues();
            var deletedRowIndex = -1;
            for (var j = 1; j < deletedIdCol.length; j++) {
              if (deletedIdCol[j][0].toString() === idToDelete) {
                deletedRowIndex = j + 1;
                break;
              }
            }
            if (deletedRowIndex > -1) {
              deletedSheet.getRange(deletedRowIndex, 1, 1, 3).setValues([[idToDelete, deletedName, now]]);
            } else {
              deletedSheet.appendRow([idToDelete, deletedName, now]);
            }
          }

          return ContentService.createTextOutput("Deleted ID: " + idToDelete).setMimeType(ContentService.MimeType.TEXT);
        }
      }
      return ContentService.createTextOutput("ID Not Found").setMimeType(ContentService.MimeType.TEXT);
    }

    // 原有的同步 (Sync) 邏輯
    var id = postData.id.toString();
    var name = postData.name;
    var intro = postData.introduction;
    var coverImage = postData.cover_image || "";
    var time = new Date();
    var sourcesJson = JSON.stringify(postData.sources);
    
    var lastRow = sheet.getLastRow();
    var idColumn = sheet.getRange(1, 1, lastRow || 1, 1).getValues();
    var rowIndex = -1;
    
    for (var i = 0; i < idColumn.length; i++) {
      if (idColumn[i][0].toString() === id) {
        rowIndex = i + 1;
        break;
      }
    }
    
    var rowData = [id, name, intro, coverImage, time, sourcesJson];
    
    if (rowIndex > -1) {
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      return ContentService.createTextOutput("Updated ID: " + id).setMimeType(ContentService.MimeType.TEXT);
    } else {
      sheet.appendRow(rowData);
      return ContentService.createTextOutput("Inserted ID: " + id).setMimeType(ContentService.MimeType.TEXT);
    }
    
  } catch (f) {
    return ContentService.createTextOutput("Error: " + f.toString()).setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}
