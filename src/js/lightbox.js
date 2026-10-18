import { pictureHTML, pad2, escapeHtml, lockScroll, unlockScroll, trapFocus, IMG_BASE } from './utils.js';

const REF_WIDTHS = [480, 800, 1400];

/**
 * Lightbox nad <dialog>: velká fotka, počítadlo, šipky, náhledy,
 * klávesy ← → Esc, swipe, zamknutý scroll stránky a focus trap.
 */
export function createLightbox(dialog) {
  const counter = dialog.querySelector('[data-lb-counter]');
  const figure = dialog.querySelector('[data-lb-figure]');
  const title = dialog.querySelector('[data-lb-title]');
  const finish = dialog.querySelector('[data-lb-finish]');
  const location = dialog.querySelector('[data-lb-location]');
  const thumbs = dialog.querySelector('[data-lb-thumbs]');
  const stage = dialog.querySelector('[data-lb-stage]');
  const prevBtn = dialog.querySelector('[data-lb-prev]');
  const nextBtn = dialog.querySelector('[data-lb-next]');
  const closeBtn = dialog.querySelector('[data-lb-close]');

  let items = [];
  let index = 0;
  let opener = null;
  let closing = false;

  function renderThumbs() {
    thumbs.innerHTML = items
      .map(
        (item, i) => `<button class="lightbox__thumb" type="button" data-index="${i}" aria-label="Fotka ${i + 1}: ${escapeHtml(item.title)}">
          ${pictureHTML(item.image, { widths: [480], sizes: '88px', width: 480, height: 360 })}
        </button>`,
      )
      .join('');
  }

  function preload(i) {
    const item = items[(i + items.length) % items.length];
    if (!item) return;
    const img = new Image();
    img.sizes = '100vw';
    img.srcset = REF_WIDTHS.map((w) => `${IMG_BASE}${item.image}-${w}.webp ${w}w`).join(', ');
  }

  function show(i) {
    index = (i + items.length) % items.length;
    const item = items[index];

    figure.innerHTML = pictureHTML(item.image, {
      widths: REF_WIDTHS,
      sizes: '(min-width: 1200px) 1200px, 100vw',
      alt: item.alt || item.title,
      width: 1400,
      height: 1050,
      lazy: false,
      imgClass: 'is-loading',
    });
    const img = figure.querySelector('img');
    const reveal = () => img.classList.remove('is-loading');
    if (img.complete) requestAnimationFrame(reveal);
    else {
      img.addEventListener('load', reveal, { once: true });
      img.addEventListener('error', reveal, { once: true });
    }

    counter.textContent = `${pad2(index + 1)} / ${pad2(items.length)}`;
    title.textContent = item.title;
    finish.textContent = item.finish;
    location.textContent = item.location;

    const single = items.length < 2;
    prevBtn.hidden = single;
    nextBtn.hidden = single;

    thumbs.querySelectorAll('.lightbox__thumb').forEach((t, ti) => {
      const active = ti === index;
      t.setAttribute('aria-current', String(active));
      if (active) {
        const left = t.offsetLeft - (thumbs.clientWidth - t.offsetWidth) / 2;
        thumbs.scrollTo({ left, behavior: dialog.classList.contains('is-open') ? 'smooth' : 'auto' });
      }
    });

    preload(index + 1);
    preload(index - 1);
  }

  function open(list, startIndex, openerEl) {
    items = list;
    opener = openerEl || document.activeElement;
    closing = false;
    renderThumbs();
    show(startIndex);
    dialog.showModal();
    lockScroll();
    requestAnimationFrame(() => dialog.classList.add('is-open'));
    closeBtn.focus();
  }

  function close() {
    if (closing || !dialog.open) return;
    closing = true;
    dialog.classList.remove('is-open');
    const finishClose = () => {
      dialog.close();
      unlockScroll();
      figure.innerHTML = '';
      opener?.focus({ preventScroll: true });
      closing = false;
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finishClose();
    else window.setTimeout(finishClose, 220);
  }

  prevBtn.addEventListener('click', () => show(index - 1));
  nextBtn.addEventListener('click', () => show(index + 1));
  closeBtn.addEventListener('click', close);
  thumbs.addEventListener('click', (e) => {
    const t = e.target.closest('[data-index]');
    if (t) show(Number(t.dataset.index));
  });

  // Esc: nativní „cancel“ dialogu přesměrujeme na vlastní zavření s animací
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      show(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      show(index + 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else {
      trapFocus(dialog, e);
    }
  });

  // klik do prázdné plochy kolem fotky zavře lightbox
  stage.addEventListener('click', (e) => {
    if (e.target === stage || e.target === figure) close();
  });

  /* swipe na mobilu */
  let startX = 0;
  let startY = 0;
  let tracking = false;
  stage.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length !== 1) return;
      tracking = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    },
    { passive: true },
  );
  stage.addEventListener(
    'touchend',
    (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) show(index + (dx < 0 ? 1 : -1));
    },
    { passive: true },
  );

  return { open, close };
}
