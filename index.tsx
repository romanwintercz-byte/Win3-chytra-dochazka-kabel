
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// --- NUCLEAR CLEANUP START ---
// Tento blok kódu se spustí před Reactem a pokusí se vyčistit starý "nepořádek" v prohlížeči.

// 1. Vymazat localStorage klíče, které mohly způsobovat smyčky
try {
    const badKeys = ['smartwork_supabase_url', 'smartwork_supabase_key'];
    badKeys.forEach(key => localStorage.removeItem(key));
} catch (e) { console.error(e); }

// 2. Odregistrovat všechny Service Workery (aby přestaly servírovat starou appku)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      console.log('Odregistrovávám starý Service Worker:', registration);
      registration.unregister();
    }
  });
}

// 3. Smazat Cache Storage (pro jistotu i z hlavního vlákna)
if ('caches' in window) {
    caches.keys().then(function(names) {
        for (let name of names) {
            console.log('Mažu cache:', name);
            caches.delete(name);
        }
    });
}
// --- NUCLEAR CLEANUP END ---

// Register the NEW "Killer" SW
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
        // Force update immediately
        reg.update();
    });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
