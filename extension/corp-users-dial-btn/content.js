/**
 * EvoX 撥打按鈕 - Content Script
 *
 * 目標頁面：https://corp.orangeapple.co/users/*
 *
 * 用戶資料頁的基本資料表格結構：
 *   <tr><td><strong>電話:</strong></td><td>0986334030</td></tr>
 *
 * 本腳本會在電話號碼右側插入一個「撥打」按鈕，
 * 點按後：
 *   1. 開啟 evox://(電話號碼) 觸發 Evox 桌面程式撥打
 *   2. 填入頁面主搜尋框（#q）並觸發 input 事件
 *   3. 複製電話號碼到剪貼簿
 */

(function () {
  const PROCESSED_ATTR = 'data-evox-done';

  // ── 注入 Material Icons ──────────────────────────────────────────────────
  if (!document.querySelector('link[href*="Material+Icons"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    document.head.appendChild(link);
  }

  // ── 注入樣式 ─────────────────────────────────────────────────────────────
  if (!document.getElementById('evox-style')) {
    const style = document.createElement('style');
    style.id = 'evox-style';
    style.textContent = `
      .evox-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 4px !important;
        margin-left: 8px !important;
        padding: 3px 10px !important;
        background: #00b050 !important;
        color: #fff !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        border: none !important;
        border-radius: 4px !important;
        cursor: pointer !important;
        line-height: 1.5 !important;
        vertical-align: middle !important;
        text-decoration: none !important;
        white-space: nowrap !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
        transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.1s ease !important;
      }
      .evox-btn:hover {
        background: #009140 !important;
        transform: scale(1.05) !important;
        box-shadow: 0 2px 5px rgba(0,0,0,0.4) !important;
      }
      .evox-btn:active {
        transform: scale(0.97) !important;
      }
      .evox-icon {
        font-size: 16px !important;
        line-height: 1 !important;
      }
      .evox-btn.is-dialing {
        background: #9aa1a9 !important;
        cursor: not-allowed !important;
        opacity: 0.85 !important;
        transform: none !important;
        box-shadow: none !important;
      }
      .evox-invite-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 4px !important;
        margin-left: 4px !important;
        padding: 3px 10px !important;
        background: #3498db !important;
        color: #fff !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        border: none !important;
        border-radius: 4px !important;
        cursor: pointer !important;
        line-height: 1.5 !important;
        vertical-align: middle !important;
        text-decoration: none !important;
        white-space: nowrap !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
        transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.1s ease !important;
      }
      .evox-invite-btn:hover {
        background: #2980b9 !important;
        transform: scale(1.05) !important;
        box-shadow: 0 2px 5px rgba(0,0,0,0.4) !important;
      }
      .evox-invite-btn:active {
        transform: scale(0.97) !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ── 判斷是否為電話號碼（台灣手機/市話 或 國際格式） ─────────────────────
  function isPhone(str) {
    return /^[\+]?[\d][\d\s\-]{6,16}$/.test(str.trim());
  }

  // ── 主處理：找電話列並注入按鈕 ────────────────────────────────────────────
  function injectButton() {
    const rows = document.querySelectorAll(`tr:not([${PROCESSED_ATTR}])`);
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) return;

      // 第一格含「電話」字樣才處理
      if (!/電話/.test(cells[0].textContent)) return;

      row.setAttribute(PROCESSED_ATTR, '1');

      const phoneCell = cells[1];
      const phoneRaw = phoneCell.textContent.trim();
      if (!isPhone(phoneRaw)) return;

      // 避免重複注入
      if (phoneCell.querySelector('.evox-btn')) return;

      const phoneClean = phoneRaw.replace(/[\s\-]/g, '');

      // ── 建立撥打按鈕 ──
      const btn = document.createElement('a');
      btn.className = 'evox-btn';
      btn.innerHTML = `<span class="material-icons evox-icon">call</span><span class="evox-label">撥打</span>`;
      btn.setAttribute('data-phone', phoneClean);
      btn.setAttribute('title', `撥打 ${phoneRaw}`);
      btn.href = `evox://${phoneClean}`;

      btn.addEventListener('click', e => {
        // 防止重複點擊
        if (btn.classList.contains('is-dialing')) {
          e.preventDefault();
          return;
        }

        btn.classList.add('is-dialing');
        const labelSpan = btn.querySelector('.evox-label');
        if (labelSpan) labelSpan.textContent = '撥號中';

        // 1. 填入主搜尋框並觸發 input 事件
        const searchInput = document.getElementById('q');
        if (searchInput) {
          searchInput.value = phoneClean;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // 2. 複製到剪貼簿
        navigator.clipboard.writeText(phoneClean).catch(err => {
          console.error('[EVOX] 無法複製到剪貼簿', err);
        });

        // 3. 3 秒後恢復
        setTimeout(() => {
          btn.classList.remove('is-dialing');
          if (labelSpan) labelSpan.textContent = '撥打';
        }, 3000);
      });

      // ── 建立邀約名單按鈕 ──
      const inviteBtn = document.createElement('a');
      inviteBtn.className = 'evox-invite-btn';
      inviteBtn.innerHTML = `<span class="material-icons evox-icon">group</span><span>邀約名單</span>`;
      inviteBtn.setAttribute('title', `查看 ${phoneRaw} 邀約名單`);
      inviteBtn.href = `https://corp.orangeapple.co/marketing/sales?kind=&grade_low=0&grade_top=16&search_and_text=&exclude_or_text=&exclude_and_text=&start_date=&end_date=&log_count=&search_or_text=${phoneClean}`;
      inviteBtn.target = '_blank';
      inviteBtn.rel = 'noopener noreferrer';

      phoneCell.appendChild(btn);
      phoneCell.appendChild(inviteBtn);
    });
  }

  // ── 判斷目前是否在 /users/ 頁面 ─────────────────────────────────────────
  function isUsersPage() {
    return /^\/users\//.test(location.pathname);
  }

  // ── 初次執行 ─────────────────────────────────────────────────────────────
  if (isUsersPage()) {
    injectButton();
  }

  // ── 監聽 Turbo 導航完成事件（從其他頁面跳轉過來時） ───────────────────────
  document.addEventListener('turbo:load', () => {
    if (isUsersPage()) {
      injectButton();
    }
  });

  // ── 監聽動態更新（同頁 Ajax 更新等） ──────────────────────────────────────
  new MutationObserver(mutations => {
    if (isUsersPage() && mutations.some(m => m.addedNodes.length > 0)) {
      injectButton();
    }
  }).observe(document.body, { childList: true, subtree: true });

})();
