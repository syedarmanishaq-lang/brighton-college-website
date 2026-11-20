import React from 'react';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import { FACULTY } from '../data/college.js';
import { useAdmissionsOpen } from '../lib/settings.js';
import Seo from '../seo/Seo.jsx';

export default function Faculty() {
  const { t } = useLang();
  /* Live admissions state — same switch Admissions.jsx reads, so this page
     can never again claim "open" while admissions are closed. */
  const admissionsOpen = useAdmissionsOpen();
  const st = t.admissionsStatus || {};
  return (
    <>
      <Seo page="faculty" />
      <section className="page-hero">
        <div className="container">
          <div className="crumbs"><LLink to="/">{t.common.backHome}</LLink> / {t.pages.faculty.crumbs}</div>
          <h1>{t.pages.faculty.title}</h1>
          <p>
            A diverse, qualified and experienced team of teachers — masters of
            their subjects, and mentors who know every student by name.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <span className="eyebrow">Teaching Staff</span>
          <h2>Meet Your Teachers</h2>
          <p className="lead">
            From the principal to every lecturer — the people who will guide you
            through 11th and 12th, test by test.
          </p>
          <div className="grid grid-4" style={{ marginTop: 26 }}>
            {FACULTY.map((f) => (
              <div className="card" key={f.name}>
                {f.photo ? (
                  <img className="avatar-photo" src={`/faculty/${f.photo}`} alt={f.name} loading="lazy" />
                ) : (
                  <div className="avatar-circle">{f.name.replace(/^(Mr\.|Miss|Mufti)\s+/, '').charAt(0)}</div>
                )}
                <h3 style={{ fontSize: 17 }}>{f.name}</h3>
                <p className="tag" style={{ marginBottom: 8 }}>{f.role}</p>
                {f.title && <p className="form-note" style={{ margin: 0 }}>{f.title}</p>}
              </div>
            ))}
          </div>

          <div className="card" style={{ marginTop: 30 }}>
            <h3>Want to learn from them?</h3>
            <p>{admissionsOpen ? st.openLead : st.closedLead}</p>
            <LLink className="btn btn-gold" to="/contact">{t.visitCampus}</LLink>
          </div>
        </div>
      </section>
    </>
  );
}
