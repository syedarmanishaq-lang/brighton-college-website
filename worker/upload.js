/* Brighton College — R2 image upload worker.
   POST multipart (file + kind) with header X-Admin-Hash (the SHA-256 hex
   of the admin password, same value the admin panel keeps after login).
   The worker checks the hash against Supabase site_settings
   (admin_pw_hash) — the SAME check the admin panel itself does, so no
   new credential exists anywhere. Valid images (<=5MB) go to the R2
   bucket brighton-college-media under <kind>/<timestamp>-<name> and the
   public r2.dev URL comes back. No other method, origin or file type
   is accepted. The anon key below is the PUBLIC Supabase anon key —
   the same value already shipped in the site's own config.js. */
const SUPABASE_URL = 'https://vhmqofxciisnrxrzbovq.supabase.co';
const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__'; // replaced at deploy time from web/src/config.js
const R2_PUBLIC = 'https://pub-657f762b08ff455cb0cff1c7f48b2217.r2.dev';
const ALLOWED_ORIGINS = [
  'https://brighton-college-website.vercel.app',
  'https://brighton-college.pages.dev',
];
const MAX_BYTES = 5 * 1024 * 1024;

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Hash',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

async function expectedHash() {
  const r = await fetch(
    SUPABASE_URL + '/rest/v1/site_settings?select=value&key=eq.admin_pw_hash&limit=1',
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } }
  );
  if (!r.ok) return null;
  const rows = await r.json();
  return rows && rows[0] ? String(rows[0].value) : null;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, cors);
    }
    const provided = request.headers.get('X-Admin-Hash') || '';
    if (!provided) return json({ error: 'Missing admin auth' }, 401, cors);
    let expected = null;
    try { expected = await expectedHash(); } catch { /* fall through */ }
    if (!expected || provided !== expected) {
      return json({ error: 'Wrong admin password' }, 403, cors);
    }
    let form = null;
    try { form = await request.formData(); } catch { /* fall through */ }
    if (!form) return json({ error: 'Bad upload' }, 400, cors);
    const file = form.get('file');
    const kind = String(form.get('kind') || 'gallery').replace(/[^a-z]/g, '') || 'gallery';
    if (!file || typeof file === 'string') return json({ error: 'No file attached' }, 400, cors);
    if (!String(file.type || '').startsWith('image/')) {
      return json({ error: 'Only images are allowed' }, 400, cors);
    }
    if (file.size > MAX_BYTES) {
      return json({ error: 'Image too big — max 5MB' }, 400, cors);
    }
    const safe = String(file.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_') || 'image';
    const key = kind + '/' + Date.now() + '-' + safe;
    await env.MEDIA.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
    });
    return json({ url: R2_PUBLIC + '/' + key, key }, 200, cors);
  },
};
