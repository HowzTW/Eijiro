function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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
      
      var data = sheet.getRange(1, 1, lastRow, 1).getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0].toString() === idToDelete) {
          sheet.deleteRow(i + 1);
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
