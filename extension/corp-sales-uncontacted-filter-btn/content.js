(function() {
  const FAB_CLASS = 'uncontacted-filter-fab';
  const ROW_HIDDEN_CLASS = 'uncontacted-filter-row-hidden';

  // Material Design visibility_off icon
  const SVG_FILTER = `<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`;

  let _fabEl = null;
  let _fadeTimer = null;

  function getPane() {
    return document.querySelector('#new_students');
  }

  function isNewListActive() {
    const pane = getPane();
    return !!pane && pane.classList.contains('active');
  }

  // 建立並注入 FAB 按鈕（左下角）
  function injectFAB() {
    if (document.querySelector('.' + FAB_CLASS)) return;

    const btn = document.createElement('button');
    btn.className = FAB_CLASS;
    btn.type = 'button';
    btn.title = '僅保留未聯絡（-）的名單';
    btn.innerHTML = SVG_FILTER;
    btn.addEventListener('click', filterRows);

    _fabEl = btn;
    document.body.appendChild(btn);
    updateFabVisibility();
  }

  // 依目前分頁狀態顯示/隱藏 FAB
  function updateFabVisibility() {
    if (!_fabEl) return;
    if (isNewListActive()) {
      _fabEl.classList.remove('is-hidden', 'is-fading');
    } else {
      _fabEl.classList.add('is-hidden');
      _fabEl.classList.remove('is-fading');
    }
  }

  // 隱藏所有已有聯絡記錄的名單（保留 inner text 為 - 的）
  function filterRows() {
    const pane = getPane();
    if (!pane) return;

    const frames = pane.querySelectorAll('turbo-frame[id^="potential_student_"][id$="_log"]');
    frames.forEach(frame => {
      const link = frame.querySelector('a.show-comment');
      // frame 尚未載入完成時保守處理：不隱藏
      if (!link) return;
      if (link.textContent.trim() === '-') return;

      const tr1 = frame.closest('tr');
      if (!tr1) return;
      tr1.classList.add(ROW_HIDDEN_CLASS);

      // 一筆名單有兩行 <tr>，第二行為緊接的 border-bottom 列
      const tr2 = tr1.nextElementSibling;
      if (tr2 && tr2.classList.contains('border-bottom')) {
        tr2.classList.add(ROW_HIDDEN_CLASS);
      }
    });

    fadeOutFab();
  }

  // FAB 漸淡消失
  function fadeOutFab() {
    if (!_fabEl) return;
    _fabEl.classList.add('is-fading');
    clearTimeout(_fadeTimer);
    _fadeTimer = setTimeout(() => {
      if (_fabEl && _fabEl.classList.contains('is-fading')) {
        _fabEl.classList.add('is-hidden');
      }
    }, 450); // 對應 style.css 的 opacity 0.4s transition
  }

  // 恢復所有被過濾隱藏的名單列
  function restoreRows() {
    document.querySelectorAll('tr.' + ROW_HIDDEN_CLASS).forEach(tr => {
      tr.classList.remove(ROW_HIDDEN_CLASS);
    });
  }

  // 切回新名單分頁時：復原名單並重新顯示 FAB
  function onTabShown() {
    if (isNewListActive()) {
      clearTimeout(_fadeTimer);
      restoreRows();
    }
    updateFabVisibility();
  }

  // Bootstrap 5 的 tab 切換會發出原生 DOM 事件，content script 可直接監聽
  document.addEventListener('shown.bs.tab', onTabShown);

  // 處理 Turbo 頁面切換
  document.addEventListener('turbo:load', () => {
    injectFAB();
    updateFabVisibility();
  });

  // 自動執行注入
  injectFAB();
})();
