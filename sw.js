// G検定学習システム Service Worker v3.8 (問題読み上げ時の正解非表示・v3.8バッジ)
const CACHE_NAME = 'gkentei-v3.8';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './style.css?v=3.8',
  './app.js',
  './app.js?v=3.8',
  './manifest.json',
  './data/categories.json',
  './data/questions.json',
  './data/terms.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching updated learning assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // APIリクエスト
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(JSON.stringify({ error: "Offline" }), { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }

  // NetworkFirst: ネットワーク通信が可能なら常に最新ファイルを取得・更新し、オフライン時はキャッシュから配信
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return networkResponse;
    }).catch(() => {
      // オフライン時のキャッシュ配信
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return caches.match('./index.html');
      });
    })
  );
});
