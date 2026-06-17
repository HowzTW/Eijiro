(function () {
  if (!document.querySelector('link[href*="Material+Icons"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    document.head.appendChild(link);
  }

  const audioCtx = new AudioContext();
  ['click', 'keydown', 'touchstart'].forEach(evt =>
    document.addEventListener(evt, () => {
      if (audioCtx.state === 'suspended') audioCtx.resume();
    }, { capture: true, passive: true })
  );
  let observer = null;
  let initialized = false;

  const VALID_GRADES = new Set(['一年級','二年級','三年級','四年級','五年級','六年級','七年級','八年級','九年級']);

  // ── Auto-dial switch state（每個 tab 獨立，初始為 off）──────────────────────
  let autoDialEnabled = false;

  // ── Floating switch UI ──────────────────────────────────────────────────────
  function createSwitch() {
    if (document.querySelector('.oa-autodial-fab')) return;

    const fab = document.createElement('div');
    fab.className = 'oa-autodial-fab';

    const label = document.createElement('span');
    label.className = 'oa-autodial-label';
    label.textContent = '自動撥打';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'oa-autodial-checkbox';
    checkbox.checked = autoDialEnabled;

    const track = document.createElement('span');
    track.className = 'oa-autodial-track' + (autoDialEnabled ? ' is-on' : '');

    const thumb = document.createElement('span');
    thumb.className = 'oa-autodial-thumb';
    track.appendChild(thumb);

    track.addEventListener('click', () => {
      const val = !checkbox.checked;
      checkbox.checked = val;
      autoDialEnabled = val;
      track.classList.toggle('is-on', val);
    });

    fab.appendChild(label);
    fab.appendChild(checkbox);
    fab.appendChild(track);
    document.body.appendChild(fab);

    const style = document.createElement('style');
    style.textContent = '#all_students { margin-bottom: 80px !important; }';
    document.head.appendChild(style);
  }

  // ── Audio ───────────────────────────────────────────────────────────────────
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

  // ── Data extraction ─────────────────────────────────────────────────────────
  function cleanNumber(raw) {
    return raw.replace(/[^0-9+]/g, '');
  }

  function extractPhone(td) {
    const textNode = Array.from(td.childNodes).find(
      n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()
    );
    if (textNode) {
      const cleaned = cleanNumber(textNode.textContent.trim());
      if (cleaned.length >= 8) return cleaned;
    }
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

  // ── Toast ───────────────────────────────────────────────────────────────────
  function showToast(rows) {
    const existing = document.querySelector('.oa-new-student-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'oa-new-student-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 70px;
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
      <strong style="color:#e05c00; font-size:15px;">🔔 發現 Corp 新名單</strong>
      <span class="oa-toast-close" style="cursor:pointer; color:#999; font-size:18px; line-height:1;">✕</span>
    `;
    toast.appendChild(header);

    const dialBtns = [];

    rows.forEach(({ phone, grade }) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; align-items:center; gap:8px; padding:6px 0; border-top:1px solid #f0f0f0;';

      const info = document.createElement('span');
      info.style.flex = '1';
      info.textContent = phone + (grade ? ` (${grade})` : '');

      const btn = document.createElement('a');
      btn.className = 'oa-dial-btn';
      btn.dataset.phone = phone;
      btn.dataset.grade = grade;
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

      dialBtns.push(btn);
      row.appendChild(info);
      row.appendChild(btn);
      toast.appendChild(row);
    });

    document.body.appendChild(toast);
    toast.querySelector('.oa-toast-close').addEventListener('click', () => toast.remove());

    const firstBtn = toast.querySelector('.oa-dial-btn');
    if (firstBtn) firstBtn.focus();
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 60000);

    return dialBtns;
  }

  // ── Alert ───────────────────────────────────────────────────────────────────
  function showAlert(rows) {
    beep();
    const dialBtns = showToast(rows);

    if (Notification.permission === 'granted') {
      const now = new Date();
      const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      const notif = new Notification('發現 Corp 新名單！', {
        body: `有 ${rows.length} 筆新名單加入。\n(${ts})`,
        icon: 'https://corp.orangeapple.co/favicon.ico'
      });
      notif.onclick = () => window.focus();
    }

    if (autoDialEnabled) {
      const targetBtn = dialBtns.find(btn => VALID_GRADES.has(btn.dataset.grade));
      if (targetBtn) {
        targetBtn.click();
        autoDialEnabled = false;
        const cb = document.querySelector('.oa-autodial-checkbox');
        if (cb) cb.checked = false;
        const track = document.querySelector('.oa-autodial-track');
        if (track) track.classList.remove('is-on');
      }
    }
  }

  // ── Observer ────────────────────────────────────────────────────────────────
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

      showAlert(newRows);
    });

    observer.observe(tbody, { childList: true });
  }

  function requestAndStart() {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(startObserving);
    } else {
      startObserving();
    }
    createSwitch();
  }

  requestAndStart();
  document.addEventListener('turbo:load', requestAndStart);
})();
