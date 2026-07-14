var CONFIG = Object.freeze({
  API_VERSION: '1',
  SPREADSHEET_ID: '1qPUjq5dY-rYekMKFWomcHvh8bd-fSubHOm83ykvxkxc',
  TOPICS_SHEET: 'topics',
  PHRASES_SHEET: 'phrases',
  CACHE_KEY: 'korean-note-content-v1',
  CACHE_TTL_SECONDS: 300,
  CACHE_MAX_BYTES: 90000,
  ALLOWED_COLORS: ['indigo', 'green', 'pink', 'yellow', 'sky', 'violet', 'orange']
});

function doGet(e) {
  try {
    var action = String((e && e.parameter && e.parameter.action) || 'content').trim().toLowerCase();
    if (action === 'health') return jsonOutput_(createHealthResponse_());
    if (action !== 'content') return jsonOutput_(createErrorResponse_('INVALID_ACTION', '不支援的 API 操作。'));
    return jsonOutput_(getContentResponse_());
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonOutput_(createErrorResponse_('INTERNAL_ERROR', '內容暫時無法載入，請稍後再試。'));
  }
}

function getContentResponse_(forceRefresh) {
  var cache = CacheService.getScriptCache();
  if (!forceRefresh) {
    var cached = cache.get(CONFIG.CACHE_KEY);
    if (cached) return JSON.parse(cached);
  }
  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(3000);
  try {
    if (hasLock && !forceRefresh) {
      var rechecked = cache.get(CONFIG.CACHE_KEY);
      if (rechecked) return JSON.parse(rechecked);
    }
    var response = buildContentResponse_();
    var serialized = JSON.stringify(response);
    if (serialized.length <= CONFIG.CACHE_MAX_BYTES) cache.put(CONFIG.CACHE_KEY, serialized, CONFIG.CACHE_TTL_SECONDS);
    else console.warn('Content response exceeds cache size guard; returning without caching.');
    return response;
  } finally {
    if (hasLock) lock.releaseLock();
  }
}

function buildContentResponse_() {
  var spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var topicsSheet = spreadsheet.getSheetByName(CONFIG.TOPICS_SHEET);
  var phrasesSheet = spreadsheet.getSheetByName(CONFIG.PHRASES_SHEET);
  if (!topicsSheet || !phrasesSheet) throw new Error('SHEET_NOT_FOUND: Required topics or phrases sheet is missing.');

  var topicRows = readRows_(topicsSheet, ['topic_id', 'display_order', 'nav_label', 'title_zh_tw', 'accent_color', 'enabled']);
  var phraseRows = readRows_(phrasesSheet, ['phrase_id', 'topic_id', 'display_order', 'card_title_zh_tw', 'korean', 'romanization', 'translation_zh_tw', 'usage_note_zh_tw', 'enabled']);
  var allTopicIds = {};
  topicRows.forEach(function (row) { var id = cleanText_(row.topic_id); if (id) allTopicIds[id] = true; });
  var topicMap = {};
  var topics = [];

  topicRows.forEach(function (row, index) {
    if (!isEnabled_(row.enabled)) return;
    var topic = {
      id: cleanText_(row.topic_id),
      displayOrder: positiveInteger_(row.display_order, 'topics row ' + (index + 2) + ' display_order'),
      navLabel: requiredText_(row.nav_label, 'topics row ' + (index + 2) + ' nav_label'),
      title: requiredText_(row.title_zh_tw, 'topics row ' + (index + 2) + ' title_zh_tw'),
      accentColor: requiredText_(row.accent_color, 'topics row ' + (index + 2) + ' accent_color'),
      phrases: []
    };
    validateId_(topic.id, 'topic_id', index + 2);
    if (topicMap[topic.id]) throw new Error('DUPLICATE_ID: Duplicate topic_id ' + topic.id);
    if (CONFIG.ALLOWED_COLORS.indexOf(topic.accentColor) === -1) throw new Error('INVALID_SCHEMA: Unsupported accent_color ' + topic.accentColor);
    topicMap[topic.id] = topic;
    topics.push(topic);
  });

  var phraseIds = {};
  phraseRows.forEach(function (row, index) {
    if (!isEnabled_(row.enabled)) return;
    var phraseId = cleanText_(row.phrase_id);
    var topicId = cleanText_(row.topic_id);
    validateId_(phraseId, 'phrase_id', index + 2);
    validateId_(topicId, 'topic_id', index + 2);
    if (phraseIds[phraseId]) throw new Error('DUPLICATE_ID: Duplicate phrase_id ' + phraseId);
    phraseIds[phraseId] = true;
    if (!allTopicIds[topicId]) throw new Error('INVALID_SCHEMA: phrase_id ' + phraseId + ' references unknown topic_id ' + topicId);
    if (!topicMap[topicId]) return;
    topicMap[topicId].phrases.push({
      id: phraseId,
      displayOrder: positiveInteger_(row.display_order, 'phrases row ' + (index + 2) + ' display_order'),
      cardTitle: requiredText_(row.card_title_zh_tw, 'phrases row ' + (index + 2) + ' card_title_zh_tw'),
      korean: requiredText_(row.korean, 'phrases row ' + (index + 2) + ' korean'),
      romanization: cleanText_(row.romanization),
      translation: requiredText_(row.translation_zh_tw, 'phrases row ' + (index + 2) + ' translation_zh_tw'),
      usageNote: cleanText_(row.usage_note_zh_tw)
    });
  });
  topics.sort(compareDisplayOrder_);
  topics.forEach(function (topic) { topic.phrases.sort(compareDisplayOrder_); });
  var phraseCount = topics.reduce(function (total, topic) { return total + topic.phrases.length; }, 0);
  var data = { topics: topics };
  return { ok: true, apiVersion: CONFIG.API_VERSION, generatedAt: new Date().toISOString(), contentHash: createContentHash_(data), data: data, meta: { topicCount: topics.length, phraseCount: phraseCount } };
}

function createHealthResponse_() {
  var content = getContentResponse_();
  return { ok: true, apiVersion: CONFIG.API_VERSION, service: 'koreanNote-content-api', status: 'healthy', checkedAt: new Date().toISOString(), contentHash: content.contentHash, meta: content.meta };
}

function readRows_(sheet, requiredHeaders) {
  var values = sheet.getDataRange().getValues();
  if (!values.length) throw new Error('INVALID_SCHEMA: Sheet ' + sheet.getName() + ' is empty.');
  var headers = values[0].map(cleanText_);
  var seenHeaders = {};
  headers.forEach(function (header) {
    if (!header) return;
    if (seenHeaders[header]) throw new Error('INVALID_SCHEMA: Duplicate header ' + header + ' in sheet ' + sheet.getName());
    seenHeaders[header] = true;
  });
  requiredHeaders.forEach(function (header) {
    if (!seenHeaders[header]) throw new Error('INVALID_SCHEMA: Missing header ' + header + ' in sheet ' + sheet.getName());
  });
  return values.slice(1).filter(function (row) {
    return row.some(function (value) { return cleanText_(value) !== ''; });
  }).map(function (row) {
    var record = {};
    headers.forEach(function (header, index) { if (header) record[header] = row[index]; });
    return record;
  });
}

function createContentHash_(data) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(data), Utilities.Charset.UTF_8);
  return bytes.map(function (byte) {
    var value = (byte + 256) % 256;
    return ('0' + value.toString(16)).slice(-2);
  }).join('').slice(0, 16);
}

function validateId_(value, fieldName, rowNumber) {
  if (!value || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) throw new Error('INVALID_SCHEMA: Invalid ' + fieldName + ' at row ' + rowNumber);
}

function positiveInteger_(value, fieldName) {
  var number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new Error('INVALID_SCHEMA: ' + fieldName + ' must be a positive integer.');
  return number;
}

function requiredText_(value, fieldName) {
  var text = cleanText_(value);
  if (!text) throw new Error('INVALID_SCHEMA: ' + fieldName + ' is required.');
  return text;
}

function cleanText_(value) { if (value === null || value === undefined) return ''; return String(value).trim(); }
function isEnabled_(value) { if (value === true || value === 1) return true; return String(value).trim().toLowerCase() === 'true'; }
function compareDisplayOrder_(left, right) { if (left.displayOrder !== right.displayOrder) return left.displayOrder - right.displayOrder; return left.id.localeCompare(right.id); }
function createErrorResponse_(code, message) { return { ok: false, apiVersion: CONFIG.API_VERSION, error: { code: code, message: message } }; }
function jsonOutput_(payload) { return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON); }
function clearContentCache_() { CacheService.getScriptCache().remove(CONFIG.CACHE_KEY); }
function onEdit(e) { if (!e || !e.range) return; var sheetName = e.range.getSheet().getName(); if (sheetName === CONFIG.TOPICS_SHEET || sheetName === CONFIG.PHRASES_SHEET) clearContentCache_(); }
function testBuild() { var response = getContentResponse_(true); console.log(JSON.stringify(response)); }
