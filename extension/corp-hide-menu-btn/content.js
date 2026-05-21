(function () {
  const CONTAINER_ID = 'oa-hide-menu-container';
  const BTN_ID      = 'oa-hide-menu-btn';
  const CALL_BTN_ID = 'oa-call-btn';
  const CLOCK_ID    = 'oa-hide-menu-clock';
  const STYLE_ID    = 'oa-hide-menu-style';
  const STORAGE_KEY = 'oa-menu-collapsed';

  // ── Material Icons ────────────────────────────────────────────────────────
  if (!document.querySelector('link[href*="Material+Icons"]')) {
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    document.head.appendChild(link);
  }

  // ── 注入樣式 ──────────────────────────────────────────────────────────────
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${CONTAINER_ID} {
        position: fixed;
        top: 8px;
        left: 8px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      #${BTN_ID}, #${CALL_BTN_ID} {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: #e67e22;
        color: #fff;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        transition: background 0.15s ease, transform 0.1s ease;
        flex-shrink: 0;
      }
      #${BTN_ID}:hover, #${CALL_BTN_ID}:hover { background: #d35400; transform: scale(1.05); }
      #${BTN_ID}:active, #${CALL_BTN_ID}:active { transform: scale(0.97); }
      #${BTN_ID} .material-icons, #${CALL_BTN_ID} .material-icons { font-size: 20px; line-height: 1; }
      /* 時鐘 */
      #${CLOCK_ID} {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 36px;
        padding: 0 5px;
        background: #e67e22;
        color: #fff;
        font-size: 20px;
        font-family: ui-monospace, 'Courier New', monospace;
        font-weight: 700;
        letter-spacing: 0.02em;
        border-radius: 6px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        user-select: none;
        flex-shrink: 0;
        line-height: 1;
      }
      /* 收合時主內容區填滿寬度 */
      body.oa-menu-collapsed .sidebar { display: none !important; }
      body.oa-menu-collapsed .sidebar + * {
        flex: 1 1 100% !important;
        max-width: 100% !important;
        width: 100% !important;
        margin-left: 0 !important;
        padding-top: 52px !important;
      }
      /* form 移入浮動容器後 */
      #${CONTAINER_ID} #search_students {
        display: flex !important;
        align-items: center !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
        border: none !important;
      }
      /* 搜尋框樣式 */
      #${CONTAINER_ID} #q {
        height: 36px !important;
        width: 200px !important;
        border-radius: 6px !important;
        border: 1px solid #ced4da !important;
        padding: 0 10px !important;
        font-size: 14px !important;
        background: #fff !important;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important;
        outline: none !important;
        margin: 0 !important;
      }
      #${CONTAINER_ID} #q:focus {
        border-color: #e67e22 !important;
        box-shadow: 0 0 0 2px rgba(230,126,34,0.25) !important;
      }
      /* 搜尋結果下拉：複製原始 .desktop 的 hover 顯示/隱藏規則 */
      #${CONTAINER_ID} #search_students #search_results { display: none !important; }
      #${CONTAINER_ID} #search_students:hover #search_results,
      #${CONTAINER_ID} #search_students:focus-within #search_results { display: block !important; }
      /* 定位到浮動列下方 */
      #${CONTAINER_ID} #search_results {
        position: fixed !important;
        top: 52px !important;
        left: 8px !important;
        z-index: 9998 !important;
        min-width: 260px !important;
        max-height: 60vh !important;
        overflow-y: auto !important;
        background: #fff !important;
        border: 1px solid #dee2e6 !important;
        border-radius: 6px !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Server 時間校準 ───────────────────────────────────────────────────────
  let serverOffset = 0; // ms，server 時間 - 本機時間

  async function calibrateServerTime() {
    try {
      const t0  = Date.now();
      const res = await fetch('/', { method: 'HEAD', cache: 'no-store' });
      const t1  = Date.now();
      const serverDateStr = res.headers.get('Date');
      if (!serverDateStr) return;
      const serverMs = new Date(serverDateStr).getTime();
      // 用 RTT 中點補償網路延遲
      serverOffset = serverMs - Math.round((t0 + t1) / 2);
    } catch (e) {
      console.warn('[oa-clock] 校準失敗，使用本機時間', e);
    }
  }

  function getServerNow() {
    return new Date(Date.now() + serverOffset);
  }

  function formatTime(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${mi}:${ss}`;
  }

  // 首次校準，之後每 5 分鐘重新校準
  calibrateServerTime();
  setInterval(calibrateServerTime, 5 * 60 * 1000);

  // 每秒更新時鐘
  let clockInterval = null;
  function startClock() {
    if (clockInterval) return;
    clockInterval = setInterval(() => {
      const el = document.getElementById(CLOCK_ID);
      if (el) el.textContent = formatTime(getServerNow());
    }, 1000);
  }

  // ── 狀態輔助 ──────────────────────────────────────────────────────────────
  let formParent      = null;
  let formNextSibling = null;

  const isCollapsed = () => sessionStorage.getItem(STORAGE_KEY) === '1';

  function getSearchForm() {
    return document.getElementById('search_students');
  }

  // ── 收合：將 form 插到時鐘左側，保留 Stimulus binding ────────────────────
  function collapse(btn) {
    const form      = getSearchForm();
    const container = document.getElementById(CONTAINER_ID);
    const clock     = document.getElementById(CLOCK_ID);
    if (form && container && !container.contains(form)) {
      formParent      = form.parentElement;
      formNextSibling = form.nextSibling;
      // 插在撥打按鈕左側，維持 [btn][form][call-btn][clock] 順序
      const callBtn = document.getElementById(CALL_BTN_ID);
      container.insertBefore(form, callBtn || clock || null);
    }
    document.body.classList.add('oa-menu-collapsed');
    sessionStorage.setItem(STORAGE_KEY, '1');
    const icon = btn.querySelector('.material-icons');
    if (icon) icon.textContent = 'menu';
  }

  // ── 展開：將 form 歸位 ────────────────────────────────────────────────────
  function expand(btn) {
    const form = getSearchForm();
    if (form && formParent) {
      formParent.insertBefore(form, formNextSibling || null);
      formParent      = null;
      formNextSibling = null;
    }
    document.body.classList.remove('oa-menu-collapsed');
    sessionStorage.removeItem(STORAGE_KEY);
    const icon = btn.querySelector('.material-icons');
    if (icon) icon.textContent = 'menu_open';
  }

  // ── 注入浮動容器、按鈕、時鐘 ─────────────────────────────────────────────
  function inject() {
    let container = document.getElementById(CONTAINER_ID);

    if (!container) {
      container = document.createElement('div');
      container.id = CONTAINER_ID;

      // 切換按鈕
      const btn = document.createElement('button');
      btn.id    = BTN_ID;
      btn.title = '收合/展開側邊欄';
      btn.innerHTML = `<span class="material-icons">${isCollapsed() ? 'menu' : 'menu_open'}</span>`;
      btn.addEventListener('click', () => {
        isCollapsed() ? expand(btn) : collapse(btn);
      });
      container.appendChild(btn);

      // 撥打按鈕（在時鐘左側）
      const callBtn = document.createElement('button');
      callBtn.id    = CALL_BTN_ID;
      callBtn.title = '撥打號碼';
      callBtn.innerHTML = `<span class="material-icons">phone</span>`;
      callBtn.addEventListener('click', () => {
        const phone = (document.getElementById('q')?.value ?? '').trim();
        if (phone) window.open(`evox://${phone}`);
      });
      container.appendChild(callBtn);

      // 時鐘（永遠在容器最右側）
      const clock = document.createElement('div');
      clock.id          = CLOCK_ID;
      clock.textContent = formatTime(getServerNow());
      container.appendChild(clock);

      document.body.appendChild(container);
      startClock();
    }

    // 恢復收合狀態（Turbo 導航後重建）
    if (isCollapsed()) {
      const btn  = document.getElementById(BTN_ID);
      const form = getSearchForm();
      if (btn && form && !container.contains(form)) {
        collapse(btn);
      } else {
        document.body.classList.add('oa-menu-collapsed');
      }
    }
  }

  // ── Turbo 導航前：將 form 移回 nav，確保 permanent 機制正常 ───────────────
  document.addEventListener('turbo:before-render', () => {
    if (!isCollapsed()) return;
    const form      = getSearchForm();
    const container = document.getElementById(CONTAINER_ID);
    if (form && container && container.contains(form) && formParent) {
      formParent.insertBefore(form, formNextSibling || null);
      formParent      = null;
      formNextSibling = null;
    }
  });

  // ── 初次執行與 Turbo 事件 ─────────────────────────────────────────────────
  inject();
  document.addEventListener('turbo:load', inject);
  document.addEventListener('turbo:render', inject);

  // ── MutationObserver 自癒 ─────────────────────────────────────────────────
  new MutationObserver(() => {
    if (!document.getElementById(CONTAINER_ID)) inject();
  }).observe(document.body, { childList: true, subtree: false });
})();
