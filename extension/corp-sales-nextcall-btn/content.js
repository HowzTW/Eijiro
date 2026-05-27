/**
 * OrangeApple 銷售預約時間提醒
 * 
 * 適用 URL: https://corp.orangeapple.co/marketing/sales*
 * 
 * 下次預約標籤範例:
 * <a data-turbo-frame="remote_modal" href="/potential_students/491652/next_call"> </a>
 * 
 * 如果內容為空，自動轉換為「預約時間」按鈕樣式。
 */

(function () {
  // 注入 Material Icons 樣式
  if (!document.querySelector('link[href*="Material+Icons"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    document.head.appendChild(link);
  }

  const BUTTON_LABEL = '預約時間';
  const BUTTON_HTML = `<span class="material-icons oa-icon">event</span><span class="oa-label">${BUTTON_LABEL}</span>`;
  const STYLE_ID = 'oa-nextcall-styles';

  /**
   * 注入 CSS 樣式 (確保比外部 CSS 更有權威)
   */
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .oa-nextcall-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 4px !important;
        padding: 3px 10px !important;
        background-color: #e67e22 !important; /* 強制橘色 */
        color: #ffffff !important;           /* 強制白色文字 */
        border-radius: 4px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        text-decoration: none !important;
        cursor: pointer !important;
        border: none !important;
        vertical-align: middle !important;
        line-height: 1.5 !important;
        transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.1s ease !important;
        white-space: nowrap !important;
        margin: 2px 0 !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
      }
      .oa-nextcall-btn:hover {
        background-color: #d35400 !important;
        transform: scale(1.05) !important;
        box-shadow: 0 2px 5px rgba(0,0,0,0.4) !important;
      }
      .oa-icon {
        font-size: 16px !important;
        line-height: 1 !important;
      }
      .oa-label {
        letter-spacing: 0.02em !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 掃描並更新所有符合條件的連結
   */
  function updateNextCallLinks() {
    injectStyles(); // 依然保留 CSS Class 作為備援與 Hover 效果
    
    // 尋找具有 data-turbo-frame 且 href 包含 next_call 的連結
    const links = document.querySelectorAll('a[data-turbo-frame="remote_modal"][href*="/next_call"]');

    links.forEach(link => {
      const text = link.textContent.trim();
      const isProcessed = link.dataset.oaProcessed === 'true';

      // --- 置中處理 ---
      // 為了讓按鈕不變形且維持置中，我們設定父層 td 置中，按鈕本身維持 inline-flex
      if (link.parentElement) {
        link.parentElement.style.textAlign = 'center';
      }
      link.style.setProperty('display', 'inline-flex', 'important');
      link.style.setProperty('width', 'auto', 'important');
      link.style.setProperty('justify-content', 'center', 'important');

      // 情況 1：目前的內容是空白 (或是原本的空白)
      if (text === '' || text === ' ' || (isProcessed && text === BUTTON_LABEL)) {
        if (!isProcessed || link.innerHTML !== BUTTON_HTML) {
            link.innerHTML = BUTTON_HTML;
            link.className = 'oa-nextcall-btn';
            
            // 使用 Inline Style 確保最高優先級
            link.style.setProperty('height', 'auto', 'important');
            link.style.setProperty('padding', '3px 10px', 'important');
            link.style.setProperty('background-color', '#e67e22', 'important');
            link.style.setProperty('color', '#ffffff', 'important');
            link.style.setProperty('border-radius', '4px', 'important');
            link.style.setProperty('font-size', '12px', 'important');
            link.style.setProperty('font-weight', '600', 'important');
            link.style.setProperty('text-decoration', 'none', 'important');
            link.style.setProperty('cursor', 'pointer', 'important');
            link.style.setProperty('vertical-align', 'middle', 'important');
            link.style.setProperty('line-height', '1.5', 'important');
            link.style.setProperty('white-space', 'nowrap', 'important');
            
            link.dataset.oaProcessed = 'true';
        }
      } 
      // 情況 2：如果目前的內容是日期，但我們之前標記過它是補上去的按鈕
      else if (isProcessed && text !== BUTTON_LABEL && !text.includes(BUTTON_LABEL)) {
        link.className = '';
        // 清除按鈕專用樣式，但保留置中樣式
        link.style.height = ''; 
        link.style.backgroundColor = '';
        link.style.color = '';
        link.style.padding = '';
        link.style.borderRadius = '';
        link.style.fontWeight = '';
        link.style.fontSize = '';
        link.style.lineHeight = '';
        
        link.dataset.oaProcessed = 'false'; 
      }
    });
  }

  // 1. 頁面載入時執行一次
  updateNextCallLinks();

  // 2. 監聽 DOM 變化（應對 Turbo / Hotwire 局部更新或分頁載入）
  const observer = new MutationObserver((mutations) => {
    const hasAddedNodes = mutations.some(m => m.addedNodes.length > 0);
    if (hasAddedNodes) {
      updateNextCallLinks();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  console.log('[OA Sales NextCall] Styles re-injected and logic refined.');
})();
