/* Build-time prerendering (postbuild).
   The site is a client-side SPA: title, meta description, H1 and OG
   tags are set by JavaScript at runtime (src/seo/Seo.jsx). Crawlers
   that read the page without running JS (e.g. Bing's Live URL test)
   saw only the generic index.html shell — "H1 tag missing", generic
   description. This script renders every main route in headless
   Chrome and writes the finished DOM to dist/<route>/index.html, so
   each route serves static HTML with its correct title, meta, H1 and
   OG tags — no JavaScript needed to see them.
   - The SPA still boots on top (createRoot re-renders #root), so
     client-side navigation, the PWA service worker and the admin
     panel are untouched. Static files win over the /* /index.html
     fallback on both Vercel (rewrites) and Cloudflare Pages
     (_redirects), so the prerendered files are what crawlers get.
   - Routes mirror scripts/build-sitemap.mjs STATIC_ROUTES +
     STORY_SLUGS (both en and ur). Course detail pages
     (/courses/<id>, ~200, data-driven) are intentionally NOT
     prerendered: each needs live Drive/Supabase fetches and would
     make the build far too slow; they stay SPA.
   - NOTE on data lists: the prerendered HTML contains the static
     shell (title, meta, H1, OG, intro text). Data-driven lists
     (news items, course cards, books, results) load live in the
     browser as designed — they are NOT baked into the static HTML.
     That is deliberate: lists change often and would go stale
     between deploys, and Google/Bing render JS so they see the
     live lists anyway. (In this sandbox the prerender browser
     cannot reach Supabase at all: Chrome's proxy auth does not
     work with the MITM egress proxy — page.authenticate() gives
     ERR_TUNNEL_CONNECTION_FAILED and credentials in --proxy-server
     give ERR_NO_SUPPORTED_PROXIES — while curl/python reach it
     fine. On Vercel/Cloudflare build machines there is no proxy,
     so data may load there; the script still does not depend on
     it — only title + H1 are asserted.)
   - If Chrome cannot launch (e.g. missing system libs on a build
     image), the build still succeeds as a plain SPA and a warning
     is printed — prerendering is an enhancement, never a blocker.
     But if a page renders WITHOUT a title or H1, the build FAILS:
     that means the app itself is broken, not just the prerender.
   - Proxy: in sandboxes the browser needs the egress proxy to reach
     Supabase/Drive/Fonts. HTTPS_PROXY/HTTP_PROXY (with userinfo)
     are picked up automatically; without them no proxy is used.
   Usage: `npm run build` (postbuild hook) or `node scripts/prerender.mjs`
   after a build. Set PRERENDER_CONCURRENCY to tune parallelism. */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');

// Must match scripts/build-sitemap.mjs + src/App.jsx public routes.
const STATIC_ROUTES = [
  '', '/about', '/programs', '/faculty', '/admissions', '/news', '/courses',
  '/results', '/material', '/books', '/past-papers', '/mcqs', '/notes',
  '/gallery', '/contact', '/privacy', '/terms', '/developer',
];
const STORY_SLUGS = [
  'sports-gala', 'award-ceremonies', 'weekly-tests', 'science-labs',
  'computer-lab', 'library', 'smart-classrooms', 'campus-events',
];
const LANGS = ['en', 'ur'];
const COLLEGE = 'brighton';

// The generic shell title in web/index.html — if a prerendered page
// still carries it, Seo.jsx never ran and the page is broken.
const GENERIC_TITLE = 'The Brighton College of Science — Shewa Adda, Kalu Khan, Swabi';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

/* Tiny static server for dist/ with SPA fallback (mirrors what the
   hosts serve): exact file wins, anything else falls back to
   dist/index.html so the app can render the route client-side. */
function serve() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, 'http://localhost');
        let p = decodeURIComponent(url.pathname);
        if (p.endsWith('/')) p += 'index.html';
        let file = join(dist, p);
        try {
          const s = await stat(file);
          if (s.isDirectory()) file = join(file, 'index.html');
        } catch { file = join(dist, 'index.html'); }
        const body = await readFile(file);
        res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end('not found');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function proxySettings() {
  const raw = process.env.HTTPS_PROXY || process.env.https_proxy
    || process.env.HTTP_PROXY || process.env.http_proxy || '';
  if (!raw) return { args: [], auth: null };
  let u;
  try { u = new URL(raw); } catch { return { args: [], auth: null }; }
  const bypass = [
    '<-loopback>',
    ...String(process.env.NO_PROXY || process.env.no_proxy || '')
      .split(',').map((s) => s.trim()).filter(Boolean),
  ].join(';');
  return {
    args: [`--proxy-server=${u.protocol}//${u.hostname}:${u.port}`, `--proxy-bypass-list=${bypass}`],
    auth: u.username ? { username: decodeURIComponent(u.username), password: decodeURIComponent(u.password || '') } : null,
  };
}

function routes() {
  const out = [];
  for (const lang of LANGS) {
    for (const r of STATIC_ROUTES) out.push(`/${COLLEGE}/${lang}${r}`);
    for (const slug of STORY_SLUGS) out.push(`/${COLLEGE}/${lang}/gallery/${slug}`);
  }
  return out;
}

async function renderOne(browser, base, route) {
  const page = await browser.newPage();
  try {
    await page.setBypassServiceWorker(true);
    await page.setViewport({ width: 1280, height: 800 });
    const { auth } = proxySettings();
    if (auth) await page.authenticate(auth);
    await page.goto(base + route, { waitUntil: 'networkidle0', timeout: 90000 });
    // Static H1s render with the first paint; data lists follow.
    await page.waitForSelector('#root h1', { timeout: 30000 }).catch(() => {});
    await page.waitForNetworkIdle({ idleTime: 1000, timeout: 20000 }).catch(() => {});
    const html = await page.content();
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '';
    const h1Text = h1.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
    if (!title || title === GENERIC_TITLE) throw new Error(`no per-page title (got ${JSON.stringify(title)})`);
    if (!h1Text) throw new Error('no <h1> in rendered HTML');
    const outPath = join(dist, route, 'index.html');
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, html, 'utf8');
    return { route, title: title.slice(0, 80), h1: h1Text.slice(0, 80), bytes: Buffer.byteLength(html) };
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('[prerender] dist/index.html missing — run `vite build` first.');
    process.exit(1);
  }
  const allRoutes = routes();
  const concurrency = Math.max(1, parseInt(process.env.PRERENDER_CONCURRENCY || '3', 10));
  const server = await serve();
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  console.log(`[prerender] serving dist on ${base}; ${allRoutes.length} routes, concurrency ${concurrency}`);

  const { args: proxyArgs } = proxySettings();
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', ...proxyArgs],
    });
  } catch (e) {
    console.warn('[prerender] WARNING: Chrome could not launch — shipping plain SPA.'
      + ` (${e.message.split('\n')[0]})`);
    await writeFile(join(dist, 'prerender-status.json'),
      JSON.stringify({ prerendered: false, reason: 'chrome-launch-failed', routes: [], generatedAt: new Date().toISOString() }, null, 2));
    server.close();
    return;
  }

  const done = [];
  const failed = [];
  let next = 0;
  const t0 = Date.now();
  async function worker() {
    while (next < allRoutes.length) {
      const route = allRoutes[next++];
      try {
        done.push(await renderOne(browser, base, route));
        process.stdout.write('.');
      } catch (e) {
        // One retry: headless Chrome sometimes drops a target under
        // parallel load ("Session with given id not found") — a fresh
        // page usually renders fine. Only a second failure counts.
        try {
          done.push(await renderOne(browser, base, route));
          process.stdout.write('r');
        } catch (e2) {
          failed.push({ route, error: e2.message });
          process.stdout.write('F');
        }
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log('');
  await browser.close().catch(() => {});
  server.close();

  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`[prerender] ${done.length} pages OK, ${failed.length} failed, in ${secs}s`);
  await writeFile(join(dist, 'prerender-status.json'), JSON.stringify({
    prerendered: failed.length === 0,
    routes: done.map((d) => d.route),
    failures: failed,
    generatedAt: new Date().toISOString(),
  }, null, 2));
  if (failed.length) {
    for (const f of failed) console.error(`[prerender] FAILED ${f.route}: ${f.error}`);
    console.error('[prerender] failing the build: pages rendered without a title/H1.');
    process.exit(1);
  }
  for (const d of done.filter((x) => x.route.endsWith('/en') || x.route.endsWith('/developer'))) {
    console.log(`[prerender] ${d.route} — "${d.title}" / h1 "${d.h1}" (${(d.bytes / 1024).toFixed(1)}KB)`);
  }
}

main().catch((e) => { console.error('[prerender] fatal:', e); process.exit(1); });
