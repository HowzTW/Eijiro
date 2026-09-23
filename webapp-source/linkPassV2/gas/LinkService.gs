function listLinks_(request) {
  var limit = clampLimit_(request.limit);
  var cursor = decodeCursor_(request.cursor);
  var items = readAllLinks_(getLinksSheet_());

  items.sort(compareLinksDescending_);
  if (cursor) {
    items = items.filter(function(item) {
      return item.createdAtMs < cursor.createdAtMs ||
        (item.createdAtMs === cursor.createdAtMs && item.id < cursor.id);
    });
  }

  var hasMore = items.length > limit;
  var page = items.slice(0, limit).map(toPublicLink_);
  var lastItem = page.length ? page[page.length - 1] : null;

  return {
    items: page,
    nextCursor: hasMore && lastItem ? encodeCursor_(lastItem) : null,
    hasMore: hasMore,
    serverTime: new Date().toISOString()
  };
}

function createLink_(request) {
  var url = normalizeUrl_(request.url);
  var label = normalizeLabel_(request.label);
  var clientRequestId = validateId_(request.clientRequestId, 'client_request_id');
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
    var sheet = getLinksSheet_();
    var existing = findLinkByRequestId_(sheet, clientRequestId);
    if (existing) return toPublicLink_(existing);

    var now = new Date();
    var link = {
      id: Utilities.getUuid(),
      createdAt: now.toISOString(),
      createdAtMs: now.getTime(),
      url: url,
      label: label,
      clientRequestId: clientRequestId
    };
    appendLink_(sheet, link);
    return toPublicLink_(link);
  } catch (error) {
    if (error && error.code) throw error;
    throw apiError_('WRITE_FAILED', '目前無法新增連結，請稍後再試');
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function deleteLink_(request) {
  var id = validateId_(request.id, 'id');
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
    var sheet = getLinksSheet_();
    var rowNumber = findRowByValue_(sheet, 1, id);
    if (!rowNumber) throw apiError_('NOT_FOUND', '這個連結已經不存在');
    sheet.deleteRow(rowNumber);
    return { id: id };
  } catch (error) {
    if (error && error.code) throw error;
    throw apiError_('DELETE_FAILED', '目前無法刪除連結，請稍後再試');
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function compareLinksDescending_(left, right) {
  if (left.createdAtMs !== right.createdAtMs) return right.createdAtMs - left.createdAtMs;
  return left.id < right.id ? 1 : left.id > right.id ? -1 : 0;
}

function toPublicLink_(link) {
  return {
    id: link.id,
    url: link.url,
    label: link.label,
    createdAt: link.createdAt,
    createdAtMs: link.createdAtMs
  };
}

function encodeCursor_(link) {
  return Utilities.base64EncodeWebSafe(JSON.stringify({
    createdAtMs: link.createdAtMs,
    id: link.id
  })).replace(/=+$/, '');
}

function decodeCursor_(input) {
  if (!input) return null;
  try {
    var decoded = Utilities.newBlob(Utilities.base64DecodeWebSafe(String(input))).getDataAsString();
    var cursor = JSON.parse(decoded);
    if (!cursor || !isFinite(Number(cursor.createdAtMs)) || !cursor.id) throw new Error('Invalid cursor');
    return { createdAtMs: Number(cursor.createdAtMs), id: String(cursor.id) };
  } catch (error) {
    throw apiError_('INVALID_CURSOR', '分頁資訊已失效，請重新整理');
  }
}
