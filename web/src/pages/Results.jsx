import React, { useEffect, useState } from 'react';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import { useCollege, useSite } from '../college/CollegeContext.jsx';

import { fetchResults, backendReady } from '../lib/supabase.js';
import { isRealCollegeId } from '../lib/settings.js';
import { useResultClasses } from '../lib/settings.js';
import { cacheFresh, cacheSet } from '../lib/cache.js';
import { drivePreviewUrl } from '../lib/drive.js';
import { TEST_TYPES } from '../data/college.js';
import Seo from '../seo/Seo.jsx';
import { ICal } from '../components/icons.jsx';

/* Public reads cache: 5 minutes (same pattern as Home/News). Repeat
   visits with the same filters render instantly; a fresh fetch runs
   only when the cache is stale. Key uses the college SLUG. */
const RESULTS_TTL_MS = 5 * 60 * 1000;

/* Renders one result entry: an uploaded result picture, an uploaded
   PDF/Word document (R2/Supabase direct upload), a Drive file
   (document/video/image), or an inline subject-wise marks table stored
   as JSON in result_data. */
function fileDisplayName(url) {
  try {
    const base = decodeURIComponent(String(url || '').split('/').pop().split('?')[0] || '');
    return base.replace(/^\d+-/, '') || base;
  } catch { return ''; }
}

function ResultBody({ r }) {
  if (r.image_url) {
    return <img src={r.image_url} alt={r.title} loading="lazy" decoding="async"
      style={{ maxWidth: '100%', borderRadius: 12, border: '1px solid var(--line)', marginTop: 12 }} />;
  }
  if (r.file_url) {
    const isPdf = /\.pdf($|\?)/i.test(r.file_url);
    const name = fileDisplayName(r.file_url);
    return (
      <div style={{ marginTop: 12 }}>
        {isPdf && (
          <div className="video-frame">
            <iframe src={r.file_url} title={r.title} allowFullScreen />
          </div>
        )}
        <a className="btn btn-outline" href={r.file_url} target="_blank" rel="noreferrer"
          style={{ marginTop: 10 }}>
          ⬇ Download {isPdf ? 'PDF' : 'file'}{name ? ' — ' + name : ''}
        </a>
      </div>
    );
  }
  if (r.drive_file_id) {
    const url = drivePreviewUrl(r.drive_file_id);
    if (r.file_type === 'image') {
      return <img src={url.replace('/preview', '/view?usp=drivesdk')} alt={r.title} loading="lazy" decoding="async"
        style={{ maxWidth: '100%', borderRadius: 12, border: '1px solid var(--line)' }} />;
    }
    return (
      <div className="video-frame" style={{ marginTop: 12 }}>
        <iframe src={url} title={r.title} allow="autoplay; fullscreen" allowFullScreen />
      </div>
    );
  }
  let rows = [];
  try { rows = JSON.parse(r.result_data || '[]'); } catch (e) { /* not JSON */ }
  if (!Array.isArray(rows) || rows.length === 0) {
    return <div className="result-text">{r.result_data || 'Details will be attached soon.'}</div>;
  }
  return (
    <div className="table-wrap" style={{ marginTop: 12 }}>
      <table className="data">
        <thead><tr><th>Subject</th><th>Obtained</th><th>Total</th></tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{row.subject}</td><td>{row.obtained}</td><td>{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Results() {
  const { t } = useLang();
  const { college } = useCollege();
  const classes = useResultClasses();
  const collegeId = college && college.id; /* stable dep (see Courses.jsx) */
  const [items, setItems] = useState(() => cacheFresh(`results:All:All:${(college && college.slug) || 'all'}`, RESULTS_TTL_MS) || []);
  const [cls, setCls] = useState('All');
  const [typ, setTyp] = useState('All');
  const [loading, setLoading] = useState(() => cacheFresh(`results:All:All:${(college && college.slug) || 'all'}`, RESULTS_TTL_MS) === null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    if (!backendReady()) { setLoading(false); return; }
    if (!isRealCollegeId(collegeId)) return; // wait for the real UUID
    const cacheKey = `results:${cls}:${typ}:${(college && college.slug) || 'all'}`;
    const cached = cacheFresh(cacheKey, RESULTS_TTL_MS);
    if (cached) { setItems(cached); setLoading(false); return; } // fresh cache: no re-fetch
    fetchResults({
      classLevel: cls === 'All' ? null : cls,
      testType: typ === 'All' ? null : typ,
      collegeId,
      publishedOnly: true,
    }).then((r) => { setItems(r || []); cacheSet(cacheKey, r || []); }).catch(() => {}).finally(() => setLoading(false));
  }, [cls, typ, collegeId]);

  return (
    <>
      <Seo page="results" />
      <section className="page-hero">
        <div className="container">
          <div className="crumbs"><LLink to="/">{t.common.backHome}</LLink> / {t.pages.results.crumbs}</div>
          <h1>{t.pages.results.title}</h1>
          <p>Weekly tests and monthly results for 11th &amp; 12th — published by the college office.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="filters">
            {['All', ...classes].map((c) => (
              <button key={c} className={'chip' + (cls === c ? ' on' : '')} onClick={() => setCls(c)}>
                {c === 'All' ? 'All Classes' : c}
              </button>
            ))}
            <span style={{ alignSelf: 'center', color: 'var(--line)' }}>|</span>
            {['All', ...TEST_TYPES].map((t) => (
              <button key={t} className={'chip' + (typ === t ? ' on' : '')} onClick={() => setTyp(t)}
                style={{ textTransform: 'capitalize' }}>
                {t === 'All' ? 'All Tests' : t === 'mcqs' ? 'MCQs tests' : t + ' tests'}
              </button>
            ))}
          </div>

          {loading ? <div className="loading">Loading results…</div>
            : items.length === 0 ? (
              <div className="empty">
                <div className="big" aria-hidden><ICal size={44} /></div>
                <h3>No results published yet</h3>
                <p>Weekly and monthly test results will appear here once the office publishes them.</p>
              </div>
            ) : items.map((r) => (
              <div className="card result-card" key={r.id}>
                <div className="result-tags">
                  <span className="tag">{r.test_type}</span>
                  <span className="tag navy">{r.class_level}</span>
                  {r.subject && <span className="tag green">{r.subject}</span>}
                </div>
                <h3>{r.title}</h3>
                <div className="result-meta">
                  Published {new Date(r.published_at).toLocaleDateString()}
                </div>
                {openId === r.id
                  ? <><ResultBody r={r} />
                      <button className="chip" style={{ marginTop: 12 }} onClick={() => setOpenId(null)}>Hide details ▲</button></>
                  : <button className="chip" onClick={() => setOpenId(r.id)}>View details ▼</button>}
              </div>
            ))}
          {/* Explore more (internal linking): results readers usually want
              study material, courses or textbooks next. */}
          <nav className="hub-links" aria-label={t.library.exploreMore} style={{ marginTop: 28 }}>
            <span className="eyebrow">{t.library.exploreMore}</span>
            <div className="hub-links-row">
              <LLink className="btn btn-outline" to="/material">{t.pages.material.crumbs} →</LLink>
              <LLink className="btn btn-outline" to="/courses">{t.pages.courses.crumbs} →</LLink>
              <LLink className="btn btn-outline" to="/books">{t.pages.books.crumbs} →</LLink>
            </div>
          </nav>
        </div>
      </section>
    </>
  );
}
