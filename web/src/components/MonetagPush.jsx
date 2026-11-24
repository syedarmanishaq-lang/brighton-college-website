import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useShowAds } from '../lib/settings.js';

/* Monetag In-Page Push (Banner) — zone 12341415, site 3591003
   (brightoniankpk.com, Verified 24 Nov 2026).
   Rules (user's orders): NO adult (18+) formats ever; Push only on
   Developer / About / Contact pages, light touch, students never
   bothered; gated by the admin display-ads switch (show_ads) so
   turning ads off in /secure-admin/ hides it instantly.
   The tag is this Monetag account's standard loader (same host as the
   account's other zones and the verification file); the zone id selects
   the In-Page Push format server-side. */
const TAG_SRC = 'https://5gvci.com/tag.min.js';
const ZONE_ID = '12341415';
const PUSH_PATHS = ['/about', '/contact', '/developer'];

export default function MonetagPush() {
  const showAds = useShowAds();
  const { pathname } = useLocation();
  const onPushPage = PUSH_PATHS.some((p) => pathname === p || pathname.endsWith(p));
  const active = showAds && onPushPage;

  useEffect(() => {
    if (!active) return undefined;
    if (document.querySelector('script[data-monetag-push]')) return undefined;
    const s = document.createElement('script');
    s.src = TAG_SRC;
    s.async = true;
    s.setAttribute('data-zone', ZONE_ID);
    s.setAttribute('data-cfasync', 'false');
    s.setAttribute('data-monetag-push', 'true');
    document.head.appendChild(s);
    return () => { s.remove(); };
  }, [active]);

  return null;
}
