/* Shared study-hub library: filterable grid of Drive-hosted book PDFs.
   Used by Books (kind="book") and PastPapers (kind="paper").
   Reads the Supabase `books` table; filters: board, class, subject, search. */
import React, { useEffect, useMemo, useState } from 'react';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import { fetchBooks, backendReady } from '../lib/supabase.js';
import { IBook, IDoc, ISearch } from './icons.jsx';
import './BookLibrary.css';

const BOARDS = ['KPK', 'Punjab', 'Federal', 'Sindh', 'Balochistan'];
const CLASSES = ['11th', '12th'];

/* Stable, pleasant hue per subject for the book-cover art. */
function subjectHue(subject) {
  let h = 0;
  const s = String(subject || '?');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

function prettyName(fileTitle) {
  // "11th-physics-kpk.pdf" -> "Physics"
  return String(fileTitle || '')
    .replace(/\.pdf$/i, '')
    .replace(/^\d+(st|nd|rd|th)-/i, '')
    .replace(/-(kpk|punjab|federal|sindh|balochistan)$/i, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* One card per entry. Books keep the dark book-cover look; past papers get a
   light paper-sheet look (ruled lines + folded corner + document icon) so the
   two pages never look the same. */
function BookCard({ book, kind }) {
  const { t } = useLang();
  const L = t.library;
  const hue = subjectHue(book.subject);
  const url = `/read/${book.id}`;
  const isPaper = kind === 'paper';
  return (
    <article className="book-card">
      {isPaper ? (
        <div className="paper-cover" aria-hidden>
          <span className="paper-lines" />
          <span className="paper-fold" />
          <span className="paper-emblem"><IDoc size={40} /></span>
          <span className="paper-tag">{L.hub.pastPapers}</span>
        </div>
      ) : (
        <div
          className="book-cover"
          style={{ background: `linear-gradient(135deg, hsl(${hue}, 45%, 32%), hsl(${(hue + 40) % 360}, 55%, 22%))` }}
          aria-hidden
        >
          <span className="book-spine" />
          <span className="book-emblem"><IBook size={40} /></span>
          <span className="book-class-tag">{book.class_level}</span>
        </div>
      )}
      <div className="book-body">
        <h3>{book.title || prettyName(book.drive_file_id)}</h3>
        <div className="book-meta">
          <span className="tag tag-board">{book.board}</span>
          <span className="tag">{book.subject}</span>
          {book.file_size_mb ? <span className="book-size">{Number(book.file_size_mb).toFixed(0)} MB</span> : null}
        </div>
        <div className="book-actions">
          <LLink className="btn btn-gold" to={url}>
            {L.read}
          </LLink>
        </div>
      </div>
    </article>
  );
}

/* Cross-links between the four hub pages (SEO interlinking). */
export function HubLinks({ current }) {
  const { t } = useLang();
  const L = t.library;
  const links = [
    { key: 'books', to: '/books' },
    { key: 'pastPapers', to: '/past-papers' },
    { key: 'mcqs', to: '/mcqs' },
    { key: 'notes', to: '/notes' },
  ].filter((l) => l.key !== current);
  return (
    <nav className="hub-links" aria-label={L.exploreMore}>
      <span className="eyebrow">{L.exploreMore}</span>
      <div className="hub-links-row">
        {links.map((l) => (
          <LLink key={l.to} className="btn btn-outline" to={l.to}>
            {L.hub[l.key]} →
          </LLink>
        ))}
      </div>
    </nav>
  );
}

export default function BookLibrary({ kind }) {
  const { t } = useLang();
  const L = t.library;
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [board, setBoard] = useState('All');
  const [cls, setCls] = useState('All');
  const [subject, setSubject] = useState('All');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let live = true;
    setLoading(true);
    setFailed(false);
    if (!backendReady()) { setLoading(false); setFailed(true); return; }
    const timer = setTimeout(() => {
      fetchBooks({ kind })
        .then((r) => { if (live) { setBooks(r || []); setLoading(false); } })
        .catch(() => { if (live) { setFailed(true); setLoading(false); } });
    }, 250); // debounce for search typing
    return () => { live = false; clearTimeout(timer); };
  }, [kind]);

  // Re-filter client-side for instant chip response (data already loaded)
  const subjects = useMemo(() => {
    const s = new Set();
    books.forEach((b) => { if (b.subject) s.add(b.subject); });
    return [...s].sort();
  }, [books]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((b) => {
      if (board !== 'All' && b.board !== board) return false;
      if (cls !== 'All' && b.class_level !== cls) return false;
      if (subject !== 'All' && b.subject !== subject) return false;
      if (q && !(String(b.title).toLowerCase().includes(q) || String(b.subject).toLowerCase().includes(q))) return false;
      return true;
    });
  }, [books, board, cls, subject, query]);

  return (
    <div className="booklib">
      <div className="lib-search">
        <span className="lib-search-icon" aria-hidden><ISearch size={18} /></span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={L.searchPlaceholder}
          aria-label={L.searchPlaceholder}
        />
      </div>

      <div className="lib-filter-group">
        <span className="lib-filter-label">{L.board}</span>
        <div className="filters" style={{ marginBottom: 0 }}>
          {['All', ...BOARDS].map((b) => (
            <button key={b} className={'chip' + (board === b ? ' on' : '')} onClick={() => setBoard(b)}>
              {b === 'All' ? L.allBoards : b}
            </button>
          ))}
        </div>
      </div>

      <div className="lib-filter-group">
        <span className="lib-filter-label">{L.class}</span>
        <div className="filters" style={{ marginBottom: 0 }}>
          {['All', ...CLASSES].map((c) => (
            <button key={c} className={'chip' + (cls === c ? ' on' : '')} onClick={() => setCls(c)}>
              {c === 'All' ? L.allClasses : L.className.replace('{n}', c)}
            </button>
          ))}
        </div>
      </div>

      {subjects.length > 1 && (
        <div className="lib-filter-group">
          <span className="lib-filter-label">{L.subject}</span>
          <div className="filters" style={{ marginBottom: 0 }}>
            {['All', ...subjects].map((s) => (
              <button key={s} className={'chip' + (subject === s ? ' on' : '')} onClick={() => setSubject(s)}>
                {s === 'All' ? L.allSubjects : prettyName(s)}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="lib-count" aria-live="polite">
        {loading ? L.loading : L.count.replace('{n}', visible.length)}
      </p>

      {loading ? (
        <div className="loading" style={{ padding: 40, textAlign: 'center' }}>{L.loading}</div>
      ) : failed || books.length === 0 ? (
        <div className="empty">
          <div className="big" aria-hidden><IBook size={44} /></div>
          <h3>{L.emptyTitle}</h3>
          <p>{L.emptyText}</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <div className="big" aria-hidden><ISearch size={44} /></div>
          <h3>{L.noResults}</h3>
          <p>{L.noResultsText}</p>
        </div>
      ) : (
        <div className="lib-grid">
          {visible.map((b) => <BookCard key={b.id} book={b} kind={kind} />)}
        </div>
      )}
    </div>
  );
}
