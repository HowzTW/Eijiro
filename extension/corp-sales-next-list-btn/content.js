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
    const fourHoursInMs = 4 * 60 * 60 * 1000;

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

    // 邏輯 2: 同日且距離現在超過4小時
    const sameDayPotentials = recordList.filter(item => {
      return item.dateStr === todayStr && (now - item.date) >= fourHoursInMs;
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

  function scrollToElement(scrollTarget, highlightElement, message) {
    scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // 移除舊的標籤（如果存在）
    const oldIndicator = document.querySelector('.next-list-indicator');
    if (oldIndicator) oldIndicator.remove();

    // 增加高亮樣式 (套用在 small 元件上)
    highlightElement.classList.add('next-list-target-highlight');

    // 建立浮動標籤
    const indicator = document.createElement('div');
    indicator.className = 'next-list-indicator';
    indicator.textContent = message;
    document.body.appendChild(indicator);

    // 計算定位 (position: fixed → 直接使用 viewport 座標，不需加 scrollY)
    const updatePosition = () => {
      const rect = highlightElement.getBoundingClientRect();
      // Guard：元素若為隱藏（display:none）則 width/height 為 0，跳過定位
      if (rect.width === 0 && rect.height === 0) return;
      indicator.style.top  = `${rect.top + rect.height / 2 - 15}px`;
      indicator.style.left = `${rect.right + 15}px`;
    };

    // 等 smooth scroll 完成後再定位（600ms 緩衝確保遠距離捲動也能完成）
    setTimeout(updatePosition, 600);

    // 3 秒後自動消失
    setTimeout(() => {
      indicator.style.opacity = '0';
      indicator.style.transition = 'opacity 0.5s';
      setTimeout(() => {
        indicator.remove();
        highlightElement.classList.remove('next-list-target-highlight');
      }, 500);
    }, 3000);
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
