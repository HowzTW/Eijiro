/**
 * OrangeApple 銷售預約時間提醒
 * 
 * 適用 URL: https://corp.orangeapple.co/marketing/sales*
 * 
 * 下次預約標籤範例:
 * <a data-turbo-frame="remote_modal" href="/potential_students/491652/next_call"> </a>
 * 
 * 如果 innerText 為空或是空白字元，自動取代為 "[預約時間]"。
 */

(function () {
  const TARGET_PHRASE = '[預約時間]';

  /**
   * 掃描並更新所有符合條件的連結
   */
  function updateNextCallLinks() {
    // 尋找具有 data-turbo-frame 且 href 包含 next_call 的連結
    const links = document.querySelectorAll('a[data-turbo-frame="remote_modal"][href*="/next_call"]');

    links.forEach(link => {
      const text = link.textContent.trim();
      const isAlreadyProcessed = link.dataset.oaProcessed === 'true';

      // 情況 1：目前的內容是空白 (或是原本的空白)
      if (text === '' || text === ' ') {
        link.textContent = TARGET_PHRASE;
        link.style.color = '#e67e22'; // 橘色提醒，與一般日期區分
        link.style.fontWeight = 'bold';
        link.dataset.oaProcessed = 'true';
      } 
      // 情況 2：如果目前的內容是日期 (非空白且非 [預約時間])，但我們之前標記過它是空值
      else if (text !== TARGET_PHRASE && isAlreadyProcessed) {
        // 這代表 Turbo 已經更新了內容，填入了正式日期
        // 我們應該還原樣式
        link.style.color = ''; 
        link.style.fontWeight = '';
        link.dataset.oaProcessed = 'false'; // 標記為不再是空值狀態
      }
    });
  }

  // 1. 頁面載入時執行一次
  updateNextCallLinks();

  // 2. 監聽 DOM 變化（應對 Turbo / Hotwire 局部更新或分頁載入）
  const observer = new MutationObserver((mutations) => {
    // 效能優化：只有當有節點新增或是子樹變更時才執行
    const hasAddedNodes = mutations.some(m => m.addedNodes.length > 0);
    if (hasAddedNodes) {
      updateNextCallLinks();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 輔助：監聽點擊事件，如果點擊的是我們標記的連結，代表可能要開 Modal 了
  // 這部分通常不需要額外處理，因為 Turbo 會接手，但我們可以在控制台記錄
  console.log('[OA Sales NextCall] Extension loaded and observing...');
})();
