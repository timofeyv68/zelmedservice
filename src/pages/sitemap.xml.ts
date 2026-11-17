import type { APIRoute } from 'astro';
import { getProducts, getCategories, getBrands } from '../lib/catalog';
import landings from '../data/landings.json';
import scenarios from '../data/scenarios.json';

const site = 'https://timofeyv68.github.io/zelmedservice';

function loc(path: string) {
  const clean = path.replace(/^\//, '').replace(/\/?$/, '/');
  return `${site}/${clean === '/' ? '' : clean}`;
}

export const GET: APIRoute = () => {
  const urls: { loc: string; priority: string }[] = [
    { loc: loc('/'), priority: '1.0' },
    { loc: loc('catalog/'), priority: '0.9' },
    { loc: loc('scenarios/'), priority: '0.85' },
    { loc: loc('company/'), priority: '0.7' },
    { loc: loc('brands/'), priority: '0.7' },
    { loc: loc('news/'), priority: '0.6' },
    { loc: loc('contacts/'), priority: '0.7' },
  ];

  for (const c of getCategories()) {
    urls.push({ loc: loc(`catalog/${c.slug}/`), priority: '0.8' });
  }
  for (const p of getProducts()) {
    urls.push({ loc: loc(`catalog/${p.categorySlug}/${p.slug}/`), priority: '0.8' });
  }
  for (const b of getBrands()) {
    urls.push({ loc: loc(`brands/${b.slug}/`), priority: '0.7' });
  }
  for (const l of landings) {
    urls.push({ loc: loc(`buy/${l.slug}/`), priority: '0.85' });
  }
  for (const s of scenarios) {
    urls.push({ loc: loc(`scenarios/${s.slug}/`), priority: '0.85' });
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
