import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LLink, LNavLink, useLang } from '../i18n/LangContext.jsx';
import { useCollege, useSite } from '../college/CollegeContext.jsx';
import { useTheme } from '../theme.jsx';
import { IGlobe, IMenu, ISun, IMoon } from './icons.jsx';

const LINKS = [
  ['home', '/'], ['about', '/about'], ['programs', '/programs'],
  ['faculty', '/faculty'], ['courses', '/courses'], ['news', '/news'],
  ['results', '/results'], ['material', '/material'],
  ['books', '/books'], ['pastPapers', '/past-papers'],
  ['mcqs', '/mcqs'], ['notes', '/notes'],
  ['gallery', '/gallery'], ['contact', '/contact'],
];

/* One-pill toggle showing the OTHER language (R1, Almentor pattern). */
function LangToggle() {
  const { lang, collegeSlug } = useLang();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const other = lang === 'en' ? 'ur' : 'en';
  const label = lang === 'en' ? 'اردو' : 'EN';
  function toggle() {
    // /:college/:lang/... → /:college/:other/...
    const next = pathname.replace(/^\/[^/]+\/(en|ur)(?=\/|$)/, `/${collegeSlug}/${other}`);
    try { localStorage.setItem('bcp_lang', other); } catch {}
    navigate(next.startsWith('/') ? next : `/${collegeSlug}/${other}/`);
  }
  return (
    <button className="lang-toggle" onClick={toggle}
      aria-label={lang === 'en' ? 'Switch to Urdu' : 'Switch to English'}>
      <span className="globe" aria-hidden><IGlobe size={15} /></span> {label}
    </button>
  );
}

/* Sun/moon theme toggle — same pill style family as the language toggle. */
function ThemeToggle() {
  const { t } = useLang();
  const [theme, toggleTheme] = useTheme();
  const dark = theme === 'dark';
  return (
    <button className="theme-toggle" onClick={toggleTheme}
      aria-label={dark ? t.lightMode : t.darkMode}
      title={dark ? t.lightMode : t.darkMode}>
      <span aria-hidden>{dark ? <ISun size={16} /> : <IMoon size={16} />}</span>
    </button>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const { t, lp } = useLang();
  const { college } = useCollege();
  const site = useSite();
  return (
    <header className="site-header">
      <div className="header-inner">
        <LLink className="brand" to="/" onClick={() => setOpen(false)} aria-label={site.name}>
          {college && college.logo_url
            ? <img className="brand-logo" src={college.logo_url} alt={site.shortName} />
            : <img className="brand-mark-img" src="/logo-crest-small.png" alt="The Brighton College crest" width="46" height="46" />}
          <span>
            {/* Latin brand lockup stays LTR in Urdu mode */}
            <span className="brand-name brand-lock-ltr">{site.shortName}</span><br />
            <span className="brand-sub">{t.hero.eyebrow}</span>
          </span>
        </LLink>
        <button className="burger" onClick={() => setOpen(!open)}
          aria-label={t.menu} aria-expanded={open}><IMenu size={26} /></button>
        <nav className={'nav' + (open ? ' open' : '')} aria-label="Primary">
          {LINKS.map(([key, to]) => (
            <LNavLink key={to} to={to} onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? 'active' : '')}>
              {t.nav[key]}
            </LNavLink>
          ))}
          <LangToggle />
          <ThemeToggle />
          <LLink className="btn btn-gold nav-cta" to="/admissions" onClick={() => setOpen(false)}>
            {t.applyNow}
          </LLink>
        </nav>
      </div>
    </header>
  );
}
