/* Watch-ad gate — one ad per video (user's order 24 Nov 21:01 PKT:
   10 minutes was too long, no money in it). Rules: max ONE watch ad
   per video per browser session (sessionStorage set, so re-tapping
   the same lesson in one sitting never re-gates); a DIFFERENT video
   gets a NEW ad — no time cap between videos. */

const SS_KEY = 'bcp_rewarded_session';

function ssGet() {
  try { return JSON.parse(window.sessionStorage.getItem(SS_KEY) || '[]'); }
  catch { return []; }
}
function ssSet(arr) {
  try { window.sessionStorage.setItem(SS_KEY, JSON.stringify(arr)); } catch { /* ignore */ }
}

/* Was this video already gated once this session? */
export function sessionGated(videoId) {
  return ssGet().includes(String(videoId));
}

/* Remember that this video was gated this session. */
export function markSessionGated(videoId) {
  const arr = ssGet();
  const id = String(videoId);
  if (!arr.includes(id)) { arr.push(id); ssSet(arr); }
}
