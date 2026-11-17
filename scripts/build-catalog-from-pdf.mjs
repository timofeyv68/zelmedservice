import fs from 'fs';

const text = fs.readFileSync('docs/catalog-2026-raw.txt', 'utf8');
const toc = text.split('-- 2 of 62 --')[0];

const cats = [
  ['Компьютерная томография', 'kompyuternye-tomografy', 'Компьютерные томографы', 'КТ'],
  ['Магнитно-резонансная томография', 'mrt', 'Магнитно-резонансные томографы', 'МРТ'],
  ['Ангиография', 'angiografy', 'Ангиографы', 'Ангиография'],
  ['Мобильный модуль для КТ, МРТ и Ангиографа', 'mobilnye-moduli', 'Мобильные модули', 'Модули'],
  ['Рентгенология', 'rentgenodiagnostika', 'Рентгенодиагностика', 'Рентген'],
  ['Рентгенохирургия', 'rentgenokhirurgiya', 'Рентгенохирургия (С-дуга)', 'С-дуга'],
  ['Маммография', 'mammografy', 'Маммографы', 'Маммография'],
  ['Ультразвуковая диагностика', 'ultrazvukovye-sistemy', 'Ультразвуковые системы', 'УЗИ'],
  ['Эндоскопия', 'endoskopiya', 'Эндоскопия', 'Эндоскопия'],
  ['Стоматология', 'stomatologicheskie-ustanovki', 'Стоматологические установки', 'Стоматология'],
];

const lines = toc.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
let current = null;
const products = [];

for (const line of lines) {
  const cat = cats.find((c) => line === c[0]);
  if (cat) {
    current = cat;
    if (cat[1] === 'mobilnye-moduli') {
      products.push({
        raw: 'Мобильный модуль для КТ, МРТ и ангиографа',
        category: cat[0],
        categorySlug: cat[1],
        categoryName: cat[2],
        chip: cat[3],
      });
    }
    continue;
  }
  if (line.startsWith('•') || /^Samsung\s/.test(line)) {
    const name = line.replace(/^•\s*/, '').replace(/\s+/g, ' ').trim();
    const isSamsung = /^Samsung\s/i.test(name);
    const cat = isSamsung
      ? cats.find((c) => c[1] === 'ultrazvukovye-sistemy')
      : current;
    products.push({
      raw: name,
      category: cat?.[0],
      categorySlug: cat?.[1],
      categoryName: cat?.[2],
      chip: cat?.[3],
      open: !isSamsung,
    });
    continue;
  }
  const last = products[products.length - 1];
  if (
    last?.open &&
    current &&
    line.length < 90 &&
    !/^\d+$/.test(line) &&
    !line.includes('ОГЛАВЛЕНИЕ') &&
    !cats.some((c) => c[0] === line) &&
    !['Гастроскопы/Дуоденоскопы', 'Колоноскопы', 'Бронхоскопы', 'Ультразвуковые эндоскопы', 'О компании'].includes(line)
  ) {
    last.raw += ' ' + line;
  } else if (last) {
    last.open = false;
  }
}

function brandOf(name) {
  const n = name.toLowerCase();
  if (n.includes('canon')) return ['Canon', 'canon'];
  if (n.includes('neusoft')) return ['Neusoft', 'neusoft'];
  if (n.includes('minfound')) return ['MinFound', 'minfound'];
  if (n.includes('вко')) return ['ВКО Медпром', 'vko-medprom'];
  if (n.includes('fujifilm')) return ['Fujifilm', 'fujifilm'];
  if (n.includes('alpinion')) return ['Alpinion', 'alpinion'];
  if (n.includes('samsung')) return ['Samsung', 'samsung'];
  if (n.includes('cingol')) return ['CINGOL', 'cingol'];
  if (n.includes('эфа')) return ['ЭФА МЕДИКА', 'efa-medika'];
  if (n.includes('concemed')) return ['Concemed', 'concemed'];
  if (
    n.includes('мтл') ||
    n.includes('универс') ||
    n.includes('мобирен') ||
    n.includes('телекорд') ||
    n.includes('уником') ||
    n.includes('малахит') ||
    n.includes('сикорд') ||
    n.includes('маммо-')
  ) {
    return ['МТЛ', 'mtl'];
  }
  return ['ЗелМедСервис', 'zelmedservice'];
}

function slugify(s) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return s
    .toLowerCase()
    .replace(/\+/g, '-plus')
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, 90);
}

// Enrich descriptions from later PDF pages by matching product name
function findBlurb(name) {
  const idx = text.indexOf(name.split('/')[0].trim());
  if (idx < 0) return '';
  const chunk = text.slice(idx, idx + 500).replace(/\s+/g, ' ');
  const after = chunk.replace(name.split('/')[0].trim(), '').trim();
  const sentence = after.match(/^.{20,220}?[.!]/);
  return sentence ? sentence[0].trim() : '';
}

const out = products.map((p, i) => {
  const name = p.raw.replace(/\s+/g, ' ').trim();
  const [brand, brandSlug] = brandOf(name);
  const blurb = findBlurb(name);
  const short =
    blurb ||
    `Поставка оборудования «${name}» для медицинских организаций. Цена и комплектация — по запросу.`;
  return {
    id: String(i + 1),
    name,
    slug: slugify(name),
    brand,
    brandSlug,
    category: p.categoryName,
    categorySlug: p.categorySlug,
    direction:
      ['kompyuternye-tomografy', 'mrt', 'angiografy', 'mobilnye-moduli', 'rentgenodiagnostika', 'rentgenokhirurgiya', 'mammografy'].includes(p.categorySlug)
        ? 'luchevaya-diagnostika'
        : p.categorySlug === 'ultrazvukovye-sistemy'
          ? 'ultrazvukovaya-diagnostika'
          : p.categorySlug === 'endoskopiya'
            ? 'endoskopiya'
            : 'stomatologiya',
    chip: p.chip,
    seoTitle: `${name} купить — поставка для ЛПУ | ЗелМедСервис`,
    seoDescription: `${name}: поставка медицинского оборудования от ЗелМедСервис. Монтаж, сервис, сопровождение закупок. Цена по запросу.`,
    description: short,
    specs: [],
    image: null,
    price: 'По запросу',
  };
});

const categories = cats.map(([pdfName, slug, name, chip]) => ({
  slug,
  name,
  pdfName,
  chip,
  directionSlug:
    ['kompyuternye-tomografy', 'mrt', 'angiografy', 'mobilnye-moduli', 'rentgenodiagnostika', 'rentgenokhirurgiya', 'mammografy'].includes(slug)
      ? 'luchevaya-diagnostika'
      : slug === 'ultrazvukovye-sistemy'
        ? 'ultrazvukovaya-diagnostika'
        : slug === 'endoskopiya'
          ? 'endoskopiya'
          : 'stomatologiya',
  seoTitle: `${name} — купить медицинское оборудование | ЗелМедСервис`,
  seoDescription: `Каталог: ${name.toLowerCase()}. Поставка для клиник и больниц, сервис и монтаж. ЗелМедСервис, Москва.`,
  count: out.filter((p) => p.categorySlug === slug).length,
}));

const brandMap = new Map();
for (const p of out) {
  if (!brandMap.has(p.brandSlug)) {
    brandMap.set(p.brandSlug, {
      slug: p.brandSlug,
      name: p.brand,
      seoTitle: `${p.brand} — медицинское оборудование купить | ЗелМедСервис`,
      seoDescription: `Оборудование ${p.brand} в каталоге ЗелМедСервис: поставка для ЛПУ, сервис, монтаж. Подборка моделей из каталога 2026.`,
      count: 0,
    });
  }
  brandMap.get(p.brandSlug).count += 1;
}

fs.writeFileSync('src/data/products.json', JSON.stringify(out, null, 2), 'utf8');
fs.writeFileSync('src/data/categories.json', JSON.stringify(categories, null, 2), 'utf8');
fs.writeFileSync('src/data/brands.json', JSON.stringify([...brandMap.values()], null, 2), 'utf8');

console.log('products', out.length);
console.log('categories', categories.map((c) => `${c.slug}:${c.count}`).join(', '));
console.log('brands', [...brandMap.values()].map((b) => `${b.name}:${b.count}`).join(', '));
out.forEach((p) => console.log(p.categorySlug.padEnd(28), p.brand.padEnd(14), p.name.slice(0, 72)));
