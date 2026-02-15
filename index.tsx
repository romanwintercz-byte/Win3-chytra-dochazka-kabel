import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Kritický polyfill pro browser prostředí
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { env: {} };
}

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
  
  // Skrytí loaderu po vykreslení
  setTimeout(() => {
    const loader = document.getElementById('app-loader');
    if (loader) loader.style.display = 'none';
  }, 500);
}