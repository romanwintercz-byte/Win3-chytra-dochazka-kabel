
// SMARTWORK PWA SERVICE WORKER - v1.7.0
const CACHE_NAME = 'smartwork-v1.7.0';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Smazat úplně všechno staré při aktivaci nové verze
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // HLAVNÍ STRÁNKA: Vždy zkusit síť. Pokud selže (offline), zkusit cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // API a Supabase neřešíme přes SW cache
  if (request.url.includes('supabase.co') || request.url.includes('google')) {
    return;
  }

  // Ostatní (JS, CSS, Obrázky): Network First, pak Cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
