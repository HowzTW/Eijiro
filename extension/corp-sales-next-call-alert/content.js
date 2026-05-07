(function () {
  const ALERT_MAX = 4; // 最多提前 4 分鐘提醒，已過時的名單也算
  const alerted = new Set(); // 記錄已提醒過的預約，頁面關閉或重整後自動清除

  // AudioContext 需要使用者互動後才能播音
  const audioCtx = new AudioContext();
  ['click', 'keydown', 'touchstart'].forEach(evt =>
    document.addEventListener(evt, () => {
      if (audioCtx.state === 'suspended') audioCtx.resume();
    }, { capture: true, passive: true })
  );

  function beep() {
    if (audioCtx.state !== 'running') return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.8);
  }

  function showNotification(items) {
    if (Notification.permission !== 'granted') return;
    const body = items.map(({ timeText, phone }) => `${timeText.substring(11, 16)} ${phone}`).join('\n');
    const notif = new Notification('📞 預約撥打提醒', {
      body,
      icon: 'https://corp.orangeapple.co/favicon.ico'
    });
    notif.onclick = () => window.focus();
  }

  function requestNotificationPermission() {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'check_appointments' && msg.html) {
      console.log('[NextCall] content.js received html, length:', msg.html.length);
      processAppointments(msg.html);
    }
  });

  function processAppointments(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('#next_call tr.border-black');
    console.log('[NextCall] rows found:', rows.length);

    const now = Date.now();
    const newItems = [];

    rows.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length < 3) return;

      const timeText = tds[0]?.textContent.trim();

      const phoneTd = tds[2];
      const phone = Array.from(phoneTd?.childNodes || [])
        .find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim())
        ?.textContent.trim();

      if (!timeText || !phone) return;

      const apptTime = new Date(timeText.replace(' ', 'T')).getTime();
      const diffMin = (apptTime - now) / 60000;
      console.log(`[NextCall] ${phone} @ ${timeText} → diff: ${diffMin.toFixed(2)} min`);

      if (diffMin > ALERT_MAX) return; // 超過 4 分鐘後才到的預約，暫不提醒

      const key = `${timeText}|${phone}`;
      if (alerted.has(key)) return;

      alerted.add(key);
      newItems.push({ timeText, phone });
    });

    console.log('[NextCall] newItems to alert:', newItems.length);
    if (newItems.length === 0) return;

    beep();
    showNotification(newItems);
    showModal(newItems);
  }

  function showModal(items) {
    const existing = document.querySelector('.oa-next-call-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'oa-next-call-modal';

    const header = document.createElement('div');
    header.className = 'oa-next-call-header';
    header.innerHTML = `
      <strong>🔔 預約撥打提醒</strong>
      <span class="oa-next-call-close">✕</span>
    `;
    modal.appendChild(header);

    items.forEach(({ timeText, phone }) => {
      const row = document.createElement('div');
      row.className = 'oa-next-call-row';

      const timeSpan = document.createElement('span');
      timeSpan.className = 'oa-next-call-time';
      timeSpan.textContent = timeText.substring(11, 16); // 只顯示 HH:MM

      const phoneSpan = document.createElement('span');
      phoneSpan.className = 'oa-next-call-phone';
      phoneSpan.textContent = phone;

      row.appendChild(timeSpan);
      row.appendChild(phoneSpan);
      modal.appendChild(row);
    });

    const btn = document.createElement('button');
    btn.className = 'oa-next-call-btn';
    btn.textContent = '前往預約撥打名單';
    btn.addEventListener('click', () => {
      window.open('https://corp.orangeapple.co/marketing/sales', '_blank');
    });
    modal.appendChild(btn);

    document.body.appendChild(modal);

    modal.querySelector('.oa-next-call-close').addEventListener('click', () => modal.remove());

    // 60 秒後自動關閉
    setTimeout(() => { if (modal.parentNode) modal.remove(); }, 60000);
  }

  requestNotificationPermission();
})();
