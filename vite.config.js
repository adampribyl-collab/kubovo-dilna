import { defineConfig } from 'vite';
import { contentPlugin } from './scripts/content-plugin.mjs';

export default defineConfig({
  // Relativní cesty → hotový web z /dist funguje v kořeni domény i v podsložce hostingu.
  base: './',
  // Texty ze src/content/*.json se vkládají do index.html při sestavení.
  plugins: [contentPlugin()],
  server: { host: true },
  preview: { host: true },
});
