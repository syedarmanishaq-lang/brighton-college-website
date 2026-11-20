import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import { useCollege, useSite } from '../college/CollegeContext.jsx';

import { fetchNewsById, backendReady } from '../lib/supabase.js';
import { isRealCollegeId } from '../lib/settings.js';
import Seo from '../seo/Seo.jsx';
import { ISearch } from '../components/icons.jsx';
import AdSlot from '../components/AdSlot.jsx';

export default function NewsPost() {
  const { t } = useLang();
  const { college } = useCollege();
  const collegeId = college && college.id; /* stable dep (see Courses.jsx) */
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!backendReady()) { setLoading(false); return; }
    if (!isRealCollegeId(collegeId)) return; // wait for the real UUID
    fetchNewsById(id, collegeId).then((r) => setPost(r || null)).catch(() => {}).finally(() => setLoading(false));
  }, [id, collegeId]);

  return (
    <>
      <Seo page="news"
        article={post ? {
          title: post.title,
          excerpt: (post.body || '').slice(0, 160),
          published_at: post.published_at,
          image: post.image_url || null,
          id,
        } : null} />
      <section className="page-hero">
        <div className="container">
          <div className="crumbs"><LLink to="/">{t.common.backHome}</LLink> / <LLink to="/news">{t.pages.news.crumbs}</LLink></div>
          <h1>{post ? post.title : 'News'}</h1>
        </div>
      </section>
      <section className="section">
        <div className="container">
          {loading ? <div className="loading">Loading…</div>
            : !post ? (
              <div className="empty"><div className="big" aria-hidden><ISearch size={44} /></div><h3>Not found</h3>
                <p><LLink to="/news">Back to all news</LLink></p></div>
            ) : (
              <div className="prose">
                <div className="meta" style={{ marginBottom: 18, display: 'flex', gap: 14 }}>
                  <span className="tag">{post.category}</span>
                  {(post.section === 'boys' || post.section === 'girls') && (
                    <span className="tag tag-section">
                      {post.section === 'boys' ? t.pages.sections.boys : t.pages.sections.girls}
                    </span>
                  )}
                  <span style={{ color: 'var(--muted)', fontSize: 14 }}>
                    {new Date(post.published_at).toLocaleDateString()}
                  </span>
                </div>
                {post.image_url && (
                  <img src={post.image_url} alt={post.title}
                    style={{ width: '100%', height: 'auto', objectFit: 'contain', background: 'var(--navy-900)', border: '1px solid var(--line)', borderRadius: 12, marginBottom: 22, display: 'block' }} />
                )}
                <AdSlot id="news-article" format="incontent" />
                {(post.body || '').split('\n').map((para, i) => <p key={i}>{para}</p>)}
                <div style={{ marginTop: 30 }}><LLink className="btn btn-outline" to="/news">← All News</LLink></div>
              </div>
            )}
        </div>
      </section>
    </>
  );
}
