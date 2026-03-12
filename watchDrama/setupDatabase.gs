/**
 * Watch Drama Assistant - Database Setup Script
 * 執行此 function 以初始化 Google Sheet 結構
 */
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 建立「使用者清單」工作表
  var usersSheet = getOrCreateSheet(ss, "Users");
  usersSheet.clear();
  usersSheet.getRange(1, 1, 1, 2).setValues([["userId", "userName"]]);
  // 插入預設使用者
  usersSheet.getRange(2, 1, 2, 2).setValues([
    ["user_ayu", "阿玉"],
    ["user_hataro", "哈太郎"]
  ]);
  
  // 2. 建立「使用者追劇清單」工作表
  var librarySheet = getOrCreateSheet(ss, "UserLibrary");
  librarySheet.clear();
  librarySheet.getRange(1, 1, 1, 4).setValues([["userId", "dramaId", "addedDate", "lastWatchedDate"]]);
  
  // 3. 建立「播放進度紀錄」工作表
  var progressSheet = getOrCreateSheet(ss, "UserProgress");
  progressSheet.clear();
  progressSheet.getRange(1, 1, 1, 6).setValues([["userId", "dramaId", "lineName", "episodeName", "timestamp", "updatedDate"]]);

  SpreadsheetApp.getUi().alert("✅ 資料庫初始化完成！已建立 Users, UserLibrary, UserProgress 工作表。");
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}
