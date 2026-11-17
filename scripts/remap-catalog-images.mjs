/**
 * Remap already-extracted Poppler images onto products with better hero selection.
 * Skips soft-masks; prefers product photos over clinical strips.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public', 'img', 'catalog');
const RAW = path.join(OUT, '_raw');
const PRODUCTS_PATH = path.join(ROOT, 'src', 'data', 'products.json');
const MAP_PATH = path.join(ROOT, 'docs', 'catalog-image-map.json');
const LIST_PATH = path.join(OUT, 'pdfimages-list.txt');

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseList(text) {
  const lines = text.split(/\r?\n/).slice(2).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    // page num type width height color comp bpc enc ...
    const m = line.match(
      /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\d+)\s+(\d+)\s+(\S+)/
    );
    if (!m) continue;
    rows.push({
      page: Number(m[1]),
      num: Number(m[2]),
      type: m[3],
      width: Number(m[4]),
      height: Number(m[5]),
      color: m[6],
      enc: m[9],
      area: Number(m[4]) * Number(m[5]),
      ratio: Number(m[4]) / Math.max(Number(m[5]), 1),
    });
  }
  return rows;
}

function scoreAsHero(row, size) {
  if (row.type === 'smask') return -1;
  if (row.width < 120 || row.height < 120) return -1;
  if (row.color === 'gray' && row.type !== 'image') return -1;
  let score = Math.sqrt(row.area) + size / 5000;
  // Product photos are usually ~0.7–1.6
  if (row.ratio >= 0.55 && row.ratio <= 1.85) score *= 3.2;
  else if (row.ratio > 2.8) score *= 0.15; // clinical strips
  else if (row.ratio < 0.4) score *= 0.35; // tall thin
  // Prefer color photos
  if (row.color === 'icc' || row.color === 'rgb' || row.color === 'cmyk') score *= 1.25;
  if (row.color === 'gray') score *= 0.55;
  return score;
}

function scoreAsGallery(row, size) {
  if (row.type === 'smask') return -1;
  if (row.width < 80 || row.height < 80) return -1;
  return Math.sqrt(row.area) + size / 8000;
}

function distinctiveTokens(name) {
  const raw = String(name);
  const tokens = [];
  for (const m of raw.matchAll(/«([^»]+)»/g)) tokens.push(m[1]);
  // Avoid \\b — it breaks on Cyrillic in JS
  const re =
    /(Aquilion(?:\s+[A-Za-z0-9+/ -]+)?|NeuViz(?:\s+[A-Za-z0-9+/ -]+)?|ScintCare(?:\s+[A-Za-z0-9+/ -]+)?|QuantumEye(?:\s*\d+)?|Vantage(?:\s+\w+)?|Alphenix|Aplio(?:\s+[A-Za-z0-9+/ -]+)?|X-CUBE(?:\s*\d+)?|E-CUBE(?:\s*[A-Za-z0-9]+)?|ELUXEO(?:\s*\d+)?|AMULET(?:\s+\w+)?|HS\d+(?:-RUS)?|HM\d+(?:\s*EVO)?|W\d+(?:-RUS)?|Z\d+(?:-RUS)?|RS\d+(?:-RUS)?|V\d+|СиКоРД[-\w]*|МобиРен[-\w]*|Маммо[-\w]*|УнивеРС[-\w]*|УниКоРД[-\w]*|ТелеКоРД[-\w]*|Малахит|Полидиагност|Дуограф|Флюоро|Опервиз|ЭФА-М|CAD EYE|Innovality|PRISM|Exceed(?:\s+LB)?|Prime(?:\s+SP)?|Serve|Orian|Elan)/gi;
  for (const m of raw.matchAll(re)) tokens.push(m[0]);
  for (const m of raw.matchAll(/X\d\+?/gi)) tokens.push(m[0]);
  return [...new Set(tokens.map((t) => t.trim()).filter((t) => t.length >= 2))];
}

function matchProductsOnPage(products, text) {
  const nt = normalize(text);
  const hits = [];
  for (const p of products) {
    const name = normalize(p.name);
    if (!name) continue;
    if (nt.includes(name)) {
      hits.push({ product: p, score: name.length + 100 });
      continue;
    }
    const short = name
      .replace(/^(canon|samsung|fujifilm|neusoft|minfound|alpinion|cingol|concemed)\s+/, '')
      .replace(/^(мтл|вко медпром|эфа медика)\s+/, '');
    if (short.length > 10 && nt.includes(short)) {
      hits.push({ product: p, score: short.length + 70 });
      continue;
    }
    const tokens = distinctiveTokens(p.name);
    let tokenHits = 0;
    let tokenScore = 0;
    for (const tok of tokens) {
      const ntok = normalize(tok);
      if (ntok.length >= 2 && nt.includes(ntok)) {
        tokenHits += 1;
        tokenScore += ntok.length + 25;
      }
    }
    if (tokenHits > 0) {
      hits.push({ product: p, score: tokenScore + tokenHits * 15 });
      continue;
    }
    const model = short.match(/([a-z0-9][a-z0-9+./-]{2,})$/i)?.[1];
    if (model && model.length >= 3 && nt.includes(normalize(model))) {
      hits.push({ product: p, score: 40 + model.length });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  const seen = new Set();
  return hits.filter((h) => {
    if (seen.has(h.product.slug)) return false;
    seen.add(h.product.slug);
    return true;
  });
}

function extractSpecs(text) {
  const specs = [];
  for (const re of [
    /Количество срезов[^\n]{0,60}/gi,
    /Апертура[^\n]{0,60}/gi,
    /Широкий детектор[^\n]{0,60}/gi,
    /Интервал между снимками[^\n]{0,60}/gi,
  ]) {
    for (const m of text.match(re) || []) {
      const v = m.replace(/\s+/g, ' ').replace(/[•●].*$/, '').trim();
      if (v && !specs.includes(v)) specs.push(v);
    }
  }
  return specs.slice(0, 8);
}

function extractBullets(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[•●▪◦–—\-\s]+/, '').trim())
    .filter((l) => l.length > 28 && l.length < 220);
  const uniq = [];
  for (const l of lines) {
    if (/^(стр|каталог|зелмед|ооо|тел|www|http|ру рзн|оглавление)/i.test(l)) continue;
    if (!uniq.some((u) => normalize(u) === normalize(l))) uniq.push(l);
  }
  return uniq.slice(0, 10);
}

function extractTagline(text) {
  const known = text.match(
    /(Новейшие алгоритмы реконструкции|Сочетание функциональности и надёжности|Мобильное превосходство|Визуализация премиум-класса|Скрининговая маммография|Будущее ультразвуковой диагностики|Новая ступень эволюции ультразвука|Инновации во имя жизни|Расширенные возможности 2D- и 3D-сканирования)[^.!\n]{0,40}/i
  );
  return known ? known[0].trim() : '';
}

const list = parseList(fs.readFileSync(LIST_PATH, 'utf8'));
const rawFiles = fs.readdirSync(RAW).filter((f) => /\.png$/i.test(f)).sort();
if (rawFiles.length !== list.length) {
  console.warn(`raw files ${rawFiles.length} vs list ${list.length}`);
}

const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
const mapPrev = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
const pageTexts = Object.fromEntries(mapPrev.map((p) => [p.page, p.textPreview || '']));

// Prefer full text if available via previous extract — rebuild from pdftotext if needed later
// For now also read full texts from map is only preview; load from a cache file if present
const TEXT_CACHE = path.join(OUT, 'page-texts.json');
let fullTexts = {};
if (fs.existsSync(TEXT_CACHE)) {
  fullTexts = JSON.parse(fs.readFileSync(TEXT_CACHE, 'utf8'));
} else {
  // keep preview
  fullTexts = pageTexts;
}

const byPage = {};
for (let i = 0; i < Math.min(list.length, rawFiles.length); i++) {
  const row = list[i];
  const src = path.join(RAW, rawFiles[i]);
  const size = fs.statSync(src).size;
  const heroScore = scoreAsHero(row, size);
  const galScore = scoreAsGallery(row, size);
  if (galScore < 0) continue;

  const destName = `p${String(row.page).padStart(2, '0')}_${String(row.num).padStart(3, '0')}_${row.width}x${row.height}.png`;
  const dest = path.join(OUT, destName);
  if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);

  (byPage[row.page] ||= []).push({
    path: `img/catalog/${destName}`,
    ...row,
    size,
    heroScore,
    galScore,
  });
}

const bySlug = Object.fromEntries(
  products.map((p) => [
    p.slug,
    {
      ...p,
      image: null,
      gallery: [],
      clinical: [],
      specs: [],
      bullets: [],
      tagline: '',
    },
  ])
);

const map = [];

for (const page of Object.keys(byPage).map(Number).sort((a, b) => a - b)) {
  const text = fullTexts[page] || pageTexts[page] || '';
  const hits = matchProductsOnPage(products, text);
  const imgs = byPage[page].slice();
  const heroes = imgs.filter((im) => im.heroScore > 0).sort((a, b) => b.heroScore - a.heroScore);
  const clinical = imgs
    .filter((im) => im.ratio > 2.5 || (im.color === 'gray' && im.ratio > 1.5))
    .sort((a, b) => b.galScore - a.galScore);
  const galleryPool = imgs.filter((im) => im.galScore > 0).sort((a, b) => b.galScore - a.galScore);

  map.push({
    page,
    products: hits.map((h) => h.product.slug),
    heroes: heroes.slice(0, 5).map((h) => h.path),
    clinical: clinical.slice(0, 6).map((h) => h.path),
  });

  if (!hits.length) continue;

  // Distribute product photos across matched products on the page
  const photoCandidates = heroes.length ? heroes : galleryPool;
  hits.forEach((hit, idx) => {
    const cur = bySlug[hit.product.slug];
    const photo = photoCandidates[Math.min(idx, photoCandidates.length - 1)];
    if (photo && !cur.image) cur.image = photo.path;

    const extras = galleryPool.map((g) => g.path).filter((p) => p !== cur.image);
    cur.gallery = [...new Set([...(cur.gallery || []), ...extras])].slice(0, 12);
    cur.clinical = [...new Set([...(cur.clinical || []), ...clinical.map((c) => c.path)])].slice(0, 8);

    const specs = extractSpecs(text);
    const bullets = extractBullets(text);
    const tagline = extractTagline(text);
    if (specs.length) cur.specs = [...new Set([...(cur.specs || []), ...specs])].slice(0, 8);
    if (bullets.length) cur.bullets = [...new Set([...(cur.bullets || []), ...bullets])].slice(0, 10);
    if (tagline) cur.tagline = cur.tagline || tagline;
    if (!cur.description || /Цена и комплектация|Поставка оборудования/.test(cur.description)) {
      cur.description = bullets.find((b) => b.length > 40) || tagline || cur.description;
    }
  });
}

// Manual aliases for known multi-product / hard pages from catalog structure
const aliases = {
  // Samsung ultrasound spreads often share pages — borrow siblings' visuals if missing
  'samsung-hs50-rus': ['samsung-hs40-rus', 'samsung-v-seriya-v6-v7-v8'],
  'samsung-hm70-evo': ['samsung-hs40-rus', 'samsung-v-seriya-v6-v7-v8'],
  'samsung-hs30-rus': ['samsung-hs40-rus'],
  'samsung-w9-rus': ['samsung-v-seriya-v6-v7-v8'],
  'samsung-w10-rus': ['samsung-v-seriya-v6-v7-v8'],
  'samsung-z20-rus': ['samsung-v-seriya-v6-v7-v8'],
  'samsung-rs85-rus': ['samsung-v-seriya-v6-v7-v8'],
  'canon-aquilion-serve': ['canon-aquilion-prime-sp', 'canon-aquilion-exceed-lb'],
  'canon-vantage-elan': ['canon-vantage-orian'],
  'canon-aplio-go': ['canon-aplio-flex'],
  'canon-aplio-flex-aplio-go': ['canon-aplio-flex'],
  'canon-aplio-a-series': ['canon-aplio-i-series-prism-edition', 'canon-aplio-flex'],
  'alpinion-seriya-e-cube-8': ['alpinion-seriya-e-cube-15', 'alpinion-x-cube-90'],
  'alpinion-seriya-e-cube-i7': ['alpinion-seriya-e-cube-15'],
  'fujifilm-eluxeo-6000': ['fujifilm-eluxeo-7000'],
  'fujifilm-cad-eye': ['fujifilm-eluxeo-7000'],
  'fujifilm-endoskopy-seriya-700-600-500': ['fujifilm-eluxeo-7000'],
  'concemed-videoendoskopicheskaya-sistema-v-800': ['concemed-videoendoskopicheskaya-sistema-v-1000'],
  'cingol-stomatologicheskaya-ustanovka-serii-x5-plus': ['cingol-stomatologicheskaya-ustanovka-serii-x5'],
  'neusoft-neuviz-16-classic': ['neusoft-neuviz-ace-ace-sp', 'neusoft-neuviz-128'],
  'minfound-scintcare-ct-16': ['minfound-scintcare-ct-128'],
  'mtl-palatnyy-apparat-dlya-ekstrennyh-i-planovyh-issledovaniy-mobiren-4mt': [
    'mtl-palatnyy-apparat-dlya-ekstrennyh-i-planovyh-issledovaniy-mobiren-5mt',
  ],
  'mtl-tsifrovoy-mammograf-mammo-6mt': ['mtl-tsifrovoy-mammograf-mammo-5mt-s-tomosintezom'],
  'efa-medika-efa-m': ['fujifilm-eluxeo-7000'],
};

for (const [slug, donors] of Object.entries(aliases)) {
  const cur = bySlug[slug];
  if (!cur || cur.image) continue;
  for (const d of donors) {
    const donor = bySlug[d];
    if (donor?.image) {
      cur.image = donor.image;
      cur.gallery = [...new Set([...(cur.gallery || []), ...(donor.gallery || [])])].slice(0, 12);
      cur.clinical = [...new Set([...(cur.clinical || []), ...(donor.clinical || [])])].slice(0, 8);
      if (!cur.tagline && donor.tagline) cur.tagline = donor.tagline;
      break;
    }
  }
}

// Existing featured product photos as high-priority heroes when available
const featuredOverrides = {
  'canon-aquilion-one-prism-edition': 'img/products/canon-orian.jpg', // may not match — skip if wrong
};
// Use existing public/img/products where slug matches naming
const productImgDir = path.join(ROOT, 'public', 'img', 'products');
if (fs.existsSync(productImgDir)) {
  const files = fs.readdirSync(productImgDir);
  const guess = {
    'canon-vantage-orian': 'canon-orian.jpg',
    'canon-alphenix': 'canon-alphenix.jpg',
    'samsung-z20-rus': 'samsung-z20.jpg',
    'samsung-rs85-rus': 'samsung-rs85.jpg',
    'fujifilm-tsifrovoy-mammograf-amulet-innovality': 'fujifilm-amulet.jpg',
    'minfound-quantumeiye-789': 'minfound-quantumeye.jpg',
    'minfound-quantumeiye-789': 'minfound-quantumeye.jpg',
    'minfound-quantumeiye': 'minfound-quantumeye.jpg',
    'mtl-rentgenokhirurgicheskaya-tsifrovaya-mobilnaya-sistema-s-duga-sikord-2mt': 'mtl-sikord.jpg',
  };
  // fix quantumeye key
  guess['minfound-quantumeiye-789'] = undefined;
  guess['minfound-quantumeye-789'] = 'minfound-quantumeye.jpg';

  for (const [slug, file] of Object.entries(guess)) {
    if (!file) continue;
    if (!files.includes(file)) continue;
    const cur = bySlug[slug];
    if (!cur) continue;
    // Prefer dedicated product photo as hero; keep catalog extracts in gallery
    const rel = `img/products/${file}`;
    if (cur.image && cur.image !== rel) {
      cur.gallery = [...new Set([cur.image, ...(cur.gallery || [])])].slice(0, 12);
    }
    cur.image = rel;
  }
}

// Attach user-provided reference page screenshots into gallery
const assetDir = path.join(
  process.env.USERPROFILE || '',
  '.cursor',
  'projects',
  'c-Users-User-Projects-zelmedservice-ru',
  'assets'
);
const refs = [
  ['canon-aquilion-one-prism-edition', 'image-d4711d71-01cd-4080-98a9-48d584c63a68.png'],
  ['fujifilm-tsifrovoy-mammograf-amulet-innovality', 'image-45f6d90a-79b4-4f70-b7c0-70bc88e2a264.png'],
  ['samsung-hs50-rus', 'image-0f2fa157-f5c7-4da6-a891-14a053f51418.png'],
  ['samsung-hm70-evo', 'image-0f2fa157-f5c7-4da6-a891-14a053f51418.png'],
  ['samsung-v-seriya-v6-v7-v8', 'image-0f2fa157-f5c7-4da6-a891-14a053f51418.png'],
];
for (const [slug, file] of refs) {
  const src = path.join(assetDir, file);
  if (!fs.existsSync(src) || !bySlug[slug]) continue;
  const destName = `ref-${slug}.png`;
  const dest = path.join(OUT, destName);
  fs.copyFileSync(src, dest);
  bySlug[slug].gallery = [...new Set([`img/catalog/${destName}`, ...(bySlug[slug].gallery || [])])].slice(0, 14);
}

const enriched = products.map((p) => {
  const e = bySlug[p.slug];
  return {
    ...p,
    ...e,
    image: e.image || null,
    gallery: e.gallery || [],
    clinical: e.clinical || [],
    specs: e.specs || [],
    bullets: e.bullets || [],
    tagline: e.tagline || '',
  };
});

fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(enriched, null, 2));
fs.writeFileSync(path.join(ROOT, 'docs', 'catalog-image-remap.json'), JSON.stringify(map, null, 2));

const withImg = enriched.filter((p) => p.image).length;
console.log(`Products with images: ${withImg}/${enriched.length}`);
enriched.filter((p) => !p.image).forEach((p) => console.log(' missing', p.slug));
