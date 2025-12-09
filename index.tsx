import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Service Worker Registration with Update Detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((registration) => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);

      // Check if there is a waiting worker (update ready but not activated)
      if (registration.waiting) {
        window.dispatchEvent(new CustomEvent('swUpdated', { detail: registration.waiting }));
      }

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New content is available; please refresh.
                window.dispatchEvent(new CustomEvent('swUpdated', { detail: installingWorker }));
              } else {
                // Content is cached for offline use.
                console.log('Content is cached for offline use.');
              }
            }
          };
        }
      };
    }).catch((err) => {
      console.log('ServiceWorker registration failed: ', err);
    });

    // Ensure refresh is only called once.
    // This works around a bug in "force update on reload".
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        window.location.reload();
        refreshing = true;
      }
    });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);