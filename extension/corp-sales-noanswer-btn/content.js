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
   * @param {HTMLElement} btn    - 觸發的按鈕（用於還原狀態）
   * @param {string} originalHTML - 按鈕原始 innerHTML
   */
  async function submitLogDirect(studentId, commentValue, btn, originalHTML) {
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    if (!token) {
      console.error('[OA NoAnswer] 找不到 CSRF token，送出失敗');
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }, 3000);
      return;
    }

    const body = new URLSearchParams({
      'authenticity_token':                  token,
      'potential_student_log[is_answered]':  'false',
      'potential_student_log[is_pitched]':   'false',
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
        // 延遲 3 秒再 reload，讓按鈕維持 disabled 狀態提供視覺回饋
        setTimeout(() => {
          const frame = document.querySelector(`turbo-frame#potential_student_${studentId}_log`);
          if (frame) {
            // 等 frame 載入完畢後才移除旗標並重新注入按鈕，
            // 避免 reload 期間 mainObserver 提早觸發造成重複注入
            frame.addEventListener('turbo:frame-load', () => {
              delete frame.dataset.oaNoAnswerProcessed;
              injectNoAnswerButtons();
            }, { once: true });
            frame.reload();
          }
        }, 3000);
      } else {
        console.error(`[OA NoAnswer] 送出失敗，HTTP ${resp.status}`);
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = originalHTML;
        }, 3000);
      }
    } catch (err) {
      console.error('[OA NoAnswer] 網路錯誤:', err);
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }, 3000);
    }
  }

  /**
   * 建立快捷按鈕
   * @param {string} label       - 按鈕文字
   * @param {string} icon        - Material Icon 名稱
   * @param {string} commentValue - 自動填寫的備註內容
   * @param {string} studentId   - 潛在學生 ID
   */
  function createQuickButton(label, icon, commentValue, studentId) {
    const btn = document.createElement('button');
    btn.className = 'oa-noanswer-btn';
    btn.innerHTML = `<span class="material-icons oa-icon">${icon}</span><span class="oa-label">${label}</span>`;
    btn.type = 'button';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      btn.disabled = true;
      const originalHTML = btn.innerHTML;
      btn.innerHTML = `<span class="material-icons oa-icon">sync</span><span class="oa-label">處理中...</span>`;

      submitLogDirect(studentId, commentValue, btn, originalHTML);
    });

    return btn;
  }

  /**
   * 搜尋並注入按鈕
   */
  function injectNoAnswerButtons() {
    const logFrames = document.querySelectorAll('turbo-frame[id^="potential_student_"][id$="_log"]');

    logFrames.forEach(frame => {
      if (frame.dataset.oaNoAnswerProcessed === 'true') return;

      const link = frame.querySelector('a.show-comment[data-turbo-frame="remote_modal"]');
      if (!link) return;

      // 從 turbo-frame id 取出 student ID（格式：potential_student_{id}_log）
      const match = frame.id.match(/^potential_student_(\d+)_log$/);
      if (!match) return;
      const studentId = match[1];

      const noAnswerBtn = createQuickButton('未接聽', 'phone_missed',  '',                          studentId);
      const transferBtn = createQuickButton('直轉',   'forward',        '直轉',                      studentId);
      const introHangBtn = createQuickButton('自介掛', 'record_voice_over', '自介掛',                studentId);
      const aiVoiceBtn  = createQuickButton('AI語音', 'smart_toy',      '轉AI語音，自介後仍不接聽。', studentId);
      const hangupBtn   = createQuickButton('接掛',   'call_end',       '接掛',                      studentId);

      frame.appendChild(document.createElement('br'));
      frame.appendChild(noAnswerBtn);
      frame.appendChild(transferBtn);
      frame.appendChild(introHangBtn);
      frame.appendChild(aiVoiceBtn);
      frame.appendChild(hangupBtn);

      frame.dataset.oaNoAnswerProcessed = 'true';
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

  mainObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('[OA NoAnswer Extension] 載入成功');
})();
