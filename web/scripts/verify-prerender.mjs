/* Dev-only verification for static prerendering (not part of the build).
   1. Static checks: prerendered HTML files contain the right <title>,
      meta description, <h1>, OG tags and canonical — with no JS.
   2. Boot check: serve dist/ and dump a prerendered page with the
      headless shell; the dumped DOM must contain the mounted React
      app (hero + nav), proving createRoot boots over the static H1
      instead of choking on it.
   Usage: node scripts/verify-prerender.mjs (after `npm run build`).
   Headless shell path: CHROME_HEADLESS_SHELL env or the Playwright
   cache default (sandbox). If the binary is missing, the boot check
   is skipped with a warning. */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');

function unesc(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function check(name, file, want) {
  const h = readFileSync(file, 'utf8');
  const title = unesc((h.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
  const desc = unesc((h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  const h1 = unesc(((h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '').replace(/<[^>]+>/g, '').trim());
  const og = unesc((h.match(/og:title" content="([^"]*)"/) || [])[1] || '');
  const canon = (h.match(/rel="canonical" href="([^"]*)"/) || [])[1] || '';
  const ok = title === want.title && desc.startsWith(want.descStart) && h1.length > 0
    && h1 === want.h1 && og === want.title && canon === want.canon;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: title="${title.slice(0, 60)}" | h1="${h1.slice(0, 50)}" | desc="${desc.slice(0, 50)}"`);
  return ok;
}

let allOk = true;
allOk = check('home en', join(dist, 'brighton/en/index.html'), {
  title: 'The Brighton College of Science — Intermediate College in Swabi, Pakistan',
  descStart: 'The Brighton College of Science, Swabi, Pakistan',
  h1: 'Tested every week.Proven every month.',
  canon: 'https://brightoniankpk.com/brighton/en',
}) && allOk;
allOk = check('developer en', join(dist, 'brighton/en/developer/index.html'), {
  title: 'Meet the Developer — Arman Ishaq | The Brighton College',
  descStart: 'Meet Arman Ishaq, the developer',
  h1: 'Meet the Developer',
  canon: 'https://brightoniankpk.com/brighton/en/developer',
}) && allOk;
allOk = check('developer ur', join(dist, 'brighton/ur/developer/index.html'), {
  title: 'Meet the Developer — Arman Ishaq | The Brighton College',
  descStart: 'Meet Arman Ishaq, the developer',
  h1: 'Meet the Developer',
  canon: 'https://brightoniankpk.com/brighton/en/developer',
}) && allOk;
allOk = check('about en', join(dist, 'brighton/en/about/index.html'), {
  title: 'About the College | The Brighton College',
  descStart: 'About The Brighton College of Science',
  h1: 'About the College',
  canon: 'https://brightoniankpk.com/brighton/en/about',
}) && allOk;
allOk = check('past-papers en', join(dist, 'brighton/en/past-papers/index.html'), {
  title: '11th & 12th Past Papers (Solved PDF) | The Brighton College',
  descStart: 'Free solved past papers',
  h1: 'Past Papers',
  canon: 'https://brightoniankpk.com/brighton/en/past-papers',
}) && allOk;
allOk = check('story en', join(dist, 'brighton/en/gallery/sports-gala/index.html'), {
  title: 'Sports Gala: Four Houses, One Spirit | The Brighton College',
  descStart: 'Every year the whole college divides into four houses',
  h1: 'Sports Gala: Four Houses, One Spirit',
  canon: 'https://brightoniankpk.com/brighton/en/gallery/sports-gala',
}) && allOk;
allOk = check('home ur', join(dist, 'brighton/ur/index.html'), {
  title: 'دی برائٹن کالج آف سائنس — شیوہ اڈہ، کالو خان، صوابی',
  descStart: 'دی برائٹن کالج، صوابی',
  h1: 'ہر ہفتے ٹیسٹ۔ہر مہینے ثابت نتائج۔',
  canon: 'https://brightoniankpk.com/brighton/en',
}) && allOk;
console.log('STATIC:', allOk ? 'PASS' : 'FAIL');

// Boot check with the headless shell (if available).
// Serves dist/ with python's http.server — the plain static server the
// manual boot test proved works (the hand-rolled node server made the
// shell hang for unknown reasons; same files, same flags, 3s vs 60s+).
const shellBin = process.env.CHROME_HEADLESS_SHELL
  || join(process.env.HOME || '~', '.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell');
let booted = null;
if (!existsSync(shellBin)) {
  console.log('BOOT: SKIPPED (no headless-shell binary at', shellBin + ')');
} else {
  const net = await import('node:net');
  const freePort = await new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
  const py = spawn('python3', ['-m', 'http.server', String(freePort), '--directory', dist],
    { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1500));
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || '';
  // Bypass list kept minimal on purpose: the full NO_PROXY list (with
  // IPv6 entries) made the headless shell hang on the local server.
  const args = ['--headless', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    ...(proxy ? [`--proxy-server=${proxy}`, '--proxy-bypass-list=localhost;127.0.0.1'] : []),
    '--virtual-time-budget=15000', '--dump-dom', `http://127.0.0.1:${freePort}/brighton/en`];
  const out = spawnSync(shellBin, args, { encoding: 'utf8', timeout: 90000 });
  py.kill();
  const dom = out.stdout || '';
  booted = dom.includes('hero-v2-title') && dom.includes('/brighton/en/programs') && dom.includes('<h1');
  console.log('BOOT:', booted ? 'PASS (React mounted over static H1)' : 'FAIL (app did not mount in dump)');
}
process.exit(allOk && booted !== false ? 0 : 1);
