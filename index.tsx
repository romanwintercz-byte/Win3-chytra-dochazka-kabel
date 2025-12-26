
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Robustnější registrace Service Workera
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Registrujeme SW s explicitním scope
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(registration => {
        console.log('SW Registered (v1.6.3):', registration.scope);
        
        // Pokud je k dispozici nová verze, vyvoláme event pro UI
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                window.dispatchEvent(new CustomEvent('swUpdated', { detail: installingWorker }));
              }
            };
          }
        };

        // Kontrola aktualizace každých 30 minut
        setInterval(() => registration.update(), 1000 * 60 * 30);
      })
      .catch(err => console.error('SW registration failed:', err));
  });

  // Reakce na aktivaci nového SW (skipWaiting)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
