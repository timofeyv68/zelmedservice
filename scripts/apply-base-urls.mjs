import fs from 'fs';
import path from 'path';

const files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.astro')) files.push(p);
  }
}
walk('src/pages');
walk('src/components');
walk('src/layouts');

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  const original = text;

  // Skip already using url( heavily for assets if Header/Footer already done
  const needsImport = !text.includes("from '../lib/paths'") &&
    !text.includes("from '../../lib/paths'") &&
    !text.includes("from '../../../lib/paths'");

  // Replace common absolute paths inside template expressions and attributes
  const replacements = [
    [/href="\/"/g, "href={url('/')}"],
    [/href='\/'/g, "href={url('/')}"],
    [/href="\/catalog\/"/g, "href={url('catalog/')}"],
    [/href="\/company\/"/g, "href={url('company/')}"],
    [/href="\/brands\/"/g, "href={url('brands/')}"],
    [/href="\/news\/"/g, "href={url('news/')}"],
    [/href="\/contacts\/"/g, "href={url('contacts/')}"],
    [/href="\/catalog-2026\.pdf"/g, "href={url('catalog-2026.pdf')}"],
    [/href="\/favicon\.svg"/g, "href={url('favicon.svg')}"],
    [/src="\/img\//g, "src={url('img/"],
    [/src="\/favicon\.svg"/g, "src={url('favicon.svg')}"],
    [/action="\/catalog\/"/g, "action={url('catalog/')}"],
    [/href=\{`\/catalog\/\$\{/g, "href={url(`catalog/${"],
    [/href=\{`\/brands\/\$\{/g, "href={url(`brands/${"],
    [/href=\{`\/news\/\$\{/g, "href={url(`news/${"],
    [/href=\{`\/stand\/\$\{/g, "href={url(`stand/${"],
    [/href="\/contacts\/#request"/g, "href={`${url('contacts/')}#request`}"],
    [/href=\{`\/catalog\/\?direction=\$\{/g, "href={`${url('catalog/')}?direction=${"],
    [/const heroImage = '\/img\/hero-aquilion\.jpg'/g, "const heroImage = url('img/hero-aquilion.jpg')"],
    [/href=\{`\/catalog\/\$\{c\.slug\}\/`\}/g, "href={url(`catalog/${c.slug}/`)}"],
    [/href=\{`\/catalog\/\?direction=\$\{d\.slug\}`\}/g, "href={`${url('catalog/')}?direction=${d.slug}`}"],
  ];

  // Fix broken replacements for src={url('img/ ... need closing
  // Better targeted file-by-file for src patterns after first pass

  for (const [re, to] of replacements) text = text.replace(re, to);

  // Fix src={url('img/foo.png"} -> src={url('img/foo.png')}
  text = text.replace(/src=\{url\('img\/([^"']+)"\}/g, "src={url('img/$1')}");

  // Fix href={url(`catalog/${x}/`)}  if we left extra }
  // href={url(`catalog/${c.slug}/`)}  from href={url(`catalog/${c.slug}/`)}  OK
  // From href={url(`catalog/${c.slug}/`)}  when original was href={`/catalog/${c.slug}/`}
  // replacement href={url(`catalog/${ -> href={url(`catalog/${c.slug}/`)}  might become href={url(`catalog/${c.slug}/`)}  with extra }
  text = text.replace(/href=\{url\(`catalog\/\$\{([^}]+)\}\/`\}/g, 'href={url(`catalog/${$1}/`)}');
  text = text.replace(/href=\{url\(`brands\/\$\{([^}]+)\}\/`\}/g, 'href={url(`brands/${$1}/`)}');
  text = text.replace(/href=\{url\(`news\/\$\{([^}]+)\}\/`\}/g, 'href={url(`news/${$1}/`)}');

  // Incomplete: href={`${url('catalog/')}?direction=${dir.slug}`} from broken
  text = text.replace(
    /href=\{\`\$\{url\('catalog\/'\)\}\?direction=\$\{([^}]+)\}`\}/g,
    "href={`${url('catalog/')}?direction=${$1}`}"
  );

  if (text !== original && needsImport) {
    const depth = file.includes(`${path.sep}catalog${path.sep}`) || file.includes(`${path.sep}brands${path.sep}`) || file.includes(`${path.sep}news${path.sep}`) || file.includes(`${path.sep}stand${path.sep}`)
      ? file.split(/catalog|brands|news|stand/)[1]?.split(path.sep).filter(Boolean).length || 2
      : 1;
    // compute relative import
    const rel = path.relative(path.dirname(file), path.join('src', 'lib', 'paths')).replace(/\\/g, '/');
    const importPath = rel.startsWith('.') ? rel : `./${rel}`;
    if (text.startsWith('---')) {
      text = text.replace(/^---\n/, `---\nimport { url } from '${importPath}';\n`);
    }
  }

  if (text !== original) {
    fs.writeFileSync(file, text);
    console.log('patched', file);
  }
}

console.log('done');
