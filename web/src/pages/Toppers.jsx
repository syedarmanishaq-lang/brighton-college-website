/* Our Toppers — Hall of Fame page.
   Data-driven from the Supabase `toppers` table (migration 012).
   No topper is ever invented: the page shows only published rows, and
   an elegant empty state when there are none yet. The two verified
   toppers are: (1) Munazza Hamid (MDCAT 171, F.Sc 1129, 2026) — from
   the college's own gallery video "MDCAT Topper Celebration"; (2)
   Aroosa Gul — 3rd Position, BISEM Mardan, Computer Science — her
   name is burned into the college's own "Campus Life" gallery video
   and she introduces herself by name in the audio at t≈0s. Her year
   is not stated in the video, so the card shows no year rather than
   a guess. (The banner was first misread as "Arooha Gul" — the user
   corrected it 2026-11-21; the DB row and migration were fixed.)
   Design notes (from real college achiever pages — Crescent Hall of
   Fame, Learners Academy, Stars Academy, St. Mary's): a stats strip
   under the hero, one large featured topper card, toppers grouped by
   year, category filter (MDCAT / Board), and a "Be the Next Topper"
   call to action. Motion: layered hero entrance, varied scroll
   reveals, staggered score-chip pops, photo zoom on hover, and a
   hand-drawn gold medal drifting in the hero — all transform +
   opacity only, CSS-only, no animation library, so the page stays
   fast on a phone. */
import React, { useEffect, useRef, useState } from 'react';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import Seo from '../seo/Seo.jsx';
import { fetchToppers } from '../lib/supabase.js';
import { driveDownloadUrl } from '../lib/drive.js';
import './Toppers.css';

/* Scroll reveal. Mirrors the Gallery/Home IntersectionObserver
   pattern; falls back to visible when IO is unavailable, and honours
   prefers-reduced-motion via CSS. The `variant` gives each section
   its own motion (left / right / zoom / settle / card) so the page
   never feels like one identical fade-up repeated. */
function Reveal({ children, delay, variant }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); io.disconnect(); }
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={'top-reveal' + (variant ? ` rv-${variant}` : '') + (inView ? ' in' : '')}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

/* Count-up number, mirroring the Home page hook: eases out over 1.5s
   once the stat scrolls into view; never leaves the numeral stuck at 0
   (2500ms safety timeout) and respects reduced-motion. */
function CountUp({ to }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVal(to); return; }
    let raf = 0, started = false;
    const finish = () => { if (!started) { started = true; setVal(to); } io.disconnect(); };
    const safety = setTimeout(finish, 2500);
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || started) return;
      started = true;
      clearTimeout(safety);
      const t0 = performance.now(), dur = 1500;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      io.disconnect();
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); clearTimeout(safety); };
  }, [to]);
  return <span ref={ref}>{val.toLocaleString('en-US')}</span>;
}

function initials(name) {
  if (!name) return '🏆';
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join('');
}

function numOf(s) {
  const m = String(s || '').match(/(\d[\d,]*)/);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
}

function TopperPhoto({ t, big }) {
  if (t.photo_url) {
    return <img className={'top-photo' + (big ? ' big' : '')} src={t.photo_url}
      alt={t.name} loading="lazy" decoding="async" />;
  }
  return (
    <div className={'top-photo top-photo-fallback' + (big ? ' big' : '')} aria-hidden>
      {initials(t.name)}
    </div>
  );
}

/* Fallback stream URL if the Drive API stream ever fails (e.g. key
   revoked) — same as Gallery.jsx. */
const DRIVE_UC = (id) => `https://drive.google.com/uc?export=download&id=${id}`;

/* The toppers table stores the Drive /view link; the player needs the
   bare file id for the alt=media stream URL. */
function driveFileId(url) {
  const m = String(url || '').match(/\/d\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

/* In-place Drive video player — the Gallery lightbox pattern, shrunk
   into the card. The <video> mounts only after the user taps the
   poster, so nothing streams on page load (no data burn on a slow
   connection); the tap itself starts playback, exactly like the
   Gallery lightbox. Primary stream is the Drive API alt=media URL
   (range requests, verified 206 video/mp4); on error it falls back
   once to the uc?export=download URL, then to a Drive link. */
function TopperPlayer({ t, big, fileId }) {
  const [src, setSrc] = useState(() => driveDownloadUrl(fileId));
  const [failed, setFailed] = useState(false);
  const [fellBack, setFellBack] = useState(false);
  if (failed) {
    return (
      <div className={'top-video top-video-failed' + (big ? ' big' : '')}>
        <p>This video could not be played.</p>
        <a href={t.video_url} target="_blank" rel="noreferrer">Watch on Google Drive</a>
      </div>
    );
  }
  return (
    <div className={'top-video' + (big ? ' big' : '')}>
      <video
        src={src}
        poster={t.photo_url || undefined}
        controls
        playsInline
        preload="none"
        autoPlay
        onError={() => {
          if (!fellBack) { setFellBack(true); setSrc(DRIVE_UC(fileId)); }
          else setFailed(true);
        }}
        title={t.name}
      />
    </div>
  );
}

/* Card media: the R2 still stays as the poster with a gold play badge;
   tapping it swaps the still for the topper's own Drive video, played
   in place. No video_url (or an unparseable one) → the plain photo. */
function TopperMedia({ t, big }) {
  const [playing, setPlaying] = useState(false);
  const fileId = driveFileId(t.video_url);
  if (!fileId) return <TopperPhoto t={t} big={big} />;
  if (playing) return <TopperPlayer t={t} big={big} fileId={fileId} />;
  return (
    <button type="button" className={'top-video-poster' + (big ? ' big' : '')}
      onClick={() => setPlaying(true)}
      aria-label={`Play video: ${t.name || t.achievement || 'topper'}`}>
      <TopperPhoto t={t} big={big} />
      <span className="top-play-badge" aria-hidden="true">▶</span>
    </button>
  );
}

function ScoreChips({ t }) {
  /* secondary_text is either "F.Sc 1129" (number + label) or a plain
     subject such as "Computer Science" — the chip shows whichever
     form the data actually has; nothing is guessed. */
  const secNum = numOf(t.secondary_text);
  const secLabel = t.secondary_text ? t.secondary_text.replace(/[\d,]+$/, '').trim() : '';
  return (
    <div className="top-scores">
      {t.marks && (
        <div className="top-score">
          <b>{t.marks}</b>
          <span>{t.marks_label || 'Score'}</span>
        </div>
      )}
      {t.secondary_text && (
        <div className="top-score">
          <b>{secNum !== null ? secNum : t.secondary_text}</b>
          <span>{secNum !== null ? (secLabel || 'Marks') : 'Subject'}</span>
        </div>
      )}
      {t.position && (
        <div className="top-score gold">
          <b>{t.position}</b>
          <span>Position</span>
        </div>
      )}
    </div>
  );
}

export default function Toppers() {
  const { t, lang } = useLang();
  const s = t.pages.toppers;
  const [rows, setRows] = useState(null); // null = loading
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let live = true;
    fetchToppers()
      .then((r) => { if (live) setRows(r || []); })
      .catch(() => { if (live) setRows([]); }); // table missing yet -> empty state
    return () => { live = false; };
  }, []);

  const mdcatRows = (rows || []).filter((r) => r.category === 'MDCAT');
  const boardRows = (rows || []).filter((r) => r.category === 'Board');
  const counts = { all: (rows || []).length, MDCAT: mdcatRows.length, Board: boardRows.length };
  const visible = filter === 'all' ? (rows || []) : filter === 'MDCAT' ? mdcatRows : boardRows;
  const featured = (rows || [])[0] || null;
  const rest = (rows || []).slice(1);

  /* Stats, computed from the real rows only — never invented. */
  const mdcatNums = mdcatRows.map((r) => numOf(r.marks)).filter((n) => n !== null);
  const fscNums = (rows || []).map((r) => numOf(r.secondary_text)).filter((n) => n !== null);
  const stats = [];
  if (mdcatNums.length) stats.push({ v: Math.max(...mdcatNums), label: s.topMdcat });
  if (fscNums.length) stats.push({ v: Math.max(...fscNums), label: s.topFsc });
  if (mdcatRows.length) stats.push({ v: mdcatRows.length, label: s.qualifiers });

  /* Year groups: under "All" the featured topper is spotlighted above,
     so the grid lists the rest; under a category filter the grid lists
     every topper of that category (the featured one included). */
  const gridRows = filter === 'all' ? rest : visible;
  /* Year groups: dated rows group under their year; rows whose year
     is not confirmed yet (e.g. the board topper) group under a plain
     "Board Toppers" / "More Toppers" heading — the year is never guessed. */
  const datedRows = gridRows.filter((r) => r.year);
  const undatedRows = gridRows.filter((r) => !r.year);
  const years = [...new Set(datedRows.map((r) => r.year))].sort((a, b) => b - a);
  const undatedHeading = undatedRows.length && undatedRows.every((r) => r.category === 'Board')
    ? s.boardToppers : s.moreToppers;

  /* A topper whose name is not confirmed yet is shown by role
     ("Board Topper") with a "name to be announced" note — never a
     made-up name. */
  const displayName = (r) => r.name || (r.category === 'Board' ? s.unnamedBoard : s.unnamedMdcat);

  const renderGroup = (key, heading, list) => (
    <div key={key}>
      <Reveal variant="left"><h2 className="top-year">{heading}</h2></Reveal>
      <div className="top-grid">
        {list.map((r, i) => (
          <Reveal key={r.id} delay={(i % 3) * 120} variant="card">
            <article className="card top-card">
              <TopperMedia t={r} />
              <div className="top-card-body">
                <span className="top-badge small">{r.achievement || r.category}</span>
                <h3>{displayName(r)}</h3>
                {!r.name && <p className="top-name-soon">{s.nameSoon}</p>}
                <ScoreChips t={r} />
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <Seo page="toppers" />
      <section className="page-hero top-hero">
        {/* Hand-drawn line-art gold medal — the page's signature
            motion element. Decorative only; hidden on small screens. */}
        <div className="top-hero-medal" aria-hidden="true">
          <svg viewBox="0 0 120 140" aria-hidden="true">
            <path d="M40 2 L60 46 L80 2" fill="none" stroke="currentColor" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx="60" cy="46" r="7" fill="#0a1c33" stroke="currentColor" strokeWidth="3" />
            <circle cx="60" cy="86" r="34" fill="none" stroke="currentColor" strokeWidth="3" />
            <circle cx="60" cy="86" r="26" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".55" />
            <path d="M60 70 L63.8 80.7 L75.2 81.1 L66.2 88 L69.4 98.9 L60 92.5 L50.6 98.9 L53.8 88 L44.8 81.1 L56.2 80.7 Z" fill="currentColor" />
          </svg>
        </div>
        <div className="container">
          <div className="crumbs"><LLink to="/">Home</LLink> / {s.crumbs}</div>
          <h1>{s.title}</h1>
          <p>{s.subtitle}</p>
          <div className="top-gold-rule" aria-hidden />
        </div>
      </section>

      {rows === null ? (
        <section className="section"><div className="container"><div className="loading">Loading…</div></div></section>
      ) : rows.length === 0 ? (
        <section className="section">
          <div className="container" style={{ maxWidth: 720 }}>
            <Reveal>
              <div className="card top-empty">
                <div className="top-empty-mark" aria-hidden>🏆</div>
                <h2>{s.emptyTitle}</h2>
                <p>{s.emptyText}</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <LLink className="btn btn-gold" to="/programs">{lang === 'ur' ? 'پروگرامز دیکھیں' : 'Explore Programs'}</LLink>
                  <LLink className="btn btn-outline" to="/admissions">{s.ctaBtn}</LLink>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      ) : (
        <>
          {stats.length > 0 && (
            <section className="section top-stats-sec">
              <div className="container">
                <div className="top-stats">
                  {stats.map((st, i) => (
                    <Reveal key={st.label} delay={i * 120} variant="zoom">
                      <div className="card top-stat">
                        <div className="top-stat-num"><CountUp to={st.v} /></div>
                        <div className="top-stat-label">{st.label}</div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="section" style={{ paddingTop: 0 }}>
            <div className="container">
              <div className="top-filters" role="tablist" aria-label="Topper category">
                {['all', 'MDCAT', 'Board'].map((k) => (
                  <button key={k} type="button" role="tab" aria-selected={filter === k}
                    className={'chip' + (filter === k ? ' on' : '')}
                    onClick={() => setFilter(k)}>
                    {k === 'all' ? s.all : k} ({counts[k === 'all' ? 'all' : k]})
                  </button>
                ))}
              </div>

              {filter === 'all' && featured && (
                <Reveal variant="settle">
                  <article className="card top-featured">
                    <TopperMedia t={featured} big />
                    <div className="top-featured-body">
                      <span className="top-badge">{s.featured} · {featured.achievement || featured.category}</span>
                      <h2>{displayName(featured)}</h2>
                      {!featured.name && <p className="top-name-soon">{s.nameSoon}</p>}
                      <p className="top-achieve">{featured.achievement}</p>
                      <ScoreChips t={featured} />
                    </div>
                  </article>
                </Reveal>
              )}

              {visible.length === 0 && filter === 'Board' && (
                <Reveal>
                  <div className="card top-empty">
                    <div className="top-empty-mark" aria-hidden>🎓</div>
                    <h2>{s.noBoardTitle}</h2>
                    <p>{s.noBoardText}</p>
                    <LLink className="btn btn-outline" to="/results">{lang === 'ur' ? 'نتائج دیکھیں' : 'See Results'}</LLink>
                  </div>
                </Reveal>
              )}

              {/* key={filter} re-mounts the groups on every filter tap,
                  so the grid re-enters with its stagger instead of
                  swapping in flat. */}
              <div key={filter}>
                {years.map((y) => renderGroup(y, filter === 'all' ? y : `${filter} — ${y}`,
                  datedRows.filter((r) => r.year === y)))}
                {undatedRows.length > 0 && renderGroup('undated', undatedHeading, undatedRows)}
              </div>
            </div>
          </section>

          <section className="top-cta">
            <div className="container">
              <Reveal variant="zoom">
                <h2>{s.ctaTitle}</h2>
                <p>{s.ctaText}</p>
                <LLink className="btn btn-gold" to="/admissions">{s.ctaBtn}</LLink>
              </Reveal>
            </div>
          </section>
        </>
      )}
    </>
  );
}
