/**
 * OA Sales Email Copy Button
 * 
 * 適用 URL: https://corp.orangeapple.co/marketing/sales*
 */

(function () {
  const BUTTON_CLASS = 'oa-email-copy-btn';
  const ICON_CLASS = 'oa-copy-icon';
  const LABEL_CLASS = 'oa-copy-label';

  console.log('%c[OA Email Copy] 腳本初始化中 (v4 - Turbo Support)...', 'color: #3498db; font-weight: bold;');

  // 1. 注入 Material Icons 樣式
  if (!document.querySelector('link[href*="Material+Icons"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    document.head.appendChild(link);
  }

  /**
   * 檢查字串是否為電子郵件格式 (基本檢索引)
   */
  function isValidEmail(str) {
    if (!str) return false;
    const cleanStr = str.replace('複製', '').trim();
    // 嚴格檢查：必須包含 @，且 @ 前後要有字元
    return /.+@.+\..+/.test(cleanStr);
  }

  /**
   * 建立複製按鈕
   * @param {HTMLElement} emailElement - 包含 data-email 屬性的元素 (div)
   */
  function createCopyButton(emailElement) {
    const btn = document.createElement('button');
    btn.className = BUTTON_CLASS;
    btn.innerHTML = `<span class="material-icons ${ICON_CLASS}">content_copy</span><span class="${LABEL_CLASS}">複製</span>`;
    btn.type = 'button';
    btn.title = '複製 Email';

    // 根據初始值決定是否顯示
    updateButtonVisibility(btn, emailElement.getAttribute('data-email') || emailElement.textContent);

    // 點擊事件
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const container = btn.closest('[data-email]');
      const email = container?.getAttribute('data-email')?.trim();
      if (!isValidEmail(email)) return;

      try {
        await navigator.clipboard.writeText(email.trim());
        
        // 成功反饋
        const labelSpan = btn.querySelector(`.${LABEL_CLASS}`);
        const iconSpan = btn.querySelector(`.${ICON_CLASS}`);
        const originalText = labelSpan.textContent;
        const originalIcon = iconSpan.textContent;

        btn.classList.add('is-success');
        labelSpan.textContent = '已複製！';
        iconSpan.textContent = 'check';

        setTimeout(() => {
          btn.classList.remove('is-success');
          labelSpan.textContent = originalText;
          iconSpan.textContent = originalIcon;
        }, 2000);

      } catch (err) {
        console.error('[OA Email Copy] 複製失敗:', err);
      }
    });

    // 阻斷雙擊事件
    btn.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    return btn;
  }

  /**
   * 更新按鈕可見性
   */
  function updateButtonVisibility(btn, emailValue) {
    if (isValidEmail(emailValue)) {
      btn.style.display = 'inline-flex';
    } else {
      btn.style.setProperty('display', 'none', 'important');
    }
  }

  /**
   * 搜尋並注入按鈕 (具備自癒功能)
   */
  function injectEmailButtons() {
    const emailElements = document.querySelectorAll('[data-email]');
    
    emailElements.forEach(el => {
      const emailValue = el.getAttribute('data-email') || el.textContent;
      
      // 自癒檢查：如果標記為已處理，但按鈕消失了 (被 Turbo 覆蓋)，則重新處理
      const existingBtn = el.querySelector(`.${BUTTON_CLASS}`);
      if (el.dataset.oaEmailProcessed === 'true' && !existingBtn) {
        console.log('[OA Email Copy] 偵測到按鈕消失，重新注入中...');
        el.dataset.oaEmailProcessed = 'false';
      }

      // 如果已經處理過且按鈕還在，僅更新可見性
      if (el.dataset.oaEmailProcessed === 'true') {
        if (existingBtn) {
          updateButtonVisibility(existingBtn, emailValue);
        }
        return;
      }

      // 檢查內部是否已存在按鈕
      if (!existingBtn) {
        // 清除殘留 (確保乾淨)
        const oldBtns = el.querySelectorAll(`.${BUTTON_CLASS}`);
        oldBtns.forEach(b => b.remove());

        const btn = createCopyButton(el);
        
        // 注入到 div 內部
        el.appendChild(document.createElement('br'));
        el.appendChild(btn);
        
        el.dataset.oaEmailProcessed = 'true';

        // 監聽該元素的屬性變化與內容變化
        const observer = new MutationObserver(() => {
          // 同步 data-email：當 change_email() 只更新 innerHTML 而不更新屬性時，手動補上
          const textNode = Array.from(el.childNodes)
            .find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
          const visibleEmail = textNode?.textContent?.trim();
          if (visibleEmail && isValidEmail(visibleEmail) && visibleEmail !== el.getAttribute('data-email')) {
            el.setAttribute('data-email', visibleEmail);
          }

          const currentEmail = el.getAttribute('data-email') || el.textContent;
          updateButtonVisibility(btn, currentEmail);

          // 如果更新內容時按鈕又不見了，觸發下一輪掃描
          if (!el.querySelector(`.${BUTTON_CLASS}`)) {
            el.dataset.oaEmailProcessed = 'false';
          }
        });

        observer.observe(el, { 
          attributes: true, 
          childList: true, 
          characterData: true
        });
      }
    });
  }

  // 1. 執行初始注入
  injectEmailButtons();

  // 2. 監聽 DOM 變化 (MutationObserver)
  const mainObserver = new MutationObserver((mutations) => {
    if (mutations.some(m => m.addedNodes.length > 0)) {
      injectEmailButtons();
    }
  });
  mainObserver.observe(document.documentElement, { childList: true, subtree: true });

  // 3. 專屬 Turbo Frame 事件監聽
  document.addEventListener('turbo:load', injectEmailButtons);
  document.addEventListener('turbo:render', injectEmailButtons);
  document.addEventListener('turbo:frame-load', injectEmailButtons);

  // 安全檢查定時器
  [500, 1000, 3000].forEach(delay => {
    setTimeout(injectEmailButtons, delay);
  });
})();
