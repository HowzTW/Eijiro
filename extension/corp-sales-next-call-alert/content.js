(function () {
  const ALERT_MIN = 2;
  const ALERT_MAX = 4;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'check_appointments' && msg.html) {
      processAppointments(msg.html);
    }
  });

  async function processAppointments(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('#next_call tr.border-black');

    const now = Date.now();
    const upcoming = [];

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

      if (diffMin >= ALERT_MIN && diffMin <= ALERT_MAX) {
        upcoming.push({ timeText, phone });
      }
    });

    if (upcoming.length === 0) return;

    // 過濾已提醒過的
    const storage = await chrome.storage.session.get('alerted');
    const alerted = storage.alerted || {};

    const newItems = upcoming.filter(({ timeText, phone }) => !alerted[`${timeText}|${phone}`]);
    if (newItems.length === 0) return;

    // 標記已提醒
    newItems.forEach(({ timeText, phone }) => {
      alerted[`${timeText}|${phone}`] = Date.now();
    });

    // 清理 2 小時前的舊記錄
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    Object.keys(alerted).forEach(key => {
      if (alerted[key] < twoHoursAgo) delete alerted[key];
    });

    await chrome.storage.session.set({ alerted });

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
})();
