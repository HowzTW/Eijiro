(function () {
  if (!document.querySelector('link[href*="Material+Icons"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    document.head.appendChild(link);
  }

  const myTabId = Math.random();
  const audioCtx = new AudioContext();
  ['click', 'keydown', 'touchstart'].forEach(evt =>
    document.addEventListener(evt, () => {
      if (audioCtx.state === 'suspended') audioCtx.resume();
    }, { capture: true, passive: true })
  );
  const channel = new BroadcastChannel('oa_sales_new_student');
  let observer = null;
  let initialized = false;
  let pendingAlert = null;

  function beep() {
    if (audioCtx.state !== 'running') return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.8);
  }

  function cleanNumber(raw) {
    return raw.replace(/[^0-9+]/g, '');
  }

  function extractPhone(td) {
    // 優先抓第一個 text node（電話可能直接放在 td 裡）
    const textNode = Array.from(td.childNodes).find(
      n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()
    );
    if (textNode) {
      const cleaned = cleanNumber(textNode.textContent.trim());
      if (cleaned.length >= 8) return cleaned;
    }
    // 其次找非 evox-dial-btn 的 <a>（電話在連結文字裡）
    const anchor = td.querySelector('a:not(.evox-dial-btn)');
    if (anchor) {
      const cleaned = cleanNumber(anchor.textContent.trim());
      if (cleaned.length >= 8) return cleaned;
    }
    return '';
  }

  function isMainRow(tr) {
    return tr.classList.contains('border-black');
  }

  function extractRowInfo(tr) {
    const tds = tr.querySelectorAll('td');
    const phone = tds[2] ? extractPhone(tds[2]) : '';
    const grade = tds[6] ? tds[6].textContent.trim() : '';
    return { phone, grade };
  }

  function showToast(rows) {
    const existing = document.querySelector('.oa-new-student-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'oa-new-student-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999999;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      padding: 16px;
      min-width: 280px;
      font-family: sans-serif;
      font-size: 14px;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;';
    header.innerHTML = `
      <strong style="color:#e05c00; font-size:15px;">🔔 新潛在學生名單</strong>
      <span class="oa-toast-close" style="cursor:pointer; color:#999; font-size:18px; line-height:1;">✕</span>
    `;
    toast.appendChild(header);

    rows.forEach(({ phone, grade }) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; align-items:center; gap:8px; padding:6px 0; border-top:1px solid #f0f0f0;';

      const info = document.createElement('span');
      info.style.flex = '1';
      info.textContent = phone + (grade ? ` (${grade})` : '');

      const btn = document.createElement('a');
      btn.className = 'oa-dial-btn';
      btn.title = `用 EVOX 撥打 ${phone}`;
      btn.tabIndex = 0;
      btn.innerHTML = '<span class="material-icons evox-icon">call</span><span class="evox-label">撥打</span>';
      btn.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { e.preventDefault(); btn.click(); }
      });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (btn.classList.contains('is-dialing')) return;

        btn.classList.add('is-dialing');
        const labelSpan = btn.querySelector('.evox-label');
        labelSpan.textContent = '撥號中';

        window.location.href = `evox://${phone}`;

        const searchInput = document.getElementById('q');
        if (searchInput) {
          searchInput.value = '';
          searchInput.value = phone;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        navigator.clipboard.writeText(phone).catch(() => {});

        setTimeout(() => {
          btn.classList.remove('is-dialing');
          labelSpan.textContent = '撥打';
        }, 3000);
      });

      row.appendChild(info);
      row.appendChild(btn);
      toast.appendChild(row);
    });

    document.body.appendChild(toast);
    toast.querySelector('.oa-toast-close').addEventListener('click', () => toast.remove());

    const firstBtn = toast.querySelector('.oa-dial-btn');
    if (firstBtn) firstBtn.focus();
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 60000);
  }

  function showAlert(rows) {
    beep();
    showToast(rows);
    if (Notification.permission === 'granted') {
      const notif = new Notification('發現 Corp 新名單！', {
        body: `有 ${rows.length} 筆新名單加入。`,
        icon: 'https://corp.orangeapple.co/favicon.ico'
      });
      notif.onclick = () => window.focus();
    }
  }

  // 若收到其他 tab 廣播且對方 tabId 較小，取消自己的通知（對方優先）
  channel.onmessage = (e) => {
    if (e.data.type === 'new_rows' && e.data.tabId < myTabId) {
      if (pendingAlert) { clearTimeout(pendingAlert); pendingAlert = null; }
    }
  };

  function startObserving() {
    if (observer) { observer.disconnect(); observer = null; }
    initialized = false;

    const tbody = document.querySelector('#new_potential_students');
    if (!tbody) return;

    initialized = true;

    observer = new MutationObserver((mutations) => {
      if (!initialized) return;
      const newRows = [];
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeName === 'TR' && isMainRow(node)) newRows.push(extractRowInfo(node));
        });
      });
      if (newRows.length === 0) return;

      channel.postMessage({ type: 'new_rows', rows: newRows, tabId: myTabId });
      pendingAlert = setTimeout(() => {
        pendingAlert = null;
        showAlert(newRows);
      }, 100);
    });

    observer.observe(tbody, { childList: true });
  }

  function requestAndStart() {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(startObserving);
    } else {
      startObserving();
    }
  }

  requestAndStart();
  document.addEventListener('turbo:load', requestAndStart);
})();
