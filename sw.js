
// SMARTWORK PWA SERVICE WORKER - v1.6.1
const CACHE_NAME = 'smartwork-cache-v1.6.1';

// Soubory k před-cachování (App Shell)
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './index.tsx',
  './manifest.json',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

// Strategie: Network First, Fallback to Cache
self.addEventListener('fetch', (event) => {
  // Ignorujeme API volání (Supabase), ty musí jít vždy live
  if (event.request.url.includes('supabase.co') || event.request.url.includes('google')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Pokud je síť OK, uložíme kopii do cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Pokud síť nejede, zkusíme cache
        return caches.match(event.request);
      })
  );
});
