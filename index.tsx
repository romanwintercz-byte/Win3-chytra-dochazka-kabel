
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Signalizace pro index.html
(window as any).APP_STARTED = true;

console.log('Index.tsx: Inicializace Reactu...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Kritická chyba: Root element #root nebyl nalezen.");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  // Odstranění loaderu po úspěšném renderu
  setTimeout(() => {
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.style.transition = 'opacity 0.4s ease-out';
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 400);
    }
  }, 100);

} catch (err) {
  console.error('Index.tsx: Selhalo vykreslení aplikace:', err);
}
