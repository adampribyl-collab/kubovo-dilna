# KUBOVO DÍLNA – one page web

Web pro klempířství a zámečnictví. Vite + čisté HTML, CSS a vanilla JavaScript, bez frameworku.
Výsledkem buildu je statická složka `dist/`, kterou jde nahrát na jakýkoli běžný hosting.

Všechny texty, služby a reference se upravují v **redakci na adrese `/admin/`** (Sveltia CMS).
Redakce ukládá změny do tohoto GitHub repozitáře a GitHub Actions pak web samy sestaví a nahrají na hosting.

```
redakce /admin/ ──uloží──▶ GitHub (src/content/*.json, photos/) ──▶ GitHub Actions: build ──▶ GitHub Pages (+ volitelně FTP)
```

- Web: https://adampribyl-collab.github.io/kubovo-dilna/
- Redakce: https://adampribyl-collab.github.io/kubovo-dilna/admin/

## Spuštění

Potřebujete Node.js 20 nebo novější.

```bash
npm install        # jednou na začátku
npm run dev        # vývojový server → http://localhost:5173, redakce na http://localhost:5173/admin/
```

Vite vypíše i adresu `Network: http://192.168.x.x:5173`. Na ní web otevřete z mobilu ve stejné Wi-Fi síti.

```bash
npm run build      # obrázky + produkční build do složky dist/
npm run preview    # náhled hotového buildu → http://localhost:4173
```

## Redakce (úprava obsahu)

Na webu otevřete `/admin/` (teď https://adampribyl-collab.github.io/kubovo-dilna/admin/). V redakci jsou dvě části:

- **Texty webu** – Firma a kontakty, Menu a tlačítka, Úvodní obrazovka, Služby, Citát u svářeče, Postup,
  Kontakt a formulář, Patička, Google a sdílení.
- **Reference** – zakázky v galerii včetně fotek (přidat, smazat, přeřadit).

Po uložení se web za 1–3 minuty sám aktualizuje. Průběh je vidět v repozitáři na záložce **Actions**.
Fotky se při nahrání samy zmenší a převedou na WebP, při sestavení se z nich vyrobí verze pro mobil i desktop.

### Přihlášení přístupovým tokenem

Redakce se přihlašuje GitHub tokenem (bez dalšího serveru):

1. Uživatel potřebuje GitHub účet s přístupem k repozitáři `adampribyl-collab/kubovo-dilna`
   (vlastník, nebo pozvaný spolupracovník: repozitář → Settings → Collaborators).
2. Vytvoření tokenu na GitHubu: Settings → Developer settings → Personal access tokens:
   - **vlastník repozitáře**: *Fine-grained token* → Repository access: jen `kubovo-dilna` →
     Permissions: **Contents: Read and write**,
   - **spolupracovník**: *Tokens (classic)* se scope **repo** (fine-grained token na cizí osobní repozitář vystavit nejde).
3. V redakci zvolte **Přihlásit se pomocí přístupového tokenu** a token vložte. Prohlížeč si ho pamatuje.

Token má platnost, kterou si při vytvoření zvolíte. Po jejím vypršení stačí vytvořit nový.

### Lokální úpravy bez GitHubu

Při `npm run dev` otevřete v Chrome nebo Edge `http://localhost:5173/admin/` a zvolte **Pracovat s lokálním
repozitářem** (vyberte složku projektu). Změny se zapisují přímo do souborů a stránka se sama obnoví.
Pak je stačí commitnout a pushnout.

## Automatické nasazení (GitHub Actions)

Workflow `.github/workflows/deploy.yml` se spustí po každé změně ve větvi `main`. Web sestaví a:

- nasadí ho na **GitHub Pages** (https://adampribyl-collab.github.io/kubovo-dilna/),
- pokud jsou nastavené FTP údaje, nahraje ho i na vlastní hosting.

**Vlastní doména:** po koupi domény ji nastavte v repozitáři v Settings → Pages → Custom domain (a u registrátora
DNS podle návodu GitHubu), nebo web přesuňte na hosting přes FTP. V redakci pak změňte
**Firma a kontakty → Adresa webu**, aby odkazy pro Google a sdílení vedly na novou adresu.

FTP údaje vložte v repozitáři do Settings → Secrets and variables → Actions → **New repository secret**:

| Secret | Hodnota |
| --- | --- |
| `FTP_SERVER` | adresa FTP serveru, např. `ftp.vashosting.cz` |
| `FTP_USERNAME` | FTP uživatel |
| `FTP_PASSWORD` | FTP heslo |
| `FTP_DIR` | (volitelně) složka webu na serveru končící lomítkem, např. `/www/`; bez něj kořen FTP |

Ruční nasazení bez GitHubu: `npm run build` a celý **obsah** složky `dist/` nahrajte přes FTP do kořene webu.

## Fotky

Fotky služeb a referencí nahrávejte v redakci. Úvodní fotky se mění ručně ve složce **`photos/`**:

| Soubor | Co na fotce | Poměr |
| --- | --- | --- |
| `hero-grinder` | řemeslník s úhlovou bruskou, volný prostor uprostřed pro nápis | 16:9 |
| `welder-mask` | svářeč v kukle u svaru, tmavé pozadí | 21:9 |

`npm run images` (spouští se i v `npm run build`) fotky ořízne na střed na daný poměr stran a uloží do `public/img/`
jako WebP a JPG v několika šířkách. Nezměněné fotky přeskočí (`scripts/.images-manifest.json`).
Pro služby a reference bez fotky vyrobí šrafovanou zástupnou plochu s popiskem.
`npm run images:placeholders` zástupné plochy přegeneruje.

### Doladění animací podle fotek

- **Jiskry v hero:** v `index.html` u `<canvas data-sparks>` nastavte `data-spark-x` a `data-spark-y` na místo,
  kde se kotouč dotýká kovu (v % šířky a výšky fotky). `data-spark-angle` určuje směr výtrysku
  (0 = doprava, 90 = dolů, 180 = doleva) a `data-spark-spread` šířku kužele.
- **Svářečka:** u `<canvas data-weld>` nastavte `data-x` a `data-y` na bod svaru, `data-wind` unášení kouře.
- **Výřez fotky:** na mobilu se fotka posouvá podle CSS proměnné `--hero-focus`, resp. `--weld-focus`
  (`src/styles/hero.css`, `src/styles/sections.css`). Pozice jisker se přepočítá automaticky.

## Poptávkový formulář

Poptávky se posílají e-mailem přes [Formspree](https://formspree.io) (zdarma 50 poptávek měsíčně):

1. Na formspree.io si založte účet. Poptávky chodí na e-mail účtu (další adresy lze přidat v Settings → Linked emails).
2. Vytvořte nový formulář (**+ New Form**) a zkopírujte jeho adresu `https://formspree.io/f/…`.
3. V redakci ji vložte do **Firma a kontakty → Formulář pro poptávky (Formspree)** a uložte.
4. E-mail účtu musí být ověřený (Formspree pošle potvrzovací odkaz), jinak poptávky nedorazí.

E-mail obsahuje pole Jméno, Telefon, Co potřebuje a Zpráva. Bez nastaveného formuláře se při vývoji odeslání
jen simuluje, na webu se zobrazí výzva zavolat. Jak formulář přepojit na jinou službu nebo vlastní skript,
popisuje komentář v `src/js/form.js`.

## Co je potřeba doplnit (v redakci)

- Firma a kontakty: jméno, telefon, e-mail, IČO, adresa, působnost, otevírací doba, adresa webu, formulář Formspree
- Úvodní obrazovka: rok založení (`Est. 20XX`), roky praxe a počet zakázek (`XX`, `XXX`)
- Reference: skutečné zakázky s fotkami (teď jsou tam smyšlené ukázky s `[Obec]`)
- `public/og-image.jpg` – náhled při sdílení odkazu (1200 × 630 px), pokud chcete vlastní

## Struktura

```
index.html                   šablona stránky (Handlebars), texty doplňuje scripts/content-plugin.mjs
src/content/*.json           obsah webu – upravuje redakce
src/main.js                  vstupní bod
src/styles/                  styly (tokeny a základ, hlavička, hero, sekce, galerie, kontakt)
src/js/                      navigace, galerie, lightbox, formulář, canvas animace
public/admin/                redakce (Sveltia CMS) – index.html + config.yml
scripts/content-plugin.mjs   vkládá obsah do HTML, generuje robots.txt a sitemap.xml
scripts/build-images.mjs     generátor obrázků
photos/                      zdrojové fotky (nenahrávat na hosting)
public/                      soubory kopírované do buildu beze změny (obrázky, ikony)
.github/workflows/deploy.yml sestavení a nasazení po každé změně
```
