/* Faculty & Staff page.
   Data-driven from the Supabase `faculty` table (migration 013).
   The old hardcoded list (with 107x80 blurry thumbnails) is gone: only
   the principal's HD portrait was kept, the rest of the staff show a
   large initial block until the admin uploads a clear portrait from
   the Faculty tab. Every card is big — a large photo on top — and
   tapping it opens the full profile (role, subject, field,
   qualifications, bio) in a modal. Nothing is invented: a field the
   admin has not filled in simply does not appear. */
import React, { useEffect, useState } from 'react';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import { useAdmissionsOpen } from '../lib/settings.js';
import { fetchFaculty } from '../lib/supabase.js';
import Seo from '../seo/Seo.jsx';
import './Faculty.css';

function initials(name) {
  if (!name) return '🎓';
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join('');
}

function FacPhoto({ f, big }) {
  if (f.photo_url) {
    return <img className={'fac-photo' + (big ? ' big' : '')} src={f.photo_url}
      alt={f.name} loading="lazy" decoding="async" />;
  }
  return (
    <div className={'fac-photo fac-photo-fallback' + (big ? ' big' : '')} aria-hidden>
      {initials(f.name)}
    </div>
  );
}

/* Full profile modal — the Gallery lightbox backdrop, with a white
   detail card instead of a bare image. Closes on backdrop tap, the ×
   button, or Escape. */
function FacModal({ f, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const details = [
    ['Role', f.role],
    ['Subject', f.subject],
    ['Field', f.field],
    ['Qualifications', f.qualifications],
  ].filter(([, v]) => v);
  return (
    <div className="lightbox" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="fac-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={f.name}>
        <button className="lb-close" onClick={onClose} aria-label="Close">×</button>
        <FacPhoto f={f} big />
        <div className="fac-modal-body">
          <h2>{f.name}</h2>
          {f.role && <p className="tag">{f.role}</p>}
          {details.length > 0 && (
            <dl className="fac-details">
              {details.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          )}
          {f.bio && <p className="fac-bio">{f.bio}</p>}
        </div>
      </div>
    </div>
  );
}

export default function Faculty() {
  const { t } = useLang();
  /* Live admissions state — same switch Admissions.jsx reads, so this page
     can never again claim "open" while admissions are closed. */
  const admissionsOpen = useAdmissionsOpen();
  const st = t.admissionsStatus || {};
  const [rows, setRows] = useState(null); // null = loading
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let live = true;
    fetchFaculty()
      .then((r) => { if (live) setRows(r || []); })
      .catch(() => { if (live) setRows([]); }); // table missing yet -> empty state
    return () => { live = false; };
  }, []);

  const principal = (rows || []).find((r) => /principal/i.test(r.role || '')) || null;
  const rest = (rows || []).filter((r) => r !== principal);

  const renderCard = (f, i) => (
    <article key={f.id} className="card fac-card" style={{ animationDelay: `${(i % 3) * 90}ms` }}>
      <button type="button" className="fac-card-btn" onClick={() => setSelected(f)}
        aria-label={`View full profile: ${f.name}`}>
        <FacPhoto f={f} />
        <div className="fac-card-body">
          <h3>{f.name}</h3>
          {f.role && <p className="tag">{f.role}</p>}
          {f.qualifications && <p className="form-note" style={{ margin: 0 }}>{f.qualifications}</p>}
          {f.subject && <p className="fac-subject">{f.subject}</p>}
          <span className="fac-more">View full profile →</span>
        </div>
      </button>
    </article>
  );

  return (
    <>
      <Seo page="faculty" />
      <section className="page-hero">
        <div className="container">
          <div className="crumbs"><LLink to="/">{t.common.backHome}</LLink> / {t.pages.faculty.crumbs}</div>
          <h1>{t.pages.faculty.title}</h1>
          <p>
            A diverse, qualified and experienced team of teachers — masters of
            their subjects, and mentors who know every student by name.
          </p>
        </div>
      </section>

      {rows === null ? (
        <section className="section"><div className="container"><div className="loading">Loading…</div></div></section>
      ) : rows.length === 0 ? (
        <section className="section">
          <div className="container" style={{ maxWidth: 720 }}>
            <div className="card fac-empty">
              <div className="fac-empty-mark" aria-hidden>🎓</div>
              <h2>Our teachers are coming here soon</h2>
              <p>Teacher profiles with photos, subjects and qualifications are being added — check back soon.</p>
              <LLink className="btn btn-gold" to="/contact">{t.visitCampus}</LLink>
            </div>
          </div>
        </section>
      ) : (
        <section className="section">
          <div className="container">
            <span className="eyebrow">Teaching Staff</span>
            <h2>Meet Your Teachers</h2>
            <p className="lead">
              From the principal to every lecturer — the people who will guide you
              through 11th and 12th, test by test. Tap any teacher to see their full profile.
            </p>

            {principal && (
              <article className="card fac-featured">
                <button type="button" className="fac-featured-btn" onClick={() => setSelected(principal)}
                  aria-label={`View full profile: ${principal.name}`}>
                  <FacPhoto f={principal} />
                  <div className="fac-featured-body">
                    <span className="fac-badge">Principal</span>
                    <h3>{principal.name}</h3>
                    {principal.qualifications && <p className="form-note">{principal.qualifications}</p>}
                    {principal.bio && <p className="fac-bio">{principal.bio}</p>}
                    <span className="fac-more">View full profile →</span>
                  </div>
                </button>
              </article>
            )}

            <div className="fac-grid" style={{ marginTop: 26 }}>
              {rest.map(renderCard)}
            </div>

            <div className="card" style={{ marginTop: 30 }}>
              <h3>Want to learn from them?</h3>
              <p>{admissionsOpen ? st.openLead : st.closedLead}</p>
              <LLink className="btn btn-gold" to="/contact">{t.visitCampus}</LLink>
            </div>
          </div>
        </section>
      )}
      {selected && <FacModal f={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
