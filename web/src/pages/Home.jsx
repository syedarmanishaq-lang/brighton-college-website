/* Home — world-class redesign (R2, R3, R9).
   Proof-headline hero + animated stats band + programs + principal +
   editorial newsroom + events + admissions CTA. */
import React, { useEffect, useRef, useState } from 'react';
import { fetchTickerNotices, fetchNews, backendReady } from '../lib/supabase.js';
import { PROGRAMS } from '../data/college.js';
import { useCollege, useSite } from '../college/CollegeContext.jsx';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import Seo from '../seo/Seo.jsx';
import { personSchemas, eventSchema } from '../seo/schema.js';
import Countdown from '../components/Countdown.jsx';
import { IMegaphone, ICheck, IBook, IVideo, IDoc, ICap, IImage } from '../components/icons.jsx';
import AdSlot from '../components/AdSlot.jsx';
import { useAdmissionsOpen } from '../lib/settings.js';

/* Animated count-up numeral (R3). Respects prefers-reduced-motion. */
function Counter({ to, plain }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVal(to); return; }
    let raf = 0, started = false;
    const finish = () => { if (!started) { started = true; setVal(to); } io.disconnect(); };
    // Safety: never leave the numeral stuck at 0 (e.g. observer never fires)
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
  /* Years like 2023 must NOT get a thousands separator ("2,023" is wrong). */
  return <span ref={ref}>{plain ? String(val) : val.toLocaleString('en-US')}</span>;
}

import { cacheFresh, cacheSet } from '../lib/cache.js';

/* Public reads cache: 5 minutes. Repeat visits render instantly from the
   last saved list; a fresh fetch runs behind it. Offline visits show the
   saved list instead of an empty page. */
const NEWS_TTL_MS = 5 * 60 * 1000;

/* Cache keys use the college SLUG (stable from the first paint), not the
   UUID: the UUID only arrives after the background college fetch, so a
   UUID key made every full reload miss the cache and re-fetch news. */
function useTicker() {
  const { college } = useCollege();
  const key = `ticker:${(college && college.slug) || 'all'}`;
  const [items, setItems] = useState(() => cacheFresh(key, NEWS_TTL_MS) || []);
  useEffect(() => {
    if (!backendReady()) return;
    const cached = cacheFresh(key, NEWS_TTL_MS);
    if (cached) setItems(cached);
    fetchTickerNotices(college && college.id)
      .then((r) => { setItems(r || []); cacheSet(key, r || []); })
      .catch(() => {});
  }, [college]); // eslint-disable-line react-hooks/exhaustive-deps
  return items;
}

function useNews(limit) {
  const { college } = useCollege();
  const key = `news:${limit}:${(college && college.slug) || 'all'}`;
  const [items, setItems] = useState(() => cacheFresh(key, NEWS_TTL_MS) || []);
  const [loading, setLoading] = useState(() => cacheFresh(key, NEWS_TTL_MS) === null);
  useEffect(() => {
    if (!backendReady()) { setLoading(false); return; }
    let alive = true;
    const cached = cacheFresh(key, NEWS_TTL_MS);
    if (cached) { setItems(cached); setLoading(false); }
    fetchNews(limit, college && college.id)
      .then((r) => { if (!alive) return; setItems(r || []); cacheSet(key, r || []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [limit, college]); // eslint-disable-line react-hooks/exhaustive-deps
  return { items, loading };
}

function readTime(text) {
  const words = String(text || '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return ''; }
}

function NewsCard({ n, featured }) {
  const { t } = useLang();
  const img = n.image_url || n.cover_url;
  const body = n.body || n.content || n.excerpt || '';
  return (
    <LLink to={`/news/${n.id}`} className={'news-card' + (featured ? ' featured' : '') + (n.pinned ? ' pinned' : '') + (img ? '' : ' no-img')}>
      {img && (
        <div className="news-card-img">
          <img src={img} alt="" loading="lazy" />
        </div>
      )}
      <div className="news-card-body">
        <span className="eyebrow">{n.category || t.nav.news}</span>
        {n.pinned && <span className="tag">Pinned</span>}
        <h3>{n.title}</h3>
        {featured && body && <p>{body.slice(0, 180)}{body.length > 180 ? '…' : ''}</p>}
        <div className="news-meta">
          <span>{fmtDate(n.published_at)}</span>
          <span>·</span>
          <span>{readTime(body)} {t.common.minRead}</span>
        </div>
      </div>
    </LLink>
  );
}

function EventCard({ n }) {
  const { t } = useLang();
  let d = '', m = '';
  try {
    const dt = new Date(n.published_at);
    d = dt.getDate(); m = dt.toLocaleDateString('en-GB', { month: 'short' });
  } catch {}
  return (
    <LLink to={`/news/${n.id}`} className="event-card">
      <div className="event-date" aria-hidden><span className="d">{d}</span><span className="m">{m}</span></div>
      <div className="event-body">
        <span className="eyebrow">{n.category}</span>
        <h3>{n.title}</h3>
        <p>{t.events.register} <span className="flip-rtl" aria-hidden>→</span></p>
      </div>
    </LLink>
  );
}

export default function Home() {
  const { t, lang } = useLang();
  const site = useSite();
  const tickerItems = useTicker();
  const { items: news, loading: newsLoading } = useNews(4);
  /* Honest admissions state: live pinned notices win; otherwise the
     fallback reflects the admin's admissions_open switch (default CLOSED). */
  const admissionsOpen = useAdmissionsOpen();
  const st = t.admissionsStatus || {};
  const fallbackTicker = [
    admissionsOpen ? st.openTicker : st.closedTicker,
    (t.tickerFallback || [])[1],
  ].filter(Boolean);
  const ticker = tickerItems.length ? tickerItems : fallbackTicker;
  const events = news.filter((n) => (n.category || '').toLowerCase() === 'event').slice(0, 3);
  const seoExtra = React.useMemo(() => [
    ...personSchemas(),
    ...events.map(eventSchema).filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [news]);
  const newsOnly = news.filter((n) => (n.category || '').toLowerCase() !== 'event');

  const stats = [
    { value: 2023, label: t.stats.founded, to: '/about', plain: true },
    { value: 24, label: t.stats.faculty, to: '/faculty' },
    { value: 3, label: t.stats.programs, to: '/programs' },
    { value: 2, label: t.stats.sections, to: '/about' },
  ];

  return (
    <>
      <Seo page="home" extra={seoExtra} />
      <AdSlot id="home-top" format="leaderboard" />
      {/* ---------- HERO (R2): full-viewport, proof headline ---------- */}
      <section className="hero-v2" aria-label={site.name}>
        <div className="container hero-v2-inner">
          <span className="hero-v2-eyebrow">{t.hero.eyebrow}</span>
          <h1 className="hero-v2-title">
            {t.hero.titleA}<br />
            <span className="it">{t.hero.titleB}</span> {t.hero.titleC}
          </h1>
          <p className="hero-v2-proof">
            <b>{t.hero.fact2}.</b> {t.hero.proof}
          </p>
          <div className="hero-v2-actions">
            <LLink className="btn btn-gold" to="/admissions">{t.applyForAdmission}</LLink>
            <LLink className="btn btn-outline-light" to="/programs">{t.explorePrograms}</LLink>
          </div>
          <div style={{ marginTop: 18 }}><Countdown /></div>
          <div className="hero-v2-facts">
            {[t.hero.fact1, t.hero.fact2, t.hero.fact3].map((f) => (
              <span className="hero-v2-fact" key={f}><span className="tick" aria-hidden><ICheck size={12} /></span>{f}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Notice ticker ---------- */}
      {/* Items are rendered twice so the marquee loops seamlessly with no empty gap. */}
      <div className="ticker" aria-label="Announcements">
        <div className="ticker-track">
          {[...ticker, ...ticker].map((x, i) => <span key={i}><IMegaphone size={14} /> {x}</span>)}
        </div>
      </div>

      {/* ---------- Stats band (R3) ---------- */}
      <section className="stats-band" aria-label="College at a glance">
        <div className="container stats-band-grid">
          {stats.map((s) => (
            <LLink className="stat-band-item" to={s.to} key={s.label}>
              <div className="stat-band-num"><Counter to={s.value} plain={s.plain} /></div>
              <div className="stat-band-label">{s.label}</div>
            </LLink>
          ))}
        </div>
      </section>

      {/* ---------- Programs ---------- */}
      <section className="section">
        <div className="container">
          <div className="sec-head">
            <span className="eyebrow">{t.homePrograms.eyebrow}</span>
            <h2>{t.homePrograms.title}</h2>
            <p className="lead">{t.homePrograms.lead}</p>
          </div>
          <div className="grid grid-3">
            {PROGRAMS.map((p) => (
              <LLink className="prog-card" to="/programs" key={p.slug}>
                <div className="prog-card-top">
                  <span className="tag">11th • 12th</span>
                  <h3>{p.name}</h3>
                  <div className="subj">{p.subjects.slice(0, 3).join(' • ')}</div>
                </div>
                <div className="prog-card-body">
                  <p>{p.desc}</p>
                  <span className="prog-link">{t.homePrograms.viewDetails} <span className="flip-rtl" aria-hidden>→</span></span>
                </div>
              </LLink>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Principal's welcome (R10) ---------- */}
      <section className="section section-soft">
        <div className="container">
          <div className="principal">
            <div className="principal-photo">
              <img src="/faculty/fayoun-khan.jpg" alt={site.principalName} loading="lazy" />
            </div>
            <div>
              <span className="eyebrow">{t.principal.eyebrow}</span>
              <p className="principal-quote">{t.principal.quote}</p>
              <div className="principal-name">{site.principalName}</div>
              <div className="principal-title">Principal — {site.principalTitle}</div>
              <div style={{ marginTop: 18 }}>
                <LLink className="btn btn-outline" to="/faculty">{t.nav.faculty} <span className="flip-rtl" aria-hidden>→</span></LLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Newsroom (R9) ---------- */}
      <section className="section">
        <div className="container">
          <div className="sec-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <span className="eyebrow">{t.homeNews.eyebrow}</span>
              <h2>{t.homeNews.title}</h2>
              <p className="lead">{t.homeNews.lead}</p>
            </div>
            <LLink className="btn btn-outline" to="/news">{t.browseAllNews}</LLink>
          </div>
          {newsLoading ? (
            <div className="loading">Loading news…</div>
          ) : newsOnly.length === 0 ? (
            <div className="empty">
              <div className="big" aria-hidden><IBook size={44} /></div>
              <h3>{t.homeNews.emptyTitle}</h3>
              <p>{t.homeNews.emptyText}</p>
            </div>
          ) : (
            <div className="news-grid">
              {newsOnly.slice(0, 1).map((n) => <NewsCard key={n.id} n={n} featured />)}
              {newsOnly.slice(1, 4).map((n) => <NewsCard key={n.id} n={n} />)}
            </div>
          )}
        </div>
      </section>

      {/* ---------- Study resources — internal links to hub pages ---------- */}
      <section className="section section-soft" aria-label="Study resources">
        <div className="container">
          <div className="sec-head">
            <span className="eyebrow">{lang === 'ur' ? 'مفت تعلیمی وسائل' : 'Free Study Resources'}</span>
            <h2>{lang === 'ur' ? 'پڑھائی کے لیے سب کچھ' : 'Everything for Your Studies'}</h2>
            <p className="lead">{lang === 'ur'
              ? 'مفت ویڈیو کورسز، درسی کتب، پاسٹ پیپرز، ہفتہ وار ٹیسٹ کے نتائج اور گیلری — سب ایک جگہ۔'
              : 'Free video courses, textbooks, past papers, weekly test results and the photo gallery — all in one place.'}</p>
          </div>
          <div className="grid grid-auto">
            <LLink className="card" to="/courses">
              <div aria-hidden style={{ color: 'var(--gold-400)', marginBottom: 10 }}><IVideo size={30} /></div>
              <h3>{lang === 'ur' ? 'ویڈیو کورسز' : 'Video Courses'}</h3>
              <p>{lang === 'ur' ? 'انگریزی اور اردو میں مفت کورسز۔' : 'Free courses in English & Urdu.'}</p>
            </LLink>
            <LLink className="card" to="/books">
              <div aria-hidden style={{ color: 'var(--gold-400)', marginBottom: 10 }}><IBook size={30} /></div>
              <h3>{lang === 'ur' ? 'درسی کتب' : 'Textbooks'}</h3>
              <p>{lang === 'ur' ? 'گیارہویں اور بارہویں کی مفت کتب۔' : 'Free 11th & 12th textbooks.'}</p>
            </LLink>
            <LLink className="card" to="/past-papers">
              <div aria-hidden style={{ color: 'var(--gold-400)', marginBottom: 10 }}><IDoc size={30} /></div>
              <h3>{lang === 'ur' ? 'پاسٹ پیپرز' : 'Past Papers'}</h3>
              <p>{lang === 'ur' ? 'حل شدہ بورڈ پیپرز۔' : 'Solved board papers.'}</p>
            </LLink>
            <LLink className="card" to="/results">
              <div aria-hidden style={{ color: 'var(--gold-400)', marginBottom: 10 }}><ICap size={30} /></div>
              <h3>{lang === 'ur' ? 'ٹیسٹ کے نتائج' : 'Test Results'}</h3>
              <p>{lang === 'ur' ? 'ہفتہ وار اور ماہانہ نتائج۔' : 'Weekly & monthly results.'}</p>
            </LLink>
            <LLink className="card" to="/gallery">
              <div aria-hidden style={{ color: 'var(--gold-400)', marginBottom: 10 }}><IImage size={30} /></div>
              <h3>{lang === 'ur' ? 'گیلری' : 'Gallery'}</h3>
              <p>{lang === 'ur' ? 'کالج کی تصاویر اور ویڈیوز۔' : 'Photos & videos from college life.'}</p>
            </LLink>
          </div>
        </div>
      </section>

      {/* ---------- Events (R9) — only when the office publishes events ---------- */}
      {events.length > 0 && (
        <section className="section section-soft" style={{ paddingTop: 56 }}>
          <div className="container">
            <div className="sec-head">
              <span className="eyebrow">{t.events.eyebrow}</span>
              <h2>{t.events.title}</h2>
            </div>
            <div className="grid grid-3">
              {events.map((n) => <EventCard key={n.id} n={n} />)}
            </div>
          </div>
        </section>
      )}

      {/* ---------- Admissions CTA → visit the campus (owner's order) ---------- */}
      <section className="cta-visit">
        <div className="container" style={{ textAlign: 'center' }}>
          <span className="eyebrow" style={{ color: '#d9b545' }}>{t.hero.eyebrow}</span>
          <h2 style={{ color: '#fff' }}>{admissionsOpen ? st.openTitle : st.closedTitle}</h2>
          <p className="lead" style={{ margin: '0 auto 26px', color: '#c8d4e6' }}>{admissionsOpen ? st.openLead : st.closedLead}</p>
          <LLink className="btn btn-gold" to="/contact">{t.startApplication}</LLink>
        </div>
      </section>
    </>
  );
}
