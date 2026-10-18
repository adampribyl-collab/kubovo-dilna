export const IMG_BASE = `${import.meta.env.BASE_URL}img/`;

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
export const prefersReducedMotion = () => reducedMotionQuery.matches;

export const isMobileViewport = () => window.matchMedia('(max-width: 767px)').matches;

export const pad2 = (n) => String(n).padStart(2, '0');

export function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** České skloňování: plural(5, ['reference', 'reference', 'referencí']) */
export function plural(n, [one, few, many]) {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

/**
 * <picture> s WebP a JPG fallbackem. Soubory musí odpovídat výstupu `npm run images`:
 * img/<name>-<šířka>.webp a img/<name>-<šířka>.jpg
 */
export function pictureHTML(name, { widths, sizes, alt = '', width, height, lazy = true, imgClass = '' }) {
  const set = (ext) => widths.map((w) => `${IMG_BASE}${name}-${w}.${ext} ${w}w`).join(', ');
  const fallback = `${IMG_BASE}${name}-${widths[Math.min(1, widths.length - 1)]}.jpg`;
  return `<picture>
    <source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">
    <img src="${fallback}" srcset="${set('jpg')}" sizes="${sizes}" width="${width}" height="${height}" alt="${escapeHtml(alt)}"${lazy ? ' loading="lazy"' : ''} decoding="async"${imgClass ? ` class="${imgClass}"` : ''}>
  </picture>`;
}

/* --- zámek scrollu (menu, lightbox) ------------------------------------ */
let lockCount = 0;
export function lockScroll() {
  if (lockCount++ === 0) {
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.paddingRight = scrollbar ? `${scrollbar}px` : '';
    document.documentElement.classList.add('is-locked');
  }
}
export function unlockScroll() {
  if (lockCount > 0 && --lockCount === 0) {
    document.documentElement.classList.remove('is-locked');
    document.documentElement.style.paddingRight = '';
  }
}

/* --- focus trap -------------------------------------------------------- */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Udrží Tab uvnitř jednoho nebo více kontejnerů (pole elementů). */
export function trapFocus(containers, event) {
  if (event.key !== 'Tab') return;
  const scopes = Array.isArray(containers) ? containers : [containers];
  const items = scopes
    .flatMap((c) => [...c.querySelectorAll(FOCUSABLE)])
    .filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  const inside = scopes.some((c) => c.contains(document.activeElement));
  if (!inside) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/** Spustí callback po skončení CSS přechodu (s pojistkou, kdyby transitionend nepřišel). */
export function afterTransition(ms, cb) {
  return window.setTimeout(cb, prefersReducedMotion() ? 0 : ms + 40);
}
