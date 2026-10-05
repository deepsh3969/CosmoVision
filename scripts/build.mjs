// Static build: copies deployable sources into public/ for Vercel.
import { cpSync, rmSync, mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public');

const entries = ['index.html', 'style.css', 'script.js', 'js', 'assets'];

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const entry of entries) {
  const from = join(root, entry);
  if (!existsSync(from)) {
    console.warn(`skip (missing): ${entry}`);
    continue;
  }
  cpSync(from, join(out, entry), { recursive: true });
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
writeFileSync(join(out, '.nojekyll'), '');
console.log(`build ok → public/ (${pkg.name} v${pkg.version}, entries: ${entries.join(', ')})`);
