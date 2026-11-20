import React from 'react';
import { useLang } from '../i18n/LangContext.jsx';
import { useShowAds } from '../lib/settings.js';

/* Real ad network config — fill these in when an ad network (e.g. AdSense)
   is actually live. While AD_CLIENT / the slot id are empty, AdSlot renders
   NOTHING: an empty dashed "ADVERTISEMENT" box on every page is worse than
   no box at all. The admin's show_ads switch still gates the slot, so
   turning ads off in /secure-admin/ hides live ads instantly. */
const AD_CLIENT = ''; // e.g. 'ca-pub-XXXXXXXXXXXXXXXX'
const AD_SLOT_IDS = {
  leaderboard: '', // e.g. '1234567890'
  incontent: '',
  box: '',
};

export default function AdSlot({ id, format = 'leaderboard' }) {
  const { t } = useLang();
  const showAds = useShowAds();
  const slotId = AD_SLOT_IDS[format] || '';
  /* No ad network configured yet (or ads switched off) → render nothing.
     The placeholder box used to show on every page with no ad in it. */
  if (!showAds || !AD_CLIENT || !slotId) return null;
  const label = (t.common && t.common.advertisement) || 'Advertisement';
  return (
    <div className="ad-slot-wrap">
      <ins
        className={`adsbygoogle ad-slot ad-slot-${format}`}
        style={{ display: 'block' }}
        role="complementary"
        aria-label={label}
        data-ad-slot-id={id}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
