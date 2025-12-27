import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Signalizace pro index.html, že JS kód byl úspěšně načten a spuštěn
(window as any).APP_STARTED = true;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Root element not found");
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(registration => {
        console.log('ServiceWorker v1.8.4 registered');
        
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nový SW je připraven, upozorníme uživatele
                window.dispatchEvent(new CustomEvent('swUpdated', { detail: installingWorker }));
              }
            };
          }
        };
      })
      .catch(err => console.warn('SW registration failed:', err));
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Refresh stránky při aktivaci nového SW
    window.location.reload();
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Odstranění loaderu po krátké pauze pro hladký přechod
setTimeout(() => {
  const loader = document.getElementById('app-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 400);
  }
}, 300);