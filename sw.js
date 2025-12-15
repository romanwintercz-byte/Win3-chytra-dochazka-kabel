
// CACHE KILLER SERVICE WORKER - v1.5.0
// Tato verze slouží k vyčištění staré cache a vynucení stažení nové verze aplikace.
// Změna verze v souboru vynutí přenačtení workeru prohlížečem.

const CACHE_NAME = 'smartwork-reset-v1.5.0';

self.addEventListener('install', (event) => {
  // Okamžitě převzít kontrolu, nečekat
  console.log('SW: Instaluji Killer Worker...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Okamžitě smazat VŠECHNY staré cache
  console.log('SW: Aktivuji a mažu cache...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('SW: MAŽU STAROU CACHE:', cacheName);
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
        // Fallback jen pokud není síť
        return new Response("Probíhá aktualizace aplikace. Prosím obnovte stránku online.", { status: 503 });
    })
  );
});
