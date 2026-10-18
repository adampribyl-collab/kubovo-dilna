import { lockScroll, unlockScroll, trapFocus, prefersReducedMotion } from './utils.js';

export function initNav() {
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  if (!header) return;

  /* průhledná navigace na hero → tmavá po odscrollování */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      header.classList.toggle('is-solid', window.scrollY > 40);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* mobilní menu */
  let open = false;
  let closeTimer;

  const onKeydown = (e) => {
    if (e.key === 'Escape') {
      setMenu(false);
      toggle.focus();
    } else {
      // trap přes hlavičku (logo + zavírací tlačítko) i obsah menu
      trapFocus([header, menu], e);
    }
  };

  function setMenu(next) {
    if (next === open) return;
    open = next;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Zavřít menu' : 'Otevřít menu');
    header.classList.toggle('is-menu-open', open);
    window.clearTimeout(closeTimer);

    if (open) {
      menu.hidden = false;
      menu.getBoundingClientRect(); // reflow kvůli přechodu
      menu.classList.add('is-open');
      lockScroll();
      document.addEventListener('keydown', onKeydown);
      menu.querySelector('a')?.focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      unlockScroll();
      document.removeEventListener('keydown', onKeydown);
      closeTimer = window.setTimeout(() => (menu.hidden = true), prefersReducedMotion() ? 0 : 320);
    }
  }

  if (toggle && menu) {
    toggle.addEventListener('click', () => setMenu(!open));
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) setMenu(false);
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => e.matches && setMenu(false));
  }

  /* zvýraznění aktivní sekce v navigaci */
  const links = [...document.querySelectorAll('.main-nav [data-spy]')];
  const sections = links.map((a) => document.getElementById(a.dataset.spy)).filter(Boolean);
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.setAttribute('aria-current', String(a.dataset.spy === entry.target.id)));
      });
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  sections.forEach((s) => spy.observe(s));

  // Nad první sekcí (hero) není aktivní nic.
  const hero = document.querySelector('.hero');
  if (hero) {
    new IntersectionObserver(([e]) => e.isIntersecting && e.intersectionRatio > 0.5 && links.forEach((a) => a.setAttribute('aria-current', 'false')), {
      threshold: [0.5],
    }).observe(hero);
  }
}
