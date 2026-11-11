# THE BRIGHTON COLLEGE — Developer Handover

**Last updated:** 2026-11-11. **Owner:** Arman Ishaq (Luffy). **College:** THE BRIGHTON
COLLEGE OF SCIENCE, KKS Plaza, Main Mardan Swabi Road, Shewa Adda, Near Police
Station, Kalu Khan (Razzar, Swabi). **Live site, two hosts (same code):**
https://brighton-college-website.vercel.app and https://brighton-college.pages.dev

**No passwords, tokens or keys in this file.** Secrets live with the owner only.
Values that ship inside the code itself (Supabase anon key, Drive API key) are in
`web/src/config.js` — read them there, never copy them into docs or chat.

## 1. Tech stack

- **Frontend:** React 18.3.1 + React Router 7.6.3 + Vite 5, plain CSS. No
  TypeScript, no Next.js, no Tailwind.
- **Backend:** none of our own. **Supabase** (Postgres + PostgREST + Storage) via
  plain `fetch` with a custom client in `web/src/lib/supabase.js`. There is no
  `supabase-js` dependency.
- **Files and video:** Google Drive API for courses and study material. Video
  playback uses the Drive preview embed.
- **Hosting:** GitHub → **Vercel** (auto-deploy on push to `main`) and
  **Cloudflare Pages** (project `brighton-college`, direct-upload deploys via API).
- **Languages:** English + Urdu, routes under `/:lang/*` (`/en`, `/ur`), full RTL
  mirror for Urdu.

## 2. Repositories and accounts (info only, no passwords)

- **GitHub repo:** `syedarmanishaq-lang/brighton-college-website`, branch `main` (transferred from `brightoncollege-alt` 2026-11-11).
  Normal `git push` deploys to Vercel. Local checkout: `~/workspace/brighton-college`,
  app code in `web/`.
- **Vercel:** account `techshazal-6636`. Framework preset Vite, build `npm run build`,
  output `dist`. `vercel.json` rewrites all routes to `/index.html` (SPA).
- **Cloudflare:** account `syedarmanishaq@gmail.com`. Pages project
  `brighton-college` → `brighton-college.pages.dev`. API via connector
  `custom.cloudflare` (`~/workspace/custom-connectors/custom.cloudflare/`,
  helpers `bin/cf.py` and `bin/pages_deploy.py`). SPA routing via
  `web/public/_redirects` (`/* /index.html 200`).
- **Supabase:** project `brighton-college`, org `brightoncollege-alt`, region
  Singapore, Free plan. Project ref `vhmqofxciisnrxrzbovq`.
- **Google Search Console:** property currently on `techshazal@gmail.com`;
  moving to `syedarmanishaq@gmail.com` (add + verify new owner FIRST, then remove
  the old one — never remove first).
- **Google Drive:** course/material root folder ID `1RelBjy9voLLcGwv91Y-sK5bazdvx8tLv`
  (account `syedarmanishaq@gmail.com`).

## 3. Project layout

```text
brighton-college/
  web/                  React + Vite app (this is the deployable app)
    src/                pages, components, admin, college context, seo
    public/             static files, sitemap.xml, robots.txt, _redirects
    scripts/            build-sitemap.mjs (runs on prebuild)
    index.html          entry, Monetag-free (no ads yet)
    package.json        scripts: dev / build / preview
    vercel.json         SPA rewrites for Vercel
  supabase/
    schema.sql          base schema (tables, buckets, RLS)
    migrations/         002–011 (multi-college, storage delete, news published,
                        site settings, admin gaps, course videos, drive index,
                        storage buckets, gallery media policies)
  README.md / HANDOVER.md / DEPLOY.md / URL-MAP.md / DEVELOPER-HANDOVER.md
```

## 4. Configuration — `web/src/config.js`

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (public anon key, ships in the code).
- `DRIVE_API_KEY` (Google Drive API key, restricted to the Drive API),
  `DRIVE_FOLDER_ID` (study material root folder).
- `WHATSAPP_NUMBER` (`923179609048`, college office WhatsApp).
- `BACKEND_LIVE = true`, `SITE_URL`.
- **Admin panel:** `/adminsecuresex/` (NOT the old `/secure-admin/`). The admin
  password hash lives in Supabase `site_settings` (`admin_pw_hash`). The
  "Forgot password? Reset it" link needs no verification — a known weakness,
  do not test it live; securing it is an open task.

## 5. Supabase data model

- **Tables:** `news_posts`, `courses`, `test_results`, `study_material`,
  `admission_applications`, `gallery_images`, `gallery_media`, `books`,
  `contact_messages`, `colleges`, `site_settings`.
- **Storage buckets:** `news`, `gallery`, `results` (Free plan 1 GB total).
- **RLS:** open pattern — public read; public insert on the two forms; admin
  writes gated by the panel password only (anon key). Harden with Supabase Auth
  if spam appears.
- **Live data (2026-11-11):** `news_posts` = exactly 3 rows (never delete real
  rows); `books` = 75 rows (65 textbooks + 10 genuine past papers, filtered by
  title); `courses` table was empty — courses are added by the owner in the panel.
- **Free-tier guard:** free projects pause after 1 week of inactivity. A keep-alive
  ping runs every 48h (cron `brighton-supabase-keepalive`, read-only GET to
  `site_settings`). Usage 2026-11-09: DB 26.43 MB of 500 MB, bandwidth 0.016 GB
  of 5 GB — plenty of headroom.

## 6. Content rules a developer must know

- **Real facts only.** College facts, programs (11th & 12th Pre-Medical,
  Pre-Engineering, General Science, BISE Mardan), fees, faculty and contacts come
  from the college itself — never invent programs (no ICS/Commerce/FA), prices or
  people.
- **No student login. No online fee payment. No online apply.** "Apply Now" goes
  to "Visit the College" + address/phone. **Admissions are CLOSED** (since
  2026-11-06) until the owner reopens them.
- **Boys/girls updates are separate.** WhatsApp appears in the footer only.
- **Gallery images:** always use `drive.google.com/thumbnail?id={fileId}&sz=w1000`.
  Never use `lh3.googleusercontent.com` thumbnail links (403 for visitors).
- **Gallery videos:** Admin → Gallery → Gallery Videos → Title + Drive file ID.
  The video must be shared "Anyone with the link can view".
- **Courses:** one course = one Drive folder ID (Admin → Courses → Add New).
  Videos inside list automatically; name files "Video 01, Video 02…" for order.
  Subfolders become sections.
- **Books vs past papers:** the Past Papers page filters `books` by title
  (`*paper*`); its cards render as paper sheets, the Books page as book cards.
  Do not change the filter — the data is correct.
- **Design:** premium, human-crafted, no "AI look". Navy `#0A1B33` + gold
  `#C9A227`. Show concrete visual options before any redesign. The site name in
  Google results must be the college's own name, never "Vercel" (WebSite JSON-LD
  `name` + `og:site_name`).

## 7. Build, deploy, verify

```bash
cd web
npm install
npm run dev      # local preview
npm run build    # production build -> dist/ (prebuild runs the sitemap script)
```

- **Vercel:** push to `main` → auto-deploy. If a deploy looks stale, check it
  built the latest commit; reconnect Git and redeploy HEAD.
- **Cloudflare Pages:** direct-upload deploys are one-off snapshots (GitHub
  pushes do NOT auto-deploy there yet — connecting GitHub is an open task).
  Deploy with the venv python (blake3 lives there):

```bash
~/workspace/venv-cf/bin/python \
  ~/workspace/custom-connectors/custom.cloudflare/bin/pages_deploy.py \
  brighton-college ~/workspace/brighton-college/web/dist main
```

- **Verify a deploy:** home + one client route (`/past-papers`, `/admissions`)
  must return HTTP 200 with the current bundle hash; compare the served bundle
  hash with the local `dist/assets/` build output.
- **Custom domain (pending):** the owner is buying one domain from Hostinger.
  When it exists, add it as a custom domain on the Pages project, update the
  nameservers at Hostinger, then move the Search Console property in the safe
  order (section 2). The `vercel.app` subdomain can never move to Cloudflare —
  its DNS belongs to Vercel.

## 8. SEO and indexing

- Sitemaps: 179 pages (static sitemap + dynamic build script). `robots.txt`
  disallows the admin path. JSON-LD on every page (WebSite, CollegeOrUniversity,
  BreadcrumbList, FAQPage, NewsArticle, Person, EducationalOccupationalProgram).
- Indexing requests are manual only, **max 6 per day per Google account, never
  the full quota** (quota is shared per account and repeatedly blocks on the
  first request). Google crawls on its own — sitemaps do the work.
- Owner attribution ("Arman Ishaq, 17-year-old student, CEO") lives in invisible
  Person JSON-LD only, never in visible titles or footers.

## 9. Open work (2026-11-11)

- Buy the Hostinger domain → custom domain on Pages → Search Console move.
- Connect GitHub to Cloudflare Pages for auto-deploy (GitHub App installed on
  `syedarmanishaq-lang`, installation 180884987; Cloudflare-side link still
  pending — error 8000011 on every attempt, phone + API. Pages is direct-upload
  for now; deploy manually with `pages_deploy.py` after each push. Vercel
  auto-deploys from GitHub as before).
- Ads on Brighton: the owner will put ads on; network (Monetag vs AdSense) undecided.
- Admin panel proposals awaiting the owner's pick: WhatsApp/Call buttons per
  enquiry, gallery organiser, books manager tab, news preview + date picker,
  results draft toggle, messages inbox, college info editor, secure password reset.
- Principal's advanced platform — DEFERRED by the owner: online admissions,
  academy short-course admissions, fees, gate entry count (manual guard-phone
  check-in agreed as the method, no camera counting for now).
- Result-day prep steps 2–5 (stagger announcements, longer Drive cache,
  auto-retry on Drive errors, post-day usage re-check). No result date yet.

## 10. Recovery

- **Backups:** source code on the owner's Google Drive, folder
  `AST - Keys & Source Backup` (per-app folders; this backup is dated
  2026-11-11). Passwords and API tokens are NEVER on Drive.
- **If Vercel is down:** the Pages URL serves the same build.
- **If Supabase pauses:** the keep-alive cron prevents it; if paused, resume it
  from the Supabase dashboard (sign in via GitHub → "Continue with Google",
  `techshazal@gmail.com`, account `brightoncollege-alt`).
- **If a deploy breaks the live site:** Vercel keeps the previous deployment —
  roll back from the Vercel dashboard; for Pages, redeploy the last good `dist/`.
