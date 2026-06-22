// 注入 Material Icons 樣式
if (!document.querySelector('link[href*="Material+Icons"]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
  document.head.appendChild(link);
}

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

function createDialButton(number, potentialStudentsId) {
  const btn = document.createElement('a');
  btn.className = 'evox-dial-btn';
  btn.title = `用 EVOX 撥打 ${number}`;
  btn.innerHTML = `<span class="material-icons evox-icon">call</span><span class="evox-label">撥打</span>`;
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

    // 新增：複製到剪貼簿 (clipboard)
    navigator.clipboard.writeText(number).then(() => {
      console.log(`已將電話號碼 ${number} 複製到剪貼簿`);
    }).catch(err => {
      console.error('無法複製到剪貼簿', err);
    });

    // 新增：勾選對應的 js-student-checkbox（同時比對 data-phone 與 data-potential-students-id）
    const selector = potentialStudentsId
      ? `input.js-student-checkbox[data-phone="${number}"][data-potential-students-id="${potentialStudentsId}"]`
      : `input.js-student-checkbox[data-phone="${number}"]`;
    const checkbox = document.querySelector(selector);
    if (checkbox && !checkbox.checked) {
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 3 秒後恢復原狀
    setTimeout(() => {
      btn.classList.remove('is-dialing');
      labelSpan.textContent = originalText;
    }, 3000);

    // 稍候 150ms（讓 evox:// 協定觸發不衝突），focus 同列的「未接聽」按鈕
    setTimeout(() => {
      const tr = btn.closest('tr');
      const noAnswerBtn = tr
        ? Array.from(tr.querySelectorAll('button.oa-noanswer-btn'))
            .find(b => b.querySelector('.oa-label')?.textContent === '未接聽') ?? null
        : null;

      if (!noAnswerBtn) return;

      noAnswerBtn.setAttribute('tabindex', '0');
      noAnswerBtn.style.outline = '3px solid #6f42c1';
      noAnswerBtn.style.outlineOffset = '2px';
      noAnswerBtn.style.borderRadius = '4px';

      const cleanup = () => {
        noAnswerBtn.style.outline = '';
        noAnswerBtn.style.outlineOffset = '';
        noAnswerBtn.style.borderRadius = '';
        noAnswerBtn.removeEventListener('keydown', onKeydown);
        noAnswerBtn.removeEventListener('blur', cleanup);
      };
      const onKeydown = (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          noAnswerBtn.click();
          cleanup();
        } else if (e.key === 'Escape') {
          cleanup();
        }
      };

      noAnswerBtn.addEventListener('keydown', onKeydown);
      noAnswerBtn.addEventListener('blur', cleanup);
      noAnswerBtn.focus({ preventScroll: true });
    }, 150);
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

    const potentialStudentsId = td.closest('tr')?.dataset?.id || null;
    const btn = createDialButton(number, potentialStudentsId);
    td.appendChild(btn);
  });
}

// 初次執行
injectButtons();

// 監聽動態載入（頁面用 JS 動態更新內容時也能偵測到）
const observer = new MutationObserver(() => {
  injectButtons();
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});
