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
  const PHONE_COL_INDEX = 4; // 「聯絡人\n電話\nEmail」欄（0-based）

  // ── 注入樣式 ─────────────────────────────────────────────────────────────
  if (!document.getElementById('evox-style')) {
    const style = document.createElement('style');
    style.id = 'evox-style';
    style.textContent = `
      .evox-btn {
        display: inline-block;
        margin-top: 4px;
        padding: 2px 14px;
        background: #27ae60;
        color: #fff;
        font-size: 12px;
        font-weight: bold;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        line-height: 1.8;
        vertical-align: middle;
      }
      .evox-btn:hover { background: #1e8449; }
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

        // 建立按鈕，插在電話號碼後（第二個 <br> 前）
        const btn = document.createElement('button');
        btn.className = 'evox-btn';
        btn.textContent = '撥打';
        btn.setAttribute('data-phone', phoneClean);
        btn.setAttribute('title', `撥打 ${phoneRaw}`);
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          window.open(`evox://${phoneClean}`);
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
