
// CACHE KILLER SERVICE WORKER
// Tato verze slouží k vyčištění staré cache a vynucení stažení nové verze aplikace.

const CACHE_NAME = 'smartwork-reset-v999';

self.addEventListener('install', (event) => {
  // Okamžitě převzít kontrolu, nečekat
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Okamžitě smazat VŠECHNY staré cache
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('MAŽU STAROU CACHE:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  // Okamžitě začít ovládat všechny otevřené stránky
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // IGNOROVAT CACHE - VŽDY STAHOVAT ZE SÍTĚ
  // Tím zajistíme, že se načte nový index.html a App.tsx bez staré obrazovky
  event.respondWith(
    fetch(event.request).catch(() => {
        // Fallback jen pokud není síť, ale pravděpodobně selže, což je v pořádku pro reset
        return new Response("Jste offline a probíhá reset aplikace. Připojte se k internetu.", { status: 503 });
    })
  );
});
