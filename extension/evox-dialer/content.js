// EVOX Quick Dial - content script
// 偵測 td.phone_number，在電話號碼旁插入撥號按鈕

function cleanNumber(raw) {
  // 移除所有非數字字元（空格、dash、括號等）
  return raw.replace(/[^0-9+]/g, '');
}

function extractNumber(td) {
  // 優先從 <a> 連結的文字取號碼，否則直接取 td 的文字
  const anchor = td.querySelector('a');
  const raw = anchor ? anchor.textContent.trim() : td.childNodes[0]?.textContent?.trim() || '';
  return cleanNumber(raw);
}

function createDialButton(number) {
  const btn = document.createElement('a');
  btn.className = 'evox-dial-btn';
  btn.title = `用 EVOX 撥打 ${number}`;
  btn.innerHTML = `<span class="evox-icon">📞</span><span class="evox-label">撥打</span>`;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = `evox://${number}`;
  });
  return btn;
}

function injectButtons() {
  const cells = document.querySelectorAll('td.phone_number');

  cells.forEach((td) => {
    // 避免重複插入
    if (td.querySelector('.evox-dial-btn')) return;

    const number = extractNumber(td);
    if (!number || number.length < 8) return; // 過濾掉非電話的內容

    const btn = createDialButton(number);
    td.appendChild(btn);
  });
}

// 初次執行
injectButtons();

// 監聽動態載入（頁面用 JS 動態更新內容時也能偵測到）
const observer = new MutationObserver(() => {
  injectButtons();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
