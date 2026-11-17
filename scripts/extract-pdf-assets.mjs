/**
 * Extract images + text blocks from catalog PDF and enrich products.json.
 * Layout model (from PDF pages):
 *  - hero product photo
 *  - key specs
 *  - feature bullets
 *  - clinical/sample gallery
 */
import fs from 'fs';
import path from 'path';
import { createCanvas } from '@napi-rs/canvas';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';

const ROOT = process.cwd();
const PDF = path.join(ROOT, 'public', 'catalog-2026.pdf');
const OUT_DIR = path.join(ROOT, 'public', 'img', 'catalog');
const PRODUCTS_PATH = path.join(ROOT, 'src', 'data', 'products.json');
const MAP_PATH = path.join(ROOT, 'docs', 'catalog-image-map.json');

fs.mkdirSync(OUT_DIR, { recursive: true });

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/ё/g, 'e')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pageText(items) {
  return items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
}

function extractSpecs(text) {
  const specs = [];
  const patterns = [
    /Количество срезов[–—\-:\s]+([^\n.]+)/i,
    /Апертура(?: гентри)?[–—\-:\s]+([^\n.]+)/i,
    /Широкий детектор[–—\-:\s]+([^\n.]+)/i,
    /Интервал между снимками[–—\-:\s]+([^\n.]+)/i,
    /(\d+\s*срезов?[^\n.]{0,40})/i,
    /(апертура[^\n.]{0,40})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const v = (m[0] || m[1]).replace(/\s+/g, ' ').trim();
      if (v && !specs.includes(v)) specs.push(v);
    }
  }
  return specs.slice(0, 6);
}

function extractBullets(text) {
  // Split on common bullet-ish separators used in catalog copy
  const chunks = text
    .split(/(?<=\.)\s+(?=[A-ZА-Я]|•|–|—|- )/)
    .map((s) => s.replace(/^[•–—\-]\s*/, '').trim())
    .filter((s) => s.length > 35 && s.length < 280);
  const uniq = [];
  for (const c of chunks) {
    if (!uniq.some((u) => normalize(u) === normalize(c))) uniq.push(c);
  }
  return uniq.slice(0, 10);
}

function extractTagline(text, name) {
  const n = normalize(name);
  const t = text.replace(/\s+/g, ' ');
  // often right after product name
  const idx = normalize(t).indexOf(n);
  if (idx >= 0) {
    const after = t.slice(name.length, name.length + 120).trim();
    const m = after.match(/^([^.!?]{12,90})/);
    if (m) return m[1].trim();
  }
  // known short slogans
  const slogans = t.match(
    /(Новейшие алгоритмы реконструкции|Сочетание функциональности и надёжности|Мобильное превосходство|Визуализация премиум-класса|Скрининговая маммография|Будущее ультразвуковой диагностики|Новая ступень эволюции ультразвука)[^.!]{0,40}/i
  );
  return slogans ? slogans[0].trim() : '';
}

function scoreImage(w, h) {
  const area = w * h;
  const ratio = w / Math.max(h, 1);
  // Prefer medium/large photos; downrank tiny icons and ultra-wide strips
  let score = area;
  if (area < 20000) score *= 0.05;
  if (area < 80000) score *= 0.4;
  if (ratio > 4 || ratio < 0.25) score *= 0.2;
  if (w < 80 || h < 80) score *= 0.05;
  return score;
}

async function extractPageImages(page, pageNum) {
  const ops = await page.getOperatorList();
  const common = page.commonObjs;
  const objs = page.objs;
  const names = new Set();

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    if (
      fn === OPS.paintImageXObject ||
      fn === OPS.paintInlineImageXObject ||
      fn === OPS.paintImageMaskXObject ||
      fn === OPS.paintJpegXObject
    ) {
      const args = ops.argsArray[i];
      if (args?.[0]) names.add(args[0]);
    }
  }

  const images = [];
  for (const name of names) {
    const img = await new Promise((resolve) => {
      let settled = false;
      const done = (v) => {
        if (!settled) {
          settled = true;
          resolve(v);
        }
      };
      try {
        objs.get(name, done);
        // fallback timeout
        setTimeout(() => done(null), 1500);
      } catch {
        done(null);
      }
    });
    if (!img || !img.width || !img.height || !img.data) continue;

    const { width, height, data } = img;
    const score = scoreImage(width, height);
    if (score < 5000) continue;

    // Convert to RGBA canvas then PNG via napi canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    // pdf.js image data may be RGB or RGBA or gray
    const kind = img.kind; // 1 gray, 2 RGB, 3 RGBA roughly in some versions
    const n = data.length;
    const expectedRGBA = width * height * 4;
    const expectedRGB = width * height * 3;
    const expectedGray = width * height;

    if (n === expectedRGBA || kind === 3) {
      imageData.data.set(data.length >= expectedRGBA ? data.subarray(0, expectedRGBA) : data);
    } else if (n === expectedRGB || kind === 2) {
      for (let p = 0, q = 0; p < expectedRGB; p += 3, q += 4) {
        imageData.data[q] = data[p];
        imageData.data[q + 1] = data[p + 1];
        imageData.data[q + 2] = data[p + 2];
        imageData.data[q + 3] = 255;
      }
    } else if (n === expectedGray || kind === 1) {
      for (let p = 0, q = 0; p < expectedGray; p++, q += 4) {
        const v = data[p];
        imageData.data[q] = v;
        imageData.data[q + 1] = v;
        imageData.data[q + 2] = v;
        imageData.data[q + 3] = 255;
      }
    } else {
      // best effort RGB
      const pixels = Math.min(width * height, Math.floor(n / 3));
      for (let p = 0, q = 0; p < pixels; p++, q += 4) {
        const i = p * 3;
        imageData.data[q] = data[i] || 0;
        imageData.data[q + 1] = data[i + 1] || 0;
        imageData.data[q + 2] = data[i + 2] || 0;
        imageData.data[q + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    const file = `p${String(pageNum).padStart(2, '0')}_${name.replace(/[^\w.-]+/g, '_')}_${width}x${height}.png`;
    const abs = path.join(OUT_DIR, file);
    fs.writeFileSync(abs, canvas.toBuffer('image/png'));
    images.push({
      file,
      path: `/img/catalog/${file}`,
      width,
      height,
      score,
      area: width * height,
      ratio: width / height,
    });
  }

  images.sort((a, b) => b.score - a.score);
  return images;
}

function matchProduct(products, text) {
  const nt = normalize(text);
  let best = null;
  let bestScore = 0;
  for (const p of products) {
    const name = normalize(p.name);
    if (!name) continue;
    if (nt.includes(name)) {
      const score = name.length + 100;
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
      continue;
    }
    // partial: brand + distinctive tokens
    const tokens = name.split(' ').filter((t) => t.length > 3);
    const hit = tokens.filter((t) => nt.includes(t)).length;
    if (hit >= Math.min(3, tokens.length) && hit / tokens.length >= 0.6) {
      const score = hit * 10 + tokens.join('').length;
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
    }
  }
  return best;
}

async function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
  const data = new Uint8Array(fs.readFileSync(PDF));
  const doc = await getDocument({ data, disableWorker: true, useSystemFonts: true }).promise;
  console.log('PDF pages:', doc.numPages);

  const pageMap = [];
  const bySlug = Object.fromEntries(products.map((p) => [p.slug, { ...p }]));

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const text = pageText(textContent.items);
    const images = await extractPageImages(page, pageNum);
    const product = matchProduct(products, text);

    const entry = {
      page: pageNum,
      productSlug: product?.slug || null,
      productName: product?.name || null,
      textPreview: text.slice(0, 220),
      imageCount: images.length,
      images: images.map((i) => ({ path: i.path, width: i.width, height: i.height, score: Math.round(i.score) })),
    };
    pageMap.push(entry);
    console.log(
      `p${pageNum}: images=${images.length} product=${product?.name || '—'} top=${images[0] ? `${images[0].width}x${images[0].height}` : '-'}`
    );

    if (!product || !images.length) continue;

    const cur = bySlug[product.slug];
    const hero = images[0];
    const gallery = images.slice(1, 8).map((i) => i.path.replace(/^\//, ''));

    // Prefer higher-score hero if already set from another page
    const nextImage = hero.path.replace(/^\//, '');
    if (!cur.image || (hero.score || 0) > (cur._heroScore || 0)) {
      cur.image = nextImage;
      cur._heroScore = hero.score || 0;
    }

    const gallerySet = new Set([...(cur.gallery || []), ...gallery]);
    // don't duplicate hero in gallery
    gallerySet.delete(cur.image);
    cur.gallery = [...gallerySet].slice(0, 12);

    const specs = extractSpecs(text);
    const bullets = extractBullets(text);
    const tagline = extractTagline(text, product.name);
    if (specs.length) cur.specs = [...new Set([...(cur.specs || []), ...specs])].slice(0, 8);
    if (bullets.length) cur.bullets = [...new Set([...(cur.bullets || []), ...bullets])].slice(0, 12);
    if (tagline) cur.tagline = cur.tagline || tagline;

    // Improve description from first meaningful paragraph if still generic
    if (!cur.description || cur.description.includes('Цена и комплектация')) {
      const better = bullets[0] || tagline;
      if (better) cur.description = better;
    }
  }

  const enriched = products.map((p) => {
    const e = bySlug[p.slug];
    delete e._heroScore;
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
  fs.writeFileSync(MAP_PATH, JSON.stringify(pageMap, null, 2));

  const withImg = enriched.filter((p) => p.image).length;
  console.log(`\nDone. Products with images: ${withImg}/${enriched.length}`);
  console.log(`Images dir: ${OUT_DIR}`);
  console.log(`Map: ${MAP_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
