// Builds the deployable site into dist/ with the Leo Cal key filled in.
//
// The HTML in git only has the placeholder data-key="gxp_YOUR_KEY", so the real key never lands in the repo (secret
// scanners stay quiet). The key comes from the LEO_CAL_KEY environment variable: set it in Vercel → Project → Settings →
// Environment Variables, or locally in .env.local (gitignored; `vercel env pull .env.local` writes it for you).
//
// NB: this keeps the key out of git, not out of the browser — embed.js puts it in the booking iframe's URL, so every
// visitor can see it. What protects it is Leo Cal's allowed-origins setting for the key.
//
//   node tools/build.mjs && npx serve dist
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'dist');
const PLACEHOLDER = 'gxp_YOUR_KEY';
// not part of the site
const SKIP = new Set(['dist', 'node_modules', 'tools', 'README.md', 'vercel.json']);

// local builds: read .env.local / .env (Vercel injects env vars directly)
for (const file of ['.env.local', '.env']) {
  const path = join(ROOT, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const key = process.env.LEO_CAL_KEY;
const fail = (msg) => { console.error(`build: ${msg}`); process.exit(1); };
if (!key || key === PLACEHOLDER) fail('LEO_CAL_KEY is not set (Vercel env var, or .env.local for local builds).');
if (!key.startsWith('gxp_') || /[\s"'<>&]/.test(key)) fail('LEO_CAL_KEY does not look like a Leo Cal key (gxp_…).');

rmSync(OUT, { recursive: true, force: true });
for (const name of readdirSync(ROOT)) {
  if (!name.startsWith('.') && !SKIP.has(name)) cpSync(join(ROOT, name), join(OUT, name), { recursive: true });
}

let count = 0;
for (const name of readdirSync(OUT).filter((f) => f.endsWith('.html'))) {
  const path = join(OUT, name), html = readFileSync(path, 'utf8');
  const n = html.split(PLACEHOLDER).length - 1;
  if (n) { writeFileSync(path, html.replaceAll(PLACEHOLDER, key)); count += n; console.log(`build: key → ${name}${n > 1 ? ` (×${n})` : ''}`); }
}
if (!count) fail(`no ${PLACEHOLDER} placeholder found in any page — nothing to fill in.`);
console.log(`build: dist/ ready`);
