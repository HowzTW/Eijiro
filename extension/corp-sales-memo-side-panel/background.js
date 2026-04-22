chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') });
});

// 代理 fetch 請求：extension 分頁無法直接跨域，由 background 以 cookie 發送
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
