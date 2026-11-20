/* Courses — self-contained video course platform module.
   Route: /courses (grid) and /courses/:id (player). Deliberately modular:
   this folder can later be split into its own site without touching the rest. */
import React, { useEffect, useState } from 'react';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import { useCollege, useSite } from '../college/CollegeContext.jsx';

import { fetchCourses, backendReady } from '../lib/supabase.js';
import { driveListAll, driveFirstVideoThumb, driveExpandBundle, driveReady, isFolder, cleanCourseName, courseThumbFor, courseArtFor, courseCategoryFor, courseHue, uniqueCourseThumb } from '../lib/drive.js';
import { fetchDriveCourseIndex } from '../lib/supabase.js';
import { DRIVE_FOLDER_ID } from '../config.js';
import { getContinueLearning } from '../lib/progress.js';
import Seo from '../seo/Seo.jsx';
import { IVideo, ISearch } from '../components/icons.jsx';

/* lh3 thumbnailLinks 403 for anonymous visitors — treat them as missing. */
const isDeadThumb = (u) => !u || u.indexOf('lh3.googleusercontent.com') !== -1;

/* "Continue learning" resume card (R6) — most recent watch position. */
function ContinueLearning() {
  const [item, setItem] = useState(null);
  const [course, setCourse] = useState(null);
  useEffect(() => {
    try {
      const c = getContinueLearning();
      setItem(c);
      if (c && backendReady()) {
        import('../lib/supabase.js').then((m) =>
          m.fetchCourseById(c.courseId).then(setCourse).catch(() => {}));
      }
    } catch {}
  }, []);
  if (!item) return null;
  const mins = Math.floor((item.position || 0) / 60);
  return (
    <div className="card card-gold">
      <span className="eyebrow">Continue learning</span>
      <h3 style={{ margin: '4px 0 8px' }}>{item.title || (course && course.title) || 'Your course'}</h3>
      <p style={{ margin: '0 0 14px' }}>Resume from {mins}:{String(Math.floor((item.position || 0) % 60)).padStart(2, '0')}</p>
      <LLink className="btn btn-gold" to={`/courses/${item.courseId}`}>▶ Resume</LLink>
    </div>
  );
}

export default function Courses() {
  const { t, lang } = useLang();
  const { college } = useCollege();
  const [courses, setCourses] = useState([]);
  const [driveCourses, setDriveCourses] = useState([]);
  const [driveThumbs, setDriveThumbs] = useState({}); /* folderId -> real video thumbnail */
  const [loading, setLoading] = useState(true);
  /* Search + category filter (client-side over the already-loaded lists,
     so filtering costs no extra requests). Search input is 16px so iOS
     Safari does not auto-zoom on focus. */
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [cat, setCat] = useState('All');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(id);
  }, [query]);
  const clearFilters = () => { setQuery(''); setDebounced(''); setCat('All'); };
  const matches = (title) => {
    const q = debounced.trim().toLowerCase();
    if (q && !String(title || '').toLowerCase().includes(q)) return false;
    if (cat !== 'All' && courseCategoryFor(title) !== cat) return false;
    return true;
  };
  const visibleCourses = React.useMemo(
    () => courses.filter((c) => matches(c.title)), [courses, debounced, cat]);
  const visibleDrive = React.useMemo(
    () => driveCourses.filter((f) => matches(cleanCourseName(f.name))), [driveCourses, debounced, cat]);
  const total = courses.length + driveCourses.length;
  const visibleTotal = visibleCourses.length + visibleDrive.length;
  /* Only categories that actually have courses, biggest first. */
  const cats = React.useMemo(() => {
    const m = new Map();
    courses.forEach((c) => { const k = courseCategoryFor(c.title); m.set(k, (m.get(k) || 0) + 1); });
    driveCourses.forEach((f) => { const k = courseCategoryFor(cleanCourseName(f.name)); m.set(k, (m.get(k) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [courses, driveCourses]);

  /* Fetch each Drive course's first video thumbnail (batched, lazy).
     SKIPS courses already having thumbnails (from Supabase index).
     Gives every course its OWN real thumbnail. */
  useEffect(() => {
    const needsThumb = driveCourses.filter((f) => !f.thumbnail_url && !driveThumbs[f.id]);
    if (!needsThumb.length || !driveReady()) return;
    let live = true;
    const BATCH = 8;
    (async () => {
      for (let i = 0; i < needsThumb.length && live; i += BATCH) {
        const batch = needsThumb.slice(i, i + BATCH);
        const results = await Promise.all(batch.map(async (f) => {
          try {
            const thumb = await driveFirstVideoThumb(f.id);
            return thumb ? [f.id, thumb] : null;
          } catch { return null; }
        }));
        if (!live) return;
        const map = {};
        results.forEach((r) => { if (r) map[r[0]] = r[1]; });
        if (Object.keys(map).length) setDriveThumbs((prev) => ({ ...prev, ...map }));
      }
    })();
    return () => { live = false; };
  }, [driveCourses]);

  useEffect(() => {
    let live = true;
    /* FAST PATH: Supabase index first. ONLY if empty, use slow Drive API.
       Sequential (not parallel) so the slow path never blocks the fast one. */
    (async () => {
      if (backendReady()) {
        try {
          const r = await fetchCourses({ collegeId: college && college.id });
          if (live) setCourses(r || []);
        } catch { /* ignore */ }
      }
      let usedIndex = false;
      if (backendReady() && live) {
        try {
          const idx = await fetchDriveCourseIndex(college && college.id);
          if (!live) return;
          if (idx && idx.length) {
            usedIndex = true;
            const GENERIC = /^(introduction|intro|nmap|miscellaneous|tools?|resources?|bonus|part\s*\d+)$/i;
            const mapped = idx.map((c) => {
              let title = c.title;
              if (GENERIC.test(title.trim()) && c.parent_title) {
                title = `${title.trim()} — ${c.parent_title}`;
              }
              return { id: c.drive_folder_id, name: title, thumbnail_url: isDeadThumb(c.thumbnail_url) ? null : c.thumbnail_url, fromIndex: true };
            });
            setDriveCourses(mapped);
            const tm = {};
            idx.forEach((c) => { if (c.thumbnail_url && !isDeadThumb(c.thumbnail_url)) tm[c.drive_folder_id] = c.thumbnail_url; });
            setDriveThumbs(tm);
          }
        } catch { /* fall through to Drive API */ }
      }
      /* SLOW FALLBACK: live Drive API (only if index empty) */
      if (!usedIndex && driveReady() && DRIVE_FOLDER_ID && live) {
        try {
          const files = await driveListAll(DRIVE_FOLDER_ID);
          if (!live) return;
          const topFolders = (files || []).filter((f) => isFolder(f.mimeType));
          const expanded = [];
          const BATCH = 6;
          for (let i = 0; i < topFolders.length && live; i += BATCH) {
            const batch = topFolders.slice(i, i + BATCH);
            const results = await Promise.all(batch.map(async (f) => {
              try { const subs = await driveExpandBundle(f.id); return subs || [f]; }
              catch { return [f]; }
            }));
            results.forEach((r) => expanded.push(...r));
            if (live) setDriveCourses([...expanded]);
          }
          if (live) setDriveCourses(expanded);
        } catch { /* ignore */ }
      }
      if (live) setLoading(false);
    })();
    return () => { live = false; };
  }, [college]);

  return (
    <>
      <Seo page="courses" />
      <section className="page-hero">
        <div className="container">
          <div className="crumbs"><LLink to="/">{t.common.backHome}</LLink> / {t.pages.courses.crumbs}</div>
          <h1>{t.pages.courses.title}</h1>
          <p>Full video courses from the college's library — pick a course and start learning.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <ContinueLearning />
          {!loading && total > 0 && (
            <div style={{ marginBottom: 26 }}>
              <div style={{ position: 'relative', maxWidth: 520 }}>
                <span aria-hidden style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', display: 'inline-flex', pointerEvents: 'none' }}><ISearch size={18} /></span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={lang === 'ur' ? 'کورس تلاش کریں…' : 'Search courses…'}
                  aria-label={lang === 'ur' ? 'کورس تلاش کریں' : 'Search courses'}
                  style={{ width: '100%', padding: '13px 16px', paddingInlineStart: 42, border: '1.5px solid var(--line)', borderRadius: 14, fontSize: 16, background: 'var(--card)', color: 'var(--heading)' }}
                />
              </div>
              <div className="filters" style={{ marginTop: 14 }}>
                <button type="button" className={'chip' + (cat === 'All' ? ' on' : '')} onClick={() => setCat('All')}>
                  {lang === 'ur' ? 'سب' : 'All'} ({total})
                </button>
                {cats.map(([label, n]) => (
                  <button type="button" key={label} className={'chip' + (cat === label ? ' on' : '')} onClick={() => setCat(label)}>
                    {label} ({n})
                  </button>
                ))}
              </div>
              {(debounced.trim() || cat !== 'All') && (
                <p className="muted" style={{ marginTop: 12 }}>
                  {lang === 'ur' ? `کورسز: ${visibleTotal} / ${total}` : `Showing ${visibleTotal} of ${total} courses`}
                  {' '}· <button type="button" onClick={clearFilters} style={{ background: 'none', border: 0, color: 'var(--link)', cursor: 'pointer', fontWeight: 700, padding: 0 }}>{lang === 'ur' ? 'صاف کریں' : 'Clear'}</button>
                </p>
              )}
            </div>
          )}
          {loading ? (
            <div className="grid grid-3" aria-busy="true" aria-label="Loading courses">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div className="skel" key={i}>
                  <div className="skel-thumb" />
                  <div className="skel-body">
                    <div className="skel-line" style={{ width: '70%' }} />
                    <div className="skel-line" style={{ width: '45%' }} />
                  </div>
                </div>
              ))}
            </div>
          )
            : total === 0 ? (
              <div className="empty">
                <div className="big" aria-hidden><IVideo size={44} /></div>
                <h3>No courses published yet</h3>
                <p>Video courses will appear here once the admin adds them.</p>
              </div>
            ) : visibleTotal === 0 ? (
              <div className="empty">
                <div className="big" aria-hidden><ISearch size={44} /></div>
                <h3>{lang === 'ur' ? 'کوئی کورس نہیں ملا' : 'No courses match'}</h3>
                <p>{lang === 'ur' ? 'تلاش یا کیٹیگری بدلیں، یا فلٹر صاف کریں۔' : 'Try a different search or category, or clear the filters.'}</p>
                <button type="button" className="btn btn-gold" onClick={clearFilters} style={{ marginTop: 8 }}>{lang === 'ur' ? 'فلٹر صاف کریں' : 'Clear filters'}</button>
              </div>
            ) : (<>
              {visibleCourses.length > 0 && (
              <div className="grid grid-3">
                {visibleCourses.map((c) => (
                  <div className="card" key={'sb-' + c.id} style={{ padding: 0, overflow: 'hidden' }}>
                    <LLink to={`/courses/${c.id}`} style={{ display: 'block', aspectRatio: '16/9' }}>
                      {c.thumbnail_url
                        ? <img src={c.thumbnail_url} alt={c.title} loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={(e) => { if (!e.currentTarget.dataset.fb) { e.currentTarget.dataset.fb = '1'; e.currentTarget.src = courseThumbFor(c.title); } }} />
                        : <div className="thumb-fallback">
                            <span className="tf-icon" aria-hidden><IVideo size={36} /></span>
                            <span className="tf-title">{c.title}</span>
                          </div>}
                    </LLink>
                    <div style={{ padding: 22 }}>
                      <span className="tag">Video Course</span>{' '}
                      {c.class_level && <span className="tag navy">{c.class_level}</span>}
                      <h3 style={{ marginTop: 8 }}>
                        <LLink to={`/courses/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>{c.title}</LLink>
                      </h3>
                      {c.description && <p>{c.description}</p>}
                      <LLink className="btn btn-navy" to={`/courses/${c.id}`}>Open Course →</LLink>
                    </div>
                  </div>
                ))}
              </div>)}
              {visibleDrive.length > 0 && (<>
                {visibleCourses.length > 0 && (
                  <h2 style={{ margin: '34px 0 16px' }}>
                    Course Library
                    <span className="tag" style={{ marginInlineStart: 10 }}>{visibleDrive.length}</span>
                  </h2>)}
                <div className="grid grid-3">
                  {visibleDrive.map((f) => (
                    <div className="card" key={'dr-' + f.id} style={{ padding: 0, overflow: 'hidden' }}>
                      <LLink to={`/courses/${f.id}`} style={{ display: 'block', aspectRatio: '16/9', overflow: 'hidden' }}>
                        {/* Designed per-course thumbnail first; onError chain:
                            real video frame -> category thumbnail (never broken) */}
                        <img src={courseArtFor(f.id)} alt={cleanCourseName(f.name)}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          loading="lazy"
                          onError={(e) => {
                            const el = e.currentTarget; const step = el.dataset.fb || '0';
                            if (step === '0') { el.dataset.fb = '1'; el.src = driveThumbs[f.id] || courseThumbFor(f.name); }
                            else if (step === '1' && driveThumbs[f.id]) { el.dataset.fb = '2'; el.src = courseThumbFor(f.name); }
                          }} />
                      </LLink>
                      <div style={{ padding: 22 }}>
                        <span className="tag">Video Course</span>
                        <h3 style={{ marginTop: 8 }}>
                          <LLink to={`/courses/${f.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>{cleanCourseName(f.name)}</LLink>
                        </h3>
                        <LLink className="btn btn-navy" to={`/courses/${f.id}`}>Open Course →</LLink>
                      </div>
                    </div>
                  ))}
                </div>
              </>)}
            </>)}
        </div>
      </section>
    </>
  );
}
