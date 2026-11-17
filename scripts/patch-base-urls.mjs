/**
 * One-off helper notes — path updates are applied in source files via url().
 * This script verifies no raw root-absolute href/src remain in pages/components.
 */
import fs from 'fs';
import path from 'path';

const roots = ['src/pages', 'src/components', 'src/layouts'];
const bad = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(astro|ts|js)$/.test(entry.name)) {
      const text = fs.readFileSync(p, 'utf8');
      const matches = text.matchAll(/(?:href|src|action)=["'](\/(?!\/)[^"']+)["']/g);
      for (const m of matches) {
        if (m[1].startsWith('/http') || m[1].startsWith('//')) continue;
        bad.push(`${p}: ${m[1]}`);
      }
    }
  }
}

roots.forEach(walk);
if (bad.length) {
  console.log('Root-absolute paths still present:');
  bad.forEach((l) => console.log(' -', l));
  process.exitCode = 1;
} else {
  console.log('OK: no root-absolute href/src/action in pages/components/layouts');
}
