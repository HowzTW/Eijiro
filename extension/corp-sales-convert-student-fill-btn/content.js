(function() {
  /**
   * 注入「快速填寫」按鈕
   */
  function injectQuickFillButton() {
    const textarea = document.querySelector('textarea#dt_admission_comment');
    if (!textarea) return;
    if (document.querySelector('#oa-quick-fill-btn')) return;

    const formContainer = textarea.closest('form') || document;
    const submitBtn = formContainer.querySelector('input[type="submit"][value="送出"]');
    if (!submitBtn) return;

    const buttonContainer = submitBtn.parentElement;

    const quickFillBtn = document.createElement('button');
    quickFillBtn.id = 'oa-quick-fill-btn';
    quickFillBtn.type = 'button';
    quickFillBtn.className = 'btn';
    quickFillBtn.style.backgroundColor = '#f97316';
    quickFillBtn.style.color = '#ffffff';
    quickFillBtn.style.borderColor = '#ea580c';
    quickFillBtn.style.marginRight = '8px';
    quickFillBtn.textContent = '快速填寫';

    quickFillBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const currentTextarea = document.querySelector('textarea#dt_admission_comment');
      if (currentTextarea) {
        const text = currentTextarea.value;
        const lines = text.split('\n');
        
        const keptLines = [];
        const processedLog = [];
        const errorLog = [];

        lines.forEach(line => {
          if (line.trim().startsWith('dt_admission_')) {
            const delimiterIndex = line.indexOf(':');
            if (delimiterIndex !== -1) {
              const elementId = line.substring(0, delimiterIndex).trim();
              const valueToFill = line.substring(delimiterIndex + 1).trim();

              const targetElement = document.getElementById(elementId);
              
              if (targetElement) {
                try {
                  const tagName = targetElement.tagName.toUpperCase();
                  
                  if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
                    // --- 方案 B：MAIN World 直接呼叫模式 ---
                    if (elementId.endsWith('-selectized')) {
                      const baseId = elementId.replace('-selectized', '');
                      const baseSelect = document.getElementById(baseId);
                      
                      // 因為在 MAIN World，我們可以直接存取 .selectize
                      if (baseSelect && baseSelect.selectize) {
                        console.log(`[OA] 直接調用 Selectize: ${baseId} -> ${valueToFill}`);
                        baseSelect.selectize.setValue(valueToFill);
                        
                        // 雖然 Selectize 會自動填入文字，但根據使用者要求，我們確保 textbox 內容更新
                        // 延遲一下下讓 Selectize 處理完再填入更保險
                        setTimeout(() => {
                           const foundText = baseSelect.selectize.options[valueToFill]?.text;
                           if (foundText) targetElement.value = foundText;
                        }, 10);

                        processedLog.push(`✓ [Selectize 自動選取] ${baseId} -> ${valueToFill}`);
                        return; 
                      }
                    }
                    // ---------------------------------------

                    // 一般填值邏輯
                    targetElement.value = valueToFill;
                    targetElement.dispatchEvent(new Event('input', { bubbles: true }));
                    targetElement.dispatchEvent(new Event('change', { bubbles: true }));
                    processedLog.push(`✓ [已填寫] ${elementId} -> ${valueToFill}`);
                  } 
                  else if (tagName === 'SELECT') {
                    // 下拉選單一般填寫 (如果有的話)
                    let matchedValue = null;
                    // 先找 Value
                    for(let opt of targetElement.options) {
                      if(opt.value === valueToFill) { matchedValue = opt.value; break; }
                    }
                    // 找不到 Value 再找 Text
                    if(!matchedValue) {
                      for(let opt of targetElement.options) {
                        if(opt.text.trim() === valueToFill) { matchedValue = opt.value; break; }
                      }
                    }

                    if (matchedValue !== null) {
                      targetElement.value = matchedValue;
                      targetElement.dispatchEvent(new Event('change', { bubbles: true }));
                      processedLog.push(`✓ [已選擇選單] ${elementId}`);
                    }
                  }
                } catch (err) {
                  errorLog.push(`✗ [錯誤] ${elementId}: ${err.message}`);
                }
              } else {
                errorLog.push(`✗ [找不到元件] ${elementId}`);
              }
            } else {
              errorLog.push(`✗ [格式錯誤] 此行缺少冒號：${line}`);
            }
          } else {
            keptLines.push(line);
          }
        });

        currentTextarea.value = keptLines.join('\n');
        currentTextarea.dispatchEvent(new Event('input', { bubbles: true }));

        let alertMessage = "";
        if (processedLog.length > 0) alertMessage += "✅ 【成功執行】\n" + processedLog.join('\n') + "\n\n";
        if (errorLog.length > 0) alertMessage += "⚠️ 【異常】\n" + errorLog.join('\n') + "\n\n";
        alert(alertMessage.trim() || "沒有找到符合的指令。");
      }
    });

    buttonContainer.insertBefore(quickFillBtn, submitBtn);
  }

  const observer = new MutationObserver((mutations) => {
    if (mutations.some(m => m.addedNodes.length > 0)) {
      injectQuickFillButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log('[OA 雙師班快速填寫按鈕] 擴充功能載入成功 (MAIN World)');
})();
