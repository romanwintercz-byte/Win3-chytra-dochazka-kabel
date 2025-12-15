
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// FORCE UPDATE STRATEGY
// Místo odregistrování starého SW ho nahradíme novým "Killerem", 
// který má instrukce okamžitě převzít kontrolu (skipWaiting) a smazat cache.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // CRITICAL FIX: Použít relativní cestu './sw.js' místo absolutní '/sw.js'
    // To zajistí funkčnost i v podadresářích na GitHub Pages.
    navigator.serviceWorker.register('./sw.js').then(registration => {
      console.log('SW Registered: ', registration);
      
      // Check for updates manually
      registration.update();
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
