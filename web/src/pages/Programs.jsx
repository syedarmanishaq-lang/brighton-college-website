import React from 'react';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import { PROGRAMS } from '../data/college.js';
import Seo from '../seo/Seo.jsx';
import { programSchemas } from '../seo/schema.js';

export default function Programs() {
  const { t } = useLang();
  return (
    <>
      <Seo page="programs" extra={programSchemas()} />
      <section className="page-hero">
        <div className="container">
          <div className="crumbs"><LLink to="/">{t.common.backHome}</LLink> / {t.pages.programs.crumbs}</div>
          <h1>{t.pages.programs.title}</h1>
          <p>Three intermediate tracks for boys and girls. One admission process for all.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-2">
            {PROGRAMS.map((p) => (
              <div className="card" key={p.slug}>
                <span className="tag">{p.classes.join(' • ')}</span>{' '}
                <span className="tag navy">{p.sections.join(' & ')}</span>
                <h3 style={{ marginTop: 10 }}>{p.name}</h3>
                <p>{p.desc}</p>
                <h4 style={{ fontFamily: 'var(--font-body)', fontSize: 14, margin: '14px 0 8px' }}>Subjects</h4>
                <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--muted)', fontSize: 14.5 }}>
                  {p.subjects.map((s) => <li key={s} style={{ marginBottom: 4 }}>{s}</li>)}
                </ul>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginTop: 30, background: 'var(--navy-950)', border: 'none', borderTop: '3px solid var(--gold-500)' }}>
            <h3 style={{ color: '#fff' }}>Not sure which program fits you?</h3>
            <p style={{ color: '#c8d4e6' }}>
              Visit the college office at Shewa Adda, Kalu Khan — our counsellors will guide
              you based on your matric results and interests.
            </p>
            <LLink className="btn btn-gold" to="/contact">Visit the College</LLink>{' '}
            <LLink className="btn btn-outline" to="/admissions" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}>{t.pages.admissions.crumbs} →</LLink>
          </div>
        </div>
      </section>
    </>
  );
}
