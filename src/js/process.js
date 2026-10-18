import { clamp, prefersReducedMotion } from './utils.js';

/** Linky nad kroky postupu se při scrollu postupně vyplní oranžovou. */
export function initProcess() {
  const list = document.querySelector('[data-steps]');
  if (!list) return;
  const steps = [...list.children];

  if (prefersReducedMotion()) {
    steps.forEach((s) => s.style.setProperty('--p', '1'));
    return;
  }

  let ticking = false;
  const update = () => {
    ticking = false;
    const rect = list.getBoundingClientRect();
    const vh = window.innerHeight;
    // 0 = horní okraj kroků v 85 % výšky okna, 1 = konec seznamu o kus výš
    const progress = clamp((vh * 0.85 - rect.top) / (rect.height + vh * 0.25), 0, 1);
    steps.forEach((step, i) => {
      step.style.setProperty('--p', clamp(progress * steps.length - i, 0, 1).toFixed(3));
    });
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  // scroll posloucháme jen ve chvíli, kdy je sekce poblíž obrazovky
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      update();
    } else {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      update();
    }
  }).observe(list);
}
