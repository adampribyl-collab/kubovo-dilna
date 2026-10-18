import data from '../data/references.json';
import { pictureHTML, escapeHtml, plural, prefersReducedMotion, afterTransition } from './utils.js';

const HEIGHT_MS = 400; // délka animace rozbalení (shodná s CSS .gallery__viewport)

// „Zobrazit všech 24 referencí“ / „Zobrazit všechny 4 reference“
const showAllLabel = (n) =>
  n === 1 ? 'Zobrazit 1 referenci' : `Zobrazit ${plural(n, ['', 'všechny', 'všech'])} ${n} ${plural(n, ['', 'reference', 'referencí'])}`;

export function initGallery(lightbox) {
  const root = document.querySelector('[data-gallery]');
  if (!root) return;
  const filtersEl = root.querySelector('[data-gallery-filters]');
  const viewport = root.querySelector('[data-gallery-viewport]');
  const grid = root.querySelector('[data-gallery-grid]');
  const toggle = root.querySelector('[data-gallery-toggle]');
  const countEl = root.querySelector('[data-gallery-count]');
  const section = root.closest('section') || root;

  const labels = Object.fromEntries(data.categories.map((c) => [c.id, c.label]));
  const items = data.items;

  /* --- vykreslení filtrů a dlaždic --------------------------------------- */
  const filters = [{ id: 'all', label: 'Vše' }, ...data.categories];
  filtersEl.innerHTML = filters
    .map((f) => {
      const count = f.id === 'all' ? items.length : items.filter((it) => it.category === f.id).length;
      return `<button class="filter" type="button" data-filter="${f.id}" aria-pressed="${f.id === 'all'}">
        ${escapeHtml(f.label)}<span class="filter__count" aria-label="(${count})">${count}</span>
      </button>`;
    })
    .join('');

  grid.innerHTML = items
    .map(
      (it, i) => `<li class="tile" data-category="${escapeHtml(it.category)}" data-index="${i}">
        <div class="tile__frame">
          ${pictureHTML(it.image, {
            widths: [480, 800, 1400],
            sizes: '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
            alt: it.alt || it.title,
            width: 800,
            height: 600,
          })}
          <span class="tile__cat">${escapeHtml(labels[it.category] || it.category)}</span>
          <span class="tile__plus" aria-hidden="true">+</span>
        </div>
        <div class="tile__body">
          <p class="tile__title">${escapeHtml(it.title)}</p>
          <p class="tile__caption">${escapeHtml(it.caption)}</p>
        </div>
        <button class="tile__btn" type="button" aria-haspopup="dialog" aria-label="Zobrazit detail: ${escapeHtml(it.title)}"></button>
      </li>`,
    )
    .join('');

  const tiles = [...grid.children];
  const limitQuery = window.matchMedia('(max-width: 639px)');
  let filter = 'all';
  let expanded = false;
  let busy = false;

  const limit = () => (limitQuery.matches ? 4 : 6);
  const matching = () => tiles.filter((t) => filter === 'all' || t.dataset.category === filter);

  /* --- stav ---------------------------------------------------------------- */
  function applyVisibility() {
    const list = matching();
    const lim = limit();
    tiles.forEach((t) => (t.hidden = true));
    list.forEach((t, i) => (t.hidden = !expanded && i >= lim));
    return list;
  }

  function updateUi(list = matching()) {
    const lim = limit();
    const hasMore = list.length > lim;
    const shown = expanded ? list.length : Math.min(lim, list.length);
    root.classList.toggle('has-more', hasMore);
    root.classList.toggle('is-expanded', expanded && hasMore);
    toggle.hidden = !hasMore;
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.textContent = expanded ? 'Sbalit galerii ↑' : `${showAllLabel(list.length)} ↓`;
    countEl.textContent = `Zobrazeno ${shown} z ${list.length}`;
  }

  /** Výška sbaleného stavu: poslední řada je useknutá a přechází do ztracena. */
  function collapsedHeight(list = matching()) {
    const lim = limit();
    if (list.length <= lim) return null;
    const last = list[lim - 1];
    const frame = last.querySelector('.tile__frame');
    const visible = frame.offsetHeight * 0.78;
    viewport.style.setProperty('--fade-h', `${Math.round(visible)}px`);
    return last.offsetTop + visible;
  }

  function setCollapsedHeight() {
    const h = collapsedHeight();
    viewport.style.height = h == null ? '' : `${h}px`;
  }

  function animateIn(list) {
    if (prefersReducedMotion()) return;
    list.forEach((t, i) => {
      t.classList.remove('is-entering');
      void t.offsetWidth;
      t.style.setProperty('--d', String(i));
      t.classList.add('is-entering');
    });
    window.setTimeout(() => list.forEach((t) => t.classList.remove('is-entering')), 600 + list.length * 60);
  }

  /* --- rozbalit / sbalit ------------------------------------------------- */
  function expand() {
    busy = true;
    const from = viewport.offsetHeight;
    const before = new Set(tiles.filter((t) => !t.hidden));
    expanded = true;
    const list = applyVisibility();
    updateUi(list);
    animateIn(list.filter((t) => !before.has(t)));

    const to = grid.offsetHeight;
    viewport.style.height = `${from}px`;
    void viewport.offsetHeight;
    viewport.style.height = `${to}px`;
    afterTransition(HEIGHT_MS, () => {
      viewport.style.height = '';
      busy = false;
    });
  }

  function collapse() {
    busy = true;
    const list = matching();
    const from = viewport.offsetHeight;
    const to = collapsedHeight(list);
    viewport.style.height = `${from}px`;
    void viewport.offsetHeight;
    viewport.style.height = `${to}px`;
    expanded = false;
    updateUi(list);

    // zpět na začátek galerie (souběžně se sbalováním)
    const top = section.getBoundingClientRect().top + window.scrollY;
    if (window.scrollY > top) window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });

    afterTransition(HEIGHT_MS, () => {
      applyVisibility();
      setCollapsedHeight();
      busy = false;
    });
  }

  toggle.addEventListener('click', () => {
    if (busy) return;
    if (expanded) collapse();
    else expand();
  });

  /* --- filtry ---------------------------------------------------------------- */
  filtersEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn || btn.dataset.filter === filter || busy) return;
    filter = btn.dataset.filter;
    filtersEl.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));

    const list = applyVisibility();
    updateUi(list);
    if (expanded) viewport.style.height = '';
    else setCollapsedHeight();
    animateIn(list.filter((t) => !t.hidden));
  });

  /* --- lightbox ------------------------------------------------------------- */
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.tile__btn');
    if (!btn) return;
    const list = matching();
    const tile = btn.closest('.tile');
    lightbox.open(
      list.map((t) => items[Number(t.dataset.index)]),
      list.indexOf(tile),
      btn,
    );
  });

  /* --- reakce na změnu šířky -------------------------------------------- */
  const relayout = () => {
    if (busy) return;
    const list = applyVisibility();
    updateUi(list);
    if (!expanded) setCollapsedHeight();
  };
  limitQuery.addEventListener('change', relayout);
  new ResizeObserver(() => !expanded && !busy && setCollapsedHeight()).observe(grid);

  relayout();
}
