const ALARM_NAME = 'check_next_call';
const SALES_URL = 'https://corp.orangeapple.co/marketing/sales';

chrome.runtime.onInstalled.addListener(setupAlarm);
chrome.runtime.onStartup.addListener(setupAlarm);

function setupAlarm() {
  chrome.alarms.get(ALARM_NAME, (alarm) => {
    if (!alarm) {
      chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
    }
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) fetchAndDeliver();
});

async function fetchAndDeliver() {
  let html;
  try {
    const res = await fetch(SALES_URL, { credentials: 'include' });
    if (!res.ok) return;
    html = await res.text();
  } catch {
    return;
  }

  // 只對第一個找到的分頁送出 HTML，由 content.js 負責解析與判斷
  const tabs = await chrome.tabs.query({ url: 'https://corp.orangeapple.co/marketing/sales*' });
  if (tabs.length > 0) {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'check_appointments', html }).catch(() => {});
  }
}
