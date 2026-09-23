function parseRequest_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw apiError_('EMPTY_REQUEST', '要求內容不可為空');
  }

  try {
    var request = JSON.parse(e.postData.contents);
    if (!request || typeof request !== 'object' || Array.isArray(request)) {
      throw new Error('Request must be an object');
    }
    return request;
  } catch (error) {
    throw apiError_('INVALID_JSON', '要求格式不正確');
  }
}

function apiError_(code, publicMessage) {
  var error = new Error(publicMessage);
  error.code = code;
  error.publicMessage = publicMessage;
  return error;
}
