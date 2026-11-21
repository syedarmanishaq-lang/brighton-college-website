/* Trust footer (R10): affiliation line = our "charity number",
   policy columns, socials, back-to-top. */
import React from 'react';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import { useCollege, useSite } from '../college/CollegeContext.jsx';
import { WHATSAPP_NUMBER } from '../config.js';
import { IFb, IYt, IWhats } from './icons.jsx';

export default function Footer() {
  const { t, lp, lang } = useLang();
  const { college } = useCollege();
  const site = useSite();
  const year = new Date().getFullYear();
  const wa = (college && college.whatsapp) || WHATSAPP_NUMBER;
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand"><span className="brand-lock-ltr">{site.shortName}</span></div>
            <p style={{ fontSize: 14.5, maxWidth: 320 }}>{t.footer.tagline}</p>
            <div className="footer-social">
              <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><IFb size={18} /></a>
              <a href="https://www.youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube"><IYt size={18} /></a>
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" aria-label="WhatsApp"><IWhats size={18} /></a>
            </div>
          </div>
          <div>
            <h4>{t.footer.explore}</h4>
            <ul className="footer-links">
              <li><LLink to="/about">{t.footer.about}</LLink></li>
              <li><LLink to="/programs">{t.footer.programs}</LLink></li>
              <li><LLink to="/admissions">{t.footer.admissions}</LLink></li>
              <li><LLink to="/gallery">{t.footer.gallery}</LLink></li>
              <li><LLink to="/toppers">Toppers</LLink></li>
              <li><LLink to="/developer">Developer</LLink></li>
            </ul>
          </div>
          <div>
            <h4>{t.footer.students}</h4>
            <ul className="footer-links">
              <li><LLink to="/news">{t.footer.news}</LLink></li>
              <li><LLink to="/courses">{t.footer.courses}</LLink></li>
              <li><LLink to="/results">{t.footer.results}</LLink></li>
              <li><LLink to="/material">{t.footer.material}</LLink></li>
              <li><LLink to="/books">{t.footer.books}</LLink></li>
              <li><LLink to="/past-papers">{t.footer.pastPapers}</LLink></li>
              <li><LLink to="/mcqs">{t.footer.mcqs}</LLink></li>
              <li><LLink to="/notes">{t.footer.notes}</LLink></li>
              <li><LLink to="/contact">{t.footer.contactUs}</LLink></li>
              <li><LLink to="/install">{lang === 'ur' ? 'ایپ انسٹال کریں' : 'Install App'}</LLink></li>
            </ul>
          </div>
          <div>
            <h4>{t.footer.contact}</h4>
            <ul className="footer-links">
              <li>{site.address}</li>
              {site.phone && <li dir="ltr">{site.phone}</li>}
              {site.email && <li>{site.email}</li>}
            </ul>
          </div>
        </div>

        <div className="trust-strip">
          <span>✓ <b>{t.footer.affiliation}</b></span>
          <span>{t.footer.policies}: <LLink to="/privacy">{t.footer.privacy}</LLink> · <LLink to="/terms">{t.footer.terms}</LLink> · <LLink to="/terms#safety">{t.footer.safeguarding}</LLink></span>
        </div>

        <div className="footer-bottom">
          <span>© {year} <span className="brand-lock-ltr">{site.name}</span>. {t.footer.rights}</span>
          <span>{t.hero.eyebrow} — KPK</span>
        </div>
      </div>
    </footer>
  );
}
