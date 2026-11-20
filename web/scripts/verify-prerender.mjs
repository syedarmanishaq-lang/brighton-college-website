/* Dev-only verification for prerendering (not part of the build).
   1. Static checks: prerendered HTML files contain the right <title>,
      meta description, <h1> and OG tags with no JS involved.
   2. SPA check: load a prerendered page in headless Chrome, confirm
      React boots and a nav click changes route WITHOUT a full page
      reload (window marker survives) — prerendering must not break
      client-side navigation.
   Usage: node scripts/verify-prerender.mjs (after `npm run build`). */
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { stat } from 'node:fs/promises';
import { extname } from 'node:path';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.xml': 'application/xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };

function check(name, file, want) {
  const html = readFile(file, 'utf8');
  return html.then((h) => {
    const out = { name, file: file.replace(dist, 'dist') };
    const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
    const h1 = ((h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '').replace(/<[^>]+>/g, '').trim();
    const og = (h.match(/og:title" content="([^"]*)"/) || [])[1] || '';
    const canon = (h.match(/rel="canonical" href="([^"]*)"/) || [])[1] || '';
    out.title = title; out.desc = desc.slice(0, 90); out.h1 = h1.slice(0, 80); out.og = og.slice(0, 60); out.canon = canon;
    out.ok = title === want.title && desc.startsWith(want.descStart) && h1.length > 0 && og === want.title && canon === want.canon;
    out.hasScript = h.includes('/assets/index-');
    out.hasData = /course-card|news-card|result-row|book-card/.test(h);
    return out;
  });
}

const checks = [
  check('home en', join(dist, 'brighton/en/index.html'), {
    title: 'The Brighton College of Science — Intermediate College in Swabi, Pakistan',
    descStart: 'The Brighton College of Science, Swabi, Pakistan',
    canon: 'https://brightoniankpk.com/brighton/en',
  }),
  check('developer en', join(dist, 'brighton/en/developer/index.html'), {
    title: 'Meet the Developer — Arman Ishaq | The Brighton College',
    descStart: 'Meet Arman Ishaq, the developer',
    canon: 'https://brightoniankpk.com/brighton/en/developer',
  }),
  check('developer ur', join(dist, 'brighton/ur/developer/index.html'), {
    title: 'Meet the Developer — Arman Ishaq | The Brighton College',
    descStart: 'Meet Arman Ishaq, the developer',
    canon: 'https://brightoniankpk.com/brighton/en/developer',
  }),
  check('about en', join(dist, 'brighton/en/about/index.html'), {
    title: 'About the College | The Brighton College',
    descStart: 'About The Brighton College of Science',
    canon: 'https://brightoniankpk.com/brighton/en/about',
  }),
];

const results = await Promise.all(checks);
for (const r of results) console.log(JSON.stringify(r, null, 1));
console.log('STATIC:', results.every((r) => r.ok) ? 'PASS' : 'FAIL');

// SPA navigation smoke test
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    let file = join(dist, p);
    try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); } catch { file = join(dist, 'index.html'); }
    const body = await readFile(file);
    // NOTE: keys carry the leading dot — use extname(), NOT split('.').pop()
    // (that returns 'html' without the dot and falls through to octet-stream,
    // which makes Chrome ABORT the main-document navigation).
    res.writeHead(200, { 'content-type': (MIME[extname(file)] || 'application/octet-stream') });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const proxyRaw = process.env.HTTPS_PROXY || process.env.https_proxy || '';
let proxyArgs = [], auth = null;
if (proxyRaw) {
  const u = new URL(proxyRaw);
  // Bypass must name 127.0.0.1 explicitly: '<-loopback>' alone did not
  // keep Chrome off the proxy for the local server (ERR_EMPTY_RESPONSE).
  const bypass = ['<-loopback>', ...String(process.env.NO_PROXY || process.env.no_proxy || '').split(',').map((s) => s.trim()).filter(Boolean)].join(';');
  proxyArgs = [`--proxy-server=${u.protocol}//${u.hostname}:${u.port}`, `--proxy-bypass-list=${bypass}`];
  if (u.username) auth = { username: decodeURIComponent(u.username), password: decodeURIComponent(u.password || '') };
}
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', ...proxyArgs] });
const page = await browser.newPage();
await page.setBypassServiceWorker(true);
if (auth) await page.authenticate(auth);
await page.goto(base + '/brighton/en', { waitUntil: 'networkidle0', timeout: 90000 });
await page.evaluate(() => { window.__spaMarker = 42; });
const before = await page.evaluate(() => ({ marker: window.__spaMarker, h1: document.querySelector('#root h1')?.textContent?.slice(0, 40) }));
// Click the Programs nav link (header nav uses LLink -> <a href>)
await page.evaluate(() => {
  const a = [...document.querySelectorAll('header a')].find((x) => x.getAttribute('href')?.endsWith('/programs'));
  if (!a) throw new Error('Programs nav link not found');
  a.click();
});
await page.waitForFunction(() => location.pathname.includes('/programs'), { timeout: 20000 });
await new Promise((r) => setTimeout(r, 1500));
const after = await page.evaluate(() => ({ marker: window.__spaMarker, url: location.pathname, h1: document.querySelector('#root h1')?.textContent?.slice(0, 60) }));
console.log('SPA before:', JSON.stringify(before));
console.log('SPA after nav:', JSON.stringify(after));
console.log('SPA:', after.marker === 42 && after.url === '/brighton/en/programs' && after.h1 ? 'PASS (client-side nav, no reload)' : 'FAIL');
await browser.close();
server.close();
process.exit(results.every((r) => r.ok) && after.marker === 42 ? 0 : 1);
