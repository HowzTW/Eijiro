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
    // 系統通知
    chrome.notifications.create('callScheduleAlert', {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: `預約回撥提醒（${upcoming.length} 筆即將到期）`,
      message: upcoming.map((r) => `${r.date} ${r.time}　${r.phone}`).join('\n'),
      requireInteraction: true,
    });

    // 取得主視窗 ID 與位置，計算螢幕正中央後開啟提醒小視窗
    chrome.windows.getLastFocused({ populate: false }, (win) => {
      const mainWindowId = win ? win.id : null;
      const width = 380;
      const height = 220;
      const left = win ? Math.round(win.left + (win.width - width) / 2) : 200;
      const top = win ? Math.round(win.top + (win.height - height) / 2) : 200;
      chrome.storage.local.set({ pendingAlert: { records: upcoming, mainWindowId } }, () => {
        chrome.windows.create({
          url: chrome.runtime.getURL('alert.html'),
          type: 'popup',
          width,
          height,
          left,
          top,
          focused: true,
        });
      });
    });
  }
}

// 使用者點通知後開啟 Side Panel
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
