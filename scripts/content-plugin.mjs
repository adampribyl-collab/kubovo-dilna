/**
 * Vite plugin: vloží texty ze src/content/*.json do index.html (šablona Handlebars).
 * Obsah upravuje redakce (/admin/), výsledné HTML je statické – rychlé a čitelné pro Google.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import { imageName, serviceFallback } from '../src/js/image-name.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONTENT_DIR = path.join(ROOT, 'src', 'content');

export function loadContent() {
  const data = {};
  for (const file of readdirSync(CONTENT_DIR)) {
    if (!file.endsWith('.json')) continue;
    try {
      data[path.basename(file, '.json')] = JSON.parse(readFileSync(path.join(CONTENT_DIR, file), 'utf8'));
    } catch (err) {
      throw new Error(`Obsah src/content/${file} není platný JSON: ${err.message}`);
    }
  }
  return data;
}

const hbs = Handlebars.create();
const esc = hbs.escapeExpression;
const safe = (html) => new hbs.SafeString(html);
const pad = (i) => String(i + 1).padStart(2, '0');
const tel = (phone) => String(phone || '').replace(/[^\d+]/g, '');

/** <picture> s WebP a JPG fallbackem – stejné názvy jako vyrábí scripts/build-images.mjs */
function picture(name, { widths, sizes, alt, width, height }) {
  const set = (ext) => widths.map((w) => `/img/${name}-${w}.${ext} ${w}w`).join(', ');
  return `<picture>
                  <source type="image/webp" srcset="${set('webp')}" sizes="${sizes}" />
                  <img src="/img/${name}-${widths[1]}.jpg" srcset="${set('jpg')}" sizes="${sizes}" width="${width}" height="${height}" alt="${esc(alt)}" loading="lazy" decoding="async" />
                </picture>`;
}

const NUT_SVG = `<svg class="nut" viewBox="0 0 87 100" focusable="false"><path fill-rule="evenodd" d="M43.5 0 87 25v50l-43.5 25L0 75V25zm0 30a20 20 0 1 0 0 40 20 20 0 1 0 0-40z" /><circle cx="43.5" cy="50" r="37" fill="none" stroke="#121212" stroke-opacity=".16" stroke-width="2.5" /></svg>`;

/** Velký nápis v hero: písmena zvlášť (kvůli animaci), první „O“ nahradí matice. */
function heroTitle(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  let index = 0;
  let nutUsed = false;
  const html = words
    .map((word) => {
      const chars = [...word]
        .map((ch) => {
          const isNut = !nutUsed && ch.toUpperCase() === 'O';
          if (isNut) nutUsed = true;
          return `<span class="char${isNut ? ' char--nut' : ''}" style="--i: ${index++}"><span class="char__in">${isNut ? NUT_SVG : esc(ch)}</span></span>`;
        })
        .join('');
      return `<span class="hero-title__word">${chars}</span>`;
    })
    .join('\n              ');
  return {
    html,
    length: [...words.join(' ')].length,
    longestWord: Math.max(1, ...words.map((w) => [...w].length)),
  };
}

/** Položky pásu služeb zopakované tak, aby jedna skupina vyplnila i široký monitor. */
function marqueeItems(list) {
  const items = (list || []).filter(Boolean);
  if (!items.length) return [];
  const out = [];
  let chars = 0;
  while (chars < 90) {
    for (const item of items) {
      out.push(item);
      chars += item.length + 3;
    }
  }
  return out;
}

function normalizeUrl(url) {
  let u = String(url || '').trim().replace(/\/+$/, '');
  if (u && !/^https?:\/\//.test(u)) u = `https://${u}`;
  return u;
}

/** Strukturovaná data LocalBusiness pro Google (JSON-LD). */
function jsonLd(c, webUrl) {
  const f = c.firma;
  const hours = f.oteviraciDoba;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${webUrl}/#firma`,
    name: f.nazev,
    description: c.seo.popisFirmy,
    url: `${webUrl}/`,
    image: `${webUrl}/og-image.jpg`,
    logo: `${webUrl}/apple-touch-icon.png`,
    telephone: tel(f.telefon),
    email: f.email,
    founder: { '@type': 'Person', name: f.jmeno },
    identifier: { '@type': 'PropertyValue', propertyID: 'IČO', value: f.ico },
    address: {
      '@type': 'PostalAddress',
      streetAddress: f.adresa?.ulice,
      addressLocality: f.adresa?.mesto,
      postalCode: f.adresa?.psc,
      addressCountry: 'CZ',
    },
    areaServed: f.pusobnost,
    openingHoursSpecification: hours?.dny?.length
      ? [{ '@type': 'OpeningHoursSpecification', dayOfWeek: hours.dny, opens: hours.od, closes: hours.do }]
      : undefined,
    knowsAbout: c.sluzby.pas,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: c.navigace.menu.sluzby,
      itemListElement: c.sluzby.karty.map((k) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: k.nazev } })),
    },
  };
  // „<“ escapované, aby text z redakce nemohl ukončit <script>
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
}

function buildContext(c) {
  const webUrl = normalizeUrl(c.firma.web);
  const title = heroTitle(c.firma.nazev);
  return {
    ...c,
    rok: new Date().getFullYear(),
    webUrl,
    telHref: tel(c.firma.telefon),
    heroTitleHtml: safe(title.html),
    heroLength: title.length,
    heroLongestWord: title.longestWord,
    marquee: marqueeItems(c.sluzby.pas),
    marqueeText: (c.sluzby.pas || []).join(', '),
    sluzbyKarty: c.sluzby.karty.map((karta, i) => ({
      ...karta,
      cislo: pad(i),
      obrazek: safe(
        picture(imageName(karta.foto, serviceFallback(i)), {
          widths: [480, 800, 1200],
          sizes: '(min-width: 768px) 50vw, 100vw',
          alt: karta.popisFoto || karta.nazev,
          width: 1200,
          height: 900,
        }),
      ),
    })),
    kroky: c.postup.kroky.map((krok, i) => ({ ...krok, cislo: pad(i) })),
    jsonLd: safe(jsonLd(c, webUrl)),
  };
}

/** /admin/ → redakce (jinak by Vite vrátil hlavní stránku); na běžném hostingu to platí samo. */
function adminIndex(req, res, next) {
  if (/^\/admin\/?(\?.*)?$/.test(req.url)) req.url = '/admin/index.html';
  next();
}

export function contentPlugin() {
  return {
    name: 'kubovo-content',
    transformIndexHtml: {
      // před Vite, aby se cesty /img/… v generovaném HTML zpracovaly stejně jako ručně psané
      order: 'pre',
      handler(html) {
        return hbs.compile(html)(buildContext(loadContent()));
      },
    },
    configureServer(server) {
      // změna textu v src/content → obnovit stránku v prohlížeči
      server.watcher.on('change', (file) => {
        if (file.startsWith(CONTENT_DIR)) server.ws.send({ type: 'full-reload' });
      });
      server.middlewares.use(adminIndex);
    },
    configurePreviewServer(server) {
      server.middlewares.use(adminIndex);
    },
    // robots.txt a sitemap.xml s adresou webu z redakce (Firma a kontakty → Adresa webu)
    generateBundle() {
      const webUrl = normalizeUrl(loadContent().firma.web);
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${webUrl}/sitemap.xml\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${webUrl}/</loc>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n  </url>\n</urlset>\n`,
      });
    },
  };
}
