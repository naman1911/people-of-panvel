// Stamps a release. Every script and the stylesheet get the same ?v= number, so a
// browser that still has yesterday's files cached never mixes them with today's.
//
//   node tools/stamp.mjs        bump the version by one
//   node tools/stamp.mjs 12     set it to 12
//
// It rewrites three things in index.html: the stylesheet and entry-script links,
// the import map (which sends every module request to its stamped address), and
// the list of files to start downloading early.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'index.html');
let html = readFileSync(file, 'utf8');

const current = parseInt(/css\/style\.css\?v=(\d+)/.exec(html)?.[1] || '0', 10);
const v = parseInt(process.argv[2] || String(current + 1), 10);

const walk = (dir) => readdirSync(join(root, dir)).flatMap((name) => {
  const rel = join(dir, name);
  return statSync(join(root, rel)).isDirectory() ? walk(rel) : rel.endsWith('.js') ? [relative(root, join(root, rel)).split('\\').join('/')] : [];
}).sort();
// the reviewer page is separate from the town and loads its own script
const own = walk('js').filter((f) => f !== 'js/reviewer.js');
const addons = walk('vendor/addons');

const map = { three: './vendor/three.module.min.js' };
for (const f of own) map['./' + f] = `./${f}?v=${v}`;

const preload = [
  '  <link rel="preload" href="data/panvel.json" as="fetch" crossorigin="anonymous" />',
  '  <link rel="modulepreload" href="vendor/three.module.min.js" />',
  ...own.map((f) => `  <link rel="modulepreload" href="${f}?v=${v}" />`),
  ...addons.map((f) => `  <link rel="modulepreload" href="${f}" />`),
].join('\n');

const swap = (re, to) => {
  if (!re.test(html)) throw new Error('index.html no longer matches ' + re);
  html = html.replace(re, to);
};
swap(/css\/style\.css\?v=\d+/, `css/style.css?v=${v}`);
swap(/<script type="importmap">[\s\S]*?<\/script>/, `<script type="importmap">${JSON.stringify({ imports: map })}</script>`);
swap(/<!-- preload:start -->[\s\S]*?<!-- preload:end -->/, `<!-- preload:start -->\n${preload}\n  <!-- preload:end -->`);
swap(/<script type="module" src="js\/main\.js\?v=\d+"><\/script>/, `<script type="module" src="js/main.js?v=${v}"></script>`);

writeFileSync(file, html);
const reviewer = join(root, 'reviewer.html');
writeFileSync(reviewer, readFileSync(reviewer, 'utf8').replace(/js\/reviewer\.js\?v=\d+/, `js/reviewer.js?v=${v}`));
console.log(`stamped v${v}: ${own.length} modules`);
