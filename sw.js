
// SMARTWORK PWA SERVICE WORKER - v1.6.2
const CACHE_NAME = 'smartwork-stable-v1.6.2';

// Klíčové soubory pro "App Shell" - musí být dostupné i offline
const PRECACHE_ASSETS = [
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Používáme addAll, ale s individuálním ošetřením chyb
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url => cache.add(url).catch(err => console.warn(`Failed to precache ${url}:`, err)))
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  // Smazání všech starých verzí cache pro čistý start
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Hlavní logika obsluhy požadavků
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignorujeme API volání (Supabase), ta musí být vždy live
  if (url.hostname.includes('supabase.co') || url.hostname.includes('google')) {
    return;
  }

  // 2. Strategie pro Navigaci (otevření stránky / z plochy)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        // Pokud síť nejede, vrátíme index.html z cache
        return caches.match('./index.html') || caches.match('index.html');
      })
    );
    return;
  }

  // 3. Ostatní soubory (JS, CSS, obrázky) - Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
