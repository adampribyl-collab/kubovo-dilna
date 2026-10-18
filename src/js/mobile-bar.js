/**
 * Mobilní lišta „Zavolat / Poptávka“. Schová se, když je na obrazovce formulář
 * (a také nad úvodními tlačítky v hero, která dělají totéž).
 */
export function initMobileBar() {
  const bar = document.querySelector('[data-mobile-bar]');
  if (!bar) return;
  const targets = [document.querySelector('[data-hero-ctas]'), document.getElementById('poptavka')].filter(Boolean);
  const visible = new Set();

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      const hide = visible.size > 0;
      bar.classList.toggle('is-hidden', hide);
      bar.inert = hide;
    },
    { threshold: 0.1 },
  );
  targets.forEach((t) => io.observe(t));
}
