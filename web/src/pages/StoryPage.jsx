/* Photo story detail page — one hand-written narrative per gallery theme.
   Route: /brighton/:lang/gallery/:storySlug (legacy /:lang/gallery/:slug folds in).
   SEO: unique title/desc/OG per story + Article & ImageObject JSON-LD,
   canonical + hreflang via Seo. Internal links: breadcrumbs + related stories. */
import React from 'react';
import { useParams } from 'react-router-dom';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import { useCollege } from '../college/CollegeContext.jsx';
import { SITE_URL } from '../config.js';
import { getStory, STORIES } from '../data/stories.js';
import Seo from '../seo/Seo.jsx';
import { ISearch } from '../components/icons.jsx';

export default function StoryPage() {
  const { storySlug } = useParams();
  const { t, lang } = useLang();
  const { slug: collegeSlug } = useCollege();
  const story = getStory(storySlug);
  const L = story ? story[lang] || story.en : null;

  if (!story || !L) {
    return (
      <>
        <Seo page="gallery" />
        <section className="section"><div className="container">
          <div className="empty"><div className="big" aria-hidden><ISearch size={44} /></div><h3>Not found</h3>
            <p><LLink to="/gallery">{t.pages.gallery.crumbs}</LLink></p></div>
        </div></section>
      </>
    );
  }

  const base = SITE_URL.replace(/\/$/, '');
  const path = `/${collegeSlug}/${lang}/gallery/${story.slug}`;
  const related = (story.related || [])
    .map(getStory)
    .filter(Boolean)
    .slice(0, 3);

  /* Story photos are temporarily unavailable: the 34 local photos were
     blurry brochure-scan crops (194–309 px) and were removed on
     2026-11-20. The story text stays; photos return when the college
     brings originals. No ImageObject schema while there are no photos. */
  const schemaExtra = [
    {
      '@type': 'Article',
      headline: L.title,
      description: L.excerpt,
      inLanguage: lang,
      author: { '@type': 'Organization', name: 'The Brighton College' },
      publisher: { '@type': 'Organization', name: 'The Brighton College' },
      mainEntityOfPage: base + path,
    },
  ];

  return (
    <>
      <Seo page="gallery" pathOverride={path} extra={schemaExtra}
        seoTitle={`${L.title} | The Brighton College`}
        seoDesc={L.excerpt} />
      <section className="page-hero">
        <div className="container">
          <div className="crumbs">
            <LLink to="/">{t.common.backHome}</LLink> /{' '}
            <LLink to="/gallery">{t.pages.gallery.crumbs}</LLink> /{' '}
            <span>{L.title}</span>
          </div>
          <h1>{L.title}</h1>
          <p>{L.excerpt}</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="empty" style={{ marginBottom: 30 }}>
            <div className="big" aria-hidden><ISearch size={44} /></div>
            <h3>{lang === 'ur' ? 'تصاویر جلد آ رہی ہیں' : 'Photos coming soon'}</h3>
            <p>{lang === 'ur'
              ? 'اس کہانی کی اصل تصاویر جلد شامل کی جائیں گی — نیچے کہانی پڑھیں۔'
              : 'Original photos for this story will be added soon — read the story below.'}</p>
          </div>

          <div className="prose" style={{ maxWidth: 760 }}>
            {L.body.map((para, i) => <p key={i}>{para}</p>)}
          </div>

          {related.length > 0 && (
            <div style={{ marginTop: 44 }}>
              <h2 style={{ marginBottom: 18 }}>
                {lang === 'ur' ? 'مزید کہانیاں' : 'More stories'}
              </h2>
              <div className="news-grid">
                {related.map((r) => {
                  const rl = r[lang] || r.en;
                  return (
                    <LLink key={r.slug} to={`/gallery/${r.slug}`} className="news-card">
                      <div className="news-card-body">
                        <h3>{rl.title}</h3>
                        <p className="muted sm">{rl.excerpt}</p>
                        <span className="sm" style={{ color: 'var(--gold)', fontWeight: 700 }}>
                          {t.common.readMore} →
                        </span>
                      </div>
                    </LLink>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginTop: 34 }}>
            <LLink className="btn btn-outline" to="/gallery">
              ← {t.pages.gallery.crumbs}
            </LLink>
          </div>
        </div>
      </section>
    </>
  );
}

export { STORIES };
