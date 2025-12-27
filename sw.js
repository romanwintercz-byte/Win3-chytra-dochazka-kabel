// SMARTWORK PWA SERVICE WORKER - v1.8.8
const CACHE_NAME = 'smartwork-v1.8.8';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.url.includes('supabase.co') || request.url.includes('google') || request.url.includes('esm.sh')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }

  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) return networkResponse;
        const cacheCopy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
        return networkResponse;
      });
    })
  );
});