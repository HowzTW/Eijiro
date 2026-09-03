(function () {
  const CONTAINER_ID = 'oa-hide-menu-container';
  const BTN_ID      = 'oa-hide-menu-btn';
  const CALL_BTN_ID = 'oa-call-btn';
  const SALES_BTN_ID     = 'oa-sales-btn';
  const POTENTIAL_BTN_ID = 'oa-potential-btn';
  const LOCATE_BTN_ID = 'oa-locate-btn';
  const INDICATOR_ID  = 'oa-locate-indicator';
  const CLOCK_ID    = 'oa-hide-menu-clock';
  const STYLE_ID    = 'oa-hide-menu-style';
  const STORAGE_KEY = 'oa-menu-collapsed';
  const EARLY_STYLE_ID = 'oa-early-hide-style';

  // early-hide.js 在 document_start 階段的暫時隱藏樣式已完成階段性任務，
  // 從這裡開始由下方的 class 機制（body.oa-menu-collapsed）接手控制，
  // 同步移除不會造成畫面閃爍。
  document.getElementById(EARLY_STYLE_ID)?.remove();

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
      #${BTN_ID}, #${CALL_BTN_ID}, #${SALES_BTN_ID}, #${POTENTIAL_BTN_ID}, #${LOCATE_BTN_ID} {
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
      #${BTN_ID}:hover:not(:disabled), #${CALL_BTN_ID}:hover:not(:disabled), #${SALES_BTN_ID}:hover:not(:disabled), #${POTENTIAL_BTN_ID}:hover:not(:disabled), #${LOCATE_BTN_ID}:hover:not(:disabled) { background: #d35400; transform: scale(1.05); }
      #${BTN_ID}:active:not(:disabled), #${CALL_BTN_ID}:active:not(:disabled), #${SALES_BTN_ID}:active:not(:disabled), #${POTENTIAL_BTN_ID}:active:not(:disabled), #${LOCATE_BTN_ID}:active:not(:disabled) { transform: scale(0.97); }
      #${BTN_ID} .material-icons, #${CALL_BTN_ID} .material-icons, #${SALES_BTN_ID} .material-icons, #${POTENTIAL_BTN_ID} .material-icons, #${LOCATE_BTN_ID} .material-icons { font-size: 20px; line-height: 1; }
      /* 空值時的 disabled 樣式 */
      #${CALL_BTN_ID}:disabled, #${SALES_BTN_ID}:disabled, #${POTENTIAL_BTN_ID}:disabled, #${LOCATE_BTN_ID}:disabled {
        background: #adb5bd;
        cursor: not-allowed;
        box-shadow: none;
      }
      /* 自訂 tooltip */
      #${CONTAINER_ID} [data-tip] { position: relative; }
      #${CONTAINER_ID} [data-tip]::after {
        content: attr(data-tip);
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        background: rgba(33,37,41,0.92);
        color: #fff;
        font-size: 12px;
        font-weight: 400;
        padding: 4px 8px;
        border-radius: 4px;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transform: translateY(-4px);
        transition: opacity 0.15s ease, transform 0.15s ease;
        z-index: 10000;
      }
      #${CONTAINER_ID} [data-tip]:hover::after {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }
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
      /* 電話定位：目標列高亮框 */
      .oa-target-highlight {
        outline: 2px solid #e67e22 !important;
        outline-offset: 2px;
        border-radius: 4px;
      }
      /* 電話定位：浮動提示標籤 */
      #${INDICATOR_ID} {
        position: fixed;
        background-color: #e67e22;
        color: #fff;
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: bold;
        pointer-events: none;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(230,126,34,0.4);
        white-space: nowrap;
        animation: oa-tooltip-bounce 0.5s ease-out;
      }
      #${INDICATOR_ID}::after {
        content: "";
        position: absolute;
        top: 50%;
        right: 100%;
        margin-top: -6px;
        border-width: 6px;
        border-style: solid;
        border-color: transparent #e67e22 transparent transparent;
      }
      @keyframes oa-tooltip-bounce {
        0% { transform: translateX(-20px); opacity: 0; }
        60% { transform: translateX(5px); opacity: 1; }
        100% { transform: translateX(0); opacity: 1; }
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

  // 預設收合：只有使用者在本次分頁 session 中明確按過展開（存值 '0'）才視為展開，
  // 其餘情況（含尚未操作過）一律視為收合，避免每次載入都要手動點一次。
  const isCollapsed = () => sessionStorage.getItem(STORAGE_KEY) !== '0';

  function getSearchForm() {
    return document.getElementById('search_students');
  }

  // ── #q 為空時，停用撥打與名單搜尋按鈕 ────────────────────────────────────
  function updateSearchBtnState() {
    const hasQ = !!(document.getElementById('q')?.value ?? '').trim();
    [CALL_BTN_ID, SALES_BTN_ID, POTENTIAL_BTN_ID, LOCATE_BTN_ID].forEach((id) => {
      const b = document.getElementById(id);
      if (b) b.disabled = !hasQ;
    });
  }

  // ── 電話定位：依電話號碼在本頁捲動＋高亮到符合的名單列 ──────────────────
  // 僅在 marketing/sales、courses/dt 頁面顯示；捲動/高亮視覺仿
  // corp-sales-next-list-btn 的 scrollToElement，但不涉及聚焦撥打/未接聽
  // 按鈕（純定位用途）。兩種頁面的名單欄位結構不同，各自用專屬函式擷取電話，
  // 找到符合的列後統一交給 scrollToPhoneMatch 處理捲動＋高亮。

  // marketing/sales：電話號碼在 td.phone_number。只在「目前可見」的列中比對：
  // 頁面上同時存在多個名單頁籤（tab-pane），只有一個用 display 顯示中，其餘
  // 用 display:none 藏著，getBoundingClientRect 寬高為 0 即可判斷該列所在
  // 頁籤目前是否可見。
  function findVisibleRowByPhoneOnSalesPage(phoneDigits) {
    const cells = document.querySelectorAll('td.phone_number');
    for (const td of cells) {
      const tr = td.closest('tr');
      if (!tr) continue;
      const rect = tr.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      // 電話欄位可能包在 <a>（重複號碼查詢連結）裡，後面還接著其他擴充功能
      // 注入的撥打按鈕（如 .evox-dial-btn），需先移除該按鈕再取文字，避免誤判。
      const clone = td.cloneNode(true);
      clone.querySelectorAll('.evox-dial-btn').forEach((el) => el.remove());
      const digits = clone.textContent.replace(/\D/g, '');
      if (digits && digits === phoneDigits) {
        return { row: tr, highlightEl: td };
      }
    }
    return null;
  }

  // courses/dt：名單列第 4 個 <td> 內固定是 [聯絡人姓名, 電話, email] 三個
  // 直接子層 <span>。不寫死一定是第 2 個 span，改用內容比對（去除非數字字元
  // 後長度 8~15 碼），較不怕少數資料列缺姓名或缺 email 時順序跑掉。
  // 電話可能是國際門號（如 +81...），不能比照 sales 頁限定台灣手機格式。
  function findVisibleRowByPhoneOnCoursesPage(phoneDigits) {
    const rows = document.querySelectorAll('tr');
    for (const tr of rows) {
      const tds = tr.querySelectorAll('td');
      if (tds.length < 4) continue;
      const rect = tr.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      const spans = tds[3].querySelectorAll(':scope > span');
      for (const span of spans) {
        const digits = span.textContent.replace(/\D/g, '');
        if (digits.length >= 8 && digits.length <= 15 && digits === phoneDigits) {
          return { row: tr, highlightEl: tds[3] };
        }
      }
    }
    return null;
  }

  function findVisibleRowByPhone(phoneDigits) {
    if (location.pathname.startsWith('/courses/dt/')) {
      return findVisibleRowByPhoneOnCoursesPage(phoneDigits);
    }
    return findVisibleRowByPhoneOnSalesPage(phoneDigits);
  }

  let _locateAnimFrame     = null;
  let _locateDelayedTimer  = null;
  let _locateCleanupTimer  = null;
  let _locateScrollCleanup = null;

  function clearLocateEffects() {
    if (_locateAnimFrame)     { cancelAnimationFrame(_locateAnimFrame); _locateAnimFrame = null; }
    if (_locateDelayedTimer)  { clearTimeout(_locateDelayedTimer); _locateDelayedTimer = null; }
    if (_locateCleanupTimer)  { clearTimeout(_locateCleanupTimer); _locateCleanupTimer = null; }
    if (_locateScrollCleanup) { _locateScrollCleanup(); _locateScrollCleanup = null; }
    document.querySelectorAll('.oa-target-highlight').forEach((el) => el.classList.remove('oa-target-highlight'));
    const oldIndicator = document.getElementById(INDICATOR_ID);
    if (oldIndicator) oldIndicator.remove();
  }

  function scrollToPhoneMatch(scrollTarget, highlightElement) {
    clearLocateEffects();
    scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlightElement.classList.add('oa-target-highlight');

    let hasShown = false;
    const showIndicatorImmediately = () => {
      if (hasShown) return;
      hasShown = true;
      if (_locateScrollCleanup) { _locateScrollCleanup(); _locateScrollCleanup = null; }

      const indicator = document.createElement('div');
      indicator.id = INDICATOR_ID;
      indicator.textContent = '在這裡';
      document.body.appendChild(indicator);

      const trackPosition = () => {
        const rect = highlightElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          indicator.style.top  = `${rect.top + rect.height / 2 - 15}px`;
          indicator.style.left = `${rect.right + 15}px`;
        }
        _locateAnimFrame = requestAnimationFrame(trackPosition);
      };
      _locateAnimFrame = requestAnimationFrame(trackPosition);

      _locateCleanupTimer = setTimeout(() => {
        indicator.style.opacity = '0';
        indicator.style.transition = 'opacity 0.5s';
        _locateCleanupTimer = setTimeout(() => {
          cancelAnimationFrame(_locateAnimFrame);
          _locateAnimFrame = null;
          indicator.remove();
          highlightElement.classList.remove('oa-target-highlight');
          _locateCleanupTimer = null;
        }, 500);
      }, 3000);
    };

    const triggerDelayedShow = () => {
      if (_locateScrollCleanup) _locateScrollCleanup();
      if (_locateDelayedTimer) clearTimeout(_locateDelayedTimer);
      _locateDelayedTimer = setTimeout(showIndicatorImmediately, 400);
    };

    let isScrolling = false;
    let debounceTimer = null;

    const onScrollStartDetected = () => { isScrolling = true; };
    const onScrollEnd = () => triggerDelayedShow();
    const onScrollMove = () => {
      isScrolling = true;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(onScrollEnd, 150);
    };

    window.addEventListener('scroll', onScrollStartDetected, { once: true });
    window.addEventListener('scrollend', onScrollEnd, { once: true });
    window.addEventListener('scroll', onScrollMove);

    _locateScrollCleanup = () => {
      window.removeEventListener('scroll', onScrollStartDetected);
      window.removeEventListener('scrollend', onScrollEnd);
      window.removeEventListener('scroll', onScrollMove);
      clearTimeout(debounceTimer);
    };

    setTimeout(() => {
      if (!isScrolling) triggerDelayedShow();
    }, 150);
  }

  // 只在 marketing/sales、courses/dt 頁面顯示這顆按鈕；其餘頁面若存在就移除。
  // 每次 inject() 執行都會呼叫，涵蓋 Turbo 導覽進出這些頁面的情況。
  function updateLocateBtnVisibility(container) {
    const shouldShow = location.pathname.startsWith('/marketing/sales') ||
      location.pathname.startsWith('/courses/dt/');
    let btn = document.getElementById(LOCATE_BTN_ID);
    if (shouldShow && !btn) {
      btn = document.createElement('button');
      btn.id = LOCATE_BTN_ID;
      btn.dataset.tip = '依電話號碼定位本頁名單';
      btn.innerHTML = `<span class="material-icons">find_in_page</span>`;
      btn.addEventListener('click', () => {
        const phone = (document.getElementById('q')?.value ?? '').trim().replace(/\D/g, '');
        if (!phone) return;
        const match = findVisibleRowByPhone(phone);
        if (!match) {
          alert('找不到相符名單');
          return;
        }
        scrollToPhoneMatch(match.row, match.highlightEl);
      });
      container.appendChild(btn);
    } else if (!shouldShow && btn) {
      btn.remove();
    }
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
    sessionStorage.setItem(STORAGE_KEY, '0');
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
      btn.dataset.tip = '收合/展開左側導覽選單';
      btn.innerHTML = `<span class="material-icons">${isCollapsed() ? 'menu' : 'menu_open'}</span>`;
      btn.addEventListener('click', () => {
        isCollapsed() ? expand(btn) : collapse(btn);
      });
      container.appendChild(btn);

      // 撥打按鈕（在時鐘左側）
      const callBtn = document.createElement('button');
      callBtn.id    = CALL_BTN_ID;
      callBtn.dataset.tip = 'EVOX撥打電話';
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

      // 名單查詢按鈕（時鐘右側）：讀取 #q 的值，開新分頁搜尋
      const makeSearchBtn = (id, tip, icon, urlPrefix) => {
        const b = document.createElement('button');
        b.id    = id;
        b.dataset.tip = tip;
        b.innerHTML = `<span class="material-icons">${icon}</span>`;
        b.addEventListener('click', () => {
          const q = (document.getElementById('q')?.value ?? '').trim();
          if (q) window.open(urlPrefix + encodeURIComponent(q), '_blank');
        });
        container.appendChild(b);
      };
      makeSearchBtn(
        SALES_BTN_ID, '搜尋線上潛在名單', 'cloud',
        'https://corp.orangeapple.co/marketing/sales?kind=&grade_low=0&grade_top=16&search_and_text=&exclude_or_text=&exclude_and_text=&start_date=&end_date=&log_count=&search_or_text='
      );
      makeSearchBtn(
        POTENTIAL_BTN_ID, '搜尋全域潛在名單', 'public',
        'https://corp.orangeapple.co/potential_students?student_type=&grade_low=0&grade_top=16&pages%5B%5D=all&statuses%5B%5D=all&sources%5B%5D=all&district_ids%5B%5D=all&start_date=&end_date=&search_and_text=&exclude_or_text=&exclude_and_text=&search_or_text='
      );

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

    updateLocateBtnVisibility(container);
    updateSearchBtnState();
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

  // ── #q 輸入時同步按鈕狀態（事件委派，不受 Turbo 重建影響）────────────────
  document.addEventListener('input', (e) => {
    if (e.target?.id === 'q') updateSearchBtnState();
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
