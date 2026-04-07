/**
 * OA 銷售未接聽快捷按鈕
 * 
 * 適用 URL: https://corp.orangeapple.co/marketing/sales*
 */

(function () {
  // 注入 Material Icons 樣式
  if (!document.querySelector('link[href*="Material+Icons"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    document.head.appendChild(link);
  }

  const BUTTON_LABEL = '未接聽';
  const BUTTON_HTML = `<span class="material-icons oa-icon">phone_missed</span><span class="oa-label">${BUTTON_LABEL}</span>`;
  
  /**
   * 自動化流程：點擊連結 -> 等待彈窗 -> 勾選 -> 送出 -> 關閉
   */
  async function performNoAnswerAutomation(link) {
    // 1. 點擊原始的 <a> 標籤觸發 Turbo 彈窗
    link.click();

    console.log('[OA NoAnswer] 觸發彈窗，等待表單加載...');

    // 2. 監聽 DOM，等待 #remote_modal 內的表單出現
    const observer = new MutationObserver((mutations, obs) => {
      const modal = document.querySelector('#remote_modal');
      const form = modal?.querySelector('form[action*="/logs"]');
      
      if (form) {
        obs.disconnect(); // 找到後立即停止監聽
        console.log('[OA NoAnswer] 找到表單，開始填寫...');
        
        try {
          // A. 勾選 [是否接聽] 為 否
          const answeredFalse = form.querySelector('input[type="radio"][value="false"][name*="[is_answered]"]');
          if (answeredFalse) answeredFalse.checked = true;

          // B. 勾選 [是否溝通] 為 否
          const pitchedFalse = form.querySelector('input[type="radio"][value="false"][name*="[is_pitched]"]');
          if (pitchedFalse) pitchedFalse.checked = true;

          // C. 內容保持空白 (根據 User 要求)
          const contentArea = form.querySelector('textarea[name*="[content]"]');
          if (contentArea) contentArea.value = '';

          // D. 點擊送出按鈕
          const submitBtn = form.querySelector('input[type="submit"]');
          if (submitBtn) {
            console.log('[OA NoAnswer] 正在提交表單...');
            submitBtn.click();
            
            // E. 等待一下後嘗試關閉彈窗 (雖然 Turbo 通常會處理，但雙重保險)
            setTimeout(() => {
              const closeBtn = document.querySelector('button[data-action*="remote-modal#closeModal"]');
              if (closeBtn) {
                console.log('[OA NoAnswer] 關閉彈窗');
                closeBtn.click();
              }
            }, 800);
          }
        } catch (err) {
          console.error('[OA NoAnswer] 自動填寫失敗:', err);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * 搜尋並注入按鈕
   */
  function injectNoAnswerButtons() {
    // 尋找具有特定格式的 Turbo Frame (學生聯絡紀錄列)
    const logFrames = document.querySelectorAll('turbo-frame[id^="potential_student_"][id$="_log"]');

    logFrames.forEach(frame => {
      // 使用 data 屬性標記，防止重複注入導致無窮迴圈
      if (frame.dataset.oaNoAnswerProcessed === 'true') return;

      const link = frame.querySelector('a.show-comment[data-turbo-frame="remote_modal"]');

      if (link) {
        // 建立新按鈕
        const noAnswerBtn = document.createElement('button');
        noAnswerBtn.className = 'oa-noanswer-btn';
        noAnswerBtn.innerHTML = BUTTON_HTML;
        noAnswerBtn.type = 'button';
        
        // 點擊事件
        noAnswerBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          // 防呆機制：禁用按鈕 3 秒
          noAnswerBtn.disabled = true;
          const originalHTML = noAnswerBtn.innerHTML;
          noAnswerBtn.innerHTML = `<span class="material-icons oa-icon">sync</span><span class="oa-label">處理中...</span>`;

          performNoAnswerAutomation(link);

          setTimeout(() => {
            if (noAnswerBtn) {
              noAnswerBtn.disabled = false;
              noAnswerBtn.innerHTML = originalHTML;
            }
          }, 3000);
        });

        // 插入在 <turbo-frame> 內部最底端
        // 這樣當 Turbo 更新框架內容時，舊按鈕會自動被移除，防止重複增生
        frame.appendChild(document.createElement('br'));
        frame.appendChild(noAnswerBtn);

        // 標記為已處理
        frame.dataset.oaNoAnswerProcessed = 'true';
      }
    });
  }

  // 1. 執行初始注入
  injectNoAnswerButtons();

  // 2. 監聽 Turbo 更新造成的 DOM 變化
  const mainObserver = new MutationObserver((mutations) => {
    const hasAddedNodes = mutations.some(m => m.addedNodes.length > 0);
    if (hasAddedNodes) {
      injectNoAnswerButtons();
    }
  });

  mainObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('[OA NoAnswer Extension] 載入成功');
})();
