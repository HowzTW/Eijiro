chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  chrome.alarms.create('checkSchedule', { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.get('checkSchedule', (alarm) => {
    if (!alarm) {
      chrome.alarms.create('checkSchedule', { periodInMinutes: 1 });
    }
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkSchedule') {
    checkUpcoming();
  }
});

async function checkUpcoming() {
  const { records = [] } = await chrome.storage.local.get('records');
  const now = new Date();
  const upcoming = records.filter((r) => {
    const dt = new Date(`${r.date}T${r.time}`);
    const diffMinutes = (dt - now) / 1000 / 60;
    return diffMinutes >= 0 && diffMinutes <= 3;
  });

  if (upcoming.length > 0) {
    // 系統通知（適用 Side Panel 未開啟時）
    chrome.notifications.create('callScheduleAlert', {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: `預約回撥提醒（${upcoming.length} 筆即將到期）`,
      message: upcoming.map((r) => `${r.date} ${r.time}　${r.phone}`).join('\n'),
      requireInteraction: true,
    });

    const alertMessage = `⚠ 預約回撥即將到期！\n\n${upcoming.map((r) => `${r.date} ${r.time}　${r.phone}`).join('\n')}`;

    // 若 Side Panel 已開啟，由 Side Panel 顯示 alert；否則注入到當前分頁
    chrome.runtime.sendMessage({ type: 'upcomingAlert', records: upcoming }).catch(() => {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (msg) => {
              alert(msg);
              chrome.runtime.sendMessage({ type: 'openSidePanel' });
            },
            args: [alertMessage],
          }).catch(() => {});
        }
      });
    });
  }
}

// alert 關閉後，由注入的 script 發訊息來開啟 Side Panel
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'openSidePanel' && sender.tab) {
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
  }
});

// 使用者點通知後開啟 Side Panel（點通知屬於 user gesture，符合 Chrome 規定）
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'callScheduleAlert') {
    chrome.windows.getLastFocused({ populate: false }, (win) => {
      if (win && win.id) {
        chrome.sidePanel.open({ windowId: win.id });
      }
    });
    chrome.notifications.clear(notificationId);
  }
});
