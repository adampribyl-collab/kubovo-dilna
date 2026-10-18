# KUBOVO DÍLNA – one page web

Web pro klempířství a zámečnictví. Vite + čisté HTML, CSS a vanilla JavaScript, bez frameworku.
Výsledkem buildu je statická složka `dist/`, kterou jde nahrát na jakýkoli běžný hosting.

## Spuštění

Potřebujete Node.js 20 nebo novější.

```bash
npm install        # jednou na začátku
npm run dev        # vývojový server → http://localhost:5173
```

Vite vypíše i adresu `Network: http://192.168.x.x:5173`. Na ní web otevřete z mobilu ve stejné Wi-Fi síti.

```bash
npm run build      # produkční build do složky dist/
npm run preview    # náhled hotového buildu → http://localhost:4173
```

## Nahrání na hosting

1. `npm run build`
2. Celý **obsah** složky `dist/` (ne složku samotnou) nahrajte přes FTP do kořene webu.

Cesty v buildu jsou relativní, takže web funguje v kořeni domény i v podsložce.

## Fotky

Originální fotky dejte do složky **`photos/`** pod těmito názvy (přípona jpg, png, webp, tif nebo avif):

| Soubor | Co na fotce | Poměr |
| --- | --- | --- |
| `hero-grinder` | řemeslník s úhlovou bruskou, proud jisker, volný prostor uprostřed pro nápis | 16:9 |
| `welder-mask` | svářeč v kukle, jasný oblouk, stoupající kouř, tmavé pozadí | 21:9 |
| `service-ploty`, `service-plech`, `service-opravy`, `service-povrch` | detaily k jednotlivým službám | 4:3 |
| `ref-01` … `ref-24` | hotové zakázky (podle `src/data/references.json`) | 4:3 |

Potom spusťte:

```bash
npm run images
```

Skript fotky ořízne na střed na daný poměr stran a uloží je do `public/img/` jako WebP a JPG v několika šířkách
(např. `hero-grinder-800.webp`, `hero-grinder-1400.jpg` …). Web si pak sám vybere vhodnou velikost pro mobil nebo desktop.
Pro obrázky, které ještě nemají fotku, skript vyrobí šrafovanou zástupnou plochu s popiskem.
`npm run images:placeholders` zástupné plochy přegeneruje.

Složku `photos/` na hosting nenahrávejte, je jen zdrojová.

### Doladění animací podle skutečných fotek

- **Jiskry v hero:** v `index.html` u `<canvas data-sparks>` nastavte `data-spark-x` a `data-spark-y` na místo,
  kde se kotouč dotýká kovu (v % šířky a výšky fotky). `data-spark-angle` určuje směr výtrysku
  (0 = doprava, 90 = dolů, 180 = doleva) a `data-spark-spread` šířku kužele.
- **Svářečka:** u `<canvas data-weld>` nastavte `data-x` a `data-y` na bod svaru.
- **Výřez fotky:** při ořezu na mobilu se fotka posouvá podle CSS proměnné `--hero-focus`, resp. `--weld-focus`
  (`src/styles/hero.css`, `src/styles/sections.css`). Pozice jisker se přepočítá automaticky.

## Reference

Galerie se generuje ze souboru `src/data/references.json`. Novou referenci přidáte takto:

1. Do `items` přidejte položku (`image`, `title`, `category`, `caption`, `finish`, `location`, `alt`).
2. Fotku dejte do `photos/` pod názvem z `image` (např. `ref-25.jpg`) a spusťte `npm run images`.

Kategorie (filtry) jsou v `categories` v témže souboru. Počty v tlačítkách se přepočítají samy.

## Poptávkový formulář

Formulář se odesílá přes [Formspree](https://formspree.io). Založte si formulář a jeho endpoint vložte
do konstanty `FORMSPREE_ENDPOINT` v `src/js/form.js`. V tomtéž souboru je i komentář, jak formulář přepojit na jinou službu
nebo vlastní skript. Bez nastaveného endpointu se při vývoji odeslání jen simuluje, v produkci se zobrazí chyba s telefonem.

Přílohy (fotky) Formspree přijímá jen v placeném tarifu.

## Co je potřeba doplnit

Zástupné údaje, které je potřeba nahradit skutečnými:

- `EST. 20XX`, `XX let praxe`, `XXX hotových zakázek` (hero v `index.html`)
- `[Město]`, `[Jméno Příjmení]`, IČO, telefon a e-mail (kontakt, patička, JSON-LD v `<head>`)
- `[Obec]` u referencí v `src/data/references.json`
- doménu `kubovodilna.cz` v `index.html` (canonical, Open Graph, JSON-LD), `public/robots.txt` a `public/sitemap.xml`
- adresu a otevírací dobu ve strukturovaných datech (JSON-LD v `index.html`)
- `public/og-image.jpg` (náhled při sdílení na sociálních sítích, 1200 × 630 px), pokud chcete vlastní

## Struktura

```
index.html                 obsah stránky (všechny sekce)
src/main.js                vstupní bod
src/styles/                styly (tokeny a základ, hlavička, hero, sekce, galerie, kontakt)
src/js/                    navigace, galerie, lightbox, formulář, canvas animace
src/data/references.json   data galerie
scripts/build-images.mjs   generátor obrázků
photos/                    zdrojové fotky (nenahrávat na hosting)
public/                    soubory kopírované do buildu beze změny (obrázky, ikony, robots.txt)
```
