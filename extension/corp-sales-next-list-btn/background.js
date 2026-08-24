/**
 * OA Corp Sales：快速尋找下一筆可撥打名單按鈕 — 自動模式排程
 *
 * 使用 chrome.alarms 計時，不受分頁背景節流影響：
 * content script 每輪執行完畢後送 auto-schedule，這裡排一個 35~45 秒隨機的
 * 一次性 alarm，時間到再通知該分頁執行下一輪。
 * alarm 名稱帶 tabId，service worker 被回收重啟後仍能對應回原分頁。
 */

const ALARM_PREFIX = 'next-list-auto:';

// 診斷輸出。這些訊息不會出現在銷售頁的 console，要到 chrome://extensions
// 開本擴充功能的「Service Worker」檢視器才看得到。
// 排程鏈的後半段（建立 alarm、alarm 是否準時響、訊息有無送達分頁）只有這裡看得到，
// 追「自動模式沒有下一輪」這類偶發異常時，這半段是必要的證據。
function log(...args) {
  const t = new Date().toLocaleTimeString('zh-TW', { hour12: false });
  console.log(`[NextList BG ${t}]`, ...args);
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || !sender.tab) return;
  const alarmName = ALARM_PREFIX + sender.tab.id;

  if (msg.type === 'auto-schedule') {
    const delayMs = 35000 + Math.random() * 10000; // 35~45 秒隨機
    chrome.alarms.create(alarmName, { when: Date.now() + delayMs });
    log(`已建立 alarm：tab=${sender.tab.id}，${(delayMs / 1000).toFixed(1)} 秒後觸發`);
  } else if (msg.type === 'auto-cancel') {
    chrome.alarms.clear(alarmName);
    log(`已取消 alarm：tab=${sender.tab.id}`);
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith(ALARM_PREFIX)) return;
  const tabId = Number(alarm.name.slice(ALARM_PREFIX.length));
  log(`alarm 觸發：tab=${tabId}，準備通知分頁執行下一輪`);
  chrome.tabs.sendMessage(tabId, { type: 'auto-tick' })
    .then(() => log(`auto-tick 已送達 tab=${tabId}`))
    .catch(err => {
      // 分頁已關閉或已離開銷售頁：一次性 alarm 不會再排程，安靜結束即可。
      // 但這個失敗原本被完全吞掉，是「自動模式無聲停擺」時最難查的一環，因此留下紀錄。
      log(`auto-tick 送達失敗 tab=${tabId}：${err?.message ?? err}（自動流程就此中斷）`);
    });
});
