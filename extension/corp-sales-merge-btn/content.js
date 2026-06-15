(function () {
  const BTN_ID   = 'oa-merge-all-btn';
  const STYLE_ID = 'oa-merge-all-style';

  // ── 注入樣式 ──────────────────────────────────────────────────────────────
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BTN_ID} {
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 36px;
        padding: 0 18px;
        background: #31b0d5;
        color: #fff;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        transition: background 0.15s ease, transform 0.1s ease;
        white-space: nowrap;
      }
      #${BTN_ID}:hover  { background: #269abc; transform: translateX(-50%) scale(1.05); }
      #${BTN_ID}:active { transform: translateX(-50%) scale(0.97); }
      #${BTN_ID}:disabled {
        background: #8ad4e8;
        cursor: not-allowed;
        transform: translateX(-50%);
      }
    `;
    document.head.appendChild(style);
  }

  // ── 在 content script 載入時就永久攔截 alert，用 flag 控制是否靜音 ────────
  // 這樣不論伺服器回傳的 JS 何時執行，都會走這個 wrapper
  let _silenceAlert = false;
  const _nativeAlert = window.alert.bind(window);
  window.alert = function (msg) {
    if (_silenceAlert) return;
    _nativeAlert(msg);
  };

  // ── 計算目前 .btn-merge 數量 ───────────────────────────────────────────────
  function getMergeBtns() {
    return [...document.querySelectorAll('.btn-merge')];
  }

  // ── 更新或移除浮動按鈕（只在頁面載入時呼叫，不由 MutationObserver 驅動）──
  function syncFloatingBtn() {
    const btns    = getMergeBtns();
    let   floater = document.getElementById(BTN_ID);

    if (btns.length === 0) {
      if (floater) floater.remove();
      return;
    }

    if (!floater) {
      floater = document.createElement('button');
      floater.id = BTN_ID;
      floater.addEventListener('click', onFloatingBtnClick);
      document.body.appendChild(floater);
    }

    floater.textContent = `一鍵合併全部 (${btns.length})`;
    floater.disabled    = false;
  }

  // ── 等待某個元素從 DOM 消失，最多等 timeout ms ────────────────────────────
  function waitForRemoval(el, timeout = 10000) {
    return new Promise((resolve) => {
      if (!document.body.contains(el)) { resolve('removed'); return; }

      const timer = setTimeout(() => {
        observer.disconnect();
        resolve('timeout');
      }, timeout);

      const observer = new MutationObserver(() => {
        if (!document.body.contains(el)) {
          clearTimeout(timer);
          observer.disconnect();
          resolve('removed');
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // ── 點擊浮動按鈕後的主流程 ───────────────────────────────────────────────
  async function onFloatingBtnClick() {
    const btns = getMergeBtns();
    if (btns.length === 0) { syncFloatingBtn(); return; }

    if (!confirm(`共 ${btns.length} 筆重複名單，確定要全部合併嗎？`)) return;

    const floater = document.getElementById(BTN_ID);
    floater.disabled    = true;
    floater.textContent = `合併中：0 / ${btns.length}`;

    // 靜音 alert（切換 flag，wrapper 已在 content script 載入時設好）
    _silenceAlert = true;

    let success = 0;
    let timedOut = 0;

    for (let i = 0; i < btns.length; i++) {
      const btn = btns[i];

      // 若按鈕已不在 DOM（前一筆連帶合併了），直接計入成功
      if (!document.body.contains(btn)) { success++; continue; }

      btn.click();

      const result = await waitForRemoval(btn);
      if (result === 'removed') {
        success++;
      } else {
        timedOut++;
      }

      floater.textContent = `合併中：${i + 1} / ${btns.length}`;
    }

    // 還原 alert
    _silenceAlert = false;

    // 結果提示
    if (timedOut === 0) {
      floater.textContent = `✓ 全部完成（${success} 筆）`;
    } else {
      floater.textContent = `完成 ${success} 筆，${timedOut} 筆逾時跳過`;
    }

    // 2 秒後依剩餘按鈕數更新浮動按鈕
    setTimeout(syncFloatingBtn, 2000);
  }

  // ── 初次執行與 Turbo 導航後重新掃描（不用 MutationObserver）────────────
  syncFloatingBtn();
  document.addEventListener('turbo:load',   syncFloatingBtn);
  document.addEventListener('turbo:render', syncFloatingBtn);
})();
