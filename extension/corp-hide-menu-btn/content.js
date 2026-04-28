(function () {
  const CONTAINER_ID = 'oa-hide-menu-container';
  const BTN_ID = 'oa-hide-menu-btn';
  const STYLE_ID = 'oa-hide-menu-style';
  const STORAGE_KEY = 'oa-menu-collapsed';

  // ── Material Icons ────────────────────────────────────────────────────────
  if (!document.querySelector('link[href*="Material+Icons"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
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
      #${BTN_ID} {
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
      #${BTN_ID}:hover { background: #d35400; transform: scale(1.05); }
      #${BTN_ID}:active { transform: scale(0.97); }
      #${BTN_ID} .material-icons { font-size: 20px; line-height: 1; }
      /* 收合時主內容區填滿寬度 */
      body.oa-menu-collapsed .sidebar { display: none !important; }
      body.oa-menu-collapsed .sidebar + * {
        flex: 1 1 100% !important;
        max-width: 100% !important;
        width: 100% !important;
        margin-left: 0 !important;
        padding-top: 52px !important;
      }
      /* 搜尋框移入浮動容器後的樣式 */
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
    `;
    document.head.appendChild(style);
  }

  // ── 狀態輔助 ──────────────────────────────────────────────────────────────
  let qParent = null;
  let qNextSibling = null;

  const isCollapsed = () => sessionStorage.getItem(STORAGE_KEY) === '1';

  // ── 收合 ──────────────────────────────────────────────────────────────────
  function collapse(btn) {
    const q = document.getElementById('q');
    const container = document.getElementById(CONTAINER_ID);
    if (q && container && !container.contains(q)) {
      qParent = q.parentElement;
      qNextSibling = q.nextSibling;
      container.appendChild(q);
    }
    document.body.classList.add('oa-menu-collapsed');
    sessionStorage.setItem(STORAGE_KEY, '1');
    const icon = btn.querySelector('.material-icons');
    if (icon) icon.textContent = 'menu';
  }

  // ── 展開 ──────────────────────────────────────────────────────────────────
  function expand(btn) {
    const q = document.getElementById('q');
    if (q && qParent) {
      qParent.insertBefore(q, qNextSibling || null);
      qParent = null;
      qNextSibling = null;
    }
    document.body.classList.remove('oa-menu-collapsed');
    sessionStorage.removeItem(STORAGE_KEY);
    const icon = btn.querySelector('.material-icons');
    if (icon) icon.textContent = 'menu_open';
  }

  // ── 注入浮動容器與按鈕 ────────────────────────────────────────────────────
  function inject() {
    let container = document.getElementById(CONTAINER_ID);

    if (!container) {
      container = document.createElement('div');
      container.id = CONTAINER_ID;

      const btn = document.createElement('button');
      btn.id = BTN_ID;
      btn.title = '收合/展開側邊欄';
      btn.innerHTML = `<span class="material-icons">${isCollapsed() ? 'menu' : 'menu_open'}</span>`;
      btn.addEventListener('click', () => {
        isCollapsed() ? expand(btn) : collapse(btn);
      });

      container.appendChild(btn);
      document.body.appendChild(container);
    }

    // 若 sessionStorage 記錄為收合狀態，恢復收合（Turbo 導航後重建）
    if (isCollapsed()) {
      const btn = document.getElementById(BTN_ID);
      const q = document.getElementById('q');
      if (btn && q && !container.contains(q)) {
        collapse(btn);
      } else {
        // sidebar class 可能因 Turbo 而消失，補上
        document.body.classList.add('oa-menu-collapsed');
      }
    }
  }

  // ── Turbo 導航前：將 #q 移回 nav，確保 Turbo permanent 機制正常保存 ───────
  document.addEventListener('turbo:before-render', () => {
    if (!isCollapsed()) return;
    const q = document.getElementById('q');
    const container = document.getElementById(CONTAINER_ID);
    if (q && container && container.contains(q) && qParent) {
      qParent.insertBefore(q, qNextSibling || null);
      qParent = null;
      qNextSibling = null;
    }
  });

  // ── 初次執行與 Turbo 事件 ─────────────────────────────────────────────────
  inject();
  document.addEventListener('turbo:load', inject);
  document.addEventListener('turbo:render', inject);

  // ── MutationObserver 自癒（防止容器被移除）─────────────────────────────────
  new MutationObserver(() => {
    if (!document.getElementById(CONTAINER_ID)) inject();
  }).observe(document.body, { childList: true, subtree: false });
})();
