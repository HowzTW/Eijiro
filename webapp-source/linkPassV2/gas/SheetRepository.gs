var LINKPASS_HEADERS = ['id', 'created_at', 'created_at_ms', 'url', 'label', 'client_request_id'];

function getLinksSheet_() {
  var properties = PropertiesService.getScriptProperties();
  var spreadsheetId = properties.getProperty('SPREADSHEET_ID') || LINKPASS_SPREADSHEET_ID;
  var sheetName = properties.getProperty('SHEET_NAME') || 'links';
  var spreadsheet;

  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!spreadsheet) {
    throw apiError_('NOT_CONFIGURED', '尚未設定 SPREADSHEET_ID');
  }

  var sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
  ensureSchema_(sheet);
  return sheet;
}

function ensureSchema_(sheet) {
  var currentHeaders = sheet.getLastColumn() > 0
    ? sheet.getRange(1, 1, 1, LINKPASS_HEADERS.length).getDisplayValues()[0]
    : [];
  var isEmpty = currentHeaders.every(function(value) { return !value; });

  if (isEmpty) {
    sheet.getRange(1, 1, 1, LINKPASS_HEADERS.length).setValues([LINKPASS_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, LINKPASS_HEADERS.length).setFontWeight('bold');
    return;
  }

  for (var i = 0; i < LINKPASS_HEADERS.length; i += 1) {
    if (currentHeaders[i] !== LINKPASS_HEADERS[i]) {
      throw apiError_('INVALID_SCHEMA', 'links 工作表欄位格式不正確');
    }
  }
}

function readAllLinks_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet.getRange(2, 1, lastRow - 1, LINKPASS_HEADERS.length).getValues()
    .filter(function(row) { return row[0]; })
    .map(rowToLink_);
}

function rowToLink_(row) {
  return {
    id: String(row[0]),
    createdAt: row[1] instanceof Date ? row[1].toISOString() : String(row[1]),
    createdAtMs: Number(row[2]),
    url: String(row[3]),
    label: String(row[4] || ''),
    clientRequestId: String(row[5] || '')
  };
}

function appendLink_(sheet, link) {
  sheet.appendRow([
    link.id,
    link.createdAt,
    link.createdAtMs,
    link.url,
    link.label,
    link.clientRequestId
  ]);
}

function findRowByValue_(sheet, column, value) {
  if (sheet.getLastRow() < 2) return null;
  var result = sheet.getRange(2, column, sheet.getLastRow() - 1, 1)
    .createTextFinder(value)
    .matchEntireCell(true)
    .findNext();
  return result ? result.getRow() : null;
}

function findLinkByRequestId_(sheet, requestId) {
  var rowNumber = findRowByValue_(sheet, 6, requestId);
  if (!rowNumber) return null;
  return rowToLink_(sheet.getRange(rowNumber, 1, 1, LINKPASS_HEADERS.length).getValues()[0]);
}
