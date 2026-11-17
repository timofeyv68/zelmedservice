/**
 * Extract page renders + embedded images via MuPDF, enrich products.json.
 */
import fs from 'fs';
import path from 'path';
import * as mupdf from 'mupdf';

const ROOT = process.cwd();
const PDF = path.join(ROOT, 'public', 'catalog-2026.pdf');
const OUT = path.join(ROOT, 'public', 'img', 'catalog');
const PRODUCTS_PATH = path.join(ROOT, 'src', 'data', 'products.json');
const MAP_PATH = path.join(ROOT, 'docs', 'catalog-image-map.json');

fs.mkdirSync(OUT, { recursive: true });

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
      const score = name.length + 100;
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
      continue;
    }
    const tokens = name.split(' ').filter((t) => t.length > 3);
    const hit = tokens.filter((t) => nt.includes(t)).length;
    if (hit >= Math.min(3, tokens.length) && hit / tokens.length >= 0.55) {
      const score = hit * 12 + name.length;
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
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (
      /(срезов|апертур|детектор|интервал|доза|покрытие|скорость|кв|ма|мм|см)/i.test(line) &&
      line.length < 120 &&
      line.length > 8
    ) {
      if (!specs.includes(line)) specs.push(line);
    }
  }
  // also key-value patterns in one line
  const m = text.match(/Количество срезов[^\n]{0,40}/gi) || [];
  const m2 = text.match(/Апертура[^\n]{0,40}/gi) || [];
  for (const x of [...m, ...m2]) {
    const v = x.replace(/\s+/g, ' ').trim();
    if (!specs.includes(v)) specs.unshift(v);
  }
  return specs.slice(0, 8);
}

function extractBullets(text) {
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/^[•●▪◦–—\-]\s*/, '').trim())
    .filter((l) => l.length > 28 && l.length < 260);
  const uniq = [];
  for (const l of lines) {
    if (/^(стр\.|каталог|зелмед|ооо|тел\.|www\.|http)/i.test(l)) continue;
    if (!uniq.some((u) => normalize(u) === normalize(l))) uniq.push(l);
  }
  return uniq.slice(0, 12);
}

function extractTagline(text, name) {
  const known = text.match(
    /(Новейшие алгоритмы реконструкции|Сочетание функциональности и надёжности|Мобильное превосходство|Визуализация премиум-класса|Скрининговая маммография|Будущее ультразвуковой диагностики|Новая ступень эволюции ультразвука|Инновации во имя жизни)[^.!\n]{0,50}/i
  );
  if (known) return known[0].trim();
  const lines = text.split(/\n+/).map((l) => l.trim());
  const idx = lines.findIndex((l) => normalize(l).includes(normalize(name).slice(0, 20)));
  if (idx >= 0) {
    for (let i = idx + 1; i < Math.min(idx + 4, lines.length); i++) {
      if (lines[i].length > 12 && lines[i].length < 90 && !/\d{3,}/.test(lines[i])) return lines[i];
    }
  }
  return '';
}

function savePixmap(pixmap, filePath) {
  // Prefer PNG via pixmap
  const png = pixmap.asPNG();
  fs.writeFileSync(filePath, Buffer.from(png));
}

async function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
  const bySlug = Object.fromEntries(products.map((p) => [p.slug, { ...p, gallery: p.gallery || [] }]));

  const doc = mupdf.Document.openDocument(fs.readFileSync(PDF), 'application/pdf');
  const pageCount = doc.countPages();
  console.log('pages', pageCount);

  const map = [];

  for (let i = 0; i < pageCount; i++) {
    const pageNum = i + 1;
    const page = doc.loadPage(i);
    const text = page.toStructuredText('preserve-whitespace').asJSON
      ? '' // fallback below
      : '';
    // robust text
    let pageText = '';
    try {
      pageText = page.toStructuredText().asText();
    } catch {
      pageText = '';
    }

    const product = matchProduct(products, pageText);

    // Render page preview (useful fallback / clinical layout reference)
    const pageFile = `page-${String(pageNum).padStart(2, '0')}.png`;
    const pageAbs = path.join(OUT, pageFile);
    try {
      // ~150 dpi-ish: matrix scale 2
      const pixmap = page.toPixmap(mupdf.Matrix.scale(1.6, 1.6), mupdf.ColorSpace.DeviceRGB, false, true);
      savePixmap(pixmap, pageAbs);
      pixmap.destroy?.();
    } catch (e) {
      console.warn('page render failed', pageNum, e.message);
    }

    // Extract embedded images
    const images = [];
    try {
      // Walk resources via page.getImages() if available
      const list = typeof page.getImages === 'function' ? page.getImages() : [];
      // MuPDF JS may expose differently — also try extract via display list
      if (!list?.length) {
        // Fallback: use raw page PNG crop regions later; keep full page as hero candidate
      } else {
        for (let j = 0; j < list.length; j++) {
          // not all bindings support this
        }
      }
    } catch {
      /* ignore */
    }

    // Alternative: extract image objects from page resources using document API
    try {
      const res = page.getResources?.();
      // MuPDF wasm bindings vary; use Document.extractImages if present
    } catch {
      /* ignore */
    }

    // Practical approach with mupdf npm: use page.toPixmap for whole page,
    // and also try mupdf.PDFDocument image extraction via pdf_extract
    // We'll harvest standalone images by rendering and also extracting XObject images:
    const pdfPage = page;
    let extracted = 0;
    try {
      // In mupdf JS 0.x/1.x: page.getImageList / forEach
      if (typeof doc.loadImage === 'function') {
        /* noop */
      }
      // Use DisplayList device to capture images — not always available.
      // Instead, extract via PDFObject tree:
      const pdfDoc = doc;
      if (pdfDoc instanceof mupdf.PDFDocument || pdfDoc.constructor?.name === 'PDFDocument') {
        // walk page object for /XObject images
      }
    } catch {
      /* ignore */
    }

    // Reliable image extraction using PDFPage getResources dictionary
    try {
      const pdfdoc = mupdf.PDFDocument.openDocument(fs.readFileSync(PDF));
      const pdfpage = pdfdoc.loadPage(i);
      const obj = pdfpage.getObject();
      const resources = obj.get('Resources');
      if (resources && resources.get('XObject')) {
        const xobject = resources.get('XObject');
        const keys = xobject.getKeys?.() || [];
        for (const key of keys) {
          const xo = xobject.get(key);
          if (!xo) continue;
          const subtype = xo.get('Subtype');
          const isImage = String(subtype) === 'Image' || subtype?.asName?.() === 'Image';
          if (!isImage) continue;
          try {
            const img = new mupdf.Image(pdfdoc, xo);
            const pix = img.toPixmap(mupdf.ColorSpace.DeviceRGB, false);
            const w = pix.getWidth();
            const h = pix.getHeight();
            if (w * h < 20000) {
              pix.destroy?.();
              continue;
            }
            extracted += 1;
            const file = `p${String(pageNum).padStart(2, '0')}_${key}_${w}x${h}.png`;
            const abs = path.join(OUT, file);
            savePixmap(pix, abs);
            images.push({
              path: `img/catalog/${file}`,
              width: w,
              height: h,
              area: w * h,
              score: w * h * (w / Math.max(h, 1) > 4 || w / Math.max(h, 1) < 0.25 ? 0.2 : 1),
            });
            pix.destroy?.();
            img.destroy?.();
          } catch (err) {
            // JPX or unsupported — skip
          }
        }
      }
      pdfpage.destroy?.();
      // don't destroy pdfdoc every page — reopen is heavy; open once outside loop ideally
      pdfdoc.destroy?.();
    } catch (e) {
      if (pageNum === 1) console.warn('xobject extract note:', e.message);
    }

    images.sort((a, b) => b.score - a.score);

    // Always keep full-page render as fallback gallery/hero
    const pageRel = `img/catalog/${pageFile}`;
    if (!images.length) {
      images.push({ path: pageRel, width: 1200, height: 1600, area: 1200 * 1600, score: 100000, isPage: true });
    }

    map.push({
      page: pageNum,
      productSlug: product?.slug || null,
      productName: product?.name || null,
      textPreview: pageText.slice(0, 240),
      images: images.map((im) => ({ path: im.path, width: im.width, height: im.height, isPage: !!im.isPage })),
    });

    console.log(`p${pageNum}: product=${product?.name || '—'} imgs=${images.length} xobj=${extracted}`);

    if (!product) continue;
    const cur = bySlug[product.slug];
    const hero = images.find((im) => !im.isPage) || images[0];
    if (hero && (!cur.image || (!cur._fromEmbed && !hero.isPage) || (hero.score || 0) > (cur._heroScore || 0))) {
      // Prefer embedded product photos over full-page when available
      if (!cur.image || (!hero.isPage && (cur._fromEmbed === false || !cur._fromEmbed))) {
        cur.image = hero.path;
        cur._heroScore = hero.score || 0;
        cur._fromEmbed = !hero.isPage;
      }
    }
    const gallery = images.filter((im) => im.path !== cur.image).map((im) => im.path);
    cur.gallery = [...new Set([...(cur.gallery || []), ...gallery])].slice(0, 14);

    const specs = extractSpecs(pageText);
    const bullets = extractBullets(pageText);
    const tagline = extractTagline(pageText, product.name);
    if (specs.length) cur.specs = [...new Set([...(cur.specs || []), ...specs])].slice(0, 8);
    if (bullets.length) cur.bullets = [...new Set([...(cur.bullets || []), ...bullets])].slice(0, 12);
    if (tagline) cur.tagline = cur.tagline || tagline;
    if (!cur.description || /Цена и комплектация/.test(cur.description)) {
      cur.description = bullets[0] || tagline || cur.description;
    }

    page.destroy?.();
  }

  const enriched = products.map((p) => {
    const e = bySlug[p.slug];
    delete e._heroScore;
    delete e._fromEmbed;
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
  console.log(`\nWith images: ${enriched.filter((p) => p.image).length}/${enriched.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
