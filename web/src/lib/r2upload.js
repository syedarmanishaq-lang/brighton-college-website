/* R2 image uploads for the admin panel (via the brighton-upload Worker).
   The browser never holds R2 credentials: the Worker checks the admin
   password hash (the same SHA-256 the panel already keeps in
   localStorage after login) and does the R2 write server-side.
   Also: Drive-link helper — turns a Drive share link or bare file ID
   into the public thumbnail URL the gallery already uses. */
import { R2_UPLOAD_URL } from '../config.js';
import { MAX_UPLOAD_MB } from './supabase.js';

const PW_KEY = 'brighton_admin_pw'; // SHA-256 hex of the admin password

export function driveImageUrl(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  // Bare file ID (Drive IDs are ~25-44 chars of [A-Za-z0-9_-]).
  if (/^[A-Za-z0-9_-]{20,}$/.test(s)) {
    return 'https://drive.google.com/thumbnail?id=' + s + '&sz=w1000';
  }
  let m = s.match(/\/d\/([A-Za-z0-9_-]{10,})/);
  if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1000';
  m = s.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1000';
  m = s.match(/thumbnail\?id=([A-Za-z0-9_-]{10,})/);
  if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1000';
  return null;
}

export async function uploadToR2(file, kind) {
  if (!file) throw new Error('No file selected.');
  if (!String(file.type || '').startsWith('image/')) {
    throw new Error('Only images are allowed.');
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new Error('That file is too big — please choose an image under ' + MAX_UPLOAD_MB + 'MB.');
  }
  const hash = (() => { try { return localStorage.getItem(PW_KEY) || ''; } catch { return ''; } })();
  if (!hash) throw new Error('Please sign in to the admin panel again, then retry the upload.');
  const form = new FormData();
  form.append('file', file);
  form.append('kind', kind || 'gallery');
  let r;
  try {
    r = await fetch(R2_UPLOAD_URL, {
      method: 'POST',
      headers: { 'X-Admin-Hash': hash },
      body: form,
    });
  } catch {
    throw new Error('Could not reach the upload service. Check your connection and retry.');
  }
  let body = null;
  try { body = await r.json(); } catch { /* fall through */ }
  if (!r.ok) {
    throw new Error((body && body.error) || ('Upload failed (' + r.status + ').'));
  }
  if (!body || !body.url) throw new Error('Upload finished but no file link came back.');
  return body.url;
}
