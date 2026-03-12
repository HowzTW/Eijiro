function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // 避免同時寫入衝突
  
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    var id = data.id.toString();
    var name = data.name;
    var intro = data.introduction;
    var coverImage = data.cover_image || "";
    var time = new Date();
    var sourcesJson = JSON.stringify(data.sources);
    
    // 尋找是否已有重複的 ID
    var lastRow = sheet.getLastRow();
    var idColumn = sheet.getRange(1, 1, lastRow || 1, 1).getValues();
    var rowIndex = -1;
    
    for (var i = 0; i < idColumn.length; i++) {
      if (idColumn[i][0].toString() === id) {
        rowIndex = i + 1; // 找到對應的列號
        break;
      }
    }
    
    // 更新後的資料欄位順序：ID, 片名, 劇情介紹, 封面圖片, 更新時間, 線路資料 (JSON)
    var rowData = [id, name, intro, coverImage, time, sourcesJson];
    
    if (rowIndex > -1) {
      // 如果找到重複，更新該列 (Update)
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      return ContentService.createTextOutput("Updated ID: " + id).setMimeType(ContentService.MimeType.TEXT);
    } else {
      // 如果沒找到，新增一行 (Insert)
      sheet.appendRow(rowData);
      return ContentService.createTextOutput("Inserted ID: " + id).setMimeType(ContentService.MimeType.TEXT);
    }
    
  } catch (f) {
    return ContentService.createTextOutput("Error: " + f.toString()).setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}
