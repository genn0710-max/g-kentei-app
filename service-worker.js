const CACHE_NAME = 'g-kentei-app-cache-v5.8';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css?v=5.8',
  './app.js?v=5.8',
  './questions_bank.js?v=5.8',
  './flashcards_data.js?v=5.8',
  './manifest.json?v=5.8',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/vue@3/dist/vue.global.prod.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW v5.1] Pre-caching static assets...');
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[SW v5.1] Could not pre-cache asset:', asset, err);
        }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW v5.1] Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      return self.clients.matchAll({ type: 'window' });
    }).then((clients) => {
      clients.forEach((client) => {
        client.navigate(client.url);
      });
    })
  );
});

// Network-First strategy (with no-cache validation for same-origin assets & offline cache fallback)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isSameOrigin = event.request.url.startsWith(self.location.origin);
  const fetchOptions = isSameOrigin ? { cache: 'no-cache' } : {};

  event.respondWith(
    fetch(event.request, fetchOptions)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match('./index.html');
        });
      })
  );
});
