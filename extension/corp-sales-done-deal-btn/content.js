/**
 * OA 銷售一鍵已報名按鈕
 *
 * 適用 URL: https://corp.orangeapple.co/marketing/sales*
 *
 * 在每筆名單第一行 <tr> 最後一個 <td>（dropdown 選單所在）注入藍色封存按鈕，
 * 按下後直接觸發選單中的「設為 已報名」項目（data-status="done-deal"），
 * 並將該名單兩行 <tr> 底色改為綠色（一般淺綠 / has_repeat 深綠）。
 */

(function () {
  const ROW_COLORS = {
    'done-deal': { normal: '#C8F2C8', repeat: '#51F765' },
  };

  function applyRowColors(currentTr, nextTr, kind) {
    const colors = ROW_COLORS[kind];
    if (!colors) return;
    [currentTr, nextTr].forEach(tr => {
      if (!tr) return;
      const color = tr.classList.contains('has_repeat') ? colors.repeat : colors.normal;
      tr.querySelectorAll('td').forEach(td => {
        td.style.setProperty('background-color', color, 'important');
      });
    });
  }

  /**
   * 建立一鍵已報名按鈕
   * 點擊時才即時尋找同 td 內的選單項目與所在列，避免 DOM 被刷新後持有舊參照
   */
  function createDoneDealButton(td) {
    const btn = document.createElement('button');
    btn.className = 'oa-donedeal-btn';
    btn.type = 'button';
    btn.title = '設為 已報名';

    const icon = document.createElement('span');
    icon.className = 'material-icons';
    icon.textContent = 'archive';
    btn.appendChild(icon);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const link = td.querySelector(
        'a.js-change-potential-student-status[data-status="done-deal"]'
      );
      if (!link) {
        console.error('[OA DoneDeal] 找不到「設為 已報名」選單項目');
        return;
      }

      btn.disabled = true;
      // 觸發頁面的 inline onclick（change_potential_student_status → AJAX PUT）
      link.click();

      // 頁面以 jQuery AJAX 送出且無回呼可攔，延遲後變色並恢復按鈕
      const currentTr = td.closest('tr');
      const nextTr = currentTr ? currentTr.nextElementSibling : null;
      setTimeout(() => {
        applyRowColors(currentTr, nextTr, 'done-deal');
        btn.disabled = false;
      }, 800);
    });

    return btn;
  }

  /**
   * 搜尋並注入按鈕
   */
  function injectDoneDealButtons() {
    const links = document.querySelectorAll(
      'a.js-change-potential-student-status[data-status="done-deal"]'
    );

    links.forEach(link => {
      const td = link.closest('td');
      if (!td) return;
      if (td.dataset.oaDoneDealProcessed === 'true') return;

      // 按鈕絕對定位於 td 底部置中
      td.style.position = 'relative';
      td.appendChild(createDoneDealButton(td));
      td.dataset.oaDoneDealProcessed = 'true';
    });
  }

  // 注入 Material Icons 字型
  if (!document.querySelector('link[href*="Material+Icons"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    document.head.appendChild(link);
  }

  // 初始注入
  injectDoneDealButtons();

  // 監聽 Turbo / AJAX 造成的 DOM 變化
  const mainObserver = new MutationObserver((mutations) => {
    const hasAddedNodes = mutations.some(m => m.addedNodes.length > 0);
    if (hasAddedNodes) {
      injectDoneDealButtons();
    }
  });

  mainObserver.observe(document.documentElement, { childList: true, subtree: true });

  console.log('[OA DoneDeal Extension] 載入成功');
})();
