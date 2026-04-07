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

  /**
   * 自動化流程：點擊連結 -> 等待彈窗 -> 勾選 -> 填寫內容 -> 送出 -> 關閉
   * @param {HTMLElement} link - 原始觸發彈窗的 <a> 標籤
   * @param {string} commentValue - 自動填入的備註內容
   */
  async function performLogAutomation(link, commentValue = '') {
    // 1. 點擊原始的 <a> 標籤觸發 Turbo 彈窗
    link.click();

    console.log(`[OA LogAutomation] 觸發彈窗 (內容: "${commentValue}")，等待表單加載...`);

    // 2. 監聽 DOM，等待 #remote_modal 內的表單出現
    const observer = new MutationObserver((mutations, obs) => {
      const modal = document.querySelector('#remote_modal');
      const form = modal?.querySelector('form[action*="/logs"]');
      
      if (form) {
        obs.disconnect(); // 找到後立即停止監聽
        console.log('[OA LogAutomation] 找到表單，開始填寫...');
        
        try {
          // A. 勾選 [是否接聽] 為 否
          const answeredFalse = form.querySelector('input[type="radio"][value="false"][name*="[is_answered]"]');
          if (answeredFalse) answeredFalse.checked = true;

          // B. 勾選 [是否溝通] 為 否
          const pitchedFalse = form.querySelector('input[type="radio"][value="false"][name*="[is_pitched]"]');
          if (pitchedFalse) pitchedFalse.checked = true;

          // C. 填寫內容 (根據傳入參數)
          const contentArea = form.querySelector('textarea[name*="[content]"]');
          if (contentArea) contentArea.value = commentValue;

          // D. 點擊送出按鈕
          const submitBtn = form.querySelector('input[type="submit"]');
          if (submitBtn) {
            console.log('[OA LogAutomation] 正在提交表單...');
            submitBtn.click();
            
            // E. 等待一下後嘗試關閉彈窗 (雖然 Turbo 通常會處理，但雙重保險)
            setTimeout(() => {
              const closeBtn = document.querySelector('button[data-action*="remote-modal#closeModal"]');
              if (closeBtn) {
                console.log('[OA LogAutomation] 關閉彈窗');
                closeBtn.click();
              }
            }, 800);
          }
        } catch (err) {
          console.error('[OA LogAutomation] 自動填寫失敗:', err);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * 建立快捷按鈕
   * @param {string} label - 按鈕文字
   * @param {string} icon - Material Icon 名稱
   * @param {string} commentValue - 自動填寫內容
   * @param {HTMLElement} link - 原始連結
   */
  function createQuickButton(label, icon, commentValue, link) {
    const btn = document.createElement('button');
    btn.className = 'oa-noanswer-btn';
    btn.innerHTML = `<span class="material-icons oa-icon">${icon}</span><span class="oa-label">${label}</span>`;
    btn.type = 'button';
    
    // 點擊事件
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // 防呆機制：禁用按鈕 3 秒
      btn.disabled = true;
      const originalHTML = btn.innerHTML;
      btn.innerHTML = `<span class="material-icons oa-icon">sync</span><span class="oa-label">處理中...</span>`;

      performLogAutomation(link, commentValue);

      setTimeout(() => {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalHTML;
        }
      }, 3000);
    });

    return btn;
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
        // 建立並注入按鈕
        const noAnswerBtn = createQuickButton('未接聽', 'phone_missed', '', link);
        const transferBtn = createQuickButton('直轉', 'forward', '直轉', link);
        
        // 插入在 <turbo-frame> 內部最底端
        frame.appendChild(document.createElement('br'));
        frame.appendChild(noAnswerBtn);
        frame.appendChild(transferBtn);

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

  console.log('[OA NoAnswer Extension] 載入成功 (含直轉按鈕)');
})();
