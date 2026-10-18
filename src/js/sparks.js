import { CanvasScene, buildRamp } from './canvas-scene.js';
import { clamp } from './utils.js';

/* ==========================================================================
   Animace 1 – jiskry od úhlové brusky (hero)
   Nastavení na <canvas data-sparks>:
     data-spark-x / data-spark-y  … bod dotyku kotouče v % fotky
     data-spark-angle             … směr výtrysku ve stupních (0 = doprava, 90 = dolů)
     data-spark-spread            … šířka kužele ve stupních
   ========================================================================== */

const DEG = Math.PI / 180;
const RAMP_STEPS = 28;
const SPARK_RAMP = buildRamp(
  [
    // bílo-žlutá jen na startu, pak sytá oranžová a dohasínání do tmavě červené
    [0, '#FFF3C4', 1],
    [0.05, '#FFD27A', 1],
    [0.18, '#FF8A2A', 0.95],
    [0.42, '#FF6B1A', 0.85],
    [0.7, '#C8360F', 0.55],
    [1, '#5A0E06', 0],
  ],
  RAMP_STEPS,
);

export class GrinderSparks extends CanvasScene {
  constructor(canvas, image) {
    super(canvas, image);
    const d = canvas.dataset;
    this.srcX = parseFloat(d.sparkX ?? 68);
    this.srcY = parseFloat(d.sparkY ?? 62);
    this.angle = parseFloat(d.sparkAngle ?? 158) * DEG;
    this.spread = parseFloat(d.sparkSpread ?? 35) * DEG;

    this.particles = [];
    this.buckets = Array.from({ length: RAMP_STEPS * 2 }, () => []);
    this.ox = 0;
    this.oy = 0;
    this.k = 1;
    this.floor = 0;

    // proměnlivá intenzita v nepravidelných pulzech
    this.intensity = 0;
    this.target = 1;
    this.phaseLeft = 0.7;
    this.carry = 0;
    this.flicker = 1;
  }

  get maxParticles() {
    return this.mobile ? 1100 : 2200;
  }

  onResize() {
    const p = this.mapPoint(this.srcX, this.srcY);
    this.ox = p.x;
    this.oy = p.y;
    // menší plocha = kratší dolet jisker
    this.k = clamp(Math.min(this.h / 900, this.w / 1400) * 1.05, 0.5, 1.25);
    this.floor = this.h - 1;
  }

  reset() {
    this.particles.length = 0;
  }

  nextPhase() {
    const r = Math.random();
    if (r < 0.5) {
      // plný záběr kotouče
      this.target = 0.75 + Math.random() * 0.35;
      this.phaseLeft = 0.3 + Math.random() * 1.2;
    } else if (r < 0.8) {
      // lehký dotyk
      this.target = 0.18 + Math.random() * 0.3;
      this.phaseLeft = 0.15 + Math.random() * 0.5;
    } else {
      // kotouč nadzvednutý
      this.target = 0.02;
      this.phaseLeft = 0.12 + Math.random() * 0.45;
    }
  }

  emit() {
    // součet dvou náhod = hustší jádro proudu, řidší okraje kužele
    const a = this.angle + (Math.random() + Math.random() - 1) * this.spread * 0.5;
    // rychlý start + menší odpor → jiskra nejdřív letí rovně, pak ji gravitace ohne k zemi
    const speed = (650 + Math.pow(Math.random(), 0.7) * 1150) * this.k;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const head = Math.random() * 0.016; // rozložení podél dráhy, ať se jiskry nekupí u zdroje
    this.particles.push({
      x: this.ox + cos * speed * head,
      y: this.oy + sin * speed * head,
      vx: cos * speed,
      vy: sin * speed,
      age: 0,
      life: 0.6 + Math.random() * 0.9,
      w: 0.6 + Math.random() * 1.4,
      drag: 0.45 + Math.random() * 0.5,
      bounced: false,
    });
  }

  bounce(p) {
    p.y = this.floor - 0.5;
    p.vy *= -(0.2 + Math.random() * 0.22);
    p.vx *= 0.5 + Math.random() * 0.3;
    p.bounced = true;
    p.life = Math.min(p.life, p.age + 0.3 + Math.random() * 0.35);

    // rozprsknutí na menší jiskry
    const shards = 1 + ((Math.random() * 3) | 0);
    for (let s = 0; s < shards && this.particles.length < this.maxParticles; s++) {
      const a = -Math.PI * (0.08 + Math.random() * 0.84);
      const sp = (120 + Math.random() * 380) * this.k;
      const age = p.age * 0.6;
      this.particles.push({
        x: p.x,
        y: this.floor - 1,
        vx: Math.cos(a) * sp + p.vx * 0.4,
        vy: Math.sin(a) * sp * 0.8,
        age,
        life: age + 0.2 + Math.random() * 0.4,
        w: 0.7,
        drag: 2.2,
        bounced: true,
      });
    }
  }

  update(dt) {
    this.phaseLeft -= dt;
    if (this.phaseLeft <= 0) this.nextPhase();
    const response = this.target > this.intensity ? 16 : 5; // rychlý náběh, pomalejší dojezd
    this.intensity += (this.target - this.intensity) * Math.min(1, response * dt);
    this.flicker += (0.72 + Math.random() * 0.45 - this.flicker) * Math.min(1, 30 * dt);

    const perSecond = this.intensity * (0.7 + Math.random() * 0.6) * (this.mobile ? 500 : 1000);
    this.carry += perSecond * dt;
    const max = this.maxParticles;
    while (this.carry >= 1) {
      this.carry -= 1;
      if (this.particles.length < max) this.emit();
    }

    const g = 1150 * this.k;
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.age += dt;
      let dead = p.age >= p.life;
      if (!dead) {
        const drag = Math.exp(-p.drag * dt);
        p.vx *= drag;
        p.vy = p.vy * drag + g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y >= this.floor) {
          if (!p.bounced && p.vy > 220 * this.k && Math.random() < 0.6) this.bounce(p);
          else dead = true;
        } else if (p.x < -40 || p.x > this.w + 40) {
          dead = true;
        }
      }
      if (dead) {
        ps[i] = ps[ps.length - 1];
        ps.pop();
      }
    }
  }

  drawGlow(intensity, flicker) {
    const { ctx, ox, oy, k } = this;
    const r = (60 + 130 * intensity) * k * flicker;
    const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
    g.addColorStop(0, `rgba(255,243,196,${((0.25 + 0.6 * intensity) * flicker).toFixed(3)})`);
    g.addColorStop(0.1, `rgba(255,196,120,${((0.16 + 0.36 * intensity) * flicker).toFixed(3)})`);
    g.addColorStop(0.4, `rgba(255,107,26,${(0.05 + 0.13 * intensity).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,107,26,0)');
    ctx.fillStyle = g;
    ctx.fillRect(ox - r, oy - r, r * 2, r * 2);
  }

  draw() {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = 'lighter';
    this.drawGlow(this.intensity, this.flicker);

    // jiskry seskupené podle barvy a tloušťky → jeden stroke na skupinu
    const buckets = this.buckets;
    for (let i = 0; i < buckets.length; i++) buckets[i].length = 0;
    for (const p of this.particles) {
      const ci = Math.min(RAMP_STEPS - 1, (Math.pow(p.age / p.life, 0.85) * RAMP_STEPS) | 0);
      buckets[ci * 2 + (p.w > 1.2 ? 1 : 0)].push(p);
    }

    ctx.lineCap = 'round';
    const maxLen = 32 * this.k;
    for (let i = 0; i < buckets.length; i++) {
      const group = buckets[i];
      if (!group.length) continue;
      ctx.strokeStyle = SPARK_RAMP[i >> 1];
      ctx.lineWidth = i & 1 ? 1.6 : 0.9;
      ctx.beginPath();
      for (const p of group) {
        const sp = Math.hypot(p.vx, p.vy) || 1;
        const len = clamp(sp * 0.02, 1.2, maxLen); // délka čárky podle rychlosti
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.vx / sp) * len, p.y - (p.vy / sp) * len);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  drawStatic() {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = 'lighter';
    this.drawGlow(0.55, 1);
    ctx.globalCompositeOperation = 'source-over';
  }
}
