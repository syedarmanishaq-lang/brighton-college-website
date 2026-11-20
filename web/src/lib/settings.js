/* Site settings — admin-editable global switches (Supabase site_settings
   table, per college), with a localStorage fallback so the public site
   always shows an honest state even when the backend is offline.
   Keys: 'admissions_open' ('true'/'false', default false = CLOSED),
         'show_ads' ('true'/'false', default true),
         'rewarded_ads' ('true'/'false', default true). */
import { useState, useEffect } from 'react';
import { backendReady, sba } from './supabase.js';
import { useCollege } from '../college/CollegeContext.jsx';

const LS_PREFIX = 'bcp_setting_';

/* The local-registry college id ('local-brighton') is a placeholder, not
   a real UUID: a Supabase query scoped with it can never match a row,
   so any fetch using it is a wasted request. Callers skip the network
   until the real UUID arrives (the localStorage value is the fallback
   meanwhile, and its defaults match the live switches). */
export const PLACEHOLDER_COLLEGE_ID = 'local-brighton';
export const isRealCollegeId = (id) => !!id && id !== PLACEHOLDER_COLLEGE_ID;

/* In-memory dedupe for single-key reads: every component that asks for
   the same (college, key) shares ONE in-flight request, and a value
   fetched within the last 60s is reused without a new request. Before
   this, each AdSlot / status hook fired its own query — and re-fired
   every time the college object changed identity — so a page load made
   3-4 identical show_ads requests plus 2 admissions_open ones. */
const inflight = new Map(); /* `${collegeId}:${key}` -> Promise<string> */
const freshCache = new Map(); /* `${collegeId}:${key}` -> { at, value } */
const SETTING_TTL_MS = 60 * 1000;

export function localSetting(key, def) {
  try {
    const v = localStorage.getItem(LS_PREFIX + key);
    return v === null ? def : v;
  } catch { return def; }
}

export function saveLocalSetting(key, value) {
  try { localStorage.setItem(LS_PREFIX + key, value); } catch {}
}

/* Read one setting from Supabase; falls back to the local value (or def)
   when the backend is offline or the row is missing. Identical concurrent
   reads share one request (see inflight cache above); a placeholder
   college id never hits the network at all. */
export async function getSetting(collegeId, key, def) {
  if (!backendReady() || !isRealCollegeId(collegeId)) return localSetting(key, def);
  const ck = collegeId + ':' + key;
  const fresh = freshCache.get(ck);
  if (fresh && Date.now() - fresh.at < SETTING_TTL_MS) return fresh.value;
  const pending = inflight.get(ck);
  if (pending) return pending;
  const p = (async () => {
    try {
      const q = '/rest/v1/site_settings?select=value'
        + '&college_id=eq.' + encodeURIComponent(collegeId)
        + '&key=eq.' + encodeURIComponent(key) + '&limit=1';
      const rows = await sba.get(q);
      if (rows && rows[0] && rows[0].value !== undefined && rows[0].value !== null) {
        const v = String(rows[0].value);
        saveLocalSetting(key, v);
        freshCache.set(ck, { at: Date.now(), value: v });
        return v;
      }
    } catch {}
    return localSetting(key, def);
  })();
  inflight.set(ck, p);
  p.finally(() => { if (inflight.get(ck) === p) inflight.delete(ck); });
  return p;
}

/* Write one setting (upsert by college_id+key). Also updates the local
   fallback immediately so the public site reflects the change at once. */
export async function setSetting(collegeId, key, value) {
  const v = String(value);
  saveLocalSetting(key, v);
  if (!backendReady() || !collegeId) return v;
  const base = '/rest/v1/site_settings';
  const match = '?college_id=eq.' + encodeURIComponent(collegeId)
    + '&key=eq.' + encodeURIComponent(key) + '&limit=1';
  const rows = await sba.get(base + '?select=id&' + match.slice(1));
  if (rows && rows[0]) {
    await sba.patch(base + '?id=eq.' + encodeURIComponent(rows[0].id),
      { value: v, updated_at: new Date().toISOString() });
  } else {
    await sba.post(base, { college_id: collegeId, key, value: v });
  }
  return v;
}

/* Key-only read/write for GLOBAL settings that belong to no single college
   (today: 'admin_pw_hash'). The per-college helpers above need a real
   college UUID, which the login screen does not have yet (it renders before
   the colleges list is fetched, and the local fallback id 'local-brighton'
   is not a UUID) — so a college-scoped lookup can never find the hash.
   A key-only lookup avoids that chicken-and-egg entirely. */
export async function getSettingByKey(key, def) {
  if (!backendReady()) return localSetting(key, def);
  try {
    const q = '/rest/v1/site_settings?select=value'
      + '&key=eq.' + encodeURIComponent(key) + '&limit=1';
    const rows = await sba.get(q);
    if (rows && rows[0] && rows[0].value !== undefined && rows[0].value !== null) {
      saveLocalSetting(key, String(rows[0].value));
      return String(rows[0].value);
    }
  } catch {}
  return localSetting(key, def);
}

export async function setSettingByKey(key, value) {
  const v = String(value);
  saveLocalSetting(key, v);
  if (!backendReady()) return v;
  const base = '/rest/v1/site_settings';
  const match = '?key=eq.' + encodeURIComponent(key) + '&limit=1';
  const rows = await sba.get(base + '?select=id&' + match.slice(1));
  if (rows && rows[0]) {
    await sba.patch(base + '?id=eq.' + encodeURIComponent(rows[0].id),
      { value: v, updated_at: new Date().toISOString() });
  } else {
    await sba.post(base, { key, value: v });
  }
  return v;
}

/* React hook: live value of a setting ('true'/'false' strings).
   Starts from localStorage so first paint is never wrong.
   Depends on the college ID string (stable), not the college object
   (which changes identity when the admin-edited info merges in) — the
   old object dep re-fired this fetch on every college swap. */
export function useSiteSetting(key, def) {
  const [value, setValue] = useState(() => localSetting(key, def));
  const { college } = useCollege();
  const collegeId = college && college.id;
  useEffect(() => {
    let live = true;
    if (!backendReady() || !isRealCollegeId(collegeId)) return undefined;
    getSetting(collegeId, key, def).then((v) => { if (live) setValue(v); }).catch(() => {});
    return () => { live = false; };
  }, [collegeId, key, def]);
  return value;
}

/* Admissions status for the public site. Default = CLOSED (false). */
export function useAdmissionsOpen() {
  return useSiteSetting('admissions_open', 'false') === 'true';
}

/* College info fields — admin-editable identity/contact details.
   Stored as per-college site_settings keys 'info_*'. An empty value
   means "no override": the public site falls back to the built-in
   SITE defaults, so a blank field can never wipe a value from the
   site. `name` + `tagline` are NOT here — they live on the `colleges`
   row itself and are edited through adminUpdate. */
export const INFO_FIELDS = [
  { key: 'info_address', label: 'Address', site: 'address' },
  { key: 'info_phone', label: 'Phone(s)', site: 'phone' },
  { key: 'info_email', label: 'Email', site: 'email' },
  { key: 'info_website', label: 'Website', site: 'website' },
  { key: 'info_motto', label: 'Motto', site: 'motto' },
  { key: 'info_founded', label: 'Founded', site: 'founded' },
  { key: 'info_board', label: 'Board', site: 'board' },
  { key: 'info_principal_name', label: 'Principal — name', site: 'principalName' },
  { key: 'info_principal_title', label: 'Principal — title', site: 'principalTitle' },
  { key: 'info_coordinator_name', label: 'Academic Coordinator — name', site: 'coordinatorName' },
  { key: 'info_coordinator_title', label: 'Academic Coordinator — title', site: 'coordinatorTitle' },
  { key: 'info_whatsapp', label: 'WhatsApp number (digits only, e.g. 923179609048)', site: 'whatsapp' },
  { key: 'info_fee_note', label: 'Fee note (shown under the fee plan on Admissions)', site: 'feeNote' },
];

/* Read all info_* settings for a college. Returns { siteKey: value }
   for every key that has a non-empty value (empty = use the default). */
export async function getInfoSettings(collegeId) {
  const out = {};
  for (const f of INFO_FIELDS) {
    const v = await getSetting(collegeId, f.key, '');
    if (v !== undefined && v !== null && String(v).trim() !== '') out[f.site] = String(v);
  }
  return out;
}

/* Write the info fields. Only keys present in `values` are written;
   an empty string stores an empty override, which the public site
   treats as "use the built-in default". */
export async function setInfoSettings(collegeId, values) {
  for (const f of INFO_FIELDS) {
    if (!(f.site in values)) continue;
    await setSetting(collegeId, f.key, String(values[f.site] ?? '').trim());
  }
}

/* Whether ad slots should render. Default = true. */
export function useShowAds() {
  return useSiteSetting('show_ads', 'true') === 'true';
}

/* Whether rewarded pre-roll ads gate course videos. Default = true. */
export function useRewardedAds() {
  return useSiteSetting('rewarded_ads', 'true') === 'true';
}
