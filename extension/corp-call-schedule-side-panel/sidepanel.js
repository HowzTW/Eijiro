const WORK_URL_BASE =
  'https://corp.orangeapple.co/marketing/sales?kind=&grade_low=0&grade_top=16&search_and_text=&exclude_or_text=&exclude_and_text=&start_date=&end_date=&log_count=&search_or_text=';

let records = [];

async function loadRecords() {
  const { records: stored = [] } = await chrome.storage.local.get('records');
  records = stored;
  renderList();
}

async function saveRecords() {
  await chrome.storage.local.set({ records });
}

function isUpcoming(record) {
  const now = new Date();
  const dt = new Date(`${record.date}T${record.time}`);
  const diffMinutes = (dt - now) / 1000 / 60;
  return diffMinutes >= 0 && diffMinutes <= 3;
}

function isPast(record) {
  const now = new Date();
  const dt = new Date(`${record.date}T${record.time}`);
  return dt < now;
}

function buildTimeSelects() {
  const hourSel = document.getElementById('timeHour');
  const minSel = document.getElementById('timeMinute');

  for (let h = 0; h <= 23; h++) {
    const opt = document.createElement('option');
    opt.value = String(h).padStart(2, '0');
    opt.textContent = String(h).padStart(2, '0');
    hourSel.appendChild(opt);
  }

  for (let m = 0; m <= 59; m++) {
    const opt = document.createElement('option');
    opt.value = String(m).padStart(2, '0');
    opt.textContent = String(m).padStart(2, '0');
    minSel.appendChild(opt);
  }
}

function getSelectedTime() {
  const h = document.getElementById('timeHour').value;
  const m = document.getElementById('timeMinute').value;
  return `${h}:${m}`;
}

function setSelectedTime(timeStr) {
  const [h, m] = timeStr.split(':');
  document.getElementById('timeHour').value = h.padStart(2, '0');
  document.getElementById('timeMinute').value = m.padStart(2, '0');
}

function getLocalDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getLocalTimeString() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function renderList() {
  const listEl = document.getElementById('recordList');
  const emptyEl = document.getElementById('emptyState');

  if (records.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  const sorted = [...records].sort(
    (a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`)
  );

  listEl.innerHTML = sorted
    .map((record) => {
      const upcoming = isUpcoming(record);
      const past = isPast(record);
      let cardClass = 'record-card';
      if (upcoming) cardClass += ' upcoming';
      else if (past) cardClass += ' past';

      return `
        <div class="${cardClass}" data-id="${record.id}">
          ${upcoming ? '<div class="badge">⚠ 即將到期</div>' : ''}
          <div class="record-info">
            <div class="record-datetime">📅 ${record.date} ${record.time}</div>
            <div class="record-phone">📞 ${record.phone}</div>
            ${record.memo ? `<div class="record-memo">${record.memo}</div>` : ''}
          </div>
          <div class="record-actions">
            <button class="btn-open" data-phone="${record.phone}">開啟工作頁面</button>
            <button class="btn-edit" data-id="${record.id}">編輯</button>
            <button class="btn-delete" data-id="${record.id}">刪除</button>
          </div>
        </div>
      `;
    })
    .join('');

  listEl.querySelectorAll('.btn-open').forEach((btn) => {
    btn.addEventListener('click', () => {
      chrome.tabs.create({ url: WORK_URL_BASE + encodeURIComponent(btn.dataset.phone) });
    });
  });

  listEl.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const record = records.find((r) => r.id === btn.dataset.id);
      if (record) showForm(record);
    });
  });

  listEl.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (confirm('確定要刪除這筆預約紀錄？')) {
        records = records.filter((r) => r.id !== btn.dataset.id);
        await saveRecords();
        renderList();
      }
    });
  });
}

function showForm(record = null) {
  document.getElementById('formSection').classList.remove('hidden');
  document.getElementById('addBtn').classList.add('hidden');

  if (record) {
    document.getElementById('editId').value = record.id;
    document.getElementById('date').value = record.date;
    setSelectedTime(record.time);
    document.getElementById('phone').value = record.phone;
    document.getElementById('memo').value = record.memo || '';
  } else {
    document.getElementById('editId').value = '';
    document.getElementById('date').value = getLocalDateString();
    setSelectedTime(getLocalTimeString());
    document.getElementById('phone').value = '';
    document.getElementById('memo').value = '';
  }
}

function hideForm() {
  document.getElementById('formSection').classList.add('hidden');
  document.getElementById('addBtn').classList.remove('hidden');
}

document.getElementById('addBtn').addEventListener('click', () => showForm());
document.getElementById('cancelBtn').addEventListener('click', hideForm);

document.getElementById('recordForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const editId = document.getElementById('editId').value;
  const date = document.getElementById('date').value;
  const time = getSelectedTime();
  const phone = document.getElementById('phone').value.trim();
  const memo = document.getElementById('memo').value.trim();

  if (editId) {
    const idx = records.findIndex((r) => r.id === editId);
    if (idx !== -1) {
      records[idx] = { ...records[idx], date, time, phone, memo };
    }
  } else {
    records.push({ id: Date.now().toString(), date, time, phone, memo });
  }

  await saveRecords();
  hideForm();
  renderList();
});

// 每 30 秒重新渲染，確保 highlight 狀態即時更新
setInterval(renderList, 30000);

buildTimeSelects();
loadRecords();
