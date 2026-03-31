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

    // 防止重複點擊
    if (btn.classList.contains('is-dialing')) return;

    // 進入撥號中狀態
    btn.classList.add('is-dialing');
    const labelSpan = btn.querySelector('.evox-label');
    const originalText = labelSpan.textContent;
    labelSpan.textContent = '撥號中';

    // 執行撥號
    window.location.href = `evox://${number}`;

    // 新增：填入搜尋欄位並觸發搜尋 (id="q")
    const searchInput = document.getElementById('q');
    if (searchInput) {
      searchInput.value = ''; // 先清除內容
      searchInput.value = number; // 填入電話號碼
      // 觸發 input 事件以啟動頁面原本的搜尋機制 (Stimulus input->search#send)
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 3 秒後恢復原狀
    setTimeout(() => {
      btn.classList.remove('is-dialing');
      labelSpan.textContent = originalText;
    }, 3000);
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
