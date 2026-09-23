function verifyAccessKey_(providedKey) {
  var expectedHash = PropertiesService.getScriptProperties().getProperty('ACCESS_KEY_SHA256');
  if (!expectedHash) return;

  var actualHash = sha256Hex_(String(providedKey || ''));
  if (!constantTimeEquals_(actualHash, expectedHash.toLowerCase())) {
    throw apiError_('UNAUTHORIZED', '裝置密碼不正確');
  }
}

function setAccessKey(accessKey) {
  var value = String(accessKey || '').trim();
  if (value.length < 8) throw new Error('裝置密碼至少需要 8 個字元');
  PropertiesService.getScriptProperties().setProperty('ACCESS_KEY_SHA256', sha256Hex_(value));
}

function clearAccessKey() {
  PropertiesService.getScriptProperties().deleteProperty('ACCESS_KEY_SHA256');
}

function sha256Hex_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)
    .map(function(byte) {
      var normalized = byte < 0 ? byte + 256 : byte;
      return ('0' + normalized.toString(16)).slice(-2);
    })
    .join('');
}

function constantTimeEquals_(left, right) {
  if (left.length !== right.length) return false;
  var difference = 0;
  for (var i = 0; i < left.length; i += 1) {
    difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return difference === 0;
}
