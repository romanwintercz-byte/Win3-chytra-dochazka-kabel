
// SMARTWORK PWA SERVICE WORKER - v1.6.3
const CACHE_NAME = 'smartwork-stable-v1.6.3';

// Musíme nacachovat i externí knihovny z importmapy, jinak bez netu aplikace nenaběhne
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './index.tsx',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react-dom@^19.2.0/',
  'https://aistudiocdn.com/react@^19.2.0/',
  'https://aistudiocdn.com/uuid@^13.0.0',
  'https://aistudiocdn.com/@supabase/supabase-js@^2.39.0'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url => cache.add(url).catch(err => console.warn(`Cache add failed: ${url}`, err)))
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  // TOTÁLNÍ ČIŠTĚNÍ - Smazat úplně všechno staré
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // API volání (Supabase) nesmí být v cache
  if (request.url.includes('supabase.co') || request.url.includes('google-analytics')) {
    return;
  }

  // Navigace (vstup do aplikace)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html') || caches.match('index.html'))
    );
    return;
  }

  // Ostatní (JS, CSS, Obrázky) - Cache First, pak Network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => null);
    })
  );
});
