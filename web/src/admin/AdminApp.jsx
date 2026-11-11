/* The Brighton College — Admin panel (/adminsecuresex/).
   App-level password login. The password hash lives in Supabase
   site_settings under key 'admin_pw_hash' (global, not per-college),
   so it works on every device. localStorage only holds a fallback copy
   in the browser where the password was set. */
import './admin.css';
import { useState, useEffect, useCallback } from 'react';
import {
  sba, backendReady,
  fetchNews, fetchCourses, fetchResults, fetchMaterial, fetchGallery, fetchGalleryImages,
  fetchApplications, markReviewed, adminCreate, adminUpdate, adminDelete,
  adminDeleteWithStorage, uploadImage, MAX_UPLOAD_MB, fetchColleges,
  fetchStorageUsage, STORAGE_QUOTA_BYTES,
} from '../lib/supabase.js';
import { mapCollegeRow } from '../college/CollegeContext.jsx';
import { getLocalCollege, knownLocalSlugs, DEFAULT_COLLEGE_SLUG } from '../data/colleges.js';
import { NEWS_CATEGORIES, TEST_TYPES, CLASS_LEVELS, FILE_TYPES, PROGRAMS } from '../data/college.js';
import { clearDriveCache } from '../lib/drive.js';
import { uploadToR2, driveImageUrl } from '../lib/r2upload.js';
import { getSetting, setSetting, getSettingByKey, setSettingByKey } from '../lib/settings.js';

/* Tables scoped to a college — admin writes stamp the active college_id. */
const COLLEGE_SCOPED_TABLES = ['news_posts', 'courses', 'test_results', 'study_material', 'gallery_images'];

const SESSION_KEY = 'brighton_admin_ok';
const PW_KEY = 'brighton_admin_pw'; // SHA-256 hex of the admin password (this browser)

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ================= Login =================
   First visit: the owner SETS the admin password (stored as a SHA-256 hash
   in Supabase site_settings — works on every device — plus a localStorage
   fallback copy in this browser).
   Later visits: password check against that hash. */
function Login({ onOk }) {
  const [mode, setMode] = useState(null); // 'setup' | 'login'
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const hash = await getSettingByKey('admin_pw_hash');
        setMode(hash ? 'login' : 'setup');
      } catch {
        setMode(localStorage.getItem(PW_KEY) ? 'login' : 'setup');
      }
    })();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (mode === 'setup') {
      if (pw.length < 6) { setErr('Password must be at least 6 characters.'); return; }
      if (pw !== pw2) { setErr('Passwords do not match.'); return; }
      const hash = await sha256(pw);
      try { await setSettingByKey('admin_pw_hash', hash); } catch {}
      localStorage.setItem(PW_KEY, hash);
      sessionStorage.setItem(SESSION_KEY, '1');
      onOk();
    } else {
      const hash = await sha256(pw);
      let stored = null;
      try { stored = await getSettingByKey('admin_pw_hash'); } catch {}
      if (!stored) stored = localStorage.getItem(PW_KEY);
      const ok = hash === stored;
      if (ok) {
        /* Keep the verified hash in this browser: the R2 upload sends
           this same value to the Worker, so a stale setup-time hash
           must never linger here (it made every R2 upload fail with
           "Wrong admin password" even right after a good sign-in). */
        try { localStorage.setItem(PW_KEY, hash); } catch {}
        sessionStorage.setItem(SESSION_KEY, '1');
        onOk();
      } else {
        setErr('Wrong password.');
      }
    }
  }

  if (!mode) return <div className="adm-login-wrap"><div className="loading">…</div></div>;

  return (
    <div className="adm-login-wrap">
      <form className="adm-login" onSubmit={submit}>
        <div style={{ margin: '0 auto 14px', textAlign: 'center' }}>
          <img src="/logo-crest.png" alt="The Brighton College" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #d9b545' }} />
        </div>
        <h2>The Brighton College</h2>
        <p className="muted" style={{ fontWeight: 600 }}>Admin Panel</p>
        <p className="muted">
          {mode === 'setup'
            ? 'First time here — set your admin password.'
            : 'The Brighton College — secure area'}
        </p>
        {err && <div className="alert err">{err}</div>}
        <input type="password" placeholder={mode === 'setup' ? 'New admin password' : 'Admin password'}
          value={pw} onChange={(e) => setPw(e.target.value)} autoFocus
          style={{ width: '100%', marginBottom: 10 }} />
        {mode === 'setup' && (
          <input type="password" placeholder="Repeat password" value={pw2}
            onChange={(e) => setPw2(e.target.value)} style={{ width: '100%' }} />
        )}
        <button className="btn btn-gold" style={{ width: '100%', marginTop: 12 }}>
          {mode === 'setup' ? 'Set Password & Sign In' : 'Sign In'}
        </button>
        {mode === 'login' && (
          <p style={{ textAlign: 'center', marginTop: 12 }}>
            <button type="button" onClick={() => { if (confirm('Reset admin password? You will set a new one.')) { localStorage.removeItem(PW_KEY); sessionStorage.removeItem(SESSION_KEY); setMode('setup'); setPw(''); setPw2(''); setErr(''); } }} style={{ background: 'none', border: 'none', color: '#888', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>
              Forgot password? Reset it
            </button>
          </p>
        )}
        {mode === 'setup' && (
          <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
            Stored hashed in Supabase — works on every device.
          </p>
        )}
      </form>
    </div>
  );
}

/* ================= Toasts =================
   Tiny success/error toasts (bottom-right), used by delete/save flows. */
function Toasts({ items }) {
  return (
    <div className="adm-toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={'adm-toast ' + (t.kind === 'err' ? 'err' : 'ok')}>
          {t.kind === 'err' ? '⚠️ ' : '✅ '}{t.msg}
        </div>
      ))}
    </div>
  );
}

/* ================= Storage meter =================
   Shows Supabase bucket usage (gallery/news/results) in the sidebar.
   Free plan = 1 GB — shown as the reference quota with a note. */
function fmtMB(bytes) {
  const mb = bytes / (1024 * 1024);
  return mb < 10 ? mb.toFixed(1) : Math.round(mb).toString();
}

function StorageMeter() {
  const [usage, setUsage] = useState(null); // null=loading, false=unavailable
  useEffect(() => {
    if (!backendReady()) { setUsage(false); return; }
    fetchStorageUsage(['gallery', 'news', 'results'])
      .then(setUsage)
      .catch(() => setUsage(false));
  }, []);
  if (usage === null) {
    return <div className="adm-storage"><span className="adm-storage-label">💾 Storage</span><span className="muted sm">checking…</span></div>;
  }
  if (usage === false) {
    return <div className="adm-storage"><span className="adm-storage-label">💾 Storage</span><span className="muted sm">unavailable</span></div>;
  }
  const pct = Math.min(100, (usage.totalBytes / STORAGE_QUOTA_BYTES) * 100);
  const rows = Object.entries(usage.perBucket);
  return (
    <div className="adm-storage">
      <span className="adm-storage-label">💾 Storage</span>
      <div className="adm-storage-bar"><i style={{ width: pct + '%' }} /></div>
      <div className="sm"><b>{fmtMB(usage.totalBytes)} MB</b>
        <span className="muted"> of 1 GB (free plan)</span></div>
      <div className="muted sm" style={{ marginTop: 4 }}>
        {rows.map(([b, u]) => `${b}: ${u.files} files`).join(' · ')}
      </div>
    </div>
  );
}

/* ================= Generic CRUD section ================= */
function useRows(fetcher) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = () => {
    setLoading(true);
    fetcher().then((r) => setRows(r || [])).catch(() => setRows([])).finally(() => setLoading(false));
  };
  useEffect(reload, []);
  return [rows, loading, reload];
}

function Field({ label, children, full }) {
  return (
    <label className={'afield' + (full ? ' full' : '')}>
      <span>{label}</span>{children}
    </label>
  );
}
const T = ({ v, on }) => <input value={v ?? ''} onChange={(e) => on(e.target.value)} />;
const TA = ({ v, on, rows }) => <textarea value={v || ''} rows={rows || 4} onChange={(e) => on(e.target.value)} />;
const Sel = ({ v, on, opts }) => (
  <select value={v || ''} onChange={(e) => on(e.target.value)}>
    {opts.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

/* Image field — three sources, one stored URL:
   - R2 (default): uploads through the Cloudflare Worker to the R2 bucket
     (fast, free 10GB) — the browser never holds R2 credentials.
   - Drive: paste a Drive share link or file ID — the file must be shared
     "Anyone with the link can view".
   - Supabase: the original Storage-bucket upload.
   The stored value is always just a public URL, so the public pages
   render R2 / Drive / Supabase photos exactly the same way. */
function ImageUpload({ bucket, value, onChange, label }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [mode, setMode] = useState('r2'); // 'r2' | 'drive' | 'supabase'
  const [driveInput, setDriveInput] = useState('');

  async function pick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-picking the same file
    if (!f) return;
    setBusy(true);
    setMsg('');
    try {
      const url = mode === 'r2' ? await uploadToR2(f, bucket) : await uploadImage(bucket, f);
      onChange(url);
      setMsg(mode === 'r2' ? '✅ Uploaded to R2 — image saved.' : '✅ Uploaded — image saved.');
    } catch (err) {
      setMsg('⚠️ ' + err.message);
    }
    setBusy(false);
  }

  function useDriveLink() {
    const url = driveImageUrl(driveInput);
    if (!url) {
      setMsg('⚠️ That Drive link was not recognised — paste the share link or the file ID.');
      return;
    }
    onChange(url);
    setMsg('✅ Drive photo linked — make sure the file is shared "Anyone with the link".');
  }

  const modes = [
    ['r2', '☁️ R2 upload'],
    ['drive', 'Drive link'],
    ['supabase', 'Supabase upload'],
  ];
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {modes.map(([m, t]) => (
          <button key={m} type="button" className="chip" onClick={() => { setMode(m); setMsg(''); }}
            style={mode === m ? { background: 'var(--navy-900)', color: '#fff', borderColor: 'var(--navy-900)' } : undefined}>
            {t}
          </button>
        ))}
      </div>
      {mode === 'drive' ? (
        <div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={driveInput} onChange={(e) => setDriveInput(e.target.value)}
              placeholder="Paste Drive share link or file ID" style={{ flex: 1 }} disabled={busy} />
            <button type="button" className="btn btn-outline" onClick={useDriveLink} disabled={busy}>Use link</button>
          </div>
          <div className="muted sm" style={{ marginTop: 4 }}>
            The Drive file must be shared "Anyone with the link can view".
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="btn btn-outline" style={{ cursor: busy ? 'wait' : 'pointer' }}>
            {busy ? 'Uploading…' : '📤 Upload image'}
            <input type="file" accept="image/*" hidden disabled={busy} onChange={pick} />
          </label>
          {value ? (
            <a href={value} target="_blank" rel="noreferrer">
              <img src={value} alt={label || 'uploaded'} style={{ height: 46, borderRadius: 8, border: '1px solid var(--line)' }} />
            </a>
          ) : (
            <span className="muted sm">No image yet</span>
          )}
        </div>
      )}
      <input value={value || ''} onChange={(e) => onChange(e.target.value)}
        placeholder="…or paste an image URL" style={{ marginTop: 8 }} />
      {msg && <div className="sm" style={{ marginTop: 6 }}>{msg}</div>}
      <div className="muted sm" style={{ marginTop: 4 }}>
        JPG / PNG, max {MAX_UPLOAD_MB}MB — {mode === 'r2'
          ? <>stored in <b>Cloudflare R2</b> (brighton-college-media).</>
          : mode === 'drive'
            ? <>linked from <b>Google Drive</b> (no upload).</>
            : <>stored in the <b>{bucket}</b> Supabase bucket.</>}
      </div>
    </div>
  );
}

/* In-app delete confirmation (replaces window.confirm): native browser
   confirms cannot be clicked by automated checks and look rough on
   phones — this modal works the same for humans and automation. */
function useConfirm() {
  const [req, setReq] = useState(null); // { msg, resolve }
  const ask = useCallback((msg) => new Promise((resolve) => setReq({ msg, resolve })), []);
  const close = (answer) => { if (req) req.resolve(answer); setReq(null); };
  const dialog = req ? (
    <div className="modal" onClick={() => close(false)}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ width: 440 }}>
        <h3>Are you sure?</h3>
        <p style={{ whiteSpace: 'pre-line', marginBottom: 22 }}>{req.msg}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={() => close(false)}>Cancel</button>
          <button className="btn" style={{ background: '#b02a37', color: '#fff', borderColor: '#b02a37' }} onClick={() => close(true)}>Delete</button>
        </div>
      </div>
    </div>
  ) : null;
  return { ask, dialog };
}

function Crud({ title, table, columns, rows, loading, reload, onChanged, collegeId, fileField, notify }) {
  const [editing, setEditing] = useState(null); // null | {} (new) | row (edit)
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const { ask, dialog } = useConfirm();
  const say = notify || ((m, k) => { if (k === 'err') alert(m); });

  const blank = {};
  columns.forEach((c) => { blank[c.key] = c.def !== undefined ? c.def : ''; });

  async function save() {
    setErr(''); setBusy(true);
    try {
      const payload = {};
      columns.forEach((c) => {
        let v = editing[c.key];
        if (c.type === 'number') v = v === '' ? (c.def !== undefined ? c.def : null) : Number(v);
        if (c.type === 'check') v = !!v;
        payload[c.key] = v;
      });
      // Stamp the active college on every college-scoped write.
      if (COLLEGE_SCOPED_TABLES.includes(table) && collegeId) payload.college_id = collegeId;
      if (editing.id) await adminUpdate(table, editing.id, payload);
      else await adminCreate(table, payload);
      if (table === 'courses') clearDriveCache();
      setEditing(null);
      reload();
      onChanged && onChanged();
    } catch (e) { setErr('Save failed: ' + e.message); }
    setBusy(false);
  }

  async function del(row) {
    const fileUrl = fileField ? row[fileField] : null;
    /* Only Supabase Storage files are actually removed with the row —
       R2 / Drive links stay where they are (their hosts own them). */
    const removesFile = !!(fileUrl && String(fileUrl).includes('/storage/v1/object/public/'));
    if (!(await ask(removesFile
      ? 'Delete this entry?\n\nIts uploaded file will also be removed from storage to free space.'
      : 'Delete this entry?'))) return;
    try {
      await adminDeleteWithStorage(table, row.id, fileUrl);
      say('Deleted — entry' + (removesFile ? ' and its file' : '') + ' removed. ✅');
      reload(); onChanged && onChanged();
    }
    catch (e) { say('Delete failed: ' + e.message, 'err'); }
  }

  return (
    <div>
      {dialog}
      <div className="adm-head">
        <h2>{title}</h2>
        <button className="btn btn-gold" onClick={() => setEditing({ ...blank })}>+ Add New</button>
      </div>
      {err && <div className="alert err">{err}</div>}
      {loading ? <div className="loading">Loading…</div> : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr>
              {columns.filter((c) => !c.hide).map((c) => <th key={c.key}>{c.label}</th>)}
              <th></th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {columns.filter((c) => !c.hide).map((c) => (
                    <td key={c.key}>
                      {c.type === 'check' ? (r[c.key] ? '✅' : '—')
                        : c.type === 'date' && r[c.key] ? new Date(r[c.key]).toLocaleDateString()
                        : String(r[c.key] ?? '').slice(0, 60)}
                    </td>
                  ))}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="chip" onClick={() => setEditing({ ...r })}>Edit</button>{' '}
                    <button className="chip chip-danger" onClick={() => del(r)}>Delete</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--muted)' }}>No entries yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="modal" onClick={() => setEditing(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{editing.id ? 'Edit' : 'Add'} — {title}</h3>
            <div className="aform">
              {columns.map((c) => (
                <Field key={c.key} label={c.label} full={c.full}>
                  {c.type === 'textarea'
                    ? <TA v={editing[c.key]} rows={c.rows} on={(v) => setEditing({ ...editing, [c.key]: v })} />
                    : c.type === 'select'
                      ? <Sel v={editing[c.key]} opts={c.opts} on={(v) => setEditing({ ...editing, [c.key]: v })} />
                      : c.type === 'check'
                        ? <input type="checkbox" checked={!!editing[c.key]}
                            onChange={(e) => setEditing({ ...editing, [c.key]: e.target.checked })} style={{ width: 20, height: 20 }} />
                        : c.type === 'imageupload'
                          ? <ImageUpload bucket={c.bucket} label={c.label} value={editing[c.key]}
                              onChange={(v) => setEditing({ ...editing, [c.key]: v })} />
                          : <T v={editing[c.key]} on={(v) => setEditing({ ...editing, [c.key]: v })} />}
                </Field>
              ))}
            </div>
            {c_hint(columns, editing)}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function c_hint() { return null; }

/* ================= Sections ================= */

function NewsSection({ collegeId, notify }) {
  const [rows, loading, reload] = useRows(() => fetchNews(null, collegeId, { includeDrafts: true }));
  useEffect(() => { reload(); }, [collegeId]);
  return <Crud title="News & Updates" table="news_posts" rows={rows} loading={loading} reload={reload} collegeId={collegeId}
    fileField="image_url" notify={notify}
    columns={[
      { key: 'title', label: 'Title', full: true },
      { key: 'category', label: 'Category', type: 'select', opts: NEWS_CATEGORIES, def: 'Notice' },
      { key: 'section', label: 'Section (General / Boys / Girls)', type: 'select', opts: ['general', 'boys', 'girls'], def: 'general' },
      { key: 'body', label: 'Body', type: 'textarea', rows: 6, full: true, hide: true },
      { key: 'image_url', label: 'Cover image (becomes the share preview)', type: 'imageupload', bucket: 'news', full: true, hide: true },
      { key: 'published_at', label: 'Published', type: 'date', hide: true, def: new Date().toISOString() },
      { key: 'published', label: 'Live', type: 'check', def: true },
      { key: 'pinned', label: 'Pinned', type: 'check' },
    ]} />;
}

function CoursesSection({ collegeId, notify }) {
  const [rows, loading, reload] = useRows(() => fetchCourses({ collegeId }));
  useEffect(() => { reload(); }, [collegeId]);
  return (
    <>
      <div className="alert ok" style={{ marginBottom: 16 }}>
        💡 <b>How courses work:</b> create one <b>Drive folder per course</b> (e.g. "Cyber Security"),
        share it as <b>"Anyone with the link can view"</b>, then paste the folder ID below.
        Videos inside are listed automatically — no need to add them one by one.
        <br />Folder ID = the long code in the folder's URL: drive.google.com/drive/folders/<b>PASTE_THIS_PART</b>
      </div>
      <Crud title="Video Courses" table="courses" rows={rows} loading={loading} reload={reload} collegeId={collegeId}
        notify={notify}
        columns={[
          { key: 'title', label: 'Course title', full: true },
          { key: 'description', label: 'Description', type: 'textarea', rows: 3, full: true, hide: true },
          { key: 'drive_folder_id', label: 'Drive folder ID', full: true },
          { key: 'thumbnail_url', label: 'Thumbnail image URL', full: true, hide: true },
          { key: 'class_level', label: 'Class', type: 'select', opts: ['11th', '12th', 'General'], def: 'General' },
          { key: 'sort', label: 'Sort order', type: 'number', def: 0 },
        ]} />
    </>
  );
}

function ResultsSection({ collegeId, notify }) {
  const [rows, loading, reload] = useRows(() => fetchResults({ collegeId }));
  useEffect(() => { reload(); }, [collegeId]);
  return (
    <>
      <div className="alert ok" style={{ marginBottom: 16 }}>
        💡 Add a result three ways: <b>(1)</b> upload a <b>result picture</b> (photo of the sheet),{' '}
        <b>(2)</b> paste a <b>Drive file ID</b> (PDF/image of the result sheet), or{' '}
        <b>(3)</b> leave both empty and type subject marks as JSON in "Result data (JSON)".
      </div>
      <Crud title="Test Results" table="test_results" rows={rows} loading={loading} reload={reload} collegeId={collegeId}
        fileField="image_url" notify={notify}
        columns={[
          { key: 'title', label: 'Title', full: true },
          { key: 'class_level', label: 'Class', type: 'select', opts: CLASS_LEVELS, def: '11th' },
          { key: 'test_type', label: 'Type', type: 'select', opts: TEST_TYPES, def: 'weekly' },
          { key: 'subject', label: 'Subject', hide: true },
          { key: 'image_url', label: 'Result picture (upload)', type: 'imageupload', bucket: 'results', full: true, hide: true },
          { key: 'drive_file_id', label: 'Drive file ID (optional)', full: true, hide: true },
          { key: 'file_type', label: 'File type', type: 'select', opts: FILE_TYPES, def: 'document', hide: true },
          { key: 'result_data', label: 'Result data (JSON)', type: 'textarea', rows: 4, full: true, hide: true },
          { key: 'published_at', label: 'Published', type: 'date', hide: true, def: new Date().toISOString() },
        ]} />
    </>
  );
}

function MaterialSection({ collegeId, notify }) {
  const [rows, loading, reload] = useRows(() => fetchMaterial({ collegeId }));
  useEffect(() => { reload(); }, [collegeId]);
  return (
    <>
      <div className="alert ok" style={{ marginBottom: 16 }}>
        💡 Curated picks shown under "Recommended by Teachers". Pick the <b>type</b> —{' '}
        <b>video</b> plays embedded, <b>document</b> opens in the viewer, <b>image</b> opens in a gallery viewer.
      </div>
      <Crud title="Study Material" table="study_material" rows={rows} loading={loading} reload={reload} collegeId={collegeId}
        notify={notify}
        columns={[
          { key: 'title', label: 'Title', full: true },
          { key: 'subject', label: 'Subject' },
          { key: 'class_level', label: 'Class', type: 'select', opts: CLASS_LEVELS, def: '11th' },
          { key: 'file_type', label: 'Type', type: 'select', opts: FILE_TYPES, def: 'document' },
          { key: 'drive_file_id', label: 'Drive file ID', full: true },
        ]} />
    </>
  );
}

function AdmissionsSection({ collegeId, notify }) {
  const [rows, loading, reload] = useRows(() => fetchApplications(collegeId));
  /* Admin-side admissions switch — self-contained (admin has no CollegeContext).
     Reads/writes the same 'admissions_open' setting the public site uses. */
  const [admissionsOpen, setAdmissionsOpen] = useState('false');
  const [saving, setSaving] = useState(false);
  const { ask, dialog } = useConfirm();
  useEffect(() => { reload(); }, [collegeId]);
  useEffect(() => {
    let live = true;
    getSetting(collegeId, 'admissions_open', 'false').then((v) => { if (live) setAdmissionsOpen(v); }).catch(() => {});
    return () => { live = false; };
  }, [collegeId]);
  const flipAdmissions = async () => {
    const next = admissionsOpen === 'true' ? 'false' : 'true';
    setSaving(true);
    try {
      await setSetting(collegeId, 'admissions_open', next);
      setAdmissionsOpen(next);
      notify && notify(next === 'true' ? 'Admissions are now OPEN on the site.' : 'Admissions are now CLOSED on the site.');
    } catch (e) { notify && notify('Could not save: ' + e.message, 'err'); }
    setSaving(false);
  };
  return (
    <div>
      {dialog}
      <div className="adm-head"><h2>Admission Enquiries</h2>
        <button className="btn btn-outline" onClick={reload}>↻ Refresh</button></div>
      {/* Admissions open/closed switch — controls the public site's status banners. */}
      <div className="adm-card" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
        <span className={'status-dot ' + (admissionsOpen === 'true' ? 'on' : 'off')} aria-hidden />
        <div style={{ flex: '1 1 200px' }}>
          <b>Admissions: {admissionsOpen === 'true' ? 'OPEN' : 'CLOSED'}</b>
          <div className="muted sm">This switch updates the website instantly — banners, ticker and admissions page.</div>
        </div>
        <button className={'btn ' + (admissionsOpen === 'true' ? 'btn-outline' : 'btn-gold')} onClick={flipAdmissions} disabled={saving}>
          {saving ? 'Saving…' : admissionsOpen === 'true' ? 'Close admissions' : 'Open admissions'}
        </button>
      </div>
      {loading ? <div className="loading">Loading…</div> : (
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Date</th><th>Name</th><th>Father</th><th>Section</th><th>Program</th><th>Phone</th><th>Marks</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={r.reviewed ? { opacity: 0.65 } : {}}>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
                <td><b>{r.full_name}</b><br /><span className="muted sm">{r.address || ''}</span></td>
                <td>{r.father_name}</td><td>{r.section}</td><td>{r.program}</td>
                <td><a href={'tel:' + r.phone}>{r.phone}</a></td>
                <td>{r.board_marks || '—'}</td>
                <td>{r.reviewed ? <span className="tag green">Reviewed</span> : <span className="tag">New</span>}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="chip" onClick={() => markReviewed(r.id, !r.reviewed).then(reload).catch((e) => notify && notify(e.message, 'err'))}>
                    {r.reviewed ? 'Unmark' : 'Mark reviewed'}
                  </button>{' '}
                  <button className="chip chip-danger" onClick={async () => {
                    if (!(await ask('Delete this enquiry?'))) return;
                    adminDelete('admission_applications', r.id)
                      .then(() => { notify && notify('Enquiry deleted.'); reload(); })
                      .catch((e) => notify && notify('Delete failed: ' + e.message, 'err'));
                  }}>Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)' }}>No enquiries yet.</td></tr>}
          </tbody>
        </table></div>
      )}
    </div>
  );
}

function GallerySection({ collegeId, notify }) {
  const [rows, loading, reload] = useRows(() => fetchGalleryImages(collegeId));
  useEffect(() => { reload(); }, [collegeId]);
  /* Drive videos (gallery_media, media_type='video'): one link per video —
     each short gets its own entry with its own title. The public gallery
     already plays these (thumbnail + ▶, Drive preview in the lightbox). */
  const [videos, videosLoading, reloadVideos] = useRows(() =>
    fetchGallery(collegeId).then((r) => (r || []).filter((m) => m.media_type === 'video')));
  useEffect(() => { reloadVideos(); }, [collegeId]);
  return (
    <div>
      <Crud title="Gallery Photos" table="gallery_images" rows={rows} loading={loading} reload={reload} collegeId={collegeId}
        fileField="image_url" notify={notify}
        columns={[
          { key: 'image_url', label: 'Photo', type: 'imageupload', bucket: 'gallery', full: true },
          { key: 'caption', label: 'Caption', full: true },
        ]} />
      <div className="alert ok" style={{ margin: '28px 0 16px' }}>
        💡 <b>Gallery videos (shorts):</b> one Drive link per video — each short gets
        its own title. Share the video as <b>"Anyone with the link can view"</b>,
        then paste the file ID: drive.google.com/file/d/<b>PASTE_THIS_PART</b>/view
      </div>
      <Crud title="Gallery Videos (Drive links)" table="gallery_media" rows={videos} loading={videosLoading} reload={reloadVideos} collegeId={collegeId}
        notify={notify}
        columns={[
          { key: 'title', label: 'Title', full: true },
          { key: 'drive_file_id', label: 'Drive file ID', full: true },
          { key: 'media_type', label: 'Type', type: 'select', opts: ['video'], def: 'video', hide: true },
          { key: 'display_order', label: 'Order (0 = first)', type: 'number', def: 0 },
          { key: 'is_active', label: 'Show in gallery', type: 'check', def: true },
        ]} />
    </div>
  );
}

function MessagesSection({ collegeId, notify }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { ask, dialog } = useConfirm();
  const reload = () => {
    setLoading(true);
    sba.get('/rest/v1/contact_messages?select=*&order=created_at.desc' + (collegeId ? '&college_id=eq.' + encodeURIComponent(collegeId) : ''))
      .then((r) => setRows(r || [])).catch(() => setRows([])).finally(() => setLoading(false));
  };
  useEffect(reload, [collegeId]);
  return (
    <div>
      {dialog}
      <div className="adm-head"><h2>Contact Messages</h2>
        <button className="btn btn-outline" onClick={reload}>↻ Refresh</button></div>
      {loading ? <div className="loading">Loading…</div> : (
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Date</th><th>Name</th><th>Phone</th><th>Message</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
                <td><b>{r.name}</b></td><td>{r.phone}</td>
                <td style={{ maxWidth: 340 }}>{r.message}</td>
                <td><button className="chip chip-danger" onClick={async () => {
                  if (!(await ask('Delete this message?'))) return;
                  adminDelete('contact_messages', r.id)
                    .then(() => { notify && notify('Message deleted. ✅'); reload(); })
                    .catch((e) => notify && notify('Delete failed: ' + e.message, 'err'));
                }}>Delete</button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }}>No messages.</td></tr>}
          </tbody>
        </table></div>
      )}
    </div>
  );
}

/* ================= Shell ================= */
/* Reusable on/off switch card for a site_settings key. */
function SettingSwitch({ collegeId, notify, settingKey, title, desc, onLabel, offLabel }) {
  const [value, setValue] = useState('true');
  const [saving, setSaving] = useState(false);
  const def = settingKey === 'rewarded_ads' || settingKey === 'show_ads' ? 'true' : 'false';
  useEffect(() => {
    let live = true;
    getSetting(collegeId, settingKey, def).then((v) => { if (live) setValue(v); }).catch(() => {});
    return () => { live = false; };
  }, [collegeId, settingKey, def]);
  const flip = async () => {
    const next = value === 'true' ? 'false' : 'true';
    setSaving(true);
    try {
      await setSetting(collegeId, settingKey, next);
      setValue(next);
      notify && notify(`${title}: ${next === 'true' ? 'ON' : 'OFF'}.`);
    } catch (e) { notify && notify('Could not save: ' + e.message, 'err'); }
    setSaving(false);
  };
  const isOn = value === 'true';
  return (
    <div className="adm-card" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
      <span className={'status-dot ' + (isOn ? 'on' : 'off')} aria-hidden />
      <div style={{ flex: '1 1 200px' }}>
        <b>{title}: {isOn ? 'ON' : 'OFF'}</b>
        <div className="muted sm">{desc}</div>
      </div>
      <button className={'btn ' + (isOn ? 'btn-outline' : 'btn-gold')} onClick={flip} disabled={saving}>
        {saving ? 'Saving…' : isOn ? (offLabel || 'Turn off') : (onLabel || 'Turn on')}
      </button>
    </div>
  );
}

function SettingsSection({ collegeId, notify }) {
  return (
    <div>
      <div className="adm-head"><h2>Site Settings</h2></div>
      <p className="muted" style={{ marginBottom: 18 }}>
        Global switches for the public website. Changes apply instantly.
      </p>
      <SettingSwitch collegeId={collegeId} notify={notify} settingKey="show_ads"
        title="Display ad slots"
        desc="Banner and in-content 'Advertisement' slots across the site (AdSense-ready)."
        onLabel="Show ads" offLabel="Hide ads" />
      <SettingSwitch collegeId={collegeId} notify={notify} settingKey="rewarded_ads"
        title="Rewarded video ads"
        desc="Students watch one short ad (max once per 10 minutes) to unlock a course video. Supports free learning."
        onLabel="Enable rewarded ads" offLabel="Disable rewarded ads" />
    </div>
  );
}

const TABS = [
  ['news', '📰 News'],
  ['courses', '🎬 Courses'],
  ['results', '📊 Results'],
  ['material', '📚 Material'],
  ['admissions', '📝 Admissions'],
  ['gallery', '📸 Gallery'],
  ['messages', '✉️ Messages'],
  ['settings', '⚙️ Settings'],
];

export default function AdminApp() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [tab, setTab] = useState('news');
  const [counts, setCounts] = useState(null);
  const [toasts, setToasts] = useState([]);
  const notify = useCallback((msg, kind) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, msg, kind: kind || 'ok' }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  /* Multi-college: list + active college. Single-college mode (today:
     only Brighton) shows a static label instead of a dropdown. */
  const [colleges, setColleges] = useState(() => knownLocalSlugs().map((s) => getLocalCollege(s)));
  const [collegeSlug, setCollegeSlug] = useState(DEFAULT_COLLEGE_SLUG);
  const activeCollege = colleges.find((c) => c.slug === collegeSlug) || colleges[0] || null;
  const activeCollegeId = activeCollege ? activeCollege.id : null;

  useEffect(() => {
    if (!authed || !backendReady()) return;
    fetchColleges()
      .then((rows) => {
        if (rows && rows.length) {
          const mapped = rows.map(mapCollegeRow).filter(Boolean);
          setColleges(mapped);
          if (!mapped.find((c) => c.slug === collegeSlug)) setCollegeSlug(mapped[0].slug);
        }
      })
      .catch(() => {});
  }, [authed]);

  useEffect(() => {
    if (!authed || !backendReady()) return;
    Promise.allSettled([
      fetchNews(null, activeCollegeId), fetchCourses({ collegeId: activeCollegeId }),
      fetchResults({ collegeId: activeCollegeId }), fetchMaterial({ collegeId: activeCollegeId }),
      fetchApplications(activeCollegeId), fetchGallery(activeCollegeId),
    ]).then((rs) => {
      const labels = ['news', 'courses', 'results', 'material', 'admissions', 'gallery'];
      const c = {};
      rs.forEach((r, i) => { c[labels[i]] = r.status === 'fulfilled' ? (r.value || []).length : '?'; });
      const newApps = rs[4].status === 'fulfilled' ? (rs[4].value || []).filter((a) => !a.reviewed).length : 0;
      c.newApps = newApps;
      setCounts(c);
    });
  }, [authed, activeCollegeId]);

  if (!authed) return <Login onOk={() => setAuthed(true)} />;
  if (!backendReady()) {
    return (
      <div className="adm-login-wrap">
        <div className="adm-login" style={{ textAlign: 'center' }}>
          <h2>Backend not connected</h2>
          <p className="muted">Fill SUPABASE_URL + SUPABASE_ANON_KEY in web/src/config.js and run supabase/schema.sql first.</p>
          <button className="btn btn-outline" onClick={() => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false); }}>Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-brand"><span className="brand-mark">B</span><span>Brighton Admin</span></div>
        {/* College switcher — dropdown when several colleges exist,
            single-college mode shows just the college name. */}
        <div className="adm-college">
          <span className="adm-college-label">🏫 College</span>
          {colleges.length > 1 ? (
            <select value={collegeSlug} onChange={(e) => { setCollegeSlug(e.target.value); setTab('news'); setCounts(null); }}
              aria-label="Active college">
              {colleges.map((c) => <option key={c.slug} value={c.slug}>{c.site ? c.site.shortName : c.slug}</option>)}
            </select>
          ) : (
            <span className="adm-college-name">{activeCollege && activeCollege.site ? activeCollege.site.shortName : 'Brighton'}</span>
          )}
        </div>
        <nav>
          {TABS.map(([key, label]) => (
            <button key={key} className={'adm-tab' + (tab === key ? ' on' : '')} onClick={() => setTab(key)}>
              {label}
              {key === 'admissions' && counts && counts.newApps > 0 && <span className="adm-badge">{counts.newApps}</span>}
            </button>
          ))}
        </nav>
        <button className="adm-tab adm-out" onClick={() => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false); }}>
          ⎋ Sign out
        </button>
        <StorageMeter />
      </aside>
      <main className="adm-main">
        {counts && tab === 'news' && (
          <div className="grid grid-4" style={{ marginBottom: 24 }}>
            {[['news', '📰', 'News posts'], ['courses', '🎬', 'Video courses'], ['results', '📊', 'Result entries'],
              ['admissions', '✉️', 'Enquiries']].map(([k, ic, lb]) => (
              <div className="card stat-card" key={k}>
                <div style={{ fontSize: 26 }}>{ic}</div>
                <div className="stat-num" style={{ fontSize: 30 }}>{counts[k]}</div>
                <div className="stat-label">{lb}</div>
              </div>
            ))}
          </div>
        )}
        {tab === 'news' && <NewsSection collegeId={activeCollegeId} notify={notify} />}
        {tab === 'courses' && <CoursesSection collegeId={activeCollegeId} notify={notify} />}
        {tab === 'results' && <ResultsSection collegeId={activeCollegeId} notify={notify} />}
        {tab === 'material' && <MaterialSection collegeId={activeCollegeId} notify={notify} />}
        {tab === 'admissions' && <AdmissionsSection collegeId={activeCollegeId} notify={notify} />}
        {tab === 'gallery' && <GallerySection collegeId={activeCollegeId} notify={notify} />}
        {tab === 'messages' && <MessagesSection collegeId={activeCollegeId} notify={notify} />}
        {tab === 'settings' && <SettingsSection collegeId={activeCollegeId} notify={notify} />}
      </main>
      <Toasts items={toasts} />
    </div>
  );
}
