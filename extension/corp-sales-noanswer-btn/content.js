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

  // 記錄最近送出的學生；value: { expiry: timestamp, icon: string }
  const recentlySubmitted = new Map();

  /**
   * 直接 POST 送出聯絡紀錄，不開 modal。
   * 避免原本透過 MutationObserver 等待 #remote_modal 的競爭條件問題。
   *
   * 送出後，ActionCable 廣播會讓頁面 Turbo 立即替換 turbo-frame（含按鈕），
   * 因此改以 recentlySubmitted Map 記錄已送出的學生，
   * 讓 injectNoAnswerButtons 重新注入時直接建立 disabled 狀態的按鈕。
   *
   * @param {string} studentId   - 從 turbo-frame id 取出的潛在學生 ID
   * @param {string} commentValue - 備註內容
   */
  async function submitLogDirect(studentId, commentValue) {
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    if (!token) {
      console.error('[OA NoAnswer] 找不到 CSRF token，送出失敗');
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
        await resp.text();
      } else {
        console.error(`[OA NoAnswer] 送出失敗，HTTP ${resp.status}`);
        recentlySubmitted.delete(studentId);
      }
    } catch (err) {
      console.error('[OA NoAnswer] 網路錯誤:', err);
      recentlySubmitted.delete(studentId);
    }
  }

  /**
   * 建立快捷按鈕
   * @param {string} label        - 按鈕文字
   * @param {string} icon         - Material Icon 名稱
   * @param {string} commentValue - 自動填寫的備註內容
   * @param {string} studentId    - 潛在學生 ID
   * @param {boolean} startDisabled - 是否建立時就 disabled（學生剛送出過）
   */
  function createQuickButton(label, icon, commentValue, studentId, startDisabled) {
    const btn = document.createElement('button');
    btn.className = 'oa-noanswer-btn';
    btn.innerHTML = `<span class="material-icons oa-icon">${icon}</span><span class="oa-label">${label}</span>`;
    btn.type = 'button';

    btn._originalLabel = label;

    if (startDisabled) {
      btn.disabled = true;
      btn.querySelector('.oa-label').textContent = '處理中...';
    }

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      btn.disabled = true;
      btn.querySelector('.oa-label').textContent = '處理中...';

      // 記錄此學生已送出，並記下是哪個 icon，3 秒內重新注入時只 disable 同一顆按鈕
      recentlySubmitted.set(studentId, { expiry: Date.now() + 3000, icon });
      setTimeout(() => recentlySubmitted.delete(studentId), 3000);

      const value = typeof commentValue === 'function' ? await commentValue() : commentValue;
      submitLogDirect(studentId, value);
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

      // 若此學生剛送出過（3 秒內），找到對應 icon 的按鈕直接以 disabled 狀態顯示
      const record = recentlySubmitted.get(studentId);
      const coolingIcon = (record && Date.now() < record.expiry) ? record.icon : null;

      const noAnswerBtn  = createQuickButton('未接聽', 'phone_missed',       '',                                    studentId, coolingIcon === 'phone_missed');
      const transferBtn  = createQuickButton('直轉',   'forward',             '直轉',                                studentId, coolingIcon === 'forward');
      const introHangBtn = createQuickButton('自介掛', 'record_voice_over',   '自介掛',                              studentId, coolingIcon === 'record_voice_over');
      const aiVoiceBtn   = createQuickButton('AI語音', 'smart_toy',           '轉AI語音，自介後仍不接聽。',          studentId, coolingIcon === 'smart_toy');
      const hangupBtn    = createQuickButton('接掛',   'call_end',            '接掛',                                studentId, coolingIcon === 'call_end');
      const emptyNumBtn  = createQuickButton('空號',   'phone_disabled',      '空號',                                studentId, coolingIcon === 'phone_disabled');
      const suspendBtn   = createQuickButton('暫停使用', 'pause_circle',      '暫停使用',                            studentId, coolingIcon === 'pause_circle');
      const pasteBtn     = createQuickButton('貼上',   'content_paste',       () => navigator.clipboard.readText(), studentId, coolingIcon === 'content_paste');

      // 若有剩餘冷卻時間，設定 timer 在到期後恢復被 disabled 的那顆按鈕
      if (coolingIcon) {
        const remaining = record.expiry - Date.now();
        const disabledBtn = [noAnswerBtn, transferBtn, introHangBtn, aiVoiceBtn, hangupBtn, emptyNumBtn, suspendBtn, pasteBtn]
          .find(b => b.querySelector('.oa-icon')?.textContent === coolingIcon);
        if (disabledBtn) {
          setTimeout(() => {
            disabledBtn.disabled = false;
            disabledBtn.querySelector('.oa-label').textContent = disabledBtn._originalLabel;
          }, remaining);
        }
      }

      frame.appendChild(document.createElement('br'));
      frame.appendChild(noAnswerBtn);
      frame.appendChild(transferBtn);
      frame.appendChild(introHangBtn);
      frame.appendChild(aiVoiceBtn);
      frame.appendChild(hangupBtn);
      frame.appendChild(emptyNumBtn);
      frame.appendChild(suspendBtn);
      frame.appendChild(pasteBtn);

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
