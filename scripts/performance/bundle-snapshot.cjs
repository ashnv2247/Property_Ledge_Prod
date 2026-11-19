/* eslint-disable @typescript-eslint/no-require-imports -- Node CLI without a transpiler. */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const label = process.argv[2];
if (!['before', 'after'].includes(label)) throw new Error('Specify before or after');
const manifest = JSON.parse(fs.readFileSync('.next/app-build-manifest.json', 'utf8'));
const pages = {};
for (const [route, files] of Object.entries(manifest.pages)) {
  let rawBytes = 0, gzipBytes = 0;
  for (const file of new Set(files.filter(file => file.endsWith('.js')))) {
    const bytes = fs.readFileSync(path.join('.next', file));
    rawBytes += bytes.length;
    gzipBytes += zlib.gzipSync(bytes).length;
  }
  pages[route] = { rawBytes, gzipBytes };
}
fs.writeFileSync(`docs/performance/bundles-${label}.json`, JSON.stringify({
  capturedAt: new Date().toISOString(),
  note: 'Manifest entry JS only; not browser total transfer, RSC payload, or deferred chunks.', pages,
}, null, 2));
console.log('Saved', label, 'bundle sizes for', Object.keys(pages).length, 'entries');
