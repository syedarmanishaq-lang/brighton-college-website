import { useEffect } from 'react';
import { useRewardedAds } from '../lib/settings.js';
import { sessionGated, markSessionGated } from '../lib/rewarded.js';

/* Monetag Vignette Banner — zone 12341452, site 3591003 (Verified).
   The video watch ad for course pages. Monetag offers NO rewarded /
   watch-to-continue format, so Vignette is the watch ad (user's rule:
   videos = Vignette). ONE ad per video per session (user's order
   24 Nov 21:01 PKT — the old 10-minute global cap is gone, it made
   no money): tapping a different lesson shows a NEW ad; re-tapping
   the same lesson in one session never re-gates. Gated by the admin
   rewarded-ads switch. No adult (18+) formats. Replaces the old
   placeholder 5s gate — no fake wait.
   The tag is this Monetag account's standard loader; the zone id
   selects the Vignette format server-side. TAG SOURCE: the user
   pasted the current "Get tag" code from the Monetag dashboard 24 Nov
   19:22 PKT — the Vignette loader is its OWN host/file
   (n6wxm.com/vignette.min.js), NOT the Push loader
   (nap5k.com/tag.min.js); each format has its own tag URL. The old
   5gvci.com/tag.min.js is DEAD — 404 in a real browser. */
const TAG_SRC = 'https://n6wxm.com/vignette.min.js';
const ZONE_ID = '12341452';

export default function MonetagVignette({ videoId }) {
  const rewardedAdsOn = useRewardedAds();
  useEffect(() => {
    if (!rewardedAdsOn || !videoId) return undefined;
    if (sessionGated(videoId)) return undefined;
    // A new video must re-fire the tag: drop the old script first,
    // otherwise the SPA keeps the first load and later videos show no ad.
    document.querySelectorAll('script[data-monetag-vignette]').forEach((el) => el.remove());
    const s = document.createElement('script');
    s.src = TAG_SRC;
    s.async = true;
    s.setAttribute('data-zone', ZONE_ID);
    s.setAttribute('data-cfasync', 'false');
    s.setAttribute('data-monetag-vignette', 'true');
    document.head.appendChild(s);
    markSessionGated(videoId);
    return undefined;
  }, [rewardedAdsOn, videoId]);
  return null;
}
