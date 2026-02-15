import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Polyfill pro process.env aby Gemini SDK nespadlo
if (!(window as any).process) {
  (window as any).process = { env: {} };
}

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    // Signalizace úspěšného startu pro index.html
    (window as any).APP_STARTED = true;
    
    // Skrytí loaderu s malým zpožděním pro hladký přechod
    setTimeout(() => {
      const loader = document.getElementById('app-loader');
      if (loader) {
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none';
        setTimeout(() => loader.remove(), 600);
      }
    }, 200);
    
  } catch (err) {
    console.error('Kritická chyba startu Reactu:', err);
    const status = document.getElementById('loader-status');
    if (status) status.innerText = "Chyba při renderování komponent.";
  }
}