/* Developer contact page — Arman Ishaq. Content is English only by his
   order (SEO for UK / USA / Canada audiences); no projects are listed. */
import React from 'react';
import { LLink } from '../i18n/LangContext.jsx';
import Seo from '../seo/Seo.jsx';

const SERVICES = [
  ['Full website development', 'Complete websites — frontend and backend, built from design to launch.'],
  ['Android apps', 'Android apps (APK / AAB) and Play Store publishing.'],
  ['Software development', 'Custom software built for your needs.'],
  ['Frontend development', 'Modern, responsive, mobile-friendly design.'],
  ['Backend development', 'Databases, APIs and admin panels.'],
  ['E-commerce and business websites', 'Online stores and business websites that load fast and rank well.'],
  ['SEO and Google indexing', 'Search optimisation so customers in the UK, USA, Canada and beyond can find you.'],
  ['And much more', 'Have something else in mind? Get in touch and ask.'],
];

export default function Developer() {
  return (
    <>
      <Seo page="developer" />
      <section className="page-hero">
        <div className="container">
          <div className="crumbs"><LLink to="/">Home</LLink> / Developer</div>
          <h1>Meet the Developer</h1>
          <p>Fast, modern websites, Android apps, and software — built with care.</p>
        </div>
      </section>
      <section className="section">
        <div className="container" style={{ maxWidth: 820 }}>
          <p style={{ fontSize: 18, lineHeight: 1.8 }}>
            Hi, I&apos;m <strong>Arman Ishaq</strong> — a 17-year-old Computer Science student from Swabi, Pakistan.
          </p>
          <p style={{ color: 'var(--muted)', lineHeight: 1.8 }}>
            I build fast, modern websites, Android apps, and software — from design and development to Play Store publishing and SEO.
          </p>
          <h2 style={{ marginTop: 36 }}>What I can do for you</h2>
          {SERVICES.map(([h, p]) => (
            <div key={h} style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: 19, marginBottom: 4 }}>{h}</h3>
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>{p}</p>
            </div>
          ))}
          <div className="card" style={{ marginTop: 30 }}>
            <h3 style={{ marginTop: 0 }}>Contact me</h3>
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              Have a project in mind? Email me at{' '}
              <a href="mailto:contact.astfamily@gmail.com">contact.astfamily@gmail.com</a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
