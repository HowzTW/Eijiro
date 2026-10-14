(function () {
  // ── 常數 ──────────────────────────────────────────────────────────────────
  // 孤兒狀態需持續多久才顯示按鈕；用來避開 Bootstrap fade 動畫的正常過渡期
  const OA_OBC_ORPHAN_DELAY_MS = 600;
  // MutationObserver 觸發後，最多延遲多久執行一次檢查
  const OA_OBC_DEBOUNCE_MS = 100;
  const OA_OBC_HOST_ID = 'oa-obc-host';
  const OA_OBC_LABEL = '關閉殘留遮罩';
  const OA_OBC_CLOSE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="28" height="28" fill="currentColor" aria-hidden="true"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>';

  let host = null;           // 按鈕的 shadow host（顯示中才有值）
  let orphanSince = 0;       // 第一次偵測到孤兒狀態的時間戳，0 表示目前不是孤兒狀態
  let debounceTimer = null;
  let confirmTimer = null;   // 等待孤兒狀態持續滿 OA_OBC_ORPHAN_DELAY_MS 的複查計時器
  let observedBody = null;

  // ── 狀態判斷 ──────────────────────────────────────────────────────────────
  function hasVisibleModal() {
    return Array.from(document.querySelectorAll('.modal')).some(
      (el) => el.classList.contains('show') || getComputedStyle(el).display !== 'none'
    );
  }

  function isOrphanState() {
    return !!document.querySelector('.modal-backdrop') && !hasVisibleModal();
  }

  function resetPending() {
    orphanSince = 0;
    clearTimeout(confirmTimer);
    confirmTimer = null;
  }

  function check() {
    if (!isOrphanState()) {
      // 遮罩自己消失，或使用者正常開啟了 modal → 取消計時並移除按鈕
      resetPending();
      removeButton();
      return;
    }
    if (host) return;

    if (!orphanSince) orphanSince = Date.now();
    const remaining = OA_OBC_ORPHAN_DELAY_MS - (Date.now() - orphanSince);
    if (remaining <= 0) {
      showButton();
      return;
    }
    if (!confirmTimer) {
      confirmTimer = setTimeout(() => {
        confirmTimer = null;
        check();
      }, remaining);
    }
  }

  // 已排程就不重排：避免頁面上有頻繁變動的元素（如時鐘）時，檢查被無限延後
  function scheduleCheck() {
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      check();
    }, OA_OBC_DEBOUNCE_MS);
  }

  // ── 清除遮罩 ──────────────────────────────────────────────────────────────
  function clearBackdrop() {
    document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('padding-right');
    document.body.style.removeProperty('overflow');
    resetPending();
    removeButton();
  }

  // ── 按鈕（Shadow DOM）─────────────────────────────────────────────────────
  function showButton() {
    // 擴充功能重新載入後，舊版 content script 可能仍在執行並已顯示按鈕
    if (document.getElementById(OA_OBC_HOST_ID)) return;
    host = document.createElement('div');
    host.id = OA_OBC_HOST_ID;
    const shadow = host.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .oa-obc-btn {
          position: fixed;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 2147483000;
          width: 56px;
          height: 56px;
          padding: 0;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: 2px solid #fff;
          background: #d32f2f;
          color: #fff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
          cursor: pointer;
          transition: transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
        }
        .oa-obc-btn:hover {
          transform: translateY(-50%) scale(1.08);
          background: #b71c1c;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
        }
        .oa-obc-btn:active {
          transform: translateY(-50%) scale(0.96);
        }
        .oa-obc-btn:focus { outline: none; }
        .oa-obc-btn:focus-visible {
          outline: 3px solid #ffeb3b;
          outline-offset: 3px;
        }
      </style>
      <button type="button" class="oa-obc-btn" title="${OA_OBC_LABEL}" aria-label="${OA_OBC_LABEL}">${OA_OBC_CLOSE_SVG}</button>
    `;
    shadow.querySelector('.oa-obc-btn').addEventListener('click', clearBackdrop);
    // 掛在 <html> 而非 <body>：避免觸發 body 的 observer，且 SPA 替換 body 時不會被一併移除
    document.documentElement.appendChild(host);
  }

  function removeButton() {
    if (!host) return;
    host.remove();
    host = null;
  }

  // ── 監聽 ──────────────────────────────────────────────────────────────────
  const bodyObserver = new MutationObserver(scheduleCheck);

  function observeBody() {
    if (!document.body || document.body === observedBody) return;
    bodyObserver.disconnect();
    observedBody = document.body;
    bodyObserver.observe(observedBody, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    scheduleCheck();
  }

  // SPA（如 Turbolinks / Turbo）換頁時可能整個替換 <body>，需重新掛上 observer
  new MutationObserver(observeBody).observe(document.documentElement, { childList: true });

  // ── 初始化 ────────────────────────────────────────────────────────────────
  // 移除擴充功能重新載入前殘留的舊按鈕
  document.getElementById(OA_OBC_HOST_ID)?.remove();
  observeBody();
})();
