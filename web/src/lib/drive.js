/* The Brighton College — Google Drive helper (study material library).
   Lists files inside the configured Drive folder via the public Drive API.
   Needs DRIVE_API_KEY + DRIVE_FOLDER_ID in config.js. Returns [] when the
   key is missing so the UI can show its "coming soon" state. */
import { DRIVE_API_KEY, DRIVE_FOLDER_ID } from '../config.js';
import { cacheFresh, cacheSet, cacheClear } from './cache.js';

export function driveReady() {
  return !!DRIVE_API_KEY && !!DRIVE_FOLDER_ID;
}

/* List files in a folder (defaults to the configured root folder). */
export async function driveList(folderId) {
  if (!driveReady()) return [];
  const q = encodeURIComponent(`'${folderId || DRIVE_FOLDER_ID}' in parents and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}` +
    `&fields=files(id,name,mimeType,size,modifiedTime,thumbnailLink)` +
    `&orderBy=name&key=${encodeURIComponent(DRIVE_API_KEY)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Drive ' + r.status);
  const j = await r.json();
  return j.files || [];
}

export function drivePreviewUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/* Get a single file/folder's metadata (used for Drive-folder courses:
   folder name becomes the course title). */
export async function driveGetFile(fileId) {
  if (!driveReady()) return null;
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}` +
    `?fields=id,name,mimeType,thumbnailLink&key=${encodeURIComponent(DRIVE_API_KEY)}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  return r.json();
}

export function driveDownloadUrl(fileId) {
  /* Direct streaming via Drive API (supports range requests, works for public files) */
  if (DRIVE_API_KEY) {
    return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(DRIVE_API_KEY)}`;
  }
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/* Check if a folder is a "bundle" (contains sub-courses, not direct videos).
   RECURSIVE: also expands nested bundles. Returns flat list of course folders. */
export async function driveExpandBundle(folderId, depth = 0) {
  if (!driveReady() || depth > 3) return null;
  try {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    let r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)&pageSize=100&key=${encodeURIComponent(DRIVE_API_KEY)}`);
    let d = await r.json();
    const files = d.files || [];
    const subfolders = files.filter((f) => f.mimeType === 'application/vnd.google-apps.folder' &&
      !/for more premium/i.test(f.name));
    const videos = files.filter((f) => f.mimeType.startsWith('video/'));
    /* It's a bundle if it has 2+ subfolders and few/no direct videos */
    if (subfolders.length >= 2 && videos.length <= 2) {
      const expanded = [];
      for (const sub of subfolders) {
        const nested = await driveExpandBundle(sub.id, depth + 1);
        if (nested) expanded.push(...nested);
        else expanded.push(sub);
      }
      return expanded;
    }
  } catch { /* fall through */ }
  return null;
}

/* Lightweight: get ONE video's thumbnail from a folder (for course cards).
   Checks root videos first, then the first subfolder. Returns a public
   drive.google.com/thumbnail URL — lh3 thumbnailLinks 403 for anonymous
   visitors, so they must never be used in <img> tags. */
export async function driveFirstVideoThumb(folderId) {
  if (!driveReady()) return null;
  const fields = 'files(id,mimeType,thumbnailLink)';
  const q1 = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'video/' and trashed = false`);
  try {
    let r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q1}&fields=${fields}&pageSize=1&key=${encodeURIComponent(DRIVE_API_KEY)}`);
    let d = await r.json();
    if (d.files && d.files[0] && d.files[0].id) return 'https://drive.google.com/thumbnail?id=' + d.files[0].id + '&sz=w1000';
    /* no root video — check first subfolder */
    const q2 = encodeURIComponent(`'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q2}&fields=${fields}&pageSize=1&orderBy=name&key=${encodeURIComponent(DRIVE_API_KEY)}`);
    d = await r.json();
    if (d.files && d.files[0]) {
      const q3 = encodeURIComponent(`'${d.files[0].id}' in parents and mimeType contains 'video/' and trashed = false`);
      r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q3}&fields=${fields}&pageSize=1&key=${encodeURIComponent(DRIVE_API_KEY)}`);
      d = await r.json();
      if (d.files && d.files[0] && d.files[0].id) return 'https://drive.google.com/thumbnail?id=' + d.files[0].id + '&sz=w1000';
    }
  } catch { /* fall through */ }
  return null;
}

export function isFolder(mimeType) {
  return mimeType === 'application/vnd.google-apps.folder';
}

/* Clean a video filename for display: removes .mp4 extension,
   leading numbers like "1. " or "01 - ", and junk. */
export function cleanVideoName(raw) {
  let s = cleanCourseName(raw || '');
  s = s.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '');  // remove video extension
  s = s.replace(/^\d+\s*[-.)]\s*/, '');            // remove leading "1. " / "01 - "
  return s.trim();
}

/* Map a course name to a professional category thumbnail.
   Returns the public URL of the best-matching thumbnail. */
const THUMB_CATS = [
  { file: 'thumb-cybersecurity.jpg', keys: ['cyber security masterclass'] },
  { file: 'thumb-hacking.webp', keys: ['hack', 'cyber', 'termux', 'wifi', 'kali', 'security', 'pentest', 'android hack', 'ethical'] },
  { file: 'thumb-trading.webp', keys: ['trad', 'forex', 'crypto', 'stock', 'invest', 'binance'] },
  { file: 'thumb-youtube.webp', keys: ['youtube', 'podcast', 'content lab', 'vlog'] },
  { file: 'thumb-design.webp', keys: ['design', 'canva', 'graphic', 'photoshop', 'illustrator', '3d', 'painting', 'draw'] },
  { file: 'thumb-programming.webp', keys: ['python', 'programming', 'code', 'coding', 'flutter', 'app develop', 'git', 'github', 'linux', 'ubuntu', 'software test', 'android'] },
  { file: 'thumb-marketing.webp', keys: ['market', 'seo', 'adsense', 'facebook ads', 'arbitrage', 'affiliate', 'brand'] },
  { file: 'thumb-freelancing.webp', keys: ['freelanc', 'agency', 'fiverr', 'upwork', 'personal brand', 'earn money', 'earn ', ' ways to earn'] },
  { file: 'thumb-videoedit.webp', keys: ['capcut', 'video edit', 'premiere', 'audition', 'animation'] },
  { file: 'thumb-ai.webp', keys: [' ai ', 'artificial intelligence', 'chatgpt', 'machine learning', 'mind reader', 'mystic brain'] },
  { file: 'thumb-ecommerce.webp', keys: ['ecom', 'shopify', 'dropship', 'amazon', 'digital product'] },
  { file: 'thumb-english.webp', keys: ['english', 'spoken', 'language'] },
];
/* Readable category label for a course name — same keyword groups as the
   category thumbnails, so a filter chip always matches the card image. */
const CAT_LABELS = ['Cyber Security', 'Cyber Security', 'Trading & Crypto',
  'YouTube & Content', 'Design', 'Programming', 'Marketing & SEO',
  'Freelancing', 'Video Editing', 'AI', 'E-Commerce', 'English'];
export function courseCategoryFor(name) {
  const n = (' ' + (name || '') + ' ').toLowerCase();
  for (let i = 0; i < THUMB_CATS.length; i++) {
    if (THUMB_CATS[i].keys.some((k) => n.includes(k))) return CAT_LABELS[i];
  }
  return 'General';
}
export function courseThumbFor(name) {
  const n = (' ' + (name || '') + ' ').toLowerCase();
  for (const c of THUMB_CATS) {
    if (c.keys.some((k) => n.includes(k))) return '/course-thumbs/' + c.file;
  }
  return '/course-thumbs/thumb-general.webp';
}

/* Designed per-course thumbnail: generated art in /course-art/, one file
   per Drive folder ID. Callers chain onError to the real video thumbnail
   and then to courseThumbFor, so a missing art file never breaks the card. */
export function courseArtFor(folderId) {
  return folderId ? ('/course-art/' + folderId + '.webp') : null;
}

/* Deterministic hue for a course name — makes fallback thumbnails visually unique. */
export function courseHue(name) {
  let h = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

/* Unique thumbnail per course: hash the name to pick from ALL thumbnails.
   Guarantees no two courses share the same image. */
const ALL_THUMBS = [
  'thumb-hacking.webp', 'thumb-trading.webp', 'thumb-youtube.webp', 'thumb-design.webp',
  'thumb-programming.webp', 'thumb-marketing.webp', 'thumb-freelancing.webp', 'thumb-videoedit.webp',
  'thumb-ai.webp', 'thumb-ecommerce.webp', 'thumb-english.webp', 'thumb-general.webp',
];
export function uniqueCourseThumb(name, folderId) {
  const key = String(folderId || name || '');
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return '/course-thumbs/' + ALL_THUMBS[h % ALL_THUMBS.length];
}

/* Clean a Drive folder/file name into a professional course title:
   removes @mentions (@AHM7TECH etc), underscores -> spaces,
   trims, collapses whitespace, title-cases sensibly. */
export function cleanCourseName(raw) {
  if (!raw) return '';
  let s = String(raw);
  s = s.replace(/@[\w.]+/g, ' ');                    // @mentions
  s = s.replace(/(?:https?:\/\/)?(?:www\.)?[\w-]+\.(?:com|app|me|net|org|pk|io)[\w\/.-]*/gi, ' '); // URLs/domains
  s = s.replace(/\b[\w.-]*(?:ahm7|ahmtech)[\w.-]*\b/gi, ' '); // ahm7/ahmtech variants
  s = s.replace(/[-–—|]+/g, ' ');                   // dashes/pipes -> space
  s = s.replace(/_/g, ' ');                         // underscores -> spaces
  s = s.replace(/\bgoogle drive\b/gi, ' ');         // "Google Drive" suffix
  s = s.replace(/\s+/g, ' ').trim();               // collapse whitespace
  s = s.replace(/^[.\s]+|[.\s]+$/g, '');           // trim dots/spaces
  return s;
}

/* ---------- Paginated folder listing with simple caching ----------
   Drive API has rate limits; 700GB+ libraries mean many files.
   driveListAll walks all pages (100/page via pageToken) and caches the
   result per folder for CACHE_TTL_MS so repeated visits don't hammer
   the API. Playback itself (preview iframe) costs no API quota. */
const CACHE_TTL_MS = 10 * 60 * 1000;
const _cache = {}; // folderId -> { at, files }

export function clearDriveCache(folderId) {
  if (folderId) {
    delete _cache[folderId];
    cacheClear('drive:' + folderId);
  } else {
    Object.keys(_cache).forEach((k) => delete _cache[k]);
    cacheClear('drive:');
  }
}

export async function driveListAll(folderId, { orderBy = 'name' } = {}) {  if (!driveReady()) return [];
  const cached = _cache[folderId];
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.files;
  /* SPEED + OFFLINE: the list also lives in localStorage, so repeat
     visits (and offline visits) show the saved library instantly
     instead of waiting on the Drive API again. */
  const stored = cacheFresh('drive:' + folderId, CACHE_TTL_MS);
  if (stored) {
    _cache[folderId] = { at: Date.now(), files: stored };
    return stored;
  }

  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  let files = [];
  let pageToken = '';
  // Safety cap: 2000 files per folder per load (20 pages) — plenty for a course.
  for (let page = 0; page < 20; page++) {
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}` +
      `&fields=nextPageToken,files(id,name,mimeType,size,modifiedTime,thumbnailLink)` +
      `&orderBy=${orderBy}&pageSize=100` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '') +
      `&key=${encodeURIComponent(DRIVE_API_KEY)}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('Drive ' + r.status);
    const j = await r.json();
    files = files.concat(j.files || []);
    pageToken = j.nextPageToken || '';
    if (!pageToken) break;
  }
  _cache[folderId] = { at: Date.now(), files };
  cacheSet('drive:' + folderId, files);
  return files;
}
