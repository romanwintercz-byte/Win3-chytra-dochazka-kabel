import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Safari Polyfill pro process.env
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

// Signalizace pro index.html
(window as any).APP_STARTED = true;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Root element nebyl nalezen.");
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(() => console.log('SW v1.9.2 OK'))
      .catch(err => console.warn('SW fail:', err));
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
    setTimeout(() => loader.remove(), 400);
  }
}, 500);