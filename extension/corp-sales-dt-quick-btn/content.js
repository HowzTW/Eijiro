(function() {
  async function runQuickFill() {
    const textarea = document.querySelector('textarea#dt_admission_comment');
    if (!textarea) return;

    try {
      const clipboardText = await navigator.clipboard.readText();
      textarea.value = clipboardText;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (err) {
      console.warn('[OA] 無法讀取剪貼簿:', err);
    }

    const lines = textarea.value.split('\n');
    const keptLines = [];
    const processedLog = [];
    const errorLog = [];

    lines.forEach(line => {
      if (!line.trim().startsWith('dt_admission_')) {
        keptLines.push(line);
        return;
      }

      const delimiterIndex = line.indexOf(':');
      if (delimiterIndex === -1) {
        errorLog.push(`✗ [格式錯誤] 此行缺少冒號：${line}`);
        return;
      }

      const elementId = line.substring(0, delimiterIndex).trim();
      const valueToFill = line.substring(delimiterIndex + 1).trim();
      const targetElement = document.getElementById(elementId);

      if (!targetElement) {
        errorLog.push(`✗ [找不到元件] ${elementId}`);
        return;
      }

      try {
        const tagName = targetElement.tagName.toUpperCase();

        if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
          if (elementId.endsWith('-selectized')) {
            const baseId = elementId.replace('-selectized', '');
            const baseSelect = document.getElementById(baseId);
            if (baseSelect && baseSelect.selectize) {
              baseSelect.selectize.setValue(valueToFill);
              setTimeout(() => {
                const foundText = baseSelect.selectize.options[valueToFill]?.text;
                if (foundText) targetElement.value = foundText;
              }, 10);
              processedLog.push(`✓ [Selectize 自動選取] ${baseId} -> ${valueToFill}`);
              return;
            }
          }
          targetElement.value = valueToFill;
          targetElement.dispatchEvent(new Event('input', { bubbles: true }));
          targetElement.dispatchEvent(new Event('change', { bubbles: true }));
          processedLog.push(`✓ [已填寫] ${elementId} -> ${valueToFill}`);
        } else if (tagName === 'SELECT') {
          let matchedValue = null;
          for (const opt of targetElement.options) {
            if (opt.value === valueToFill) { matchedValue = opt.value; break; }
          }
          if (matchedValue === null) {
            for (const opt of targetElement.options) {
              if (opt.text.trim() === valueToFill) { matchedValue = opt.value; break; }
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
    });

    textarea.value = keptLines.join('\n');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    let alertMessage = '';
    if (processedLog.length > 0) alertMessage += '✅ 【成功執行】\n' + processedLog.join('\n') + '\n\n';
    if (errorLog.length > 0) alertMessage += '⚠️ 【異常】\n' + errorLog.join('\n') + '\n\n';
    alert(alertMessage.trim() || '沒有找到符合的指令。');

  }

  function waitForModalAndFill() {
    const frame = document.querySelector('turbo-frame#remote_modal');
    if (!frame) return;

    const observer = new MutationObserver(() => {
      if (document.querySelector('textarea#dt_admission_comment')) {
        observer.disconnect();
        setTimeout(runQuickFill, 100);
      }
    });
    observer.observe(frame, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 8000);
  }

  function injectButtonForRow(row) {
    if (row.querySelector('.oa-dt-quick-btn')) return;

    const dropdown = row.querySelector('.dropdown');
    if (!dropdown) return;

    const dtLink = Array.from(dropdown.querySelectorAll('a')).find(
      a => a.textContent.trim() === '轉為雙師班學生'
    );
    if (!dtLink) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm oa-dt-quick-btn';
    btn.textContent = '轉雙師班';
    btn.style.cssText = 'display:block; margin-top:4px; background-color:#f97316; color:#fff; border-color:#ea580c;';

    btn.addEventListener('click', () => {
      dtLink.click();
      waitForModalAndFill();
    });

    dropdown.parentElement.appendChild(btn);
  }

  function injectAllButtons() {
    document.querySelectorAll('tr.potential-student').forEach(injectButtonForRow);
  }

  const observer = new MutationObserver(() => injectAllButtons());
  observer.observe(document.body, { childList: true, subtree: true });
  injectAllButtons();

  console.log('[OA 轉雙師班快速按鈕] 擴充功能載入成功 (MAIN World)');
})();
