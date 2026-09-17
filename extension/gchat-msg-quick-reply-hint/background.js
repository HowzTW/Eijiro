chrome.commands.onCommand.addListener((command) => {
  if (command !== 'quick-reply-received') return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.id) return;

    // content.js 不需要回傳任何內容，故意不帶回呼，避免「message port closed」
    // 這種無回應時才會出現的無害警告訊息干擾主控台。
    chrome.tabs.sendMessage(tab.id, { type: 'QUICK_REPLY_SHORTCUT' });
  });
});
