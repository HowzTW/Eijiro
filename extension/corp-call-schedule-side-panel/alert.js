async function init() {
  const { pendingAlert } = await chrome.storage.local.get('pendingAlert');
  if (!pendingAlert) {
    window.close();
    return;
  }

  const { records, mainWindowId } = pendingAlert;

  document.getElementById('recordList').innerHTML = records
    .map(
      (r) => `
      <div class="record">
        <span class="datetime">📅 ${r.date} ${r.time}</span>
        <span class="phone">📞 ${r.phone}</span>
      </div>`
    )
    .join('');

  const openBtn = document.getElementById('openBtn');
  openBtn.focus();

  openBtn.addEventListener('click', async () => {
    if (mainWindowId) {
      await chrome.sidePanel.open({ windowId: mainWindowId });
    }
    window.close();
  });
}

init();
