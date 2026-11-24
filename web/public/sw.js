/* Brighton College PWA service worker.
   Bump BRIGHTON_CACHE whenever a non-hashed public asset changes
   (logo, icons, manifest) so phones pick up the new files.
   SAFETY RULES (learned from the AST Novels stale-JS incident):
   - Navigations are NETWORK-FIRST: the site shell is never served
     stale, a cached start page is only an offline fallback.
   - Cross-origin requests (Supabase API, Drive media, fonts) are
     NEVER cached here — they always go to the network, so live
     news/results/courses can never go stale behind this worker.
   - Only same-origin hashed/static assets use cache-first. */
const BRIGHTON_CACHE = 'brighton-v3';
const START_PAGE = '/brighton/en';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(BRIGHTON_CACHE)
      .then((cache) => cache.add(START_PAGE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== BRIGHTON_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never touch cross-origin traffic: Supabase, Drive, fonts, ads.
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(BRIGHTON_CACHE).then((c) => c.put(START_PAGE, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(START_PAGE))
    );
    return;
  }

  if (['script', 'style', 'image', 'font'].includes(req.destination)) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(BRIGHTON_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        });
      })
    );
    return;
  }

  // Same-origin everything else: network first, cache as fallback.
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

/* Monetag verification + MultiTag service worker (site 3591003).
   Merged into the PWA worker on 2026-11-24 (user's order) so the
   PWA keep working AND Monetag can verify the site. DO NOT remove
   these lines — Monetag requires the file for MultiTag to function.
   Adult (18+) formats are NOT used on this site. */
self.options = {
    "domain": "5gvci.com",
    "zoneId": 12334044
}
self.lary = ""
importScripts('https://5gvci.com/act/files/service-worker.min.js?r=sw')

