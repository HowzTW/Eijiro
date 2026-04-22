function injectMaterialIcons() {
    if (!document.querySelector('link[href*="Material+Icons"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
        document.head.appendChild(link);
    }
}

function addRecordButton(td) {
    if (td.querySelector('.oa-record-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'oa-record-btn';
    btn.type = 'button';
    btn.innerHTML = '<span class="material-icons oa-icon">edit_note</span><span class="oa-label">記錄</span>';
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            chrome.runtime.sendMessage({ type: 'openPanel' });
        } catch {
            // extension 已重新載入，忽略
        }

        const row = btn.closest('tr');
        if (!row) return;

        let targetScrollTop = 0;
        for (let el = row; el; el = el.offsetParent) targetScrollTop += el.offsetTop;
        const initialWidth = window.innerWidth;
        let done = false;

        const scheduleScroll = () => {
            if (done) return;
            done = true;
            resizeObserver.disconnect();
            window.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
        };

        const resizeObserver = new ResizeObserver(() => {
            if (window.innerWidth !== initialWidth) scheduleScroll();
        });
        resizeObserver.observe(document.documentElement);

        // 保底：若 side panel 已開啟（寬度不變），800ms 後仍執行捲動
        setTimeout(scheduleScroll, 800);
    });
    const dropdown = td.querySelector(':scope > div.dropdown');
    if (dropdown) dropdown.after(btn);
}

function processRows() {
    document.querySelectorAll('td > div.dropdown').forEach(dropdown => {
        addRecordButton(dropdown.parentElement);
    });
}

injectMaterialIcons();
processRows();

const observer = new MutationObserver(processRows);
observer.observe(document.body, { childList: true, subtree: true });

document.addEventListener('turbo:load', processRows);
document.addEventListener('turbo:frame-render', processRows);
