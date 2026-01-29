
// 1. ABSOLUTNĚ PRVNÍ: Polyfill pro process.env
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: { API_KEY: '' } };
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('Index.tsx: Spouštění inicializace...');

// Signalizace pro index.html
(window as any).APP_STARTED = true;

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Kritická chyba: Root element nebyl nalezen.");
  throw new Error("Root element nebyl nalezen.");
}

// Pro zítřejší spuštění deaktivujeme Service Worker, aby nedocházelo k problémům s cache
/*
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(() => console.log('SW OK'))
      .catch(err => console.warn('SW fail:', err));
  });
}
*/

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('Index.tsx: React render dokončen.');
} catch (err) {
  console.error('Index.tsx: Chyba při renderování:', err);
}

// Postupné odstranění loaderu po naběhnutí Reactu
setTimeout(() => {
  const loader = document.getElementById('app-loader');
  if (loader) {
    loader.style.transition = 'opacity 0.5s ease-out';
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 500);
  }
}, 800);
