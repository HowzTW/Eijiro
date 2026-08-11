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
   * 直接 POST 送出聯絡紀錄，不開 modal。
   * 避免原本透過 MutationObserver 等待 #remote_modal 的競爭條件問題。
   *
   * @param {string} studentId   - 從 turbo-frame id 取出的潛在學生 ID
   * @param {string} commentValue - 備註內容
   * @param {boolean} isAnswered - potential_student_log[is_answered]
   * @param {boolean} isPitched  - potential_student_log[is_pitched]
   * @returns {Promise<boolean>} 是否送出成功
   */
  async function submitLogDirect(studentId, commentValue, isAnswered = false, isPitched = false) {
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    if (!token) {
      console.error('[OA NoAnswer] 找不到 CSRF token，送出失敗');
      return false;
    }

    const body = new URLSearchParams({
      'authenticity_token':                  token,
      'potential_student_log[is_answered]':  String(isAnswered),
      'potential_student_log[is_pitched]':   String(isPitched),
      'potential_student_log[content]':      commentValue,
      'commit':                              '確認送出'
    });

    try {
      const resp = await fetch(`/potential_students/${studentId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });

      if (resp.ok) {
        console.log(`[OA NoAnswer] 送出成功 (student: ${studentId}, content: "${commentValue}")`);
        await resp.text();
        return true;
      } else {
        console.error(`[OA NoAnswer] 送出失敗，HTTP ${resp.status}`);
        return false;
      }
    } catch (err) {
      console.error('[OA NoAnswer] 網路錯誤:', err);
      return false;
    }
  }

  /**
   * 建立快捷按鈕
   * @param {string} label        - 按鈕文字
   * @param {string} icon         - Material Icon 名稱
   * @param {string} commentValue - 自動填寫的備註內容
   * @param {string} studentId    - 潛在學生 ID
   */
  function createQuickButton(label, icon, commentValue, studentId) {
    const btn = document.createElement('button');
    btn.className = 'oa-noanswer-btn';
    btn.innerHTML = `<span class="material-icons oa-icon">${icon}</span><span class="oa-label">${label}</span>`;
    btn.type = 'button';

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      btn.disabled = true;
      btn.querySelector('.oa-label').textContent = '處理中...';

      const value = typeof commentValue === 'function' ? await commentValue() : commentValue;
      const ok = await submitLogDirect(studentId, value);

      if (ok) {
        // 送出成功：維持 3 秒冷卻顯示，避免重複點擊
        setTimeout(() => {
          btn.disabled = false;
          btn.querySelector('.oa-label').textContent = label;
        }, 3000);
      } else {
        // 送出失敗：立即恢復，允許重試
        btn.disabled = false;
        btn.querySelector('.oa-label').textContent = label;
      }
    });

    return btn;
  }

  /**
   * 搜尋並注入按鈕
   *
   * 按鈕注入在 turbo-frame 所在的 <td> 上，而不是 frame 內部：
   * 送出後 ActionCable 廣播會讓 Turbo 把整個 turbo-frame 節點換掉（實測證實，
   * 不只是清空內部 HTML），按鈕若在 frame 內會被連根拔起。注入到 td 層級後
   * 按鈕不受影響，「已注入」的標記也要打在 td 上而非 frame 上，
   * 否則 frame 換了新節點、標記跟著消失，會被誤判成「還沒注入」而重複疊加。
   */
  function injectNoAnswerButtons() {
    const logFrames = document.querySelectorAll('turbo-frame[id^="potential_student_"][id$="_log"]');

    logFrames.forEach(frame => {
      const td = frame.closest('td');
      if (!td || td.dataset.oaNoAnswerProcessed === 'true') return;

      const link = frame.querySelector('a.show-comment[data-turbo-frame="remote_modal"]');
      if (!link) return;

      // 從 turbo-frame id 取出 student ID（格式：potential_student_{id}_log）
      const match = frame.id.match(/^potential_student_(\d+)_log$/);
      if (!match) return;
      const studentId = match[1];

      const noAnswerBtn  = createQuickButton('未接聽', 'phone_missed',       '',                                    studentId);
      const transferBtn  = createQuickButton('直轉',   'forward',             '直轉',                                studentId);
      const introHangBtn = createQuickButton('自介掛', 'record_voice_over',   '自介掛',                              studentId);
      const aiVoiceBtn   = createQuickButton('AI語音', 'smart_toy',           '轉AI語音，自介後仍不接聽。',          studentId);
      const hangupBtn    = createQuickButton('接掛',   'call_end',            '接掛',                                studentId);
      const emptyNumBtn  = createQuickButton('空號',   'phone_disabled',      '空號',                                studentId);
      const suspendBtn   = createQuickButton('暫停使用', 'pause_circle',      '暫停使用',                            studentId);
      const pasteBtn     = createQuickButton('貼上',   'content_paste',       () => navigator.clipboard.readText(), studentId);

      td.appendChild(noAnswerBtn);
      td.appendChild(transferBtn);
      td.appendChild(introHangBtn);
      td.appendChild(aiVoiceBtn);
      td.appendChild(hangupBtn);
      td.appendChild(emptyNumBtn);
      td.appendChild(suspendBtn);
      td.appendChild(pasteBtn);

      td.dataset.oaNoAnswerProcessed = 'true';
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

  mainObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  console.log('[OA NoAnswer Extension] 載入成功');
})();
