// G検定学習システム Service Worker v4.1 (260問拡充・用語168語・ルート/data両対応・シラバス層化抽出・分野別分析)
const CACHE_NAME = 'gkentei-v4.1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './style.css?v=4.1',
  './app.js',
  './app.js?v=4.1',
  './manifest.json',
  './categories.json',
  './questions.json',
  './terms.json',
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
