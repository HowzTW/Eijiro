(function () {
    function injectFAB() {
        if (document.querySelector('.oa-memo-fab')) return;

        const btn = document.createElement('button');
        btn.className = 'oa-memo-fab';
        btn.title = '開啟體驗課程預約紀錄';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M3 10h11v2H3zm0-2h11V6H3zm0 8h7v-2H3zm15.01-3.13l.71-.71a.996.996 0 0 1 1.41 0l.71.71c.39.39.39 1.02 0 1.41l-.71.71-2.12-2.12zm-.71.71l-5.3 5.3V21h2.12l5.3-5.3-2.12-2.12z"/>
            </svg>
        `;

        btn.addEventListener('click', () => {
            try {
                chrome.runtime.sendMessage({ type: 'openPanel' });
            } catch {
                // extension 已重新載入，忽略
            }
        });

        document.body.appendChild(btn);
    }

    injectFAB();
    document.addEventListener('turbo:load', injectFAB);
})();
