import { useEffect } from 'react';
import { useRewardedAds } from '../lib/settings.js';
import { rewardCapReady, markRewardShown, sessionGated, markSessionGated } from '../lib/rewarded.js';

/* Monetag Vignette Banner — zone 12341452, site 3591003 (Verified).
   The video watch ad for course pages. Monetag offers NO rewarded /
   watch-to-continue format, so Vignette is the watch ad (user's rule:
   videos = Vignette). Shows at most once per course per session and
   at most once per 10 minutes per user (same caps as the old rewarded
   gate), gated by the admin rewarded-ads switch. No adult (18+)
   formats. Replaces the old placeholder 5s gate — no fake wait.
   The tag is this Monetag account's standard loader; the zone id
   selects the Vignette format server-side. */
const TAG_SRC = 'https://5gvci.com/tag.min.js';
const ZONE_ID = '12341452';

export default function MonetagVignette({ courseId }) {
  const rewardedAdsOn = useRewardedAds();
  useEffect(() => {
    if (!rewardedAdsOn) return undefined;
    if (!rewardCapReady() || sessionGated(courseId)) return undefined;
    if (document.querySelector('script[data-monetag-vignette]')) return undefined;
    const s = document.createElement('script');
    s.src = TAG_SRC;
    s.async = true;
    s.setAttribute('data-zone', ZONE_ID);
    s.setAttribute('data-cfasync', 'false');
    s.setAttribute('data-monetag-vignette', 'true');
    document.head.appendChild(s);
    markRewardShown();
    markSessionGated(courseId);
    return undefined;
  }, [rewardedAdsOn, courseId]);
  return null;
}
