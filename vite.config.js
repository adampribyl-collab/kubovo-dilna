import { defineConfig } from 'vite';

export default defineConfig({
  // Relativní cesty → hotový web z /dist funguje v kořeni domény i v podsložce hostingu.
  base: './',
  server: { host: true },
  preview: { host: true },
});
