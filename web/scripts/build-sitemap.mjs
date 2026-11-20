/* Prebuild: regenerate public/sitemap.xml including live course pages.
   Courses come from TWO sources (mirrors src/pages/Courses.jsx):
   1. Supabase `courses` table (admin-published courses), and
   2. Google Drive root folder — every FOLDER in DRIVE_FOLDER_ID is one
      course (this is how the 151 Drive course folders go live).
   If either source is unreachable, keeps the existing static sitemap —
   build never fails. */
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outPath = join(root, 'public', 'sitemap.xml');

const BASE = 'https://brightoniankpk.com';
const COLLEGE = 'brighton';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

// Static routes (must match App.jsx public routes)
const STATIC_ROUTES = [
  '', '/about', '/programs', '/faculty', '/admissions', '/news', '/courses',
  '/results', '/material', '/books', '/past-papers', '/mcqs', '/notes',
  '/gallery', '/contact', '/privacy', '/terms', '/developer',
];
const STORY_SLUGS = [
  'sports-gala', 'award-ceremonies', 'weekly-tests', 'science-labs',
  'computer-lab', 'library', 'smart-classrooms', 'campus-events',
];

function urlEntry(loc, priority = '0.8', changefreq = 'weekly') {
  const en = `${BASE}/${COLLEGE}/en${loc}`;
  const ur = `${BASE}/${COLLEGE}/ur${loc}`;
  return `  <url>
    <loc>${en}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>
    <xhtml:link rel="alternate" hreflang="ur" href="${ur}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function main() {
  const cfg = readFileSync(join(root, 'src', 'config.js'), 'utf8');
  const get = (name) => {
    const m = cfg.match(new RegExp(`${name}\\s*=\\s*'([^']*)'`));
    return m ? m[1] : '';
  };
  const courseIds = new Set();

  // 1) Supabase admin-published courses
  try {
    const url = get('SUPABASE_URL'), key = get('SUPABASE_ANON_KEY');
    const live = /BACKEND_LIVE\s*=\s*true/.test(cfg);
    if (url && key && live) {
      const r = await fetch(`${url}/rest/v1/courses?select=id&published=eq.true&limit=500`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (r.ok) {
        for (const c of await r.json()) if (c.id) courseIds.add(String(c.id));
      }
    }
  } catch (e) {
    console.warn('[sitemap] Supabase fetch failed:', e.message);
  }

  // 2) Drive library: every folder in the Drive root = one course
  try {
    const apiKey = get('DRIVE_API_KEY'), folderId = get('DRIVE_FOLDER_ID');
    if (apiKey && folderId) {
      const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
      let pageToken = '';
      for (let page = 0; page < 20; page++) {
        const u = 'https://www.googleapis.com/drive/v3/files?q=' + q +
          '&fields=nextPageToken,files(id,mimeType)' +
          '&orderBy=name&pageSize=100' +
          (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '') +
          '&key=' + encodeURIComponent(apiKey);
        const r = await fetch(u);
        if (!r.ok) throw new Error('Drive ' + r.status);
        const j = await r.json();
        for (const f of (j.files || []))
          if (f.mimeType === FOLDER_MIME && f.id) courseIds.add(String(f.id));
        pageToken = j.nextPageToken || '';
        if (!pageToken) break;
      }
    }
  } catch (e) {
    console.warn('[sitemap] Drive folder listing failed:', e.message);
  }

  const ids = [...courseIds];
  const entries = [];
  entries.push(urlEntry('', '1.0', 'daily'));
  for (const r of STATIC_ROUTES.slice(1)) entries.push(urlEntry(r));
  for (const slug of STORY_SLUGS) entries.push(urlEntry(`/gallery/${slug}`, '0.7'));
  for (const id of ids) entries.push(urlEntry(`/courses/${id}`, '0.8'));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;
  writeFileSync(outPath, xml);
  console.log(`[sitemap] wrote ${entries.length} URLs (${ids.length} course pages)`);
}

main();
