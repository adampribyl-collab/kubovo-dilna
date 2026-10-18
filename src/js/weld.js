import { CanvasScene, buildRamp } from './canvas-scene.js';
import { clamp } from './utils.js';

/* ==========================================================================
   Animace 2 – svářecí oblouk, kouř a jiskry (předěl se svářečem)
   Nastavení na <canvas data-weld>: data-x / data-y = bod svaru v % fotky,
   data-wind = unášení kouře do stran v px/s (záporné = doleva)
   ========================================================================== */

const DEG = Math.PI / 180;
const RAMP_STEPS = 20;
// teplé poloprůhledné jiskry (bez čistě bílé), aby splývaly s jiskrami ve fotce
const SPARK_STOPS = [
  [0, '#FFF1C9', 0.85],
  [0.15, '#FFD58A', 0.8],
  [0.45, '#FF9A3C', 0.6],
  [0.8, '#D9541C', 0.28],
  [1, '#8A2A10', 0],
];
const SPARK_RAMP = buildRamp(SPARK_STOPS, RAMP_STEPS);
// tlumenější varianta pro „vzdálenější“ jiskry → hloubka
const SPARK_RAMP_DIM = buildRamp(
  SPARK_STOPS.map(([t, c, a]) => [t, c, a * 0.45]),
  RAMP_STEPS,
);

/** Předkreslený měkký „obláček“ – kreslit gradient pro každou částici by bylo zbytečně drahé. */
function makePuff(r, g, b) {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const grad = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.45, `rgba(${r},${g},${b},0.55)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = grad;
  x.fillRect(0, 0, size, size);
  return c;
}

export class WeldScene extends CanvasScene {
  constructor(canvas, image) {
    super(canvas, image);
    this.srcX = parseFloat(canvas.dataset.x ?? 62);
    this.srcY = parseFloat(canvas.dataset.y ?? 58);
    this.windBias = parseFloat(canvas.dataset.wind ?? 10);

    this.smoke = [];
    this.sparks = [];
    this.buckets = Array.from({ length: RAMP_STEPS * 2 }, () => []);
    this.puffGrey = makePuff(196, 196, 202);
    this.puffWarm = makePuff(255, 158, 80);

    this.ox = 0;
    this.oy = 0;
    this.k = 1;
    this.arc = 0.9;
    this.breath = 1;
    this.ignite = 0; // náběh při prvním spuštění
    this.smokeCarry = 0;
    this.sparkCarry = 0;
    this.burstLeft = 0;
    this.burstRate = 0;
  }

  onResize() {
    const p = this.mapPoint(this.srcX, this.srcY);
    this.ox = p.x;
    this.oy = p.y;
    // měřítko podle velikosti fotky na obrazovce → dolet jisker odpovídá jiskrám ve fotce
    this.k = clamp(p.scale * 1.3, 0.45, 1.5);
  }

  reset() {
    this.smoke.length = 0;
    this.sparks.length = 0;
  }

  emitSmoke() {
    const k = this.k;
    this.smoke.push({
      x: this.ox + (Math.random() - 0.5) * 10 * k,
      y: this.oy - 10 * k,
      vx: (Math.random() - 0.5) * 30 * k,
      vy: -(45 + Math.random() * 40) * k,
      r: (8 + Math.random() * 10) * k,
      grow: (18 + Math.random() * 22) * k,
      age: 0,
      life: 3.5 + Math.random() * 3,
      seed: Math.random() * 100,
      freq: 0.6 + Math.random() * 0.9,
      alpha: 0.08 + Math.random() * 0.04, // max. ~0,12
    });
  }

  emitSpark() {
    const k = this.k;
    // směry podle fotky: dva hlavní vějíře šikmo nahoru (doleva a doprava), méně kolmo nahoru
    // a část se odrazí od trubky do stran
    // 40 % tvoří hustý roj krátkých jasných jisker těsně u oblouku, zbytek létá daleko
    const near = Math.random() < 0.4;
    const r = Math.random();
    const spread = Math.random() + Math.random() - 1; // −1…1, hustší uprostřed vějíře
    let deg;
    let speedScale = 1;
    if (r < 0.38) deg = -140 + spread * 32;
    else if (r < 0.68) deg = -48 + spread * 32;
    else if (r < 0.8) deg = -95 + spread * 22;
    else {
      deg = (Math.random() < 0.5 ? 18 : 162) + spread * 22;
      speedScale = 0.6;
    }
    const a = deg * DEG;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const sp = (near ? 70 + Math.random() * 200 : 180 + Math.pow(Math.random(), 1.6) * 640) * k * speedScale;
    const off = Math.random() * 6 * k; // start kousek od středu, ať se jiskry nekupí do hvězdičky
    this.sparks.push({
      x: this.ox + cos * off,
      y: this.oy + sin * off,
      vx: cos * sp,
      vy: sin * sp,
      age: 0,
      life: near ? 0.12 + Math.random() * 0.25 : 0.3 + Math.random() * 0.6,
      dim: Math.random() < (near ? 0.3 : 0.55) ? 1 : 0,
    });
  }

  update(dt) {
    const k = this.k;
    this.ignite = Math.min(1, this.ignite + dt * 2.5);

    // oblouk: rychlý nepravidelný flicker s občasným mírným poklesem
    const targetArc = Math.random() < 0.06 ? 0.45 + Math.random() * 0.25 : 0.8 + Math.random() * 0.2;
    this.arc += (targetArc - this.arc) * Math.min(1, dt * 40);
    // teplá záře pomalu „dýchá“
    this.breath = 0.78 + 0.16 * Math.sin(this.time * 1.6) + 0.06 * Math.sin(this.time * 4.1 + 1.3);

    /* kouř */
    this.smokeCarry += (this.mobile ? 7 : 14) * this.ignite * dt;
    const maxSmoke = this.mobile ? 80 : 160;
    while (this.smokeCarry >= 1) {
      this.smokeCarry -= 1;
      if (this.smoke.length < maxSmoke) this.emitSmoke();
    }
    const smoke = this.smoke;
    for (let i = smoke.length - 1; i >= 0; i--) {
      const s = smoke[i];
      s.age += dt;
      if (s.age >= s.life) {
        smoke[i] = smoke[smoke.length - 1];
        smoke.pop();
        continue;
      }
      // „vítr“: pomalé společné kývání + vlastní vír každé částice (sinusovky v čase a výšce),
      // čím výš nad svarem, tím víc se kouř kroutí a rozplývá do stran
      const height = clamp((this.oy - s.y) / (200 * k), 0, 1);
      const sway = Math.sin(this.time * 0.35 + s.y * 0.006) * 16;
      const swirl = Math.sin(this.time * s.freq + s.seed * 3 + s.y * 0.02) * 26;
      const wind = (sway * (0.3 + height) + swirl * (0.25 + height) + this.windBias * height) * k;
      s.vx += (wind - s.vx) * Math.min(1, dt * 1.2);
      s.vy += (-40 * k - s.vy) * Math.min(1, dt * 0.5);
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.r += s.grow * dt;
    }

    /* jiskry v krátkých dávkách */
    this.burstLeft -= dt;
    if (this.burstLeft <= 0) {
      this.burstRate = Math.random() < 0.35 ? 600 + Math.random() * 300 : 220 + Math.random() * 120;
      this.burstLeft = 0.06 + Math.random() * 0.3;
    }
    this.sparkCarry += this.burstRate * (this.mobile ? 0.5 : 1) * this.ignite * dt;
    const maxSparks = this.mobile ? 450 : 900;
    while (this.sparkCarry >= 1) {
      this.sparkCarry -= 1;
      if (this.sparks.length < maxSparks) this.emitSpark();
    }
    const g = 650 * k;
    const drag = Math.exp(-1.25 * dt);
    const sparks = this.sparks;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.age += dt;
      p.vx *= drag;
      p.vy = p.vy * drag + g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.age >= p.life || p.y > this.h || p.y < 0 || p.x < 0 || p.x > this.w) {
        sparks[i] = sparks[sparks.length - 1];
        sparks.pop();
      }
    }
  }

  drawLight(arc, breath) {
    const { ctx, ox, oy, k } = this;

    // Oblouk je jediný zdroj světla ve scéně (fotka je před zapálením).
    // teplé nasvětlení okolí, které pomalu „dýchá“
    const r = 320 * k * (0.9 + 0.2 * breath);
    let g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
    g.addColorStop(0, `rgba(255,160,80,${(0.2 * breath).toFixed(3)})`);
    g.addColorStop(0.4, `rgba(255,120,40,${(0.07 * breath).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,110,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(ox - r, oy - r, r * 2, r * 2);

    // studené modrobílé světlo oblouku, bliká s ním
    const hr = (60 + 30 * arc) * k;
    g = ctx.createRadialGradient(ox, oy, 0, ox, oy, hr);
    g.addColorStop(0, `rgba(220,236,255,${(0.35 * arc).toFixed(3)})`);
    g.addColorStop(0.4, `rgba(170,205,255,${(0.1 * arc).toFixed(3)})`);
    g.addColorStop(1, 'rgba(140,190,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(ox - hr, oy - hr, hr * 2, hr * 2);

    // jasné jádro #E8F4FF s měkkým rozzářením (bez ostré hrany)
    const cr = (9 + 5 * arc) * k;
    g = ctx.createRadialGradient(ox, oy, 0, ox, oy, cr);
    g.addColorStop(0, `rgba(255,255,255,${arc.toFixed(3)})`);
    g.addColorStop(0.18, `rgba(232,244,255,${(0.85 * arc).toFixed(3)})`);
    g.addColorStop(0.45, `rgba(170,210,255,${(0.25 * arc).toFixed(3)})`);
    g.addColorStop(1, 'rgba(170,210,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(ox - cr, oy - cr, cr * 2, cr * 2);
  }

  draw() {
    const { ctx, ox, oy, k } = this;
    const arc = this.arc * this.ignite;
    ctx.clearRect(0, 0, this.w, this.h);

    /* kouř */
    const warmRadius = 130 * k;
    for (const s of this.smoke) {
      const t = s.age / s.life;
      const alpha = s.alpha * Math.min(1, s.age / 1.1) * Math.pow(1 - t, 1.4);
      const d = s.r;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha;
      ctx.drawImage(this.puffGrey, s.x - d, s.y - d, d * 2, d * 2);
      // spodní část kouře prosvícená teplou barvou oblouku
      const warm = 1 - Math.hypot(s.x - ox, s.y - oy) / warmRadius;
      if (warm > 0.02) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, alpha * warm * warm * 1.1 * (0.5 + 0.5 * arc));
        ctx.drawImage(this.puffWarm, s.x - d, s.y - d, d * 2, d * 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';

    /* jiskry */
    const buckets = this.buckets;
    for (let i = 0; i < buckets.length; i++) buckets[i].length = 0;
    for (const p of this.sparks) {
      if (p.age < 0.03) continue; // úplně čerstvé jiskry by u středu tvořily ostrou „hvězdičku“
      const ci = Math.min(RAMP_STEPS - 1, ((p.age / p.life) * RAMP_STEPS) | 0);
      buckets[ci * 2 + p.dim].push(p);
    }
    ctx.lineCap = 'round';
    const maxLen = 26 * k;
    for (let i = 0; i < buckets.length; i++) {
      const group = buckets[i];
      if (!group.length) continue;
      const dim = i & 1;
      ctx.strokeStyle = dim ? SPARK_RAMP_DIM[i >> 1] : SPARK_RAMP[i >> 1];
      ctx.lineWidth = dim ? 0.8 : 1.1;
      ctx.beginPath();
      for (const p of group) {
        const sp = Math.hypot(p.vx, p.vy) || 1;
        const len = clamp(sp * 0.03, 1.5, maxLen); // tenké protáhlé čárky jako na fotce
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.vx / sp) * len, p.y - (p.vy / sp) * len);
      }
      ctx.stroke();
    }

    /* oblouk a nasvětlení */
    this.drawLight(arc, this.breath * this.ignite);
    ctx.globalCompositeOperation = 'source-over';
  }

  drawStatic() {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = 'lighter';
    this.drawLight(0.8, 0.9);
    ctx.globalCompositeOperation = 'source-over';
  }
}
