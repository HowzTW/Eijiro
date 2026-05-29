function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var type = (e && e.parameter && e.parameter.type) ? e.parameter.type : "";

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
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);

  var headers = ["id", "name", "introduction", "cover_image", "update_time", "sources"];
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
