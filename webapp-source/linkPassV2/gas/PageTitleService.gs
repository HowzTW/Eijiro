var LINKPASS_TITLE_MAX_LENGTH = 120;

function fetchPageTitle_(url) {
  if (!isTitleFetchAllowed_(url)) return '';

  try {
    var response = UrlFetchApp.fetch(url, {
      followRedirects: true,
      muteHttpExceptions: true,
      validateHttpsCertificates: true,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPass/2.1; +https://github.com/HowzTW/Eijiro)'
      }
    });
    var status = response.getResponseCode();
    if (status < 200 || status >= 400) return '';

    var headers = response.getHeaders();
    var contentType = String(headers['Content-Type'] || headers['content-type'] || '').toLowerCase();
    if (contentType && contentType.indexOf('text/html') === -1 && contentType.indexOf('application/xhtml+xml') === -1) {
      return '';
    }

    var match = response.getContentText().match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
    return match ? sanitizePageTitle_(match[1]) : '';
  } catch (error) {
    console.warn('Unable to fetch page title for ' + url + ': ' + error);
    return '';
  }
}

function sanitizePageTitle_(value) {
  var title = decodeHtmlEntities_(String(value || '').replace(/<[^>]*>/g, ' '));
  title = title.replace(/\s+/g, ' ').trim();
  return title.slice(0, LINKPASS_TITLE_MAX_LENGTH);
}

function decodeHtmlEntities_(value) {
  var namedEntities = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"'
  };

  return value
    .replace(/&#x([0-9a-f]+);/gi, function(_, code) {
      return safeCodePoint_(parseInt(code, 16));
    })
    .replace(/&#(\d+);/g, function(_, code) {
      return safeCodePoint_(parseInt(code, 10));
    })
    .replace(/&([a-z]+);/gi, function(entity, name) {
      return Object.prototype.hasOwnProperty.call(namedEntities, name.toLowerCase())
        ? namedEntities[name.toLowerCase()]
        : entity;
    });
}

function safeCodePoint_(codePoint) {
  if (!isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF) return '';
  return String.fromCodePoint(codePoint);
}

function isTitleFetchAllowed_(url) {
  var match = String(url || '').match(/^https?:\/\/([^/?#]+)/i);
  if (!match) return false;

  var host = match[1].replace(/:\d+$/, '').toLowerCase();
  if (!host || host.charAt(0) === '[' || host === 'localhost' || /\.(local|internal)$/.test(host)) return false;

  var octets = host.split('.');
  if (octets.length !== 4 || !octets.every(function(part) { return /^\d+$/.test(part); })) return true;

  var numbers = octets.map(Number);
  if (numbers.some(function(part) { return part < 0 || part > 255; })) return false;
  if (numbers[0] === 0 || numbers[0] === 10 || numbers[0] === 127 || numbers[0] >= 224) return false;
  if (numbers[0] === 169 && numbers[1] === 254) return false;
  if (numbers[0] === 172 && numbers[1] >= 16 && numbers[1] <= 31) return false;
  if (numbers[0] === 192 && numbers[1] === 168) return false;
  return true;
}
