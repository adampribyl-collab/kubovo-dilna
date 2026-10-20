/**
 * Název obrázku v public/img/ (bez šířky a přípony).
 * Sdílí ho skript scripts/build-images.mjs, sestavení HTML (scripts/content-plugin.mjs) i galerie.
 *
 * foto    – cesta nahraná z redakce, např. "/photos/brana-novakovi.webp" (může být prázdná)
 * fallback – název, když fotka chybí (pro něj se vyrobí šrafovaná zástupná plocha)
 */
export function imageName(foto, fallback) {
  if (!foto) return fallback;
  const base = String(foto)
    .split('/')
    .pop()
    .replace(/\.[^.]+$/, '');
  const slug = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

const pad = (i) => String(i + 1).padStart(2, '0');
export const refFallback = (i) => `ref-${pad(i)}`;
export const serviceFallback = (i) => `service-${pad(i)}`;
