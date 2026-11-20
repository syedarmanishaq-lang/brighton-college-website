/* Book Reader — read textbooks & past papers right on the website.
   Route: /read/:id. Data: Supabase `books` table. PDF shown via Drive embed. */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import Seo from '../seo/Seo.jsx';
import { sba, backendReady } from '../lib/supabase.js';

export default function BookReader() {
  const { id } = useParams();
  const { t, lang } = useLang();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  /* The Drive viewer itself is slow for big books (~50s for a 49MB PDF
     is Google's limit, not ours) — but the page used to show a blank
     white iframe box with no feedback at all while it loaded. Show a
     plain "opening…" state until the viewer shell reports loaded, with
     the Download button right there so a slow connection can skip the
     viewer entirely. */
  const [frameLoaded, setFrameLoaded] = useState(false);

  useEffect(() => {
    setFrameLoaded(false);
    if (!backendReady() || !id) { setLoading(false); return; }
    sba.get(`/rest/v1/books?select=*&id=eq.${id}&limit=1`)
      .then((r) => setBook(r && r[0] ? r[0] : null))
      .catch(() => setBook(null))
      .finally(() => setLoading(false));
  }, [id]);

  const embedUrl = book ? `https://drive.google.com/file/d/${book.drive_file_id}/preview` : null;

  return (
    <>
      <Seo page="books" seoTitle={book ? `${book.title} — Read Online` : undefined} />
      <section className="page-hero">
        <div className="container">
          <div className="crumbs">
            <LLink to="/">{t.common.backHome}</LLink> / <LLink to="/books">{lang === 'ur' ? 'کتب' : 'Books'}</LLink> / {lang === 'ur' ? 'مطالعہ' : 'Read'}
          </div>
          <h1>{book ? book.title : (lang === 'ur' ? 'کتاب' : 'Book Reader')}</h1>
          {book && (
            <p>{book.board} • {book.class_level} • {book.subject}</p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading ? (
            <div className="loading" style={{ textAlign: 'center', padding: 40 }}>
              {lang === 'ur' ? 'لوڈ ہو رہا ہے...' : 'Loading...'}
            </div>
          ) : !book ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <p className="muted">{lang === 'ur' ? 'کتاب نہیں ملی۔' : 'Book not found.'}</p>
              <LLink to="/books" className="btn btn-gold">{lang === 'ur' ? 'واپس کتب پر' : 'Back to Books'}</LLink>
            </div>
          ) : (
            <div className="reader-wrap">
              {/* Download first: on a slow connection the Drive viewer can
                  take ~50s for a ~49MB book, and these buttons sat below a
                  full-screen iframe — users never scrolled far enough to
                  find Download. The size is the book's real file_size_mb. */}
              <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <a
                  href={`https://drive.google.com/uc?export=download&id=${book.drive_file_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-gold"
                >
                  {lang === 'ur' ? '↓ ڈاؤن لوڈ کریں' : '↓ Download'}
                  {book.file_size_mb ? ` (${book.file_size_mb} MB)` : ''}
                </a>
                <a
                  href={`https://drive.google.com/file/d/${book.drive_file_id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                >
                  {lang === 'ur' ? 'ڈرائیو میں کھولیں' : 'Open in Drive'}
                </a>
                <LLink to="/books" className="btn">{lang === 'ur' ? '← واپس' : '← Back'}</LLink>
              </div>
              <iframe
                src={embedUrl}
                title={book.title}
                onLoad={() => setFrameLoaded(true)}
                style={{ width: '100%', height: 'calc(100dvh - 230px)', minHeight: 520, border: '1px solid var(--line)', borderRadius: 12, display: frameLoaded ? 'block' : 'none' }}
                allow="autoplay; fullscreen"
                allowFullScreen
              />
              {!frameLoaded && (
                <div style={{ width: '100%', minHeight: 520, border: '1px solid var(--line)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32, textAlign: 'center' }}>
                  <div className="loading" style={{ fontSize: 17, fontWeight: 700 }}>
                    {lang === 'ur' ? 'کتاب کھل رہی ہے…' : 'Opening the book…'}
                  </div>
                  <p className="muted" style={{ margin: 0, maxWidth: 460 }}>
                    {lang === 'ur'
                      ? 'ڈرائیو ویوور بڑی کتاب کو صفحہ بہ صفحہ لوڈ کرتا ہے — اس میں وقت لگ سکتا ہے۔ تیز پڑھنے کے لیے اوپر Download پر ٹیپ کریں۔'
                      : 'The Drive viewer loads a large book page by page, so it can take a while. For the fastest read, tap Download above.'}
                  </p>
                </div>
              )}
              <p className="muted" style={{ textAlign: 'center', marginTop: 12, fontSize: 14 }}>
                {lang === 'ur'
                  ? (book.file_size_mb
                    ? `یہ کتاب ${book.file_size_mb} MB کی ہے — ڈرائیو ویوور اسے صفحہ بہ صفحہ لوڈ کرتا ہے اس لیے بڑی کتابیں آہستہ کھلتی ہیں۔ Download پر ٹیپ کریں اور اپنے موبائل کے PDF ریڈر میں پڑھیں — وہ زیادہ تیز چلے گا اور آف لائن بھی کام کرے گا۔`
                    : 'مشورہ: اگر صفحات آہستہ لوڈ ہوں تو Download پر ٹیپ کریں اور کتاب اپنے موبائل کے PDF ریڈر میں پڑھیں — وہ زیادہ تیز چلے گا اور آف لائن بھی کام کرے گا۔')
                  : (book.file_size_mb
                    ? `This book is ${book.file_size_mb} MB — the Drive viewer loads it page by page, so large books open slowly. Tap Download and read it in your phone's own PDF reader instead — it loads much faster and works offline.`
                    : 'Tip: if pages load slowly, tap Download and read the book in your phone’s own PDF reader — it loads much faster and works offline.')}
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
