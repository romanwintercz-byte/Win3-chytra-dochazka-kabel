
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Signalizace pro index.html, že aplikace skutečně nastartovala
(window as any).APP_STARTED = true;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=1.6.5', { scope: './' })
      .then(registration => {
        console.log('SW v1.6.5 Active');
        
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
      })
      .catch(err => console.error('SW failed:', err));
  });

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

// Odstranění loaderu
setTimeout(() => {
  const loader = document.getElementById('app-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 500);
  }
}, 500);
