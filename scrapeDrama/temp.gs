function setupDeletedSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var existing = ss.getSheetByName("deleted");
  if (existing) {
    Logger.log("deleted Sheet 已存在，略過建立。");
    return;
  }

  var sheet = ss.insertSheet("deleted");
  sheet.getRange(1, 1, 1, 3).setValues([["id", "name", "deleted_at"]]);
  Logger.log("deleted Sheet 建立完成。");
}
