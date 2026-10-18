/**
 * Generátor obrázků pro web.
 *
 *   npm run images               – zpracuje fotky z /photos, chybějícím obrázkům vyrobí zástupné plochy
 *   npm run images:placeholders  – přegeneruje zástupné plochy u všech obrázků, které nemají fotku
 *
 * Fotky vkládejte do složky /photos pod názvem podle tabulky níže, např. photos/hero-grinder.jpg
 * (jpg, jpeg, png, webp, tif, avif). Skript je ořízne na střed na správný poměr stran a uloží
 * do public/img/ jako <název>-<šířka>.webp a <název>-<šířka>.jpg.
 */
import { readdir, mkdir, access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'photos');
const OUT_DIR = path.join(ROOT, 'public', 'img');
const FORCE_PLACEHOLDERS = process.argv.includes('--placeholders');

const SIZES = {
  hero: { ratio: [16, 9], widths: [800, 1400, 2000] },
  wide: { ratio: [21, 9], widths: [800, 1400, 2100] },
  service: { ratio: [4, 3], widths: [480, 800, 1200] },
  ref: { ratio: [4, 3], widths: [480, 800, 1400] },
};

// Reference se berou ze src/data/references.json – nová položka tam = nový obrázek tady.
const { items: references } = JSON.parse(await readFile(path.join(ROOT, 'src/data/references.json'), 'utf8'));

const IMAGES = [
  { name: 'hero-grinder', size: 'hero', label: 'Řemeslník s úhlovou bruskou, proud jisker', glow: [0.68, 0.62], labelPos: 'top-left' },
  { name: 'welder-mask', size: 'wide', label: 'Svářeč v kukle, oblouk a stoupající kouř', glow: [0.62, 0.58], labelPos: 'top-right' },
  { name: 'service-ploty', size: 'service', label: 'Ploty a brány' },
  { name: 'service-plech', size: 'service', label: 'Plechové konstrukce' },
  { name: 'service-opravy', size: 'service', label: 'Opravy kovových konstrukcí' },
  { name: 'service-povrch', size: 'service', label: 'Povrchová ochrana' },
  ...references.map((ref) => ({ name: ref.image, size: 'ref', label: ref.title })),
];

const exists = (p) => access(p).then(() => true, () => false);

async function findSource(name, files) {
  const hit = files.find((f) => path.parse(f).name.toLowerCase() === name && /\.(jpe?g|png|webp|tiff?|avif)$/i.test(f));
  return hit ? path.join(SRC_DIR, hit) : null;
}

function placeholderSvg({ name, label, glow, labelPos = 'center' }, w, h, [rw, rh]) {
  const u = w / 100; // jednotka podle šířky, ať zástupné plochy vypadají stejně ve všech velikostech
  const step = Math.max(8, Math.round(u * 1.1));
  const fs1 = Math.max(11, u * (labelPos === 'center' ? 3.4 : 1.5));
  const fs2 = fs1 * 0.72;
  const pos = {
    center: { x: w / 2, y: h / 2, anchor: 'middle' },
    'top-left': { x: u * 5, y: h * 0.24, anchor: 'start' },
    'top-right': { x: w - u * 5, y: h * 0.2, anchor: 'end' },
  }[labelPos];
  const glowEl = glow
    ? `<radialGradient id="g" cx="${glow[0]}" cy="${glow[1]}" r="0.45">
         <stop offset="0" stop-color="#FF6B1A" stop-opacity="0.32"/>
         <stop offset="0.35" stop-color="#FF6B1A" stop-opacity="0.08"/>
         <stop offset="1" stop-color="#FF6B1A" stop-opacity="0"/>
       </radialGradient>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <pattern id="hatch" width="${step}" height="${step}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="${step}" height="${step}" fill="#1C1C1C"/>
      <rect width="${Math.max(1, u * 0.14)}" height="${step}" fill="#2B2B2B"/>
    </pattern>
    <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#121212" stop-opacity="0"/>
      <stop offset="1" stop-color="#121212" stop-opacity="0.55"/>
    </linearGradient>
    ${glowEl}
  </defs>
  <rect width="100%" height="100%" fill="url(#hatch)"/>
  ${glow ? '<rect width="100%" height="100%" fill="url(#g)"/>' : ''}
  <rect width="100%" height="100%" fill="url(#v)"/>
  <rect x="${u * 0.6}" y="${u * 0.6}" width="${w - u * 1.2}" height="${h - u * 1.2}" fill="none" stroke="#383838" stroke-width="${Math.max(1, u * 0.1)}"/>
  <g font-family="Menlo, 'DejaVu Sans Mono', monospace" text-anchor="${pos.anchor}">
    <text x="${pos.x}" y="${pos.y}" font-size="${fs1}" fill="#F2EFEA" letter-spacing="${fs1 * 0.06}">${name.toUpperCase()} · ${rw}:${rh}</text>
    <text x="${pos.x}" y="${pos.y + fs1 * 1.5}" font-size="${fs2}" fill="#9E9994">${label}</text>
  </g>
</svg>`;
}

async function writeVariants(pipelineFactory, name, w) {
  await Promise.all([
    pipelineFactory().webp({ quality: 78, effort: 5 }).toFile(path.join(OUT_DIR, `${name}-${w}.webp`)),
    pipelineFactory().jpeg({ quality: 80, mozjpeg: true, progressive: true }).toFile(path.join(OUT_DIR, `${name}-${w}.jpg`)),
  ]);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const files = (await exists(SRC_DIR)) ? await readdir(SRC_DIR) : [];
  const report = { photos: [], placeholders: [], skipped: [], warnings: [] };

  for (const img of IMAGES) {
    const { ratio, widths } = SIZES[img.size];
    const src = await findSource(img.name, files);

    if (src) {
      const { width: srcWidth = 0 } = await sharp(src).metadata();
      const maxWidth = Math.max(...widths);
      if (srcWidth < maxWidth) {
        report.warnings.push(`${img.name}: fotka má ${srcWidth} px, největší varianta ${maxWidth} px se zvětší (ideálně dodat aspoň ${maxWidth} px na šířku)`);
      }
      for (const w of widths) {
        const h = Math.round((w * ratio[1]) / ratio[0]);
        await writeVariants(() => sharp(src).rotate().resize(w, h, { fit: 'cover', position: 'centre' }), img.name, w);
      }
      report.photos.push(img.name);
      continue;
    }

    const already = await exists(path.join(OUT_DIR, `${img.name}-${widths[0]}.webp`));
    if (already && !FORCE_PLACEHOLDERS) {
      report.skipped.push(img.name);
      continue;
    }
    for (const w of widths) {
      const h = Math.round((w * ratio[1]) / ratio[0]);
      const svg = Buffer.from(placeholderSvg(img, w, h, ratio));
      await writeVariants(() => sharp(svg), img.name, w);
    }
    report.placeholders.push(img.name);
  }

  console.log(`Fotky zpracovány (${report.photos.length}): ${report.photos.join(', ') || '–'}`);
  console.log(`Zástupné plochy (${report.placeholders.length}): ${report.placeholders.join(', ') || '–'}`);
  if (report.skipped.length) console.log(`Beze změny (${report.skipped.length}) – zástupné plochy už existují.`);
  report.warnings.forEach((w) => console.warn(`Pozor – ${w}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/* Ikony z public/favicon.svg (32 px a 180 px pro iOS). */
const favicon = path.join(ROOT, 'public', 'favicon.svg');
if (await exists(favicon)) {
  await sharp(favicon, { density: 600 }).resize(32, 32).png().toFile(path.join(ROOT, 'public', 'favicon-32.png'));
  await sharp(favicon, { density: 1200 }).resize(180, 180).png().toFile(path.join(ROOT, 'public', 'apple-touch-icon.png'));
}
