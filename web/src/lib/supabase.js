/* The Brighton College — Supabase client (plain fetch, no extra dependency).
   Same pattern as Kartly/AST Novels. Public reads use the anon key.
   Every helper is defensive: if BACKEND_LIVE is false (or the request
   fails), it throws a clear error the UI turns into a friendly state. */
import { SUPABASE_URL, SUPABASE_ANON_KEY, BACKEND_LIVE } from '../config.js';

function req(method, path, opts) {
  opts = opts || {};
  const h = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY };
  if (opts.json !== undefined) h['Content-Type'] = 'application/json';
  if (opts.prefer) h['Prefer'] = opts.prefer;
  return fetch(SUPABASE_URL + path, {
    method,
    headers: h,
    body: opts.json !== undefined ? JSON.stringify(opts.json) : null,
  }).then((r) => {
    if (!r.ok) return r.text().then((t) => { throw new Error('Supabase ' + r.status + ': ' + String(t).slice(0, 160)); });
    const ct = r.headers.get('content-type') || '';
    return ct.indexOf('json') !== -1 ? r.json() : r.text();
  });
}

export function backendReady() {
  return BACKEND_LIVE && !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
}

function guard() {
  if (!backendReady()) throw new Error('backend-offline');
}

export const sba = {
  get: (path) => { guard(); return req('GET', path); },
  post: (path, json) => { guard(); return req('POST', path, { json }); },
  patch: (path, json) => { guard(); return req('PATCH', path, { json, prefer: 'return=representation' }); },
  del: (path) => { guard(); return req('DELETE', path); },
};

/* ---------- Colleges (multi-college registry) ---------- */
export const fetchColleges = () =>
  sba.get('/rest/v1/colleges?select=*&order=name.asc');
export const fetchCollegeBySlug = (slug) =>
  sba.get('/rest/v1/colleges?select=*&slug=eq.' + encodeURIComponent(slug) + '&limit=1')
    .then((r) => r && r[0]);

/* Append the college scope to a query when a college id is known. */
function scoped(q, collegeId) {
  return collegeId ? q + '&college_id=eq.' + encodeURIComponent(collegeId) : q;
}

/* ---------- News ---------- */
/* Public reads show only published posts. Admin passes {includeDrafts:true}
   to see (and flip) drafts too. */
export const fetchNews = (limit, collegeId, opts) => {
  let q = '/rest/v1/news_posts?select=*&order=pinned.desc,published_at.desc';
  if (!(opts && opts.includeDrafts)) q += '&published=eq.true';
  if (limit) q += '&limit=' + limit;
  return sba.get(scoped(q, collegeId));
};
export const fetchNewsById = (id, collegeId, opts) => {
  let q = '/rest/v1/news_posts?select=*&id=eq.' + encodeURIComponent(id) + '&limit=1';
  if (!(opts && opts.includeDrafts)) q += '&published=eq.true';
  return sba.get(scoped(q, collegeId)).then((r) => r && r[0]);
};

/* ---------- Test results ---------- */
/* Public reads show only published results. The admin passes no flag
   (and sees drafts too) — same pattern as fetchNews/includeDrafts. */
export const fetchResults = ({ classLevel, testType, collegeId, publishedOnly } = {}) => {
  let q = '/rest/v1/test_results?select=*&order=published_at.desc';
  if (publishedOnly) q += '&published=eq.true';
  if (classLevel) q += '&class_level=eq.' + encodeURIComponent(classLevel);
  if (testType) q += '&test_type=eq.' + encodeURIComponent(testType);
  return sba.get(scoped(q, collegeId));
};

/* ---------- Admissions ---------- */
export const submitApplication = (app) => sba.post('/rest/v1/admission_applications', app);
export const fetchApplications = (collegeId) =>
  sba.get(scoped('/rest/v1/admission_applications?select=*&order=created_at.desc', collegeId));
export const markReviewed = (id, reviewed) =>
  sba.patch('/rest/v1/admission_applications?id=eq.' + encodeURIComponent(id), { reviewed: !!reviewed });

/* ---------- Study material ---------- */
export const fetchMaterial = ({ subject, classLevel, collegeId } = {}) => {
  let q = '/rest/v1/study_material?select=*&order=subject.asc,title.asc';
  if (subject) q += '&subject=eq.' + encodeURIComponent(subject);
  if (classLevel) q += '&class_level=eq.' + encodeURIComponent(classLevel);
  return sba.get(scoped(q, collegeId));
};

/* ---------- Books hub (books table: official textbook PDFs on Drive).
   kind: 'book' (textbooks) or 'paper' (past papers) — distinguished by
   title pattern since the table has no kind column. All filters optional. */
export const fetchBooks = ({ board, classLevel, subject, search, kind } = {}) => {
  guard();
  let q = '/rest/v1/books?select=*&order=board.asc,class_level.asc,subject.asc,title.asc';
  if (board && board !== 'All') q += '&board=eq.' + encodeURIComponent(board);
  if (classLevel && classLevel !== 'All') q += '&class_level=eq.' + encodeURIComponent(classLevel);
  if (subject && subject !== 'All') q += '&subject=eq.' + encodeURIComponent(subject);
  if (search) q += '&title=ilike.*' + encodeURIComponent(search) + '*';
  if (kind === 'paper') q += '&title=ilike.*paper*';
  else if (kind === 'book') q += '&title=not.ilike.*paper*';
  return sba.get(q);
};

/* ---------- Courses (video course library) ---------- */
export const fetchCourses = ({ classLevel, collegeId } = {}) => {
  let q = '/rest/v1/courses?select=*&order=sort.asc,title.asc';
  if (classLevel) q += '&class_level=eq.' + encodeURIComponent(classLevel);
  return sba.get(scoped(q, collegeId));
};
export const fetchCourseById = (id, collegeId) =>
  sba.get(scoped('/rest/v1/courses?select=*&id=eq.' + encodeURIComponent(id) + '&limit=1', collegeId))
    .then((r) => r && r[0])
    .catch(() => null); /* Drive folder IDs aren't UUIDs — return null so the Drive fallback runs */

/* ---------- Gallery ---------- */
export const fetchGallery = (collegeId) =>
  sba.get('/rest/v1/gallery_media?select=*&order=display_order.asc');

/* Admin-uploaded gallery photos live in gallery_images (bucket uploads);
   the public Gallery page merges these with the Drive-based gallery_media.
   NOTE: gallery_media rows carry college_id null, so fetchGallery above
   must stay unscoped — scoping it would hide every Drive photo. */
export const fetchGalleryImages = (collegeId) => {
  const q = '/rest/v1/gallery_images?select=*&order=created_at.desc';
  return sba.get(scoped(q, collegeId));
};

/* ---------- Contact ---------- */
export const submitContact = (msg) => sba.post('/rest/v1/contact_messages', msg);

/* ---------- Pinned notices for the home ticker ---------- */
export const fetchTickerNotices = (collegeId) =>
  sba.get(scoped('/rest/v1/news_posts?select=title&published=eq.true&pinned=eq.true&order=published_at.desc&limit=5', collegeId))
    .then((r) => (r || []).map((n) => n.title));

/* ---------- Supabase Storage uploads (plain fetch, anon key) ----------
   Result pictures, gallery photos and news covers upload straight to the
   matching bucket. Free plan = 1GB, plenty for these small pictures.
   Files over 5MB are rejected with a friendly message. */
export const MAX_UPLOAD_MB = 5;

export function storagePublicUrl(bucket, filename) {
  return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeURIComponent(filename)}`;
}

export async function uploadImage(bucket, file) {
  if (!backendReady()) throw new Error('Backend not connected.');
  if (!file) throw new Error('No file selected.');
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024)
    throw new Error(`That file is too big — please choose an image under ${MAX_UPLOAD_MB}MB.`);
  const safe = String(file.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_') || 'image';
  const filename = Date.now() + '-' + safe;
  const r = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeURIComponent(filename)}`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    }
  );
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error('Upload failed (' + r.status + '). ' + String(t).slice(0, 140));
  }
  return storagePublicUrl(bucket, filename);
}

/* ---------- Admin writes ---------- */
export const adminCreate = (table, row) => sba.post('/rest/v1/' + table, row);
export const adminUpdate = (table, id, row) =>
  sba.patch('/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id), row);
export const adminDelete = (table, id) => sba.del('/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id));

/* ---------- Storage file delete + usage (admin) ----------
   Deleting a gallery/news/result entry also removes its uploaded file from
   the bucket, so the Supabase storage space is actually freed. Files that
   were never uploaded to our buckets (local /gallery/… fallbacks, pasted
   URLs) are left alone — only the DB row is deleted. */
export function storageFileFromUrl(url) {
  if (!url || !SUPABASE_URL) return null;
  const prefix = SUPABASE_URL + '/storage/v1/object/public/';
  if (typeof url !== 'string' || !url.startsWith(prefix)) return null;
  const rest = url.slice(prefix.length).split('/');
  if (rest.length < 2) return null;
  return {
    bucket: decodeURIComponent(rest[0]),
    filename: rest.slice(1).map(decodeURIComponent).join('/'),
  };
}

export async function deleteStorageFile(bucket, filename) {
  guard();
  const path = filename.split('/').map(encodeURIComponent).join('/');
  await req('DELETE', '/storage/v1/object/' + encodeURIComponent(bucket) + '/' + path);
}

/* Delete a DB row and, when it points at one of our storage files, the file
   too. A storage failure never blocks the row delete. */
export async function adminDeleteWithStorage(table, id, fileUrl) {
  const f = fileUrl ? storageFileFromUrl(fileUrl) : null;
  if (f) {
    try { await deleteStorageFile(f.bucket, f.filename); }
    catch (e) { console.warn('storage file delete failed:', e.message); }
  }
  return adminDelete(table, id);
}

/* Sum file sizes across buckets for the admin storage meter.
   Free plan = 1 GB total storage. */
export const STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024;

export async function fetchStorageUsage(buckets) {
  guard();
  const perBucket = {};
  let totalBytes = 0;
  for (const bucket of buckets) {
    let offset = 0, files = 0, bytes = 0;
    for (;;) {
      const r = await req('POST', '/storage/v1/object/list/' + encodeURIComponent(bucket),
        { json: { prefix: '', limit: 100, offset, sortBy: { column: 'name', order: 'asc' } } });
      const list = Array.isArray(r) ? r : [];
      for (const o of list) {
        files++;
        const md = (o && o.metadata) || {};
        const sz = md.size || md.contentLength;
        if (sz) bytes += Number(sz);
      }
      if (list.length < 100) break;
      offset += 100;
    }
    perBucket[bucket] = { files, bytes };
    totalBytes += bytes;
  }
  return { perBucket, totalBytes };
}

/* ---------- Drive course index (fast — pre-scanned, no live Drive calls) ---------- */
export const fetchDriveCourseIndex = (collegeId) =>
  sba.get('/rest/v1/drive_course_index?select=*&order=title.asc')
    .then((r) => r || [])
    .catch(() => []);
