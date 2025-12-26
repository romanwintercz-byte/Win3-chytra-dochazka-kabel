
// SMARTWORK PWA SERVICE WORKER - v1.6.5
const CACHE_NAME = 'smartwork-core-v1.6.5';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => caches.delete(key))
    ))
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // HLAVNÍ PRAVIDLO: Vstup do aplikace (index.html) VŽDY ze sítě.
  // To zabrání tomu, aby SW vracel poškozený soubor z cache.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }

  // Ignorovat Supabase a API
  if (request.url.includes('supabase.co') || request.url.includes('google')) {
    return;
  }

  // Ostatní soubory: Network First
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

// Listener pro aktualizaci
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
