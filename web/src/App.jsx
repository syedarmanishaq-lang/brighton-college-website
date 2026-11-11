import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import AdSlot from './components/AdSlot.jsx';
import ApplyRail from './components/ApplyRail.jsx';
import BackToTop from './components/BackToTop.jsx';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Programs from './pages/Programs.jsx';
import Admissions from './pages/Admissions.jsx';
import News from './pages/News.jsx';
import NewsPost from './pages/NewsPost.jsx';
import Results from './pages/Results.jsx';
import Material from './pages/Material.jsx';
import Books from './pages/Books.jsx';
import PastPapers from './pages/PastPapers.jsx';
import BookReader from './pages/BookReader.jsx';
import Mcqs from './pages/Mcqs.jsx';
import Notes from './pages/Notes.jsx';
import Courses from './pages/Courses.jsx';
import CourseView from './pages/CourseView.jsx';
import Gallery from './pages/Gallery.jsx';
import StoryPage from './pages/StoryPage.jsx';
import Faculty from './pages/Faculty.jsx';
import Contact from './pages/Contact.jsx';
import Install from './pages/Install.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';
import { LangProvider, LANGS, storedLang } from './i18n/LangContext.jsx';
import { CollegeProvider, CollegeNotFoundPage, useCollege } from './college/CollegeContext.jsx';
import { DEFAULT_COLLEGE_SLUG, getLocalCollege } from './data/colleges.js';
import { ADMIN_PANEL_PATH } from './config.js';

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

/* Offline bar: when the phone loses internet, say so plainly — the page
   still opens (service worker + saved data), but what it shows is the
   last saved content, not fresh updates. */
function OfflineBar() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const up = () => setOnline(true);
    const dn = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', dn);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', dn);
    };
  }, []);
  if (online) return null;
  return <div className="offline-bar" role="status">You are offline — showing saved content. New updates will appear when you are back online.</div>;
}

function SiteChrome() {
  return (
    <>
      <OfflineBar />
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/admissions" element={<Admissions />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:id" element={<NewsPost />} />
          <Route path="/results" element={<Results />} />
          <Route path="/material" element={<Material />} />
          <Route path="/books" element={<Books />} />
          <Route path="/read/:id" element={<BookReader />} />
          <Route path="/past-papers" element={<PastPapers />} />
          <Route path="/mcqs" element={<Mcqs />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseView />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/gallery/:storySlug" element={<StoryPage />} />
          <Route path="/faculty" element={<Faculty />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/install" element={<Install />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<Navigate to=".." replace />} />
        </Routes>
      </main>
      <div className="container"><AdSlot id="above-footer" format="leaderboard" /></div>
      <Footer />
      <ApplyRail />
      <BackToTop />
    </>
  );
}

/* Gates the site on the resolved college: unknown slugs get the friendly
   "not found" page instead of a crash. */
function SiteInner({ collegeSlug, lang }) {
  const { status, slug } = useCollege();
  if (status === 'loading') {
    return <div className="loading" style={{ padding: 90, textAlign: 'center' }}>Loading…</div>;
  }
  if (status === 'not-found') {
    return <CollegeNotFoundPage slug={collegeSlug} lang={lang} />;
  }
  return (
    <LangProvider lang={lang} collegeSlug={slug}>
      <SiteChrome />
    </LangProvider>
  );
}

function Site({ collegeSlug, lang }) {
  return (
    <CollegeProvider slug={collegeSlug}>
      <SiteInner collegeSlug={collegeSlug} lang={lang} />
    </CollegeProvider>
  );
}

/* Two-segment URLs: /:collegeSlug/:lang/*  (legacy /:lang/* folds into Brighton). */
function CollegeRoute() {
  const { seg1, seg2, '*': splat } = useParams();
  const rest = splat ? '/' + splat : '';
  if (LANGS.includes(seg1)) {
    // Legacy /en/about → /brighton/en/about (seg2 is part of the path)
    return <Navigate to={`/${DEFAULT_COLLEGE_SLUG}/${seg1}/${seg2}${rest}`} replace />;
  }
  if (!LANGS.includes(seg2)) {
    // /brighton/about → /brighton/en/about
    return <Navigate to={`/${seg1}/${storedLang()}${rest}`} replace />;
  }
  return <Site collegeSlug={seg1} lang={seg2} />;
}

/* Known public page slugs — flat legacy URLs (/about) redirect to their
   canonical /:college/:lang/:slug form instead of 404ing. */
const PAGE_SLUGS = ['about', 'programs', 'admissions', 'news', 'results',
  'material', 'courses', 'gallery', 'faculty', 'contact', 'privacy', 'terms'];

/* Single-segment URLs: /en, /brighton, /about (legacy), or an unknown slug. */
function SingleSegRoute() {
  const { seg1, '*': splat } = useParams();
  const rest = splat ? '/' + splat : '';
  if (LANGS.includes(seg1)) {
    // /en → /brighton/en
    return <Navigate to={`/${DEFAULT_COLLEGE_SLUG}/${seg1}${rest}`} replace />;
  }
  if (getLocalCollege(seg1)) {
    // /brighton → /brighton/en
    return <Navigate to={`/${seg1}/${storedLang()}${rest}`} replace />;
  }
  if (PAGE_SLUGS.includes(seg1)) {
    // /about → /brighton/en/about (legacy flat URL → canonical)
    return <Navigate to={`/${DEFAULT_COLLEGE_SLUG}/${storedLang()}/${seg1}${rest}`} replace />;
  }
  // Unknown slug → friendly page (it also checks Supabase when live).
  return <CollegeNotFoundPage slug={seg1} lang={storedLang()} />;
}

/* Shows a friendly message instead of a blank page if the admin panel
   crashes (e.g. a failed data load) — with a reload button. */
class AdminErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) {
      return (
        <div className="adm-login-wrap">
          <div className="adm-login" style={{ textAlign: 'center' }}>
            <h2>Something went wrong</h2>
            <p className="muted">The admin panel hit an error and could not open. Reloading usually fixes it.</p>
            <button className="btn btn-gold" onClick={() => window.location.reload()}>Reload admin panel</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* Public pages: same safety net as the admin panel — a crash shows the
   error message + Reload instead of a blank white page. The message is
   shown (not just logged) so a broken page can be diagnosed from the
   page itself. */
class SiteErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error(error); }
  render() {
    if (this.state.error) {
      return (
        <div className="section"><div className="container" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h1>Something went wrong</h1>
          <p className="lead" style={{ margin: '0 auto 16px' }}>This page hit an error and could not load. Reloading usually fixes it.</p>
          <p className="muted" style={{ wordBreak: 'break-word' }}>{String((this.state.error && this.state.error.message) || this.state.error)}</p>
          <button className="btn btn-gold" onClick={() => window.location.reload()}>Reload page</button>
        </div></div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const adminPath = ADMIN_PANEL_PATH.replace(/\/$/, '');
  return (
    <Routes>
      <Route
        path={`${adminPath}/*`}
        element={
          <Suspense fallback={<div className="loading">Loading admin…</div>}>
            <AdminErrorBoundary>
              <AdminApp />
            </AdminErrorBoundary>
          </Suspense>
        }
      />
      <Route path="/:seg1/:seg2/*" element={<SiteErrorBoundary><CollegeRoute /></SiteErrorBoundary>} />
      <Route path="/:seg1/*" element={<SiteErrorBoundary><SingleSegRoute /></SiteErrorBoundary>} />
      <Route path="/" element={<Navigate to={`/${storedLang()}`} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
