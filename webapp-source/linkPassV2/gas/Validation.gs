function normalizeUrl_(input) {
  var value = String(input || '').trim();
  if (!value) throw apiError_('URL_REQUIRED', '請輸入網址');
  if (value.length > 2048) throw apiError_('URL_TOO_LONG', '網址長度不可超過 2048 個字元');

  if (!/^https?:\/\//i.test(value)) value = 'https://' + value;
  if (!/^https?:\/\/[^\s]+$/i.test(value)) {
    throw apiError_('INVALID_URL', '請輸入有效的 http 或 https 網址');
  }

  var authority = value.replace(/^https?:\/\//i, '').split(/[/?#]/)[0];
  if (authority.indexOf('@') !== -1) {
    throw apiError_('INVALID_URL', '網址不可包含帳號或密碼');
  }
  var hostname = authority.split(':')[0];
  if (hostname.indexOf('.') === -1 || hostname.charAt(0) === '.' || hostname.charAt(hostname.length - 1) === '.') {
    throw apiError_('INVALID_URL', '請輸入有效的網址');
  }

  return value;
}

function normalizeLabel_(input) {
  var value = String(input || '').trim();
  if (value.length > 120) throw apiError_('LABEL_TOO_LONG', '名稱不可超過 120 個字元');
  return value;
}

function validateId_(input, fieldName) {
  var value = String(input || '').trim();
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(value)) {
    throw apiError_('INVALID_' + fieldName.toUpperCase(), '識別碼格式不正確');
  }
  return value;
}

function clampLimit_(input) {
  var value = Number(input || 40);
  if (!isFinite(value)) value = 40;
  return Math.max(1, Math.min(100, Math.floor(value)));
}
