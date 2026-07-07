/**
 * OA Corp Sales：快速尋找下一筆可撥打名單按鈕 — 自動模式排程
 *
 * 使用 chrome.alarms 計時，不受分頁背景節流影響：
 * content script 每輪執行完畢後送 auto-schedule，這裡排一個 40~50 秒隨機的
 * 一次性 alarm，時間到再通知該分頁執行下一輪。
 * alarm 名稱帶 tabId，service worker 被回收重啟後仍能對應回原分頁。
 */

const ALARM_PREFIX = 'next-list-auto:';

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || !sender.tab) return;
  const alarmName = ALARM_PREFIX + sender.tab.id;

  if (msg.type === 'auto-schedule') {
    const delayMs = 40000 + Math.random() * 10000; // 40~50 秒隨機
    chrome.alarms.create(alarmName, { when: Date.now() + delayMs });
  } else if (msg.type === 'auto-cancel') {
    chrome.alarms.clear(alarmName);
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith(ALARM_PREFIX)) return;
  const tabId = Number(alarm.name.slice(ALARM_PREFIX.length));
  chrome.tabs.sendMessage(tabId, { type: 'auto-tick' }).catch(() => {
    // 分頁已關閉或已離開銷售頁：一次性 alarm 不會再排程，安靜結束即可
  });
});
