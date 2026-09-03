// ── 極早期隱藏（document_start）─────────────────────────────────────────────
// 目的：避免「頁面先畫出展開的 .sidebar，content.js 在 document_idle 才收合」
// 造成的閃爍。這裡只做最小限度的 CSS 隱藏，真正的按鈕、狀態管理都交給
// content.js；一旦 content.js 開始執行，會立刻移除這個暫時樣式並接手控制。
//
// STORAGE_KEY 與收合判斷邏輯必須跟 content.js 保持一致：
// sessionStorage 值為 '0' 才代表使用者本次已手動展開，其餘（含未設定）一律
// 視為收合（預設收合）。
(function () {
  const STORAGE_KEY = 'oa-menu-collapsed';
  const STYLE_ID     = 'oa-early-hide-style';

  try {
    if (sessionStorage.getItem(STORAGE_KEY) === '0') return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .sidebar { display: none !important; }
      .sidebar + * {
        flex: 1 1 100% !important;
        max-width: 100% !important;
        width: 100% !important;
        margin-left: 0 !important;
        padding-top: 52px !important;
      }
    `;
    document.documentElement.appendChild(style);
  } catch (e) {
    // sessionStorage 若被封鎖，放棄早期隱藏，交由 content.js 在 document_idle 正常處理
  }
})();
