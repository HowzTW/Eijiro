// 點擊 toolbar 按鈕時開啟 side panel
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ tabId: tab.id });
});

// 代理 fetch 請求：side panel 無法直接跨域，由 background 以 cookie 發送
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'fetchUrl') {
        fetch(message.url, { credentials: 'include' })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.text();
            })
            .then(html => sendResponse({ success: true, html }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true; // 保持 message channel 供非同步回應
    }
});
