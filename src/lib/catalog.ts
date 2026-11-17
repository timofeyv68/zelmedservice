import products from '../data/products.json';
import categories from '../data/categories.json';
import brands from '../data/brands.json';
import directions from '../data/directions.json';
import { url } from './paths';

export type Product = (typeof products)[number];
export type Category = (typeof categories)[number];
export type Brand = (typeof brands)[number];

export function getProducts() {
  return products as Product[];
}

export function getCategories() {
  return categories as Category[];
}

export function getBrands() {
  return brands as Brand[];
}

export function getDirections() {
  return directions;
}

export function getProduct(categorySlug: string, slug: string) {
  return getProducts().find((p) => p.categorySlug === categorySlug && p.slug === slug);
}

export function getProductsByCategory(categorySlug: string) {
  return getProducts().filter((p) => p.categorySlug === categorySlug);
}

export function getProductsByBrand(brandSlug: string) {
  return getProducts().filter((p) => p.brandSlug === brandSlug);
}

export function productPath(p: Pick<Product, 'categorySlug' | 'slug'>) {
  return url(`catalog/${p.categorySlug}/${p.slug}/`);
}

export function standPath(p: Pick<Product, 'slug'>) {
  return url(`stand/${p.slug}/`);
}

/** Full product heading with equipment type, as on the old zelmedservice.ru catalog. */
export function productDisplayName(p: Pick<Product, 'name' | 'categorySlug' | 'slug' | 'brand'>) {
  const name = String(p.name || '').replace(/\s+/g, ' ').trim();
  if (!name) return '';

  const isPetCt =
    p.categorySlug === 'kompyuternye-tomografy' &&
    (/пэт\s*\/\s*кт/i.test(name) || /pet[\s-]?ct/i.test(name) || /730t/i.test(p.slug || ''));

  if (isPetCt) {
    const cleaned = name.replace(/\s*ПЭТ\s*\/\s*КТ\s*/gi, ' ').replace(/\s+/g, ' ').trim();
    return /^ПЭТ\s*\/\s*КТ\b/i.test(name) ? name : `ПЭТ/КТ ${cleaned}`;
  }

  const category = getCategories().find((c) => c.slug === p.categorySlug);
  const typeName = String((category as { typeName?: string } | undefined)?.typeName || '').trim();
  if (!typeName) return name;

  const lower = name.toLowerCase();
  if (lower.includes(typeName.toLowerCase())) return name;

  if (p.categorySlug === 'ultrazvukovye-sistemy' && /(серия|series|flex\s*\/|v\s*[–-]\s*серия)/i.test(name)) {
    const plural = 'Ультразвуковые системы';
    if (lower.includes(plural.toLowerCase())) return name;
    return `${plural} ${name}`;
  }

  if (p.categorySlug === 'endoskopiya' && /эндоскоп/i.test(name)) {
    return name;
  }

  return `${typeName} ${name}`;
}

export function filterProducts(opts: {
  categorySlug?: string;
  brandSlug?: string;
  q?: string;
}) {
  let list = getProducts();
  if (opts.categorySlug) list = list.filter((p) => p.categorySlug === opts.categorySlug);
  if (opts.brandSlug) list = list.filter((p) => p.brandSlug === opts.brandSlug);
  if (opts.q) {
    const q = opts.q.toLowerCase().trim();
    list = list.filter((p) => {
      const title = productDisplayName(p).toLowerCase();
      return (
        title.includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });
  }
  return list;
}

export function searchIndex() {
  return getProducts().map((p) => ({
    name: productDisplayName(p),
    brand: p.brand,
    category: p.category,
    description: p.description,
    href: productPath(p),
  }));
}
