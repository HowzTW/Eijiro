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
   * 直接 POST 送出狀態變更，不開 modal。
   * 避免原本透過 MutationObserver 等待 modal 的競爭條件問題。
   *
   * @param {string} studentId
   * @param {string} kind   - 'not-track' | 'invalid'
   * @param {string} reason - 原因文字（對應 select option value）
   * @param {HTMLElement} btn
   * @param {string} originalText
   */
  async function submitStatusDirect(studentId, kind, reason, btn, originalText) {
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    if (!token) {
      console.error('[OA NoTracing] 找不到 CSRF token，送出失敗');
      btn.disabled = false;
      btn.textContent = originalText;
      return;
    }

    const body = new URLSearchParams({
      'potential_student_log[content]': reason,
      'commit': '送出'
    });

    try {
      const resp = await fetch(`/potential_students/${studentId}/set_status?kind=${kind}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-CSRF-Token': token
        },
        body: body.toString()
      });

      if (resp.ok) {
        console.log(`[OA NoTracing] 送出成功 (student: ${studentId}, kind: ${kind}, reason: "${reason}")`);
      } else {
        console.error(`[OA NoTracing] 送出失敗，HTTP ${resp.status}`);
      }
    } catch (err) {
      console.error('[OA NoTracing] 網路錯誤:', err);
    }

    btn.disabled = false;
    btn.textContent = originalText;
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

      submitStatusDirect(studentId, kind, reason, btn, originalText);
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
