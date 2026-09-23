var LINKPASS_API_VERSION = '2.1.0';
var LINKPASS_SPREADSHEET_ID = '1TINrZuNCdq6jaOS8JtgduawqqMD2CBLCUvfbVUSUz8A';

function doGet() {
  return jsonResponse_({
    ok: true,
    data: {
      service: 'LinkPass API',
      version: LINKPASS_API_VERSION,
      status: 'ready'
    }
  });
}

function doPost(e) {
  try {
    var request = parseRequest_(e);
    verifyAccessKey_(request.accessKey || '');

    switch (request.action) {
      case 'list':
        return jsonResponse_({ ok: true, data: listLinks_(request) });
      case 'create':
        return jsonResponse_({ ok: true, data: createLink_(request) });
      case 'delete':
        return jsonResponse_({ ok: true, data: deleteLink_(request) });
      default:
        throw apiError_('INVALID_ACTION', '不支援的 API 操作');
    }
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse_({
      ok: false,
      error: {
        code: error && error.code ? error.code : 'INTERNAL_ERROR',
        message: error && error.publicMessage ? error.publicMessage : '伺服器暫時無法處理要求'
      }
    });
  }
}

function setupLinkPass() {
  var sheet = getLinksSheet_();
  ensureSchema_(sheet);
  return {
    spreadsheetId: sheet.getParent().getId(),
    sheetName: sheet.getName(),
    apiVersion: LINKPASS_API_VERSION
  };
}

function authorizeLinkPass() {
  var authorizationProbe = UrlFetchApp.fetch('https://example.com/', {
    muteHttpExceptions: true,
    validateHttpsCertificates: true
  });
  return {
    spreadsheetId: getLinksSheet_().getParent().getId(),
    externalRequestStatus: authorizationProbe.getResponseCode(),
    fetchedTitle: fetchPageTitle_('https://example.com/')
  };
}
