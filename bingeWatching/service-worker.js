// 定義快取名稱和需要快取的檔案列表
const CACHE_NAME = 'series-tracker-cache-v2025-08-26 09:50:00'; // 更新快取版本號，強制觸發更新
const urlsToCache = [
  './', // 代表根目錄，通常會對應到 index.html
  './index.html',
  './manifest.json',
  './icon-16.png',
  './icon-32.png',
  './icon-64.png',
  './icon-128.png',
  './icon-256.png',
  './icon-512.png',
  './icon-1024.png'
];

// 監聽 'install' 事件，當 Service Worker 被安裝時觸發
self.addEventListener('install', event => {
  // 等待快取操作完成
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // 將所有指定的檔案加入快取
        return cache.addAll(urlsToCache);
      })
  );
});

// 監聽 'activate' 事件，用於清理舊的快取
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME]; // 只保留最新版本的快取
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // 如果快取名稱不在白名單中，就刪除它
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // 讓新的 Service Worker 立即接管頁面
  );
});

// 監聽 'fetch' 事件，攔截所有網路請求
self.addEventListener('fetch', event => {
  event.respondWith(
    // 試著從快取中尋找符合的請求
    caches.match(event.request)
      .then(response => {
        // 如果在快取中找到了對應的檔案，就直接回傳快取的版本
        if (response) {
          return response;
        }
        // 如果快取中沒有，就正常地透過網路去請求資源
        return fetch(event.request);
      }
    )
  );
});

// 監聽來自客戶端（頁面）的訊息
self.addEventListener('message', event => {
  // 如果收到的訊息是要求跳過等待，就立即啟用新的 Service Worker
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
