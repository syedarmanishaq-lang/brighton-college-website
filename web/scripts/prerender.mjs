/* Build-time prerendering (postbuild) — STATIC, no browser.
   The site is a client-side SPA: title, meta description, H1 and OG
   tags are set by JavaScript at runtime (src/seo/Seo.jsx). Crawlers
   that read the page without running JS (e.g. Bing's Live URL test)
   saw only the generic index.html shell — "H1 tag missing", generic
   description. This script writes one static HTML file per main
   route (dist/<route>/index.html) with the route's correct title,
   meta description, H1 and OG tags — no JavaScript needed to see
   them — by replaying EXACTLY what Seo.jsx does, from the same data:
   src/seo/seoStrings.js (titles/descriptions), src/i18n/strings.js
   (H1 texts), src/data/stories.js (gallery story titles/excerpts)
   and src/config.js (SITE_URL). If a string changes in the app, the
   prerendered HTML changes with it — nothing is hardcoded twice,
   except the route table (which must match build-sitemap.mjs).
   - The SPA still boots on top (React 18 createRoot replaces the
     #root children), so client-side navigation, the PWA service
     worker and the admin panel are untouched. Static files win over
     the /* /index.html fallback on both Vercel (rewrites) and
     Cloudflare Pages (_redirects), so the prerendered files are
     what crawlers get. The root dist/index.html stays the generic
     SPA fallback shell.
   - Routes: the sitemap's static routes + gallery story pages,
     both en and ur (52 pages). Course detail pages (/courses/<id>,
     ~224, data-driven) are intentionally NOT prerendered; they stay
     SPA. Data-driven lists (news items, course cards, books,
     results) are NOT baked in either: they load live in the browser
     as designed (they change often and would go stale between
     deploys), and Google/Bing render JS so they see the live lists
     anyway. The static file carries the page's static shell: title,
     meta, H1, OG, canonical, hreflang and BreadcrumbList JSON-LD
     (+ FAQPage on admissions).
   - Deliberately NOT replicated: the JS-only JSON-LD extras
     (Programs' EducationalOccupationalProgram schemas and Home's
     Person/Event schemas, built from live data in the components) —
     the live page still emits them via JS.
   - WHY NOT A REAL BROWSER: the first version used puppeteer
     (headless Chrome). It worked locally but BOTH Cloudflare Pages
     builds sat in the build stage for 10+ minutes (the ~170MB
     Chromium download and/or Chrome launch on the build image) and
     had to be cancelled — it made every deploy slow and fragile.
     This static version runs in under a second and cannot fail
     for browser reasons. If a route ends up without a title or H1,
     the build FAILS: that means the app data itself is broken.
   Usage: `npm run build` (postbuild hook) or `node scripts/prerender.mjs`
   after a build. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEO_PAGES, FAQ_ITEMS } from '../src/seo/seoStrings.js';
import { STRINGS } from '../src/i18n/strings.js';
import { STORIES } from '../src/data/stories.js';
import { SITE_URL } from '../src/config.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');

// Must match scripts/build-sitemap.mjs + src/App.jsx public routes.
const STATIC_ROUTES = [
  '', '/about', '/programs', '/faculty', '/toppers', '/admissions', '/news', '/courses',
  '/results', '/material', '/books', '/past-papers', '/mcqs', '/notes',
  '/gallery', '/contact', '/privacy', '/terms', '/developer', '/install',
];
const STORY_SLUGS = [
  'sports-gala', 'award-ceremonies', 'weekly-tests', 'science-labs',
  'computer-lab', 'library', 'smart-classrooms', 'campus-events',
];
const LANGS = ['en', 'ur'];
const COLLEGE = 'brighton';
const BASE = SITE_URL.replace(/\/$/, '');
const SITE_NAME = 'The Brighton College';
const KEYWORDS = 'The Brighton College, Swabi college, intermediate Swabi, 11th 12th Swabi, pre-medical, pre-engineering, Mardan board, admissions Swabi';

// The generic shell title in web/index.html — if a prerendered page
// still carries it, the Seo data lookup failed and the page is broken.
const GENERIC_TITLE = 'The Brighton College of Science — Shewa Adda, Kalu Khan, Swabi';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* H1 exactly as the page component renders it (same strings, same
   structure). Home's hero H1 is three parts with a <br> and an
   italic span, like Home.jsx. */
function h1For(route, lang) {
  const t = STRINGS[lang];
  if (route === '') {
    const h = t.hero;
    return `${esc(h.titleA)}<br><span class="it">${esc(h.titleB)}</span> ${esc(h.titleC)}`;
  }
  if (route.startsWith('/gallery/')) {
    const slug = route.slice('/gallery/'.length);
    const story = STORIES.find((s) => s.slug === slug);
    if (!story) throw new Error(`unknown story slug ${slug}`);
    return esc(story[lang].title);
  }
  const key = route.slice(1); // '/about' -> 'about'
  const map = {
    about: t.pages.about.title, programs: t.pages.programs.title,
    admissions: t.pages.admissions.title, faculty: t.pages.faculty.title,
    courses: t.pages.courses.title, news: t.pages.news.title,
    results: t.pages.results.title, material: t.pages.material.title,
    books: t.pages.books.title, 'past-papers': t.pages.pastPapers.title,
    mcqs: t.pages.mcqs.title, notes: t.pages.notes.title,
    gallery: t.pages.gallery.title, contact: t.pages.contact.title,
    toppers: t.pages.toppers.title,
    privacy: t.footer.privacy, terms: t.footer.terms,
  };
  if (key === 'developer') return 'Meet the Developer';
  if (key === 'install') return lang === 'ur' ? 'ایپ انسٹال کریں' : 'Install the App';
  if (!(key in map)) throw new Error(`no H1 mapping for route ${route}`);
  return esc(map[key]);
}

/* Head data exactly as Seo.jsx computes it for the route. */
function headFor(route, lang) {
  const isStory = route.startsWith('/gallery/');
  const page = isStory ? 'gallery' : (route === '' ? 'home' : route.slice(1));
  const s = (SEO_PAGES[page] && SEO_PAGES[page][lang]) || SEO_PAGES.home[lang] || SEO_PAGES.home.en;
  let title = s.title;
  let desc = s.desc;
  let path = `/${COLLEGE}/${lang}${route}`;
  if (isStory) {
    const slug = route.slice('/gallery/'.length);
    const story = STORIES.find((x) => x.slug === slug);
    title = `${story[lang].title} | ${SITE_NAME}`;
    desc = story[lang].excerpt;
  }
  const pathEn = `/${COLLEGE}/en${route}`;
  const pathUr = `/${COLLEGE}/ur${route}`;
  const url = BASE + path;
  const urlEn = BASE + pathEn;
  const urlUr = BASE + pathUr;
  const ogImage = BASE + '/og-image.jpg';
  const crumbs = [
    { '@type': 'ListItem', position: 1, name: lang === 'ur' ? 'ہوم' : 'Home', item: BASE + `/${COLLEGE}/${lang}` },
  ];
  if (page !== 'home') {
    crumbs.push({ '@type': 'ListItem', position: 2, name: title.split('|')[0].trim(), item: url });
  }
  const faq = page === 'admissions';
  return { title, desc, url, urlEn, urlUr, ogImage, crumbs, faq, lang };
}

function replaceOrThrow(html, re, replacement, what) {
  if (!re.test(html)) throw new Error(`shell pattern missing for ${what}: ${re}`);
  return html.replace(re, replacement);
}

function renderRoute(shell, route, lang) {
  const { title, desc, url, urlEn, urlUr, ogImage, crumbs, faq } = headFor(route, lang);
  const h1 = h1For(route, lang);
  if (!title || title === GENERIC_TITLE) throw new Error(`${route} (${lang}): no per-page title`);
  if (!desc) throw new Error(`${route} (${lang}): no description`);
  const h1Text = h1.replace(/<[^>]+>/g, '').trim();
  if (!h1Text) throw new Error(`${route} (${lang}): empty H1`);

  let html = shell;
  html = html.replace('<html lang="en">', `<html lang="${lang}">`);
  html = replaceOrThrow(html, /<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`, 'title');
  html = replaceOrThrow(html,
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${esc(desc)}" />`, 'meta description');
  html = replaceOrThrow(html,
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${esc(title)}" />`, 'og:title');
  html = replaceOrThrow(html,
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${esc(desc)}" />`, 'og:description');
  html = replaceOrThrow(html,
    /<meta property="og:image:alt" content="[^"]*" \/>/,
    `<meta property="og:image:alt" content="${esc(title)}" />`, 'og:image:alt');

  const extraHead = [
    `<meta name="keywords" content="${esc(KEYWORDS)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:locale" content="${lang === 'ur' ? 'ur_PK' : 'en_US'}" />`,
    `<meta property="og:locale:alternate" content="${lang === 'ur' ? 'en_US' : 'ur_PK'}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
    `<meta name="twitter:image" content="${esc(ogImage)}" />`,
    `<link rel="canonical" href="${esc(urlEn)}" />`,
    `<link rel="alternate" hreflang="en" href="${esc(urlEn)}" />`,
    `<link rel="alternate" hreflang="ur" href="${esc(urlUr)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${esc(urlEn)}" />`,
    `<script type="application/ld+json" data-seo="breadcrumbs">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs })}</script>`,
  ];
  if (faq) {
    extraHead.push(`<script type="application/ld+json" data-seo="faq">${JSON.stringify({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((f) => ({
        '@type': 'Question', name: f[lang].q,
        acceptedAnswer: { '@type': 'Answer', text: f[lang].a },
      })),
    })}</script>`);
  }
  if (!html.includes('</head>')) throw new Error('shell has no </head>');
  html = html.replace('</head>', `${extraHead.join('\n    ')}\n  </head>`);
  if (!html.includes('<div id="root"></div>')) throw new Error('shell has no empty #root div');
  html = html.replace('<div id="root"></div>', `<div id="root"><h1>${h1}</h1></div>`);
  return { html, title, h1Text };
}

function main() {
  const shellPath = join(dist, 'index.html');
  if (!existsSync(shellPath)) {
    console.error('[prerender] dist/index.html missing — run `vite build` first.');
    process.exit(1);
  }
  const shell = readFileSync(shellPath, 'utf8');
  const routes = [];
  for (const lang of LANGS) {
    for (const r of STATIC_ROUTES) routes.push({ route: r, lang });
    for (const slug of STORY_SLUGS) routes.push({ route: `/gallery/${slug}`, lang });
  }
  const t0 = Date.now();
  const done = [];
  for (const { route, lang } of routes) {
    const { html, title, h1Text } = renderRoute(shell, route, lang);
    const outPath = join(dist, COLLEGE, lang, route, 'index.html');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html, 'utf8');
    done.push({ route: `/${COLLEGE}/${lang}${route}`, title, h1: h1Text, bytes: Buffer.byteLength(html) });
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[prerender] ${done.length} pages OK, 0 failed, in ${secs}s (static, no browser)`);
  writeFileSync(join(dist, 'prerender-status.json'), JSON.stringify({
    prerendered: true, method: 'static', routes: done.map((d) => d.route),
    failures: [], generatedAt: new Date().toISOString(),
  }, null, 2));
  for (const d of done.filter((x) => x.route.endsWith('/en') || x.route.endsWith('/developer'))) {
    console.log(`[prerender] ${d.route} — "${d.title.slice(0, 70)}" / h1 "${d.h1.slice(0, 60)}" (${(d.bytes / 1024).toFixed(1)}KB)`);
  }
}

main();
