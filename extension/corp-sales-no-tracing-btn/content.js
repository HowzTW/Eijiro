/**
 * OA 銷售不追蹤快捷按鈕
 *
 * 適用 URL: https://corp.orangeapple.co/marketing/sales*
 */

(function () {
  const NOT_TRACK_BUTTONS = [
    { label: '10次未接',    reason: '10次不同時段未接/轉語音' },
    { label: '不需要',      reason: '聊完後主動告知不需要' },
    { label: '3次自介掛',   reason: '累積3次，一聽是橘子蘋果就掛掉' },
    { label: '年紀不符',    reason: '年紀不符(小~大班、大學)' },
    { label: '有平板沒電腦', reason: '有平板，但沒筆電' },
    { label: '沒平板沒電腦', reason: '沒有平板，也沒有筆電' },
  ];

  const INVALID_BUTTONS = [
    { label: '沒有小孩', reason: '沒有小孩' },
    { label: '電話錯誤', reason: '電話錯誤(空號、缺碼、暫停使用)' },
    { label: '沒留電話', reason: '對方說沒留過電話' },
  ];

  /**
   * 等待 modal 出現並包含目標 select，最多等 5 秒
   */
  function waitForModal() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        observer.disconnect();
        reject(new Error('等待 modal 超時'));
      }, 5000);

      const observer = new MutationObserver(() => {
        const sel = document.querySelector('select[name="potential_student_log[content]"]');
        if (sel) {
          observer.disconnect();
          clearTimeout(timeout);
          resolve(sel);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      // 若 modal 已存在則立即 resolve
      const existing = document.querySelector('select[name="potential_student_log[content]"]');
      if (existing) {
        observer.disconnect();
        clearTimeout(timeout);
        resolve(existing);
      }
    });
  }

  /**
   * 執行狀態變更流程（不追蹤 / 無效）：
   * 1. 點擊對應連結
   * 2. 等待 modal 出現
   * 3. 選擇原因
   * 4. 點擊送出並關閉 modal
   * @param {string} studentId
   * @param {string} kind - 'not-track' | 'invalid'
   * @param {string} reason - 下拉選單的 option value
   */
  async function performStatusChange(studentId, kind, reason) {
    const frame = document.querySelector(`turbo-frame#potential_student_${studentId}_log`);
    const row = frame?.closest('tr');
    const link = row?.querySelector(`a[href*="/change_status?kind=${kind}"]`);
    if (!link) {
      console.error(`[OA NoTracing] 找不到學生 ${studentId} 的 ${kind} 連結`);
      return;
    }

    link.click();
    console.log(`[OA NoTracing] 已觸發 ${kind} modal（學生 ${studentId}）`);

    let sel;
    try {
      sel = await waitForModal();
    } catch (err) {
      console.error('[OA NoTracing] modal 未出現：', err.message);
      return;
    }

    sel.value = reason;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`[OA NoTracing] 已選擇原因：${reason}`);

    // 找送出按鈕（input[type=submit] 或 button[type=submit] 或文字為「送出」的 button）
    const form = sel.closest('form');
    const submitBtn = form
      ? (form.querySelector('input[type="submit"]') ||
         form.querySelector('button[type="submit"]') ||
         Array.from(form.querySelectorAll('button')).find(b => b.textContent.trim() === '送出'))
      : null;

    if (submitBtn) {
      console.log('[OA NoTracing] 點擊送出按鈕');
      submitBtn.click();

      // form 用 data-remote="true" 做 AJAX 送出，不會自動關閉 modal，
      // 等 AJAX 完成後用 Bootstrap API 關閉
      setTimeout(() => {
        const modal = document.getElementById('log-modal');
        if (modal && window.bootstrap) {
          bootstrap.Modal.getInstance(modal)?.hide();
        } else if (modal) {
          const closeBtn = modal.querySelector('[data-bs-dismiss="modal"], [data-dismiss="modal"]');
          closeBtn?.click();
        }
      }, 800);
    } else {
      console.error('[OA NoTracing] 找不到送出按鈕');
    }
  }

  /**
   * 從 turbo-frame id（如 potential_student_12345_log）取得學生 ID
   */
  function getStudentId(frame) {
    const match = frame.id.match(/^potential_student_(\d+)_log$/);
    return match ? match[1] : null;
  }

  /**
   * 建立單一快捷按鈕
   * @param {string} label
   * @param {string} kind - 'not-track' | 'invalid'
   * @param {string} reason
   * @param {string} studentId
   */
  function createStatusButton(label, kind, reason, studentId) {
    const btn = document.createElement('button');
    btn.className = 'oa-notracing-btn';
    btn.textContent = label;
    btn.type = 'button';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = '處理中…';

      performStatusChange(studentId, kind, reason).finally(() => {
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = originalText;
        }, 3000);
      });
    });

    return btn;
  }

  function createSeparator() {
    const sep = document.createElement('span');
    sep.className = 'material-icons oa-notracing-sep';
    sep.textContent = 'drag_indicator';
    return sep;
  }

  /**
   * 搜尋並注入按鈕
   */
  function injectNoTracingButtons() {
    const logFrames = document.querySelectorAll(
      'turbo-frame[id^="potential_student_"][id$="_log"]'
    );

    logFrames.forEach(frame => {
      if (frame.dataset.oaNoTracingProcessed === 'true') return;

      const studentId = getStudentId(frame);
      if (!studentId) return;

      // 找到 turbo-frame 所在的 <tr>，再取下一個 <tr> 的第 4 個 <td>（索引 3）
      const currentTr = frame.closest('tr');
      if (!currentTr) return;
      const nextTr = currentTr.nextElementSibling;
      if (!nextTr) return;
      const targetTd = nextTr.querySelectorAll('td')[3];
      if (!targetTd) return;

      // 標記 targetTd 而非 frame：frame 被 Turbo 刷新後 dataset 會消失，
      // 但 targetTd 不在 frame 內，不會被替換，可安全防止重複注入
      if (targetTd.dataset.oaNoTracingProcessed === 'true') return;

      if (targetTd.textContent.trim() !== '') {
        targetTd.appendChild(document.createElement('br'));
      }

      NOT_TRACK_BUTTONS.forEach(({ label, reason }) => {
        targetTd.appendChild(createStatusButton(label, 'not-track', reason, studentId));
      });

      targetTd.appendChild(createSeparator());

      INVALID_BUTTONS.forEach(({ label, reason }) => {
        targetTd.appendChild(createStatusButton(label, 'invalid', reason, studentId));
      });

      targetTd.dataset.oaNoTracingProcessed = 'true';
      frame.dataset.oaNoTracingProcessed = 'true';
    });
  }

  // 注入 Material Icons 字型
  if (!document.querySelector('link[href*="Material+Icons"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    document.head.appendChild(link);
  }

  // 初始注入
  injectNoTracingButtons();

  // 監聽 Turbo / AJAX 造成的 DOM 變化
  const mainObserver = new MutationObserver((mutations) => {
    const hasAddedNodes = mutations.some(m => m.addedNodes.length > 0);
    if (hasAddedNodes) {
      injectNoTracingButtons();
    }
  });

  mainObserver.observe(document.body, { childList: true, subtree: true });

  console.log('[OA NoTracing Extension] 載入成功');
})();
