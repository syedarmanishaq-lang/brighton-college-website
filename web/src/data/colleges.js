/* Multi-college registry (Phase 4).
   Local fallback used when the Supabase backend is not connected yet.
   The Brighton entry mirrors web/src/config.js SITE exactly, so the
   default site renders pixel-identical with or without the backend.
   NO invented colleges — only Brighton exists. New colleges are added
   as rows in the `colleges` table (see supabase/migrations/002). */
import { SITE, WHATSAPP_NUMBER } from '../config.js';

export const DEFAULT_COLLEGE_SLUG = 'brighton';

/* Local shape mirrors the DB row + a `site` block shaped like SITE.
   The id below is the REAL Supabase UUID for Brighton (stable — row ids
   never change). Baking it in means the public site's scoped queries
   (news, courses, settings, info) can fire immediately on first paint
   instead of waiting ~1s for the background colleges fetch; that fetch
   still runs and swaps in the live row when it arrives, so if the UUID
   ever changed the site would simply fall back to the old behaviour. */
export const COLLEGES = {
  brighton: {
    id: '96e45411-8fba-42f7-b106-ed5fcc293d3b',
    slug: 'brighton',
    logo_url: '',
    primary_color: '#0A1B33',
    accent_color: '#C9A227',
    whatsapp: WHATSAPP_NUMBER,
    site: { ...SITE },
    _local: true,
  },
};

/** Synchronous local lookup — safe to call during routing. */
export function getLocalCollege(slug) {
  return COLLEGES[slug] || null;
}

export function knownLocalSlugs() {
  return Object.keys(COLLEGES);
}
