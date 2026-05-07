const ALARM_NAME = 'check_next_call';
const SALES_URL = 'https://corp.orangeapple.co/marketing/sales';

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[NextCall] onInstalled → setupAlarm + inject existing tabs');
  setupAlarm();
  await injectExistingTabs();
});
chrome.runtime.onStartup.addListener(async () => {
  console.log('[NextCall] onStartup → setupAlarm + inject existing tabs');
  setupAlarm();
  await injectExistingTabs();
});

// 擴充功能安裝或重新載入時，主動注入已開著的符合分頁
async function injectExistingTabs() {
  const tabs = await chrome.tabs.query({ url: 'https://corp.orangeapple.co/marketing/sales*' });
  console.log('[NextCall] injecting into', tabs.length, 'existing tab(s)');
  for (const tab of tabs) {
    chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['style.css'] }).catch(() => {});
    chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }).catch(() => {});
  }
}

function setupAlarm() {
  chrome.alarms.get(ALARM_NAME, (alarm) => {
    if (!alarm) {
      chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
      console.log('[NextCall] alarm created');
    } else {
      console.log('[NextCall] alarm already exists, next:', new Date(alarm.scheduledTime).toLocaleTimeString());
    }
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('[NextCall] alarm fired:', alarm.name);
  if (alarm.name === ALARM_NAME) fetchAndDeliver();
});

async function fetchAndDeliver() {
  console.log('[NextCall] fetching', SALES_URL);
  let html;
  try {
    const res = await fetch(SALES_URL, { credentials: 'include' });
    console.log('[NextCall] fetch status:', res.status);
    if (!res.ok) return;
    html = await res.text();
    console.log('[NextCall] html length:', html.length);
  } catch (e) {
    console.error('[NextCall] fetch error:', e);
    return;
  }

  const tabs = await chrome.tabs.query({ url: 'https://corp.orangeapple.co/marketing/sales*' });
  console.log('[NextCall] matching tabs:', tabs.length);
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { type: 'check_appointments', html }).catch((e) => {
      console.warn('[NextCall] sendMessage failed:', e.message);
    });
  }
}
