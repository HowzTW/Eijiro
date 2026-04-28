/**
 * EvoX 撥打按鈕 - Content Script
 *
 * 目標頁面：https://corp.orangeapple.co/courses/dt/*
 *
 * 「聯絡人 電話 Email」欄位的 HTML 結構固定為：
 *   聯絡人姓名<br>電話號碼<br>email
 *
 * 本腳本會在電話號碼正下方插入一個「撥打」按鈕，
 * 點按後開啟 evox://(電話號碼) 新視窗。
 */

(function () {
  const PROCESSED_ATTR = 'data-evox-done';
  const PHONE_COL_INDEX = 3; // 「聯絡人\n電話\nEmail」欄（0-based）

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
        margin-top: 4px !important;
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
    `;
    document.head.appendChild(style);
  }

  // ── 判斷是否為電話號碼（台灣手機/市話 或 國際格式） ─────────────────────
  function isPhone(str) {
    return /^[\+]?[\d][\d\s\-]{6,16}$/.test(str.trim());
  }

  // ── 主處理：掃描 #students-table 的每一列 ────────────────────────────────
  function injectButtons() {
    const tables = document.querySelectorAll('table#students-table');
    tables.forEach(table => {
      const rows = table.querySelectorAll(`tbody tr:not([${PROCESSED_ATTR}])`);
      rows.forEach(row => {
        row.setAttribute(PROCESSED_ATTR, '1');

        const cells = row.querySelectorAll('td');
        const cell = cells[PHONE_COL_INDEX];
        if (!cell) return;

        // 用 <br> 切割：[0]=姓名, [1]=電話, [2]=email
        // innerHTML 中 <br> 可能是 <br> 或 <BR> 或 <br/>
        const parts = cell.innerHTML.split(/<br\s*\/?>/i);
        if (parts.length < 2) return;

        const phoneRaw = parts[1].trim();
        if (!isPhone(phoneRaw)) return;

        // 純數字化（保留開頭的 +）
        const phoneClean = phoneRaw.replace(/[\s\-]/g, '');

        // 避免重複加按鈕
        if (cell.querySelector(`[data-phone="${phoneClean}"]`)) return;

        // 建立按鈕
        const btn = document.createElement('a');
        btn.className = 'evox-btn';
        btn.innerHTML = `<span class="material-icons evox-icon">call</span><span class="evox-label">撥打</span>`;
        btn.setAttribute('data-phone', phoneClean);
        btn.setAttribute('title', `撥打 ${phoneRaw}`);
        btn.href = `evox://${phoneClean}`;

        btn.addEventListener('click', e => {
          // 禁止重複點擊
          if (btn.classList.contains('is-dialing')) {
            e.preventDefault();
            return;
          }

          // 進入撥號中狀態
          btn.classList.add('is-dialing');
          const labelSpan = btn.querySelector('.evox-label');
          if (!labelSpan) return;
          const originalText = labelSpan.textContent;
          labelSpan.textContent = '撥號中';

          // 1. 同步填寫主搜尋欄 (id="q") 並觸發搜尋
          const searchInput = document.getElementById('q');
          if (searchInput) {
            searchInput.value = ''; // 先清除
            searchInput.value = phoneClean; // 填入
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          }

          // 2. 複製到剪貼簿 (Clipboard)
          navigator.clipboard.writeText(phoneClean).then(() => {
            console.log(`[EVOX] 已將號碼 ${phoneClean} 複製到剪貼簿`);
          }).catch(err => {
            console.error('[EVOX] 無法複製到剪貼簿', err);
          });

          // 3. 3 秒後恢復
          setTimeout(() => {
            btn.classList.remove('is-dialing');
            labelSpan.textContent = originalText;
          }, 3000);
        });

        // 重建 cell 內容：姓名<br>電話<br>[按鈕]<br>email...
        // 找到第二個 <br> 的位置，把按鈕插進去
        const secondBrRegex = /<br\s*\/?>/i;
        // 找到 parts[0]<br>parts[1] 結尾的位置後插入按鈕
        // 使用 DOM 操作而非 innerHTML 字串拼接，更安全
        cell.innerHTML = ''; // 清空
        // 重新填入
        parts.forEach((part, idx) => {
          if (idx > 0) {
            cell.appendChild(document.createElement('br'));
          }
          // 用 span 包住純文字部分，防止 XSS
          const span = document.createElement('span');
          span.innerHTML = part; // part 本身可能含有 <a> 等 HTML，保留原樣
          cell.appendChild(span);

          // 在電話號碼（index=1）之後插入按鈕
          if (idx === 1) {
            cell.appendChild(document.createElement('br'));
            cell.appendChild(btn);
          }
        });
      });
    });
  }

  // ── 初次執行 ─────────────────────────────────────────────────────────────
  injectButtons();

  // ── 監聽動態更新（分頁切換、Ajax 載入）─────────────────────────────────
  new MutationObserver(mutations => {
    if (mutations.some(m => m.addedNodes.length > 0)) {
      injectButtons();
    }
  }).observe(document.body, { childList: true, subtree: true });

})();
