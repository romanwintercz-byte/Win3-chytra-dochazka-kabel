
// CACHE KILLER SERVICE WORKER - v1.5.8
const CACHE_NAME = 'smartwork-reset-v1.5.8';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return new Response("Offline", { 
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});
