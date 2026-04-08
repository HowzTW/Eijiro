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
    quickFillBtn.className = 'btn'; // 保留 Bootstrap 基本按鈕大小，自訂顏色
    quickFillBtn.style.backgroundColor = '#f97316'; // 橘色背景
    quickFillBtn.style.color = '#ffffff'; // 白色字體
    quickFillBtn.style.borderColor = '#ea580c'; // 微深的橘色邊框
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
        const processedLog = []; // 紀錄成功的處理
        const errorLog = [];     // 紀錄失敗或找不到目標的處理

        // 判斷每一行是否以 "dt_admission_" 開頭
        lines.forEach(line => {
          if (line.trim().startsWith('dt_admission_')) {
            // 利用第一個冒號來切割 (避免 value 內也有冒號的情況)
            const delimiterIndex = line.indexOf(':');
            
            if (delimiterIndex !== -1) {
              const elementId = line.substring(0, delimiterIndex).trim();
              const valueToFill = line.substring(delimiterIndex + 1).trim();

               // 使用 getElementById 在畫面上尋找對應的元件
              const targetElement = document.getElementById(elementId);
              
              if (targetElement) {
                try {
                  const tagName = targetElement.tagName.toUpperCase();
                  
                  if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
                    // 輸入框類型處理
                    targetElement.value = valueToFill;
                    // 派發相關事件讓框架(如 Stimulus/Vue)觸發綁定更新
                    targetElement.dispatchEvent(new Event('input', { bubbles: true }));
                    targetElement.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    processedLog.push(`✓ [已填寫] ${elementId} -> ${valueToFill}`);
                  } 
                  else if (tagName === 'SELECT') {
                    // 下拉選單處理
                    let optionFound = false;
                    for (let i = 0; i < targetElement.options.length; i++) {
                      // 檢查選項的文字是否等於我們要填入的值
                      if (targetElement.options[i].text.trim() === valueToFill) {
                        targetElement.selectedIndex = i;
                        targetElement.dispatchEvent(new Event('change', { bubbles: true }));
                        optionFound = true;
                        processedLog.push(`✓ [已選擇] ${elementId} -> ${valueToFill}`);
                        break;
                      }
                    }
                    if (!optionFound) {
                      errorLog.push(`✗ [找不到選項] ${elementId} 內找不到名為「${valueToFill}」的選項`);
                    }
                  } 
                  else {
                    errorLog.push(`✗ [未知的元件類型] 找到 ${elementId}，但它的類型標籤是 ${tagName} 無法填值`);
                  }
                } catch (err) {
                  errorLog.push(`✗ [填寫時發生預期外錯誤] ${elementId}: ${err.message}`);
                }
              } else {
                errorLog.push(`✗ [找不到元件] 網頁上沒有 ID 為 "${elementId}" 的輸入框或選單`);
              }
            } else {
              errorLog.push(`✗ [格式錯誤] 此行缺少冒號分隔字元：${line}`);
            }
          } else {
            // 不符合處理格式的行，原封不動地保留在 textarea 中
            keptLines.push(line);
          }
        });

        // 將保留下來的行，重新組合後填回原來的 textarea
        currentTextarea.value = keptLines.join('\n');
        // 主動派發 input 事件，確保網頁框架能發現 textarea 被變更了
        currentTextarea.dispatchEvent(new Event('input', { bubbles: true }));

        // 最後將成功與錯誤的資訊統整後再顯示 alert
        let alertMessage = "";
        
        if (processedLog.length > 0) {
          alertMessage += "✅ 【成功處理欄位】\n" + processedLog.join('\n') + "\n\n";
        }
        
        if (errorLog.length > 0) {
          alertMessage += "⚠️ 【處理異常 / 找不到元件】\n" + errorLog.join('\n') + "\n\n";
        }
        
        if (alertMessage === "") {
          alertMessage = "沒有找到以 'dt_admission_' 開頭的行。";
        }
        
        alert(alertMessage.trim());
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
