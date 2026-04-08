(function() {
  /**
   * 注入「快速填寫」按鈕
   */
  function injectQuickFillButton() {
    // 1. 先確認目標 textarea 存在（代表轉為雙師班學生的對話框已經出現）
    const textarea = document.querySelector('textarea#dt_admission_comment');
    if (!textarea) return;

    // 2. 防呆：確認是否已經加入過按鈕，避免重複加入
    if (document.querySelector('#oa-quick-fill-btn')) return;

    // 3. 從 textarea 往上找到它所屬的表單 (form) 或對話框容器
    // 這樣才能確保我們找到的送出按鈕是屬於這個對話框的，而不是畫面上其他隱藏的對話框
    const formContainer = textarea.closest('form') || document;

    // 4. 在這個表單內尋找送出按鈕
    const submitBtn = formContainer.querySelector('input[type="submit"][value="送出"]');
    if (!submitBtn) return;

    // 5. 確保知道要把按鈕插在哪個容器裡面 (通常是 .modal-footer 或按鈕的父元素)
    const buttonContainer = submitBtn.parentElement;

    // 建立「快速填寫」按鈕
    const quickFillBtn = document.createElement('button');
    quickFillBtn.id = 'oa-quick-fill-btn';
    quickFillBtn.type = 'button';
    quickFillBtn.className = 'btn btn-secondary'; // 使用 Bootstrap 次要按鈕樣式
    quickFillBtn.style.marginRight = '8px'; // 與右邊的送出按鈕保持一小段距離
    quickFillBtn.textContent = '快速填寫';

    // 點擊事件：處理 textarea 的內容
    quickFillBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // 在點擊當下重新抓取元素的值，確保能抓到最新的輸入內容
      const currentTextarea = document.querySelector('textarea#dt_admission_comment');
      if (currentTextarea) {
        const text = currentTextarea.value;
        const lines = text.split('\n');
        
        const keptLines = [];
        const removedLines = [];

        // 判斷每一行是否以 "dt_admission_" 開頭
        lines.forEach(line => {
          if (line.trim().startsWith('dt_admission_')) {
            removedLines.push(line);
          } else {
            keptLines.push(line);
          }
        });

        // 將保留的行重新填回 textarea
        currentTextarea.value = keptLines.join('\n');

        // 將被移除的行顯示在 alert 中
        if (removedLines.length > 0) {
          alert("已移除以下內容：\n" + removedLines.join('\n'));
        } else {
          alert("沒有找到以 'dt_admission_' 開頭的行。");
        }
      }
    });

    // 將按鈕插入到「送出」按鈕的前面
    buttonContainer.insertBefore(quickFillBtn, submitBtn);
  }

  // 由於對話框是透過 Turbo 動態載入的，需要使用 MutationObserver 監聽 DOM 變化
  const observer = new MutationObserver((mutations) => {
    const hasAddedNodes = mutations.some(m => m.addedNodes.length > 0);
    if (hasAddedNodes) {
      injectQuickFillButton();
    }
  });

  // 開始監聽整個 body 的子節點變化
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('[OA 雙師班快速填寫按鈕] 擴充功能載入成功');
})();
