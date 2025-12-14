
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Global Error Handler for Supabase WSOD loops
window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('Invalid supabaseUrl')) {
        console.error("Caught fatal Supabase error. Resetting storage.");
        localStorage.removeItem('smartwork_supabase_url');
        localStorage.removeItem('smartwork_supabase_key');
        // Force reload without the bad state
        setTimeout(() => {
             window.location.reload();
        }, 1000);
    }
});

// SERVICE WORKER MANAGEMENT
// We explicitly unregister old workers to force an update if the user is stuck on an old version
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // 1. Try to unregister any existing controller to be safe
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        // Only unregister if it's an old scope or we want to force full reload
        // registration.unregister();
      }
    });

    // 2. Register the new one
    navigator.serviceWorker.register('./sw.js').then((registration) => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
      
      // Force update check
      registration.update();

      if (registration.waiting) {
        window.dispatchEvent(new CustomEvent('swUpdated', { detail: registration.waiting }));
      }

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New content available, please refresh.');
                window.dispatchEvent(new CustomEvent('swUpdated', { detail: installingWorker }));
              } else {
                console.log('Content is cached for offline use.');
              }
            }
          };
        }
      };
    }).catch((err) => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
