(function() {
  // 目前模式：'dial'（撥打）、'missed'（未接聽）或 'auto'（自動）
  let _mode = 'dial';

  // FAB 容器是否已收合到畫面右側（純視覺狀態，不影響模式/自動排程邏輯）
  let _isCollapsed = false;

  // 模式選項按鈕（mode -> element），由 injectFAB 建立
  let _modeOpts = {};

  // 自動模式已成功送出未接聽的學生 ID（studentId 字串）。
  // host 頁面在背景分頁時，Turbo/ActionCable 觸發的畫面重繪可能不會即時發生，
  // 導致該筆記錄的時間顯示與按鈕狀態維持舊值，選取邏輯會誤判為仍可再次撥打。
  // 因此改為自己記住已處理過的學生 ID，選取名單時主動排除，不依賴頁面畫面是否已更新。
  const _autoProcessedStudentIds = new Set();

  // 進入自動模式當下的「名單情境」快照（見 currentContext）。每輪執行前比對，
  // 情境變了就停止，避免自動流程跨越到使用者換過的名單上。非自動模式時為 null。
  let _autoContext = null;

  // 自動模式診斷輸出。排程鏈跨 content script 與 background（排程請求 → 建立 alarm →
  // alarm 觸發 → 送回分頁 → 執行本輪），中間任一環節斷掉原本都是完全靜默的，
  // 追偶發異常時無從判斷斷在哪裡，因此每個環節各留一條紀錄。
  // 只有自動模式相關流程會輸出，平時不使用自動模式時 console 仍是安靜的。
  // 注意：background.js 的對應訊息不會出現在頁面 console，
  // 要到 chrome://extensions 開該擴充功能的「Service Worker」檢視器才看得到。
  function log(...args) {
    const t = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    console.log(`[NextList ${t}]`, ...args);
  }

  // 「自動」在版面上緊貼 FAB，容易誤按，而按下後約半秒就會送出一筆未接聽紀錄，
  // 因此進入自動模式前先確認。確認攔在模式按鈕的 click handler、setMode 之前，
  // 不放進 setMode 內部：自動模式的四處停止路徑也會呼叫 setMode('dial')，
  // 那些是程式自行切回，不該經過使用者確認。攔在 handler 也讓「取消」等於
  // 完全沒有狀態變化——_mode 未被指派、toggle 亮的仍是原本那個、不會排任何 alarm。
  const AUTO_CONFIRM_MSG =
    '確定要開始自動模式嗎？\n\n' +
    '按下「確定」後會立刻找出下一筆名單並送出「未接聽」紀錄，' +
    '之後每 35~45 秒自動重複一次。';

  function setMode(mode) {
    const prev = _mode;
    _mode = mode;
    Object.entries(_modeOpts).forEach(([m, btn]) => {
      btn.classList.toggle('active', m === mode);
    });
    // 離開自動模式：取消 background 的 alarm 排程，並清掉只在自動模式期間才有意義的狀態。
    // 已處理清單一定要在這裡清（而不是只靠 turbo:load）：實測 host 頁面按「篩選」
    // 不保證會觸發 Turbo 導航，若把清除掛在事件上，使用者停掉自動模式後重新篩選，
    // injectCheckboxes 仍會依殘留的 ID 把新結果補勾成跳過。
    if (prev === 'auto' && mode !== 'auto') {
      log(`離開自動模式 → ${mode}，取消 alarm 排程並清除已處理清單`);
      chrome.runtime.sendMessage({ type: 'auto-cancel' }).catch(() => {});
      _autoContext = null;
      _autoProcessedStudentIds.clear();
    }
    // 切入自動模式：先拍下情境快照（runAutoCycle 會拿它比對），再執行第一輪，
    // 之後每輪結束時才排下一次 alarm
    if (mode === 'auto' && prev !== 'auto') {
      _autoContext = currentContext();
      log(`進入自動模式，情境快照 = "${_autoContext}"`);
      runAutoCycle();
    }
  }

  // 目前所在的「名單情境」識別。host 頁面換名單的兩種方式都不會重新載入 document，
  // content script 不會重跑，模組狀態（_mode、_autoProcessedStudentIds、background 的
  // alarm）會整份留著，因此必須自己辨識情境是否已變：
  //   1. 按「篩選」  → Turbo Drive 換頁，改條件時 location.search 會變，但頁籤不變
  //   2. 切名單頁籤 → 純 AJAX 把新名單塞進另一個 tab-pane 並切換 display，
  //                   URL 完全不變、body 不換、連 turbo:load 都不會觸發，只有可見的
  //                   pane 會變（舊名單仍留在 DOM 裡，只是被 display:none）
  // 兩者各自只動其中一個維度，所以要複合起來看，單用任一個都會漏掉另一種情境。
  function currentContext() {
    const visibleFrame = Array.from(
      document.querySelectorAll('turbo-frame[id^="potential_student_"][id$="_log"]')
    ).find(f => {
      const rect = f.getBoundingClientRect();
      return rect.width > 0 || rect.height > 0;
    });
    return location.search + '|' + (visibleFrame?.closest('.tab-pane')?.id ?? '');
  }

  function runAutoCycle() {
    if (_mode !== 'auto') {
      log(`本輪不執行：目前模式為 ${_mode}，非自動模式（殘留 alarm 可安全忽略）`);
      return;
    }
    // 情境驗證擺在這裡而非靠事件監聽：切名單頁籤沒有任何可攔截的導航事件，
    // 每輪執行前主動比對是唯一對兩種換名單方式都有效的防線。
    const ctx = currentContext();
    if (ctx !== _autoContext) {
      log('自動模式停止：名單情境已變更（重新篩選或切換名單頁籤）');
      log(`  快照 = "${_autoContext}"`);
      log(`  現在 = "${ctx}"`);
      setMode('dial'); // 已處理清單由 setMode 一併清除
      return;
    }
    const visible = Array.from(
      document.querySelectorAll('turbo-frame[id^="potential_student_"][id$="_log"]')
    ).filter(f => { const r = f.getBoundingClientRect(); return r.width > 0 || r.height > 0; }).length;
    log(`本輪開始（可見名單 ${visible} 筆，已處理 ${_autoProcessedStudentIds.size} 筆，` +
        `分頁狀態 ${document.visibilityState}）`);
    findNextAndScroll();
  }

  // 請 background service worker 排下一次 40~50 秒隨機的 alarm
  function scheduleNextAutoTick() {
    log('已送出排程請求，等待 background 建立 alarm');
    chrome.runtime.sendMessage({ type: 'auto-schedule' })
      .catch(err => log('排程請求送出失敗：', err?.message ?? err));
  }

  // 接收 background 的 alarm 觸發（頁面重新載入後 _mode 會重設，
  // runAutoCycle 的模式檢查可安全忽略殘留的 alarm）
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'auto-tick') {
      log('收到 background 的 alarm 觸發');
      runAutoCycle();
    }
  });

  // 注入 Google Material Icons 字型（實心／線框兩種樣式）
  function ensureMaterialIconFont(family) {
    const href = `https://fonts.googleapis.com/icon?family=${family}`;
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
  ensureMaterialIconFont('Material+Icons');
  ensureMaterialIconFont('Material+Icons+Outlined');

  let _statusLightEl = null;
  let _fabBtnEl = null;
  let _focusListenersAdded = false;

  // 視窗失焦時顯示狀態燈（空心灰）、隱藏 FAB；聚焦時反過來。
  // 用 visibility 切換（而非攔截 click 事件），失焦時 FAB 不會被 hit-test 到，
  // 點在該位置只會讓視窗聚焦，不會觸發按鈕本身的動作。
  function updateStatusLight() {
    if (!_statusLightEl || !_fabBtnEl) return;
    const focused = document.hasFocus() && document.visibilityState === 'visible';
    _statusLightEl.classList.toggle('is-hidden', focused);
    _fabBtnEl.classList.toggle('is-hidden', !focused);
  }

  // 依 _isCollapsed 套用收合的視覺狀態（容器位移、把手位置、箭頭方向、提示文字）。
  // 建立 FAB 與點擊把手共用同一段邏輯：injectFAB 建出來的元件一律是展開的預設值，
  // Turbo 抽換 body 後重建時若不補套用，_isCollapsed 仍是 true 但畫面已是展開，
  // 第一次點把手只會把四個項目設回它們本來就有的值，看起來像沒反應。
  function applyCollapsedState(container, handle) {
    container.classList.toggle('is-collapsed', _isCollapsed);
    handle.classList.toggle('is-collapsed', _isCollapsed);
    handle.querySelector('.material-icons').textContent = _isCollapsed ? 'chevron_left' : 'chevron_right';
    handle.title = _isCollapsed ? '展開' : '收合';
  }

  // 建立並注入 FAB 按鈕與模式切換 toggle
  function injectFAB() {
    if (document.querySelector('.next-list-fab-container')) return;

    const container = document.createElement('div');
    container.className = 'next-list-fab-container';

    const statusLight = document.createElement('div');
    statusLight.className = 'next-list-status-light';
    statusLight.innerHTML = '<span class="material-icons-outlined">wb_sunny</span>';
    _statusLightEl = statusLight;

    const btn = document.createElement('button');
    btn.className = 'next-list-fab';
    btn.title = '尋找下一筆撥打名單';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M18 11l5-5-5-5v3h-4v4h4v3zm2 4.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/>
      </svg>
    `;
    btn.addEventListener('click', findNextAndScroll);
    _fabBtnEl = btn;

    if (!_focusListenersAdded) {
      window.addEventListener('focus', updateStatusLight);
      window.addEventListener('blur', updateStatusLight);
      document.addEventListener('visibilitychange', updateStatusLight);
      _focusListenersAdded = true;
    }
    updateStatusLight();

    const toggle = document.createElement('div');
    toggle.className = 'next-list-mode-toggle';

    _modeOpts = {};
    [['dial', '撥打'], ['missed', '未接聽'], ['auto', '自動']].forEach(([mode, label]) => {
      const opt = document.createElement('button');
      opt.className = 'next-list-mode-opt' + (mode === _mode ? ' active' : '');
      opt.type = 'button';
      opt.textContent = label;
      // 已在自動模式時再點「自動」，setMode 本來就會空轉，不必多跳一次確認
      opt.addEventListener('click', () => {
        if (mode === 'auto' && _mode !== 'auto' && !confirm(AUTO_CONFIRM_MSG)) return;
        setMode(mode);
      });
      _modeOpts[mode] = opt;
      toggle.appendChild(opt);
    });

    const row = document.createElement('div');
    row.className = 'next-list-fab-row';
    row.appendChild(statusLight);
    row.appendChild(btn);

    container.appendChild(toggle);
    container.appendChild(row);
    document.body.appendChild(container);

    // 收合／展開把手：獨立於 container 之外（手足元素，非子元素），
    // 因為 container 收合時會套用 transform，子元素若也用 position:fixed
    // 會被迫以 container 為新的 containing block、跟著一起被移出畫面，
    // 導致收合後找不到把手可以再點開。
    const handle = document.createElement('button');
    handle.className = 'next-list-collapse-handle';
    handle.type = 'button';
    // 這裡的箭頭只是先把 <span> 建出來讓 applyCollapsedState 有東西可改，
    // 實際方向與 title 一律由下方的 applyCollapsedState 決定。
    handle.innerHTML = '<span class="material-icons">chevron_right</span>';
    handle.addEventListener('click', () => {
      _isCollapsed = !_isCollapsed;
      applyCollapsedState(container, handle);
    });
    document.body.appendChild(handle);

    // 重建時（Turbo 抽換 body 後）把畫面補成 _isCollapsed 該有的樣子
    applyCollapsedState(container, handle);
  }

  // 注入 <br> + checkbox 到 turbo-frame 之後（frame 外，不受 Turbo 局部重繪影響）。
  // 固定插在 frame 後面、不依賴紅色按鈕（corp-sales-noanswer-btn）是否已注入，
  // 兩邊注入順序因此不影響最終位置：紅色按鈕一律 append 在 td 尾端，
  // <br>+checkbox 一律緊接在 frame 後面，結構上永遠排在紅色按鈕之前。
  // 這裡補的 <br> 是刻意的：frame 自己的內容（例如時間戳記 <small>）是 inline，
  // 後面沒有東西會強制換行，checkbox 若直接接在 frame 後面會被拉到跟時間戳記同一行；
  // 加這個 <br> 讓 checkbox+紅色按鈕確定另起一行，checkbox 跟按鈕之間則不用再加，
  // 靠欄寬有限會自然換行。
  function injectCheckboxes() {
    const frames = document.querySelectorAll('turbo-frame[id^="potential_student_"][id$="_log"]');
    frames.forEach(frame => {
      const td = frame.parentElement;
      // 找不到 td，或已經注入過，則跳過
      if (!td || td.querySelector('.next-list-checkbox')) return;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'next-list-checkbox';
      checkbox.title = '勾選後此筆將被跳過';
      // 防止點擊 checkbox 觸發列表的其他點擊事件
      checkbox.addEventListener('click', e => e.stopPropagation());

      // 自動模式已處理過的學生：補勾，維持畫面上的跳過標記
      const studentIdMatch = frame.id.match(/^potential_student_(\d+)_log$/);
      if (studentIdMatch && _autoProcessedStudentIds.has(studentIdMatch[1])) {
        checkbox.checked = true;
      }

      frame.after(document.createElement('br'), checkbox);
    });
  }

  // 判斷該列的電話是否為有效台灣手機號碼（移除所有非數字字元後為 09 開頭、共 10 碼）。
  // 只在自動模式套用：自動模式無人看畫面就送出未接聽，必須先擋掉非手機號碼；
  // 手動模式（撥打／未接聽）由使用者自行判斷，維持現狀不受影響。
  //
  // td.phone_number 內的號碼有兩種既有 DOM 形狀：純文字節點，或包在 <a> 連結裡
  // （重複號碼查詢連結）；兩種形狀後面都緊接 dial-btn 擴充功能注入的
  // <a class="evox-dial-btn">。若直接用 querySelector('a') 取號碼會誤取到那顆
  // 按鈕本身的文字「call撥打」，因此改用複製節點、移除該按鈕後再取文字，
  // 對兩種形狀都能正確取出號碼。
  function isAutoDialablePhone(tr) {
    const td = tr?.querySelector('td.phone_number');
    if (!td) return false;
    const clone = td.cloneNode(true);
    clone.querySelectorAll('.evox-dial-btn').forEach(el => el.remove());
    const digits = clone.textContent.replace(/\D/g, '');
    return /^09\d{8}$/.test(digits);
  }

  function findNextAndScroll() {
    const frames = Array.from(document.querySelectorAll('turbo-frame[id^="potential_student_"][id$="_log"]'));
    if (frames.length === 0) {
      if (_mode === 'auto') {
        // 自動模式：無資料即停止自動，切回預設「撥打」（不彈窗）
        log('自動模式停止：頁面上找不到通話記錄元件');
        setMode('dial');
        return;
      }
      alert('頁面上找不到任何通話記錄元件。');
      return;
    }

    const now = new Date();
    const todayStr = getTaipeiDateString(now); // YYYY-MM-DD

    // 截斷到分鐘（秒與毫秒歸零），讓比較不受秒數影響
    const nowTruncated = new Date(now);
    nowTruncated.setSeconds(0, 0);
    // 自動模式門檻抓整 4 小時；其他模式維持 3 小時 59 分（提早 1 分鐘的緩衝）
    const sameDayThresholdMs = (_mode === 'auto' ? 4 * 60 : 3 * 60 + 59) * 60 * 1000;

    // 邏輯 1: 從未撥打過（無通話紀錄，frame 內無 <small>）— 最優先
    const neverCalledList = frames.map(frame => {
      const studentIdMatch = frame.id.match(/^potential_student_(\d+)_log$/);
      if (studentIdMatch && _autoProcessedStudentIds.has(studentIdMatch[1])) return null;

      if (frame.querySelector('small')) return null; // 已有通話紀錄，交給邏輯 2/3 處理

      // 跳過已勾選的項目
      const checkbox = frame.parentElement.querySelector('.next-list-checkbox');
      if (checkbox && checkbox.checked) return null;

      // 自動模式排除非手機號碼（市話等），避免無人值守時對這類號碼送出未接聽
      if (_mode === 'auto' && !isAutoDialablePhone(frame.closest('tr'))) return null;

      // 無通話紀錄時 frame 內顯示「新增紀錄」連結，以此做為捲動定位與高亮目標
      const link = frame.querySelector('a.show-comment');
      if (!link) return null;

      const rect = link.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return null;

      return { element: frame, highlightElement: link };
    }).filter(item => item !== null);

    if (neverCalledList.length > 0) {
      scrollToElement(neverCalledList[0].element, neverCalledList[0].highlightElement, '下一筆在此');
      return;
    }

    const recordList = frames.map(frame => {
      // 跳過自動模式已處理過的學生（不依賴頁面畫面是否已更新）
      const studentIdMatch = frame.id.match(/^potential_student_(\d+)_log$/);
      if (studentIdMatch && _autoProcessedStudentIds.has(studentIdMatch[1])) return null;

      const small = frame.querySelector('small');
      if (!small) return null;

      // 跳過已勾選的項目
      const checkbox = frame.parentElement.querySelector('.next-list-checkbox');
      if (checkbox && checkbox.checked) return null;

      // 自動模式排除非手機號碼（市話等），避免無人值守時對這類號碼送出未接聽
      if (_mode === 'auto' && !isAutoDialablePhone(frame.closest('tr'))) return null;

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

    // 邏輯 2: 同日且（截斷到分鐘後）距現在 ≥ 門檻（自動模式 4 小時，其他模式 3 小時59分）
    const sameDayPotentials = recordList.filter(item => {
      if (item.dateStr !== todayStr) return false;
      const recordTruncated = new Date(item.date);
      recordTruncated.setSeconds(0, 0);
      return (nowTruncated - recordTruncated) >= sameDayThresholdMs;
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
    if (_mode === 'auto') {
      // 自動模式：沒有可撥打名單即停止自動，切回預設「撥打」（不彈窗）
      log('自動模式停止：目前沒有符合撥打條件的名單（全部處理過、已勾選跳過、電話非有效手機號碼，或皆為 4 小時內之今日通話）');
      setMode('dial');
      return;
    }
    alert('目前沒有符合撥打條件的名單（無資料，或全部皆為 4 小時內之今日通話）。');
  }

  function getTaipeiDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 模組層級：追蹤動畫與清理想時器
  let _trackingAnimFrame = null;
  let _scrollEndCleanup = null;
  let _delayedShowTimer = null;   // 新增：追蹤「等待 400ms」的計時器
  let _cleanupTimer = null;       // 新增：追蹤「3 秒後移除」的計時器

  function clearAllActiveEffects() {
    // 1. 取消所有動畫幀
    if (_trackingAnimFrame) {
      cancelAnimationFrame(_trackingAnimFrame);
      _trackingAnimFrame = null;
    }
    // 2. 取消所有計時器
    if (_delayedShowTimer) {
      clearTimeout(_delayedShowTimer);
      _delayedShowTimer = null;
    }
    if (_cleanupTimer) {
      clearTimeout(_cleanupTimer);
      _cleanupTimer = null;
    }
    // 3. 移除現有的監聽器
    if (_scrollEndCleanup) {
      _scrollEndCleanup();
      _scrollEndCleanup = null;
    }
    // 4. 清除頁面上所有高亮與標籤
    document.querySelectorAll('.next-list-target-highlight').forEach(el => {
      el.classList.remove('next-list-target-highlight');
    });
    const oldIndicator = document.querySelector('.next-list-indicator');
    if (oldIndicator) oldIndicator.remove();
  }

  function scrollToElement(scrollTarget, highlightElement, message) {
    // 進入新任務前，先徹底清空舊狀態
    clearAllActiveEffects();

    // 先捲動到目標
    scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 增加高亮樣式
    highlightElement.classList.add('next-list-target-highlight');

    let hasShown = false;

    // 最終顯示標籤的函式（立即執行，不帶延遲）
    const showIndicatorImmediately = () => {
      if (hasShown) return;
      hasShown = true;

      // 清理所有監聽與保底計時
      if (_scrollEndCleanup) {
        _scrollEndCleanup();
        _scrollEndCleanup = null;
      }

      // 建立浮動標籤
      const indicator = document.createElement('div');
      indicator.className = 'next-list-indicator';
      indicator.textContent = message;
      document.body.appendChild(indicator);

      // 用 rAF 迴圈持續更新位置
      const trackPosition = () => {
        const rect = highlightElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          indicator.style.top  = `${rect.top + rect.height / 2 - 15}px`;
          indicator.style.left = `${rect.right + 15}px`;
        }
        _trackingAnimFrame = requestAnimationFrame(trackPosition);
      };
      _trackingAnimFrame = requestAnimationFrame(trackPosition);

      // 依 _mode 找對應的操作按鈕
      const tr = scrollTarget.closest('tr');
      let actionBtn = null;
      if (_mode === 'dial') {
        // 撥打模式：找由 corp-sales-dial-btn 注入的撥打按鈕
        actionBtn = tr ? tr.querySelector('.evox-dial-btn') : null;
      } else {
        // 未接聽 / 自動模式：找由 corp-sales-noanswer-btn 注入的未接聽按鈕
        actionBtn = tr
          ? Array.from(tr.querySelectorAll('button.oa-noanswer-btn'))
              .find(b => b.querySelector('.oa-label')?.textContent === '未接聽') ?? null
          : null;
      }

      if (_mode === 'auto') {
        if (!actionBtn) {
          // 找不到未接聽按鈕（noanswer extension 未載入等）→ 停止自動，避免空轉
          log('自動模式停止：目標列上找不到未接聽按鈕（noanswer 擴充功能未載入或按鈕文字已變動）');
          setMode('dial');
        } else if (actionBtn.disabled) {
          // 按鈕冷卻中（剛被處理過還沒恢復）→ 跳過本輪，等下一輪重新選取
          log('自動模式本輪跳過：未接聽按鈕冷卻中');
          scheduleNextAutoTick();
        } else {
          // 已定位到目標才按下未接聽；記住此學生已處理，避免頁面畫面未即時更新時重複選中
          const studentIdMatch = scrollTarget.id.match(/^potential_student_(\d+)_log$/);
          if (studentIdMatch) _autoProcessedStudentIds.add(studentIdMatch[1]);
          log(`送出未接聽：student=${studentIdMatch ? studentIdMatch[1] : '(未知)'}`);
          actionBtn.click();
          // 送出後立即勾選同筆的跳過 checkbox，讓畫面上看得出此筆已處理
          const skipCheckbox = scrollTarget.parentElement.querySelector('.next-list-checkbox');
          if (skipCheckbox) skipCheckbox.checked = true;
          scheduleNextAutoTick();
        }
      } else if (actionBtn) {
        actionBtn.setAttribute('tabindex', '0');

        // 強制顯示 focus ring（不依賴 :focus-visible，避免滑鼠模式下不顯示）
        actionBtn.style.outline = '3px solid #6f42c1';
        actionBtn.style.outlineOffset = '2px';
        actionBtn.style.borderRadius = '4px';

        // <a> 無 href 原生不響應 Space/Enter，手動補上
        const onKeydown = (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault(); // 防止 Space 捲頁
            actionBtn.click();
            cleanup();
          } else if (e.key === 'Escape') {
            cleanup();
          }
        };
        const cleanup = () => {
          actionBtn.style.outline = '';
          actionBtn.style.outlineOffset = '';
          actionBtn.style.borderRadius = '';
          actionBtn.removeEventListener('keydown', onKeydown);
          actionBtn.removeEventListener('blur', cleanup);
        };

        actionBtn.addEventListener('keydown', onKeydown);
        actionBtn.addEventListener('blur', cleanup); // focus 離開時自動清除
        actionBtn.focus({ preventScroll: true });
      }

      // 3 秒後自動消失
      _cleanupTimer = setTimeout(() => {
        indicator.style.opacity = '0';
        indicator.style.transition = 'opacity 0.5s';
        _cleanupTimer = setTimeout(() => {
          cancelAnimationFrame(_trackingAnimFrame);
          _trackingAnimFrame = null;
          indicator.remove();
          highlightElement.classList.remove('next-list-target-highlight');
          _cleanupTimer = null;
        }, 500);
      }, 3000);
    };

    // 觸發「偵測到停止後的 400ms 延遲」
    const triggerDelayedShow = () => {
      if (_scrollEndCleanup) _scrollEndCleanup();
      // 確保取消掉之前的延遲計時，避免多重顯示
      if (_delayedShowTimer) clearTimeout(_delayedShowTimer);
      _delayedShowTimer = setTimeout(showIndicatorImmediately, 400);
    };

    // ── 偵測捲動 ──────────────────────────────────────────────
    let isScrolling = false;
    let debounceTimer = null;

    const onScrollStartDetected = () => {
      isScrolling = true;
    };
    const onScrollEnd = () => triggerDelayedShow();
    const onScrollMove = () => {
      isScrolling = true;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(onScrollEnd, 150); // 150ms 沒動視為停止
    };

    window.addEventListener('scroll', onScrollStartDetected, { once: true });
    window.addEventListener('scrollend', onScrollEnd, { once: true });
    window.addEventListener('scroll', onScrollMove);

    _scrollEndCleanup = () => {
      window.removeEventListener('scroll', onScrollStartDetected);
      window.removeEventListener('scrollend', onScrollEnd);
      window.removeEventListener('scroll', onScrollMove);
      clearTimeout(debounceTimer);
    };

    // 保底觸發邏輯：
    setTimeout(() => {
      // 如果 150ms 內完全沒觸發捲動事件，表示元素已在視野中，直接啟動延遲顯示
      if (!isScrolling) {
        triggerDelayedShow();
      }
    }, 150);
  }

  // 自動執行注入
  injectFAB();
  injectCheckboxes();

  // 監聽 DOM 動態變化（turbo-frame 非同步載入內容時），自動補充注入 checkbox
  const observer = new MutationObserver(() => {
    injectCheckboxes();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // 處理 Turbo 頁面切換。Turbo Drive 只抽換 <body>，document 未重建，content script
  // 不會重新執行，模組狀態會整份帶到新的篩選結果上，因此這裡主動重置。
  //
  // 這是「加速停止」而非主防線，實測在此站大多不會觸發，原因有二：
  //   ・切名單頁籤走純 AJAX，本來就不產生 Turbo 導航
  //   ・按「篩選」雖走 Turbo Drive，但 host 頁面的 <body> 內有一段 inline script 以
  //     `let isButtonClickable` 在頂層宣告，Turbo 抽換 body 時會重新求值該 script，
  //     撞上「已宣告」而拋 SyntaxError（Failed to execute 'replaceWith' on 'Element'），
  //     replaceBody 中斷 → body 沒換成、turbo:load 也不會觸發。此為 host 頁面既有問題，
  //     非本擴充功能造成，修正需由該系統端處理（改 var／包 IIFE／data-turbo-eval="false"）。
  // 因此真正的保證在 runAutoCycle 的情境驗證與 setMode 的狀態清除，兩者都不依賴事件。
  // 保留此處是為了在 Turbo 導航確實成功時能「立刻」停下，不必等下一次 alarm（最長 45 秒）。
  //
  // 注意不能用 setMode('dial')：此刻 _modeOpts 還指向舊 body 裡已被抽換掉的按鈕，
  // 對它們改 class 沒有意義。直接指派 _mode，由下方 injectFAB() 依 _mode 重畫高亮。
  document.addEventListener('turbo:load', () => {
    if (_mode === 'auto') {
      log('turbo:load 觸發，自動模式被重置為撥打並取消 alarm 排程');
      chrome.runtime.sendMessage({ type: 'auto-cancel' }).catch(() => {});
    }
    _mode = 'dial';
    _autoContext = null;
    _autoProcessedStudentIds.clear();

    injectFAB();
    injectCheckboxes();
  });
})();
