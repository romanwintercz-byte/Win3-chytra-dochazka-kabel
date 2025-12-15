
// CACHE KILLER SERVICE WORKER - v1.5.6
// Tato verze agresivně maže starou cache.
// Změna verze v názvu konstanty je klíčová pro detekci změny souboru.

const CACHE_NAME = 'smartwork-reset-v1.5.6';

self.addEventListener('install', (event) => {
  // Okamžitě přeskočit čekání - "vykopnout" starý service worker
  console.log('SW v1.5.6: Instalace a skipWaiting');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('SW v1.5.6: Aktivace a čištění cache');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Smazat vše, co není aktuální verze (což je v podstatě všechno)
          console.log('SW: Mazání staré cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  // Okamžitě převzít kontrolu nad všemi otevřenými taby
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // VŽDY jít na síť, nikdy nebrat index.html z cache
  // Pokud selže síť, teprve pak nic (nebo offline stránka, pokud by existovala)
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Můžeme sem přidat logiku pro cachování nové verze, 
        // ale pro jistotu teď necháme čistý network-only pro hlavní soubory
        return response;
      })
      .catch(() => {
        // Fallback
        return new Response("Jste offline a probíhá aktualizace. Prosím připojte se k internetu.", { 
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});
