(function() {
  // 建立並注入 FAB 按鈕
  function injectFAB() {
    if (document.querySelector('.next-list-fab')) return;

    const btn = document.createElement('button');
    btn.className = 'next-list-fab';
    btn.title = '尋找下一筆撥打名單';
    
    // 使用 Material Design 的 Phone Forward 圖標
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M18 11l5-5-5-5v3h-4v4h4v3zm2 4.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/>
      </svg>
    `;

    btn.addEventListener('click', findNextAndScroll);
    document.body.appendChild(btn);
  }

  // 注入 checkbox 到所有符合條件的 <small> 元件
  function injectCheckboxes() {
    const frames = document.querySelectorAll('turbo-frame[id^="potential_student_"][id$="_log"]');
    frames.forEach(frame => {
      const small = frame.querySelector('small');
      // 若找不到 small，或已經注入過，則跳過
      if (!small || small.querySelector('.next-list-checkbox')) return;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'next-list-checkbox';
      checkbox.title = '勾選後此筆將被跳過';
      // 防止點擊 checkbox 觸發列表的其他點擊事件
      checkbox.addEventListener('click', e => e.stopPropagation());

      small.insertBefore(checkbox, small.firstChild);
    });
  }

  function findNextAndScroll() {
    const frames = Array.from(document.querySelectorAll('turbo-frame[id^="potential_student_"][id$="_log"]'));
    if (frames.length === 0) {
      alert('頁面上找不到任何通話記錄元件。');
      return;
    }

    const now = new Date();
    const todayStr = getTaipeiDateString(now); // YYYY-MM-DD

    // 截斷到分鐘（秒與毫秒歸零），讓比較不受秒數影響
    const nowTruncated = new Date(now);
    nowTruncated.setSeconds(0, 0);
    const threeH59mInMs = (3 * 60 + 59) * 60 * 1000;

    const recordList = frames.map(frame => {
      const small = frame.querySelector('small');
      if (!small) return null;

      // 跳過已勾選的項目
      const checkbox = small.querySelector('.next-list-checkbox');
      if (checkbox && checkbox.checked) return null;

      // 排除隱藏元素（折疊列、display:none 等）
      // 隱藏元素的 getBoundingClientRect 會回傳 width:0, height:0
      const rect = small.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return null;

      // 取得純文字時間字串（排除 checkbox 本身，input 無 textContent 故不影響）
      const timeStr = small.textContent.trim(); // 格式: 2026-04-15 10:29:15
      const recordDate = new Date(timeStr.replace(/-/g, '/')); // 部分瀏覽器對 - 相容性較差
      
      return {
        element: frame,
        highlightElement: small,
        date: recordDate,
        dateStr: timeStr.split(' ')[0],
        fullStr: timeStr
      };
    }).filter(item => item !== null && !isNaN(item.date.getTime()));

    // 邏輯 2: 同日且（截斷到分鐘後）距現在 ≥ 3小時59分
    const sameDayPotentials = recordList.filter(item => {
      if (item.dateStr !== todayStr) return false;
      const recordTruncated = new Date(item.date);
      recordTruncated.setSeconds(0, 0);
      return (nowTruncated - recordTruncated) >= threeH59mInMs;
    });

    if (sameDayPotentials.length > 0) {
      // 找出距離當下時間最遠的一筆 (即最早的時間)
      const target = sameDayPotentials.reduce((prev, curr) => {
        return (curr.date < prev.date) ? curr : prev;
      });
      scrollToElement(target.element, target.highlightElement, '下一筆在此');
      return;
    }

    // 邏輯 3: 不同日期且在清單最前面的一筆
    const diffDayTarget = recordList.find(item => item.dateStr !== todayStr);
    if (diffDayTarget) {
      scrollToElement(diffDayTarget.element, diffDayTarget.highlightElement, '下一筆在此');
      return;
    }

    // 如果都沒有符合條件
    alert('目前沒有符合撥打條件的名單（無資料，或全部皆為 4 小時內之今日通話）。');
  }

  function getTaipeiDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 模組層級：追蹤動畫與清理想時器
  let _trackingAnimFrame = null;
  let _scrollEndCleanup = null;
  let _delayedShowTimer = null;   // 新增：追蹤「等待 400ms」的計時器
  let _cleanupTimer = null;       // 新增：追蹤「3 秒後移除」的計時器

  function clearAllActiveEffects() {
    // 1. 取消所有動畫幀
    if (_trackingAnimFrame) {
      cancelAnimationFrame(_trackingAnimFrame);
      _trackingAnimFrame = null;
    }
    // 2. 取消所有計時器
    if (_delayedShowTimer) {
      clearTimeout(_delayedShowTimer);
      _delayedShowTimer = null;
    }
    if (_cleanupTimer) {
      clearTimeout(_cleanupTimer);
      _cleanupTimer = null;
    }
    // 3. 移除現有的監聽器
    if (_scrollEndCleanup) {
      _scrollEndCleanup();
      _scrollEndCleanup = null;
    }
    // 4. 清除頁面上所有高亮與標籤
    document.querySelectorAll('.next-list-target-highlight').forEach(el => {
      el.classList.remove('next-list-target-highlight');
    });
    const oldIndicator = document.querySelector('.next-list-indicator');
    if (oldIndicator) oldIndicator.remove();
  }

  function scrollToElement(scrollTarget, highlightElement, message) {
    // 進入新任務前，先徹底清空舊狀態
    clearAllActiveEffects();

    // 先捲動到目標
    scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 增加高亮樣式
    highlightElement.classList.add('next-list-target-highlight');

    let hasShown = false;

    // 最終顯示標籤的函式（立即執行，不帶延遲）
    const showIndicatorImmediately = () => {
      if (hasShown) return;
      hasShown = true;

      // 清理所有監聽與保底計時
      if (_scrollEndCleanup) {
        _scrollEndCleanup();
        _scrollEndCleanup = null;
      }

      // 建立浮動標籤
      const indicator = document.createElement('div');
      indicator.className = 'next-list-indicator';
      indicator.textContent = message;
      document.body.appendChild(indicator);

      // 用 rAF 迴圈持續更新位置
      const trackPosition = () => {
        const rect = highlightElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          indicator.style.top  = `${rect.top + rect.height / 2 - 15}px`;
          indicator.style.left = `${rect.right + 15}px`;
        }
        _trackingAnimFrame = requestAnimationFrame(trackPosition);
      };
      _trackingAnimFrame = requestAnimationFrame(trackPosition);

      // 嘗試 focus 同列的「撥打」按鈕（由 corp-sales-dial-btn 注入）
      const tr = scrollTarget.closest('tr');
      const dialBtn = tr ? tr.querySelector('.evox-dial-btn') : null;
      if (dialBtn) {
        dialBtn.setAttribute('tabindex', '0');

        // 強制顯示 focus ring（不依賴 :focus-visible，避免滑鼠模式下不顯示）
        dialBtn.style.outline = '3px solid #6f42c1';
        dialBtn.style.outlineOffset = '2px';
        dialBtn.style.borderRadius = '4px';

        // <a> 無 href 原生不響應 Space/Enter，手動補上
        const onKeydown = (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault(); // 防止 Space 捲頁
            dialBtn.click();
            cleanup();
          } else if (e.key === 'Escape') {
            cleanup();
          }
        };
        const cleanup = () => {
          dialBtn.style.outline = '';
          dialBtn.style.outlineOffset = '';
          dialBtn.style.borderRadius = '';
          dialBtn.removeEventListener('keydown', onKeydown);
          dialBtn.removeEventListener('blur', cleanup);
        };

        dialBtn.addEventListener('keydown', onKeydown);
        dialBtn.addEventListener('blur', cleanup); // focus 離開時自動清除
        dialBtn.focus({ preventScroll: true });
      }

      // 3 秒後自動消失
      _cleanupTimer = setTimeout(() => {
        indicator.style.opacity = '0';
        indicator.style.transition = 'opacity 0.5s';
        _cleanupTimer = setTimeout(() => {
          cancelAnimationFrame(_trackingAnimFrame);
          _trackingAnimFrame = null;
          indicator.remove();
          highlightElement.classList.remove('next-list-target-highlight');
          _cleanupTimer = null;
        }, 500);
      }, 3000);
    };

    // 觸發「偵測到停止後的 400ms 延遲」
    const triggerDelayedShow = () => {
      if (_scrollEndCleanup) _scrollEndCleanup();
      // 確保取消掉之前的延遲計時，避免多重顯示
      if (_delayedShowTimer) clearTimeout(_delayedShowTimer);
      _delayedShowTimer = setTimeout(showIndicatorImmediately, 400);
    };

    // ── 偵測捲動 ──────────────────────────────────────────────
    let isScrolling = false;
    let debounceTimer = null;

    const onScrollStartDetected = () => {
      isScrolling = true;
    };
    const onScrollEnd = () => triggerDelayedShow();
    const onScrollMove = () => {
      isScrolling = true;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(onScrollEnd, 150); // 150ms 沒動視為停止
    };

    window.addEventListener('scroll', onScrollStartDetected, { once: true });
    window.addEventListener('scrollend', onScrollEnd, { once: true });
    window.addEventListener('scroll', onScrollMove);

    _scrollEndCleanup = () => {
      window.removeEventListener('scroll', onScrollStartDetected);
      window.removeEventListener('scrollend', onScrollEnd);
      window.removeEventListener('scroll', onScrollMove);
      clearTimeout(debounceTimer);
    };

    // 保底觸發邏輯：
    setTimeout(() => {
      // 如果 150ms 內完全沒觸發捲動事件，表示元素已在視野中，直接啟動延遲顯示
      if (!isScrolling) {
        triggerDelayedShow();
      }
    }, 150);
  }

  // 自動執行注入
  injectFAB();
  injectCheckboxes();

  // 監聽 DOM 動態變化（turbo-frame 非同步載入內容時），自動補充注入 checkbox
  const observer = new MutationObserver(() => {
    injectCheckboxes();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // 處理 Turbolinks/Turbo 頁面切換 (如果有的話)
  document.addEventListener('turbo:load', () => {
    injectFAB();
    injectCheckboxes();
  });
})();
