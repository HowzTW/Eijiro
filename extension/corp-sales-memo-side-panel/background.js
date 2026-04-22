// 代理 fetch 請求 & content script 開啟 side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'openPanel') {
        chrome.sidePanel.setOptions({ tabId: sender.tab.id, path: 'sidepanel.html', enabled: true });
        chrome.sidePanel.open({ tabId: sender.tab.id });
        return;
    }
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
