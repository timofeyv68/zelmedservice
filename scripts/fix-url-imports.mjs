import fs from 'fs';
import path from 'path';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (p.endsWith('.astro')) out.push(p);
  }
  return out;
}

const files = [...walk('src/pages'), ...walk('src/components'), ...walk('src/layouts')];

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  const usesUrl = /\burl\(/.test(text);
  const hasImport = /from ['"].*lib\/paths['"]/.test(text);
  if (!(usesUrl && !hasImport)) continue;
  if (!text.startsWith('---')) continue;

  let rel = path.relative(path.dirname(file), path.join('src', 'lib', 'paths.ts')).replace(/\\/g, '/');
  rel = rel.replace(/\.ts$/, '');
  if (!rel.startsWith('.')) rel = `./${rel}`;

  const importLine = `import { url } from '${rel}';\r\n`;
  if (text.startsWith('---\r\n')) {
    text = '---\r\n' + importLine + text.slice(5);
  } else if (text.startsWith('---\n')) {
    text = '---\n' + importLine.replace(/\r\n$/, '\n') + text.slice(4);
  } else {
    continue;
  }

  fs.writeFileSync(file, text);
  console.log('import added', file, '->', rel);
}

console.log('done');
