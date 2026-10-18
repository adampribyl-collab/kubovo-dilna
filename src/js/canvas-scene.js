import { clamp, isMobileViewport, reducedMotionQuery } from './utils.js';

/**
 * Společný základ pro canvas animace:
 * – velikost plátna podle prvku, devicePixelRatio max. 2
 * – přepočet bodu v % fotky na pixely plátna (fotka má object-fit: cover)
 * – pauza mimo obrazovku (IntersectionObserver) a na skryté záložce
 * – prefers-reduced-motion → jen statický snímek (drawStatic)
 */
export class CanvasScene {
  constructor(canvas, image, { rootMargin = '0px' } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.image = image;
    this.w = 0;
    this.h = 0;
    this.time = 0;
    this.last = 0;
    this.running = false;
    this.inView = false;
    this.reduced = reducedMotionQuery.matches;
    this.mobile = isMobileViewport();
    this.frame = this.frame.bind(this);

    new ResizeObserver(() => this.resize()).observe(canvas);
    if (image && !image.complete) image.addEventListener('load', () => this.resize(), { once: true });

    this.observer = new IntersectionObserver(
      ([entry]) => {
        this.inView = entry.isIntersecting;
        this.updateRunning();
      },
      { rootMargin },
    );
    this.observer.observe(canvas);

    document.addEventListener('visibilitychange', () => this.updateRunning());
    reducedMotionQuery.addEventListener('change', (e) => {
      this.reduced = e.matches;
      this.reset?.();
      this.updateRunning();
      if (this.reduced) this.drawStatic();
    });
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.w = rect.width;
    this.h = rect.height;
    this.mobile = isMobileViewport();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.onResize();
    if (this.reduced || !this.running) this.drawStatic();
  }

  /** Bod zadaný v % fotky → pixely plátna při object-fit: cover + object-position. */
  mapPoint(xPercent, yPercent) {
    const img = this.image;
    const iw = img?.naturalWidth || Number(img?.getAttribute('width')) || this.w;
    const ih = img?.naturalHeight || Number(img?.getAttribute('height')) || this.h;
    const scale = Math.max(this.w / iw, this.h / ih);
    const rw = iw * scale;
    const rh = ih * scale;
    const [posX, posY] = parseObjectPosition(img ? getComputedStyle(img).objectPosition : '');
    return {
      x: (this.w - rw) * posX + (xPercent / 100) * rw,
      y: (this.h - rh) * posY + (yPercent / 100) * rh,
      scale: rw / iw,
    };
  }

  updateRunning() {
    const shouldRun = this.inView && !document.hidden && !this.reduced && this.w > 0;
    if (shouldRun && !this.running) {
      this.running = true;
      this.last = performance.now();
      this.onStart?.();
      requestAnimationFrame(this.frame);
    } else if (!shouldRun) {
      this.running = false;
    }
  }

  frame(now) {
    if (!this.running) return;
    // dt omezené, ať po návratu na záložku nic „neodskočí“
    const dt = clamp((now - this.last) / 1000, 0, 1 / 24);
    this.last = now;
    this.time += dt;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.frame);
  }

  /* přepíší potomci */
  onResize() {}
  update() {}
  draw() {}
  drawStatic() {}
}

function parseObjectPosition(value) {
  const parts = (value || '50% 50%').trim().split(/\s+/);
  const toFraction = (v) => (v && v.endsWith('%') ? parseFloat(v) / 100 : 0.5);
  return [toFraction(parts[0]), toFraction(parts[1] ?? parts[0])];
}

/** Barevná rampa → pole rgba řetězců (předpočítané, ať se během snímku nestaví stringy). */
export function buildRamp(stops, steps) {
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const out = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const [t0, c0, a0] = stops[k];
    const [t1, c1, a1] = stops[k + 1];
    const f = clamp((t - t0) / (t1 - t0 || 1), 0, 1);
    const [r0, g0, b0] = hex(c0);
    const [r1, g1, b1] = hex(c1);
    const r = Math.round(r0 + (r1 - r0) * f);
    const g = Math.round(g0 + (g1 - g0) * f);
    const b = Math.round(b0 + (b1 - b0) * f);
    const a = (a0 + (a1 - a0) * f).toFixed(3);
    out.push(`rgba(${r},${g},${b},${a})`);
  }
  return out;
}
