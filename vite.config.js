import { defineConfig } from 'vite';
import { contentPlugin } from './scripts/content-plugin.mjs';

export default defineConfig({
  // Relativní cesty → hotový web z /dist funguje v kořeni domény i v podsložce hostingu.
  base: './',
  // Texty ze src/content/*.json se vkládají do index.html při sestavení.
  plugins: [contentPlugin()],
  build: {
    rollupOptions: {
      // dvě stránky: web a zásady zpracování osobních údajů
      input: {
        main: 'index.html',
        zasady: 'ochrana-osobnich-udaju/index.html',
      },
    },
  },
  server: { host: true },
  preview: { host: true },
});
