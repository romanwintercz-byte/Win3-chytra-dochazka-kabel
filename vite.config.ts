
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // UPDATE: Změna na './' zajistí funkčnost na GitHub Pages (kde aplikace běží v podadresáři /nazev-repo/).
  // Toto nastavení je univerzální a bude fungovat i na Vercelu.
  base: './', 
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
