/**
 * Extract catalog images with Poppler (pdfimages/pdftoppm/pdftotext) and enrich products.json.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ROOT = process.cwd();
const PDF = path.join(ROOT, 'public', 'catalog-2026.pdf');
const OUT = path.join(ROOT, 'public', 'img', 'catalog');
const RAW = path.join(OUT, '_raw');
const PAGES = path.join(OUT, '_pages');
const PRODUCTS_PATH = path.join(ROOT, 'src', 'data', 'products.json');
const MAP_PATH = path.join(ROOT, 'docs', 'catalog-image-map.json');

function findBin(name) {
  const roots = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Poppler'),
    'C:\\Program Files\\poppler\\Library\\bin',
    'C:\\poppler\\Library\\bin',
  ].filter(Boolean);

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      let entries = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) stack.push(p);
        else if (e.name.toLowerCase() === `${name}.exe`) return p;
      }
    }
  }
  // PATH fallback
  try {
    execFileSync(name, ['-v'], { stdio: 'ignore' });
    return name;
  } catch {
    return null;
  }
}

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchProduct(products, text) {
  const nt = normalize(text);
  let best = null;
  let bestScore = 0;
  for (const p of products) {
    const name = normalize(p.name);
    if (!name) continue;
    if (nt.includes(name)) {
      const score = name.length + 120;
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
      continue;
    }
    // shorten noisy prefixes
    const short = name
      .replace(/^canon /, '')
      .replace(/^samsung /, '')
      .replace(/^fujifilm /, '')
      .replace(/^neusoft /, '')
      .replace(/^minfound /, '')
      .replace(/^alpinion /, '')
      .replace(/^cingol /, '')
      .replace(/^мтл /, '')
      .replace(/^вко медпром /, '');
    if (short.length > 8 && nt.includes(short)) {
      const score = short.length + 80;
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
      continue;
    }
    const tokens = name.split(' ').filter((t) => t.length > 3);
    const hit = tokens.filter((t) => nt.includes(t)).length;
    if (hit >= Math.min(3, tokens.length) && hit / tokens.length >= 0.6) {
      const score = hit * 10;
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
    }
  }
  return best;
}

function extractSpecs(text) {
  const specs = [];
  const patterns = [
    /Количество срезов[^\n]{0,50}/gi,
    /Апертура[^\n]{0,50}/gi,
    /Широкий детектор[^\n]{0,50}/gi,
    /Интервал между снимками[^\n]{0,50}/gi,
    /\d+\s*срезов[^\n]{0,30}/gi,
  ];
  for (const re of patterns) {
    for (const m of text.match(re) || []) {
      const v = m.replace(/\s+/g, ' ').trim();
      if (v && !specs.includes(v)) specs.push(v);
    }
  }
  return specs.slice(0, 8);
}

function extractBullets(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[•●▪◦–—\-\s]+/, '').trim())
    .filter((l) => l.length > 30 && l.length < 240);
  const uniq = [];
  for (const l of lines) {
    if (/^(стр|каталог|зелмед|ооо|тел|www|http|ру рзн)/i.test(l)) continue;
    if (!uniq.some((u) => normalize(u) === normalize(l))) uniq.push(l);
  }
  return uniq.slice(0, 12);
}

function extractTagline(text) {
  const known = text.match(
    /(Новейшие алгоритмы реконструкции|Сочетание функциональности и надёжности|Мобильное превосходство|Визуализация премиум-класса|Скрининговая маммография|Будущее ультразвуковой диагностики|Новая ступень эволюции ультразвука|Инновации во имя жизни)[^.!\n]{0,40}/i
  );
  return known ? known[0].trim() : '';
}

function scoreFile(filePath) {
  const stat = fs.statSync(filePath);
  // Prefer mid/large files; tiny icons are small
  return stat.size;
}

fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(PAGES, { recursive: true });

const pdfimages = findBin('pdfimages');
const pdftoppm = findBin('pdftoppm');
const pdftotext = findBin('pdftotext');
const pdfinfo = findBin('pdfinfo');

if (!pdfimages || !pdftotext) {
  console.error('Poppler tools not found', { pdfimages, pdftoppm, pdftotext });
  process.exit(1);
}

console.log('Using', { pdfimages, pdftoppm, pdftotext });

// Clean previous raw extract
for (const f of fs.readdirSync(RAW)) fs.unlinkSync(path.join(RAW, f));

// List images with page numbers
const listOut = execFileSync(pdfimages, ['-list', PDF], { encoding: 'utf8' });
fs.writeFileSync(path.join(OUT, 'pdfimages-list.txt'), listOut);

// Extract as PNG (poppler converts JPX)
execFileSync(pdfimages, ['-png', PDF, path.join(RAW, 'img')], { stdio: 'inherit' });

// Page text
const pageCount = (() => {
  if (!pdfinfo) return 62;
  const info = execFileSync(pdfinfo, [PDF], { encoding: 'utf8' });
  const m = info.match(/Pages:\s+(\d+)/);
  return m ? Number(m[1]) : 62;
})();

const pageTexts = {};
for (let p = 1; p <= pageCount; p++) {
  const txt = execFileSync(pdftotext, ['-f', String(p), '-l', String(p), '-layout', PDF, '-'], {
    encoding: 'utf8',
  });
  pageTexts[p] = txt;
}

// Optional page previews for pages without good embeds
if (pdftoppm) {
  execFileSync(pdftoppm, ['-png', '-r', '110', PDF, path.join(PAGES, 'page')], { stdio: 'inherit' });
}

// Parse image list: page -> image indexes
// Format example:
// page   num  type   width height color comp bpc  enc interp  object ID x-ppi y-ppi size ratio
const listLines = listOut.split(/\r?\n/).slice(2).filter(Boolean);
const meta = [];
for (const line of listLines) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 5) continue;
  const page = Number(parts[0]);
  const num = Number(parts[1]);
  const width = Number(parts[2]);
  const height = Number(parts[3]);
  if (!Number.isFinite(page)) continue;
  meta.push({ page, num, width, height, area: width * height });
}

// Map extracted files: img-000.png ... (pdfimages uses 3+ digit suffix)
const rawFiles = fs
  .readdirSync(RAW)
  .filter((f) => /\.png$/i.test(f))
  .sort();

console.log(`Extracted ${rawFiles.length} images, ${meta.length} listed`);

// pdfimages numbering is sequential across document matching list order
const imagesByPage = {};
for (let i = 0; i < Math.min(rawFiles.length, meta.length); i++) {
  const m = meta[i];
  const src = path.join(RAW, rawFiles[i]);
  const size = scoreFile(src);
  // filter tiny
  if ((m.width && m.width < 90) || (m.height && m.height < 90) || size < 8000) continue;
  const ratio = m.width / Math.max(m.height, 1);
  if (ratio > 6 || ratio < 0.12) continue;

  const destName = `p${String(m.page).padStart(2, '0')}_${String(i).padStart(3, '0')}_${m.width}x${m.height}.png`;
  const dest = path.join(OUT, destName);
  fs.copyFileSync(src, dest);
  (imagesByPage[m.page] ||= []).push({
    path: `img/catalog/${destName}`,
    width: m.width,
    height: m.height,
    area: m.area,
    size,
    score: m.area * (ratio > 3.5 || ratio < 0.3 ? 0.25 : 1),
  });
}

const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
const bySlug = Object.fromEntries(products.map((p) => [p.slug, { ...p }]));
const map = [];

for (let page = 1; page <= pageCount; page++) {
  const text = pageTexts[page] || '';
  const product = matchProduct(products, text);
  let images = (imagesByPage[page] || []).slice().sort((a, b) => b.score - a.score);

  // If no embeds, use page render as temporary visual
  if (!images.length) {
    const pageFile = `page-${String(page).padStart(2, '0')}.png`;
    const src = path.join(PAGES, `page-${String(page).padStart(2, '0')}.png`);
    // pdftoppm may use page-1.png without pad depending on version — check both
    const candidates = [
      src,
      path.join(PAGES, `page-${page}.png`),
      path.join(PAGES, `page${page}.png`),
    ];
    // also find by regex
    const found = fs.readdirSync(PAGES).find((f) => new RegExp(`page-0*${page}\\.png$`).test(f));
    const hit = candidates.find((c) => fs.existsSync(c)) || (found ? path.join(PAGES, found) : null);
    if (hit) {
      const dest = path.join(OUT, pageFile);
      fs.copyFileSync(hit, dest);
      images = [{ path: `img/catalog/${pageFile}`, width: 900, height: 1200, area: 1e6, score: 5e4, isPage: true }];
    }
  }

  map.push({
    page,
    productSlug: product?.slug || null,
    productName: product?.name || null,
    textPreview: text.replace(/\s+/g, ' ').slice(0, 240),
    images: images.map((im) => ({ path: im.path, width: im.width, height: im.height, isPage: !!im.isPage })),
  });

  console.log(`p${page}: ${product?.name || '—'} · ${images.length} img`);

  if (!product || !images.length) continue;
  const cur = bySlug[product.slug];
  const hero = images.find((im) => !im.isPage) || images[0];
  if (!cur.image || (!hero.isPage && cur._pageHero)) {
    cur.image = hero.path;
    cur._pageHero = !!hero.isPage;
  }
  cur.gallery = [...new Set([...(cur.gallery || []), ...images.map((im) => im.path).filter((p) => p !== cur.image)])].slice(0, 14);
  const specs = extractSpecs(text);
  const bullets = extractBullets(text);
  const tagline = extractTagline(text);
  if (specs.length) cur.specs = [...new Set([...(cur.specs || []), ...specs])].slice(0, 8);
  if (bullets.length) cur.bullets = [...new Set([...(cur.bullets || []), ...bullets])].slice(0, 12);
  if (tagline) cur.tagline = cur.tagline || tagline;
  if (!cur.description || /Цена и комплектация/.test(cur.description)) {
    cur.description = bullets.find((b) => b.length > 40) || tagline || cur.description;
  }
}

// Attach high-quality screenshots provided by user for key products
const assetDir = path.join(process.env.USERPROFILE || '', '.cursor', 'projects', 'c-Users-User-Projects-zelmedservice-ru', 'assets');
const overrides = [
  {
    slug: 'canon-aquilion-one-prism-edition',
    file: 'image-d4711d71-01cd-4080-98a9-48d584c63a68.png',
  },
  {
    slug: 'fujifilm-tsifrovoy-mammograf-amulet-innovality',
    file: 'image-45f6d90a-79b4-4f70-b7c0-70bc88e2a264.png',
  },
];

for (const o of overrides) {
  const src = path.join(assetDir, o.file);
  if (!fs.existsSync(src)) continue;
  // Prefer product-specific crop later; for now keep page screenshot as gallery reference only
  const destName = `ref-${o.slug}.png`;
  const dest = path.join(OUT, destName);
  fs.copyFileSync(src, dest);
  const p = bySlug[o.slug];
  if (p) {
    p.gallery = [...new Set([`img/catalog/${destName}`, ...(p.gallery || [])])].slice(0, 14);
  }
}

const enriched = products.map((p) => {
  const e = bySlug[p.slug];
  delete e._pageHero;
  return {
    ...e,
    image: e.image || null,
    gallery: e.gallery || [],
    specs: e.specs || [],
    bullets: e.bullets || [],
    tagline: e.tagline || '',
  };
});

fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(enriched, null, 2));
fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2));
console.log(`\nProducts with images: ${enriched.filter((p) => p.image).length}/${enriched.length}`);
console.log(`Files in ${OUT}:`, fs.readdirSync(OUT).filter((f) => f.endsWith('.png')).length);
