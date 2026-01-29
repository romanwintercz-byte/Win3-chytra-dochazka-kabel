
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Signalizace pro index.html, že React byl načten
(window as any).APP_STARTED = true;

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
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
    }, 200);
  } catch (err) {
    console.error('Chyba při renderování:', err);
  }
}
