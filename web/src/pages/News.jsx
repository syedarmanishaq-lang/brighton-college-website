/* News — editorial newsroom (R9): eyebrow/date/read-time cards,
   one featured card, category filters. */
import React, { useEffect, useState } from 'react';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import { useCollege, useSite } from '../college/CollegeContext.jsx';

import { fetchNews, backendReady } from '../lib/supabase.js';
import { cacheFresh, cacheSet } from '../lib/cache.js';
import { NEWS_CATEGORIES } from '../data/college.js';
import Seo from '../seo/Seo.jsx';
import { IBook } from '../components/icons.jsx';
import AdSlot from '../components/AdSlot.jsx';

/* Public reads cache: 5 minutes (same pattern as Home). Repeat visits
   render instantly from the last saved list; a fresh fetch runs only
   when the cache is stale. Key uses the college SLUG, not the UUID. */
const NEWS_TTL_MS = 5 * 60 * 1000;

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
  const sec = n.section || 'general';
  const secLabel = sec === 'boys' ? t.pages.sections.boys
    : sec === 'girls' ? t.pages.sections.girls : null;
  return (
    <LLink to={`/news/${n.id}`} className={'news-card' + (featured ? ' featured' : '') + (img ? '' : ' no-img')}>
      {img && (
        <div className="news-card-img">
          <img src={img} alt="" loading="lazy" />
        </div>
      )}
      <div className="news-card-body">
        <span className="eyebrow">{n.category || t.nav.news}</span>
        <h3>{n.title}</h3>
        {body && <p className="news-excerpt">{body.slice(0, featured ? 200 : 160)}{body.length > (featured ? 200 : 160) ? '…' : ''}</p>}
        <div className="news-meta">
          {n.pinned && <span className="tag">Pinned</span>}
          {secLabel && <span className="tag tag-section">{secLabel}</span>}
          <span>{fmtDate(n.published_at)}</span>
          <span>·</span>
          <span>{readTime(body)} {t.common.minRead}</span>
        </div>
      </div>
    </LLink>
  );
}

export default function News() {
  const { t } = useLang();
  const { college } = useCollege();
  const cacheKey = `news:all:${(college && college.slug) || 'all'}`;
  const [items, setItems] = useState(() => cacheFresh(cacheKey, NEWS_TTL_MS) || []);
  const [cat, setCat] = useState('All');
  const [sec, setSec] = useState('all');
  const [loading, setLoading] = useState(() => cacheFresh(cacheKey, NEWS_TTL_MS) === null);

  useEffect(() => {
    if (!backendReady()) { setLoading(false); return; }
    const cached = cacheFresh(cacheKey, NEWS_TTL_MS);
    if (cached) { setItems(cached); setLoading(false); return; } // fresh cache: no re-fetch
    fetchNews(null, college && college.id).then((r) => { setItems(r || []); cacheSet(cacheKey, r || []); }).catch(() => {}).finally(() => setLoading(false));
  }, [college]);

  const bySec = sec === 'all' ? items : items.filter((n) => (n.section || 'general') === sec);
  const shown = cat === 'All' ? bySec : bySec.filter((n) => n.category === cat);
  const secTabs = [
    { key: 'all', label: t.pages.sections.all },
    { key: 'boys', label: t.pages.sections.boys },
    { key: 'girls', label: t.pages.sections.girls },
  ];

  return (
    <>
      <Seo page="news" />
      <section className="page-hero">
        <div className="container">
          <div className="crumbs"><LLink to="/">{t.common.backHome}</LLink> / {t.pages.news.crumbs}</div>
          <h1>{t.pages.news.title}</h1>
          <p>Announcements, date sheets, events and results notices from the college office.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="filters" role="tablist" aria-label="Filter by section">
            {secTabs.map((s) => (
              <button key={s.key} className={'chip' + (sec === s.key ? ' on' : '')}
                onClick={() => setSec(s.key)} aria-pressed={sec === s.key}>{s.label}</button>
            ))}
          </div>
          <div className="filters" role="tablist" aria-label="Filter by category">
            {['All', ...NEWS_CATEGORIES].map((c) => (
              <button key={c} className={'chip' + (cat === c ? ' on' : '')}
                onClick={() => setCat(c)} aria-pressed={cat === c}>{c}</button>
            ))}
          </div>
          <AdSlot id="news-list" format="incontent" />
          {loading ? (
            <div className="loading">{t.common.loading}</div>
          ) : shown.length === 0 ? (
            <div className="empty">
              <div className="big" aria-hidden><IBook size={44} /></div>
              <h3>No updates yet</h3>
              <p>The college office will publish news, date sheets and announcements here.</p>
            </div>
          ) : (
            <div className="news-grid">
              {cat === 'All' && shown.length > 2 && <NewsCard n={shown[0]} featured />}
              {(cat === 'All' && shown.length > 2 ? shown.slice(1) : shown).map((n) => (
                <NewsCard key={n.id} n={n} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
