import './styles/base.css';
import './styles/header.css';
import './styles/hero.css';
import './styles/sections.css';
import './styles/gallery.css';
import './styles/contact.css';

import { initNav } from './js/nav.js';
import { initGallery } from './js/gallery.js';
import { createLightbox } from './js/lightbox.js';
import { initProcess } from './js/process.js';
import { initForm } from './js/form.js';
import { initMobileBar } from './js/mobile-bar.js';
import { GrinderSparks } from './js/sparks.js';
import { WeldScene } from './js/weld.js';

initNav();

const lightboxEl = document.querySelector('[data-lightbox]');
initGallery(lightboxEl ? createLightbox(lightboxEl) : null);

initProcess();
initForm();
initMobileBar();

// Canvas animace startují až po načtení stránky, ať nebrzdí první vykreslení.
function whenIdle(cb) {
  const run = () => ('requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 1200 }) : setTimeout(cb, 200));
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}

whenIdle(() => {
  const sparksCanvas = document.querySelector('[data-sparks]');
  if (sparksCanvas) new GrinderSparks(sparksCanvas, document.querySelector('[data-hero-img]'));

  const weldCanvas = document.querySelector('[data-weld]');
  if (weldCanvas) new WeldScene(weldCanvas, document.querySelector('[data-weld-img]'));
});
