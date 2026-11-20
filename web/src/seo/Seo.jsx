/* Per-page SEO head manager (no extra dependency).
   <Seo page="about" /> or <Seo page="home" article={{...}} faq /> inside a page
   updates: <title>, meta description/keywords, Open Graph, Twitter cards,
   canonical, hreflang (en/ur), and injects JSON-LD (WebSite always;
   CollegeOrUniversity on home; BreadcrumbList everywhere; FAQPage when
   faq=true; NewsArticle when article is passed).
   og:site_name is always "The Brighton College" (SITE NAME RULE). */
import { useEffect } from 'react';
import { useLang } from '../i18n/LangContext.jsx';
import { useCollege } from '../college/CollegeContext.jsx';
import { SITE_URL } from '../config.js';
import { SEO_PAGES, FAQ_ITEMS } from './seoStrings.js';

const SITE_NAME = 'The Brighton College';

function upsertMeta(attr, key, content) {
  if (!content) return;
  const sel = attr === 'property'
    ? `meta[property="${key}"]`
    : `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(sel);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href, hreflang) {
  const sel = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]`;
  let el = document.head.querySelector(sel);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (hreflang) el.setAttribute('hreflang', hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setJsonLd(id, obj) {
  let el = document.head.querySelector(`script[data-seo="${id}"]`);
  if (!obj) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-seo', id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(obj);
}

export default function Seo({ page = 'home', article = null, faq = false, pathOverride = null, extra = null, seoTitle = null, seoDesc = null, ogImage = null }) {
  const { lang } = useLang();
  const { slug: collegeSlug } = useCollege();

  useEffect(() => {
    const s = (SEO_PAGES[page] && SEO_PAGES[page][lang]) || SEO_PAGES.home[lang] || SEO_PAGES.home.en;
    const title = seoTitle || (article && article.title ? `${article.title} | ${SITE_NAME}` : s.title);
    const desc = seoDesc || (article && article.excerpt) || s.desc;
    const base = SITE_URL.replace(/\/$/, '');
    const ogImageFinal = ogImage || (article && article.image) || (base + '/og-image.jpg');
    const articlePath = article && article.id ? `/${collegeSlug}/${lang}/news/${article.id}` : null;
    const path = pathOverride || articlePath || `/${collegeSlug}/${lang}${page === 'home' ? '' : '/' + page}`;
    const url = base + path;
    // hreflang alternates: swap the language segment of the canonical path
    const swapLang = (p, to) => p.replace(new RegExp(`^/${collegeSlug}/(en|ur)(?=/|$)`), `/${collegeSlug}/${to}`);
    const urlEn = pathOverride ? base + swapLang(path, 'en') : base + `/${collegeSlug}/en${page === 'home' ? '' : '/' + page}`;
    const urlUr = pathOverride ? base + swapLang(path, 'ur') : base + `/${collegeSlug}/ur${page === 'home' ? '' : '/' + page}`;

    document.title = title;
    upsertMeta('name', 'description', desc);
    upsertMeta('name', 'keywords', 'The Brighton College, Swabi college, intermediate Swabi, 11th 12th Swabi, pre-medical, pre-engineering, Mardan board, admissions Swabi');
    // Open Graph
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:type', article ? 'article' : 'website');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:locale', lang === 'ur' ? 'ur_PK' : 'en_US');
    upsertMeta('property', 'og:locale:alternate', lang === 'ur' ? 'en_US' : 'ur_PK');
    upsertMeta('property', 'og:image', ogImageFinal);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:image:alt', title);
    // Twitter
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', ogImageFinal);
    // Canonical + hreflang — EN is the primary index language (international
    // audience: USA/UK/Canada), so canonical always points at the EN version.
    upsertLink('canonical', urlEn);
    upsertLink('alternate', urlEn, 'en');
    upsertLink('alternate', urlUr, 'ur');
    upsertLink('alternate', urlEn, 'x-default');

    // JSON-LD: WebSite + CollegeOrUniversity are NOT emitted here — the
    // static blocks in web/index.html are the single source of truth
    // (crawlers without JS see them). Emitting them here too produced two
    // conflicting copies. Seo.jsx keeps only page-specific blocks.
    setJsonLd('website', null);
    setJsonLd('college', null);

    // JSON-LD: BreadcrumbList
    const crumbs = [
      { '@type': 'ListItem', position: 1, name: lang === 'ur' ? 'ہوم' : 'Home', item: base + `/${collegeSlug}/${lang}` },
    ];
    if (page !== 'home') {
      crumbs.push({ '@type': 'ListItem', position: 2, name: title.split('|')[0].trim(), item: url });
    }
    setJsonLd('breadcrumbs', { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs });

    // JSON-LD: FAQPage (admissions)
    if (faq) {
      setJsonLd('faq', {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map((f) => ({
          '@type': 'Question',
          name: f[lang].q,
          acceptedAnswer: { '@type': 'Answer', text: f[lang].a },
        })),
      });
    } else {
      setJsonLd('faq', null);
    }

    // JSON-LD: NewsArticle
    if (article) {
      const art = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.title,
        description: desc,
        datePublished: article.published_at,
        author: { '@type': 'Organization', name: SITE_NAME },
        publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: base + '/logo-crest.png' } },
        mainEntityOfPage: url,
      };
      if (article.image) art.image = [article.image];
      setJsonLd('article', art);
    } else {
      setJsonLd('article', null);
    }
    // JSON-LD: extra blocks (Person, EducationalOccupationalProgram, Event…)
    if (extra && extra.length) {
      setJsonLd('extra', {
        '@context': 'https://schema.org',
        '@graph': extra,
      });
    } else {
      setJsonLd('extra', null);
    }
  }, [page, lang, collegeSlug, article, faq, pathOverride, extra, seoTitle, seoDesc, ogImage]);

  return null;
}
