import React from 'react';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import { useSite } from '../college/CollegeContext.jsx';
import { HOUSES, FACILITIES } from '../data/college.js';
import Seo from '../seo/Seo.jsx';

const MISSION = [
  'To train budding minds',
  'To develop creative imagination',
  'To enhance contemplative ability',
  'To promote self-recognition',
  'To polish a sensible attitude for social welfare',
];

const WHY = [
  { t: 'Every mind matters', d: 'We believe every student can succeed — no one is left behind.' },
  { t: 'Leadership, imagination, purpose', d: 'Our system nurtures more than marks: confidence, character and big thinking.' },
  { t: 'A vibrant, inclusive community', d: 'Students are empowered to become agents of change — in class and beyond.' },
  { t: 'Passionate faculty', d: 'Deeply committed teachers, driven by a real desire to uplift lives through education.' },
  { t: 'Creativity, ethics, responsibility', d: 'Critical thinking and societal responsibility, in every child.' },
  { t: 'A movement, not just a school', d: "The Brighton College isn't just a school — it's a movement towards a better future." },
];

const HOUSE_COLORS = { 'Khalid House': '#5aa9e6', 'Qasim House': '#d64545', 'Tipu House': '#d9a821', 'Iqbal House': '#2e9e5b' };

export default function About() {
  const { t } = useLang();
  const site = useSite();
  return (
    <>
      <Seo page="about" />
      <section className="page-hero">
        <div className="container">
          <div className="crumbs"><LLink to="/">{t.common.backHome}</LLink> / {t.pages.about.crumbs}</div>
          <h1>{t.pages.about.title}</h1>
          <p>{site.tagline} — {site.motto}.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <span className="eyebrow">About Us</span>
          <h2>A Place Where Learning Inspires Action</h2>
          <div className="prose" style={{ maxWidth: 860 }}>
            <p>
              The Brighton College, Razzar, was founded with a vision to bring true
              educational transformation — a place where learning is not confined to
              textbooks and exams, but where knowledge inspires action, character,
              and leadership. Our institution stands as a beacon of hope against the
              mechanical, memorization-driven systems prevalent today. Here, we
              cultivate critical thinkers, compassionate leaders, and creative minds
              who aim to brighten the world around them.
            </p>
            <p>
              We believe that education must not only prepare students for jobs but
              also prepare them for life. At the Brighton, education is a light that
              enlightens communities, builds futures, and fulfills the deeper
              purposes of humanity.
            </p>
          </div>

          <div className="grid grid-3" style={{ marginTop: 30 }}>
            <div className="card">
              <span className="eyebrow">Our Founding</span>
              <p style={{ marginBottom: 0 }}>
                The Brighton College, Razzar, was founded on <strong>1st May, 2023</strong> with
                the purpose of equipping future generations with knowledge, skills, and
                sophisticated tools for meaningful learning and life-long growth.
              </p>
            </div>
            <div className="card">
              <span className="eyebrow">Our Vision</span>
              <p style={{ marginBottom: 0 }}>
                <strong>Igniting Potential, Polishing Excellence:</strong> we envision a
                community of lifelong learners, equipped with skills, values, and wisdom.
              </p>
            </div>
            <div className="card">
              <span className="eyebrow">Our Motto</span>
              <p style={{ marginBottom: 0 }}>
                <strong>"{site.motto}"</strong>
              </p>
            </div>
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <span className="eyebrow">Our Mission</span>
            <ul style={{ margin: '10px 0 0', paddingLeft: 20, color: 'var(--muted)', fontSize: 15.5, lineHeight: 1.9 }}>
              {MISSION.map((m) => <li key={m}>{m}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <div className="two-col">
            <div>
              <span className="eyebrow">Message from the Principal</span>
              <div className="quote-box" style={{ marginTop: 12 }}>
                "The founding of Brighton College was our answer. We built an institution
                where hearts are free to educate in a way that touches hearts and opens
                minds — a system far removed from rote memorization and mechanical
                learning that produces individuals incapable of meaningful societal roles.
                Brighton College stands as a place where change can be felt by the
                community, where every student is nurtured as a torchbearer for a better tomorrow."
              </div>
              <p style={{ fontWeight: 700, color: 'var(--navy-900)', margin: '14px 0 2px' }}>{site.principalName}</p>
              <p className="form-note">{site.principalTitle} — Principal</p>
            </div>
            <div>
              <span className="eyebrow">Message from the Academic Coordinator</span>
              <div className="quote-box" style={{ marginTop: 12 }}>
                "Welcome to the Brighton College Razzar, a hub of academic excellence and
                innovation. Our experienced faculty and state-of-the-art facilities empower
                students to achieve their full potential. We're dedicated to shaping future
                leaders, entrepreneurs, and citizens who will make a positive impact."
              </div>
              <p style={{ fontWeight: 700, color: 'var(--navy-900)', margin: '14px 0 2px' }}>{site.coordinatorName}</p>
              <p className="form-note">{site.coordinatorTitle} — Academic Coordinator</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <span className="eyebrow">Why Should You Be at the Brighton?</span>
          <h2>Because You Deserve More Than Marks</h2>
          <div className="grid grid-3" style={{ marginTop: 26 }}>
            {WHY.map((w) => (
              <div className="card" key={w.t}><h3>{w.t}</h3><p>{w.d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <span className="eyebrow">Campus Facilities</span>
          <h2>Everything a Student Needs, Under One Roof</h2>
          <p className="lead">From smart classrooms to the computer lab — the campus is built for learning, in every sense.</p>
          <div className="grid grid-4" style={{ marginTop: 26 }}>
            {FACILITIES.map((f) => (
              <div className="card" key={f.t}><h3 style={{ fontSize: 17 }}>{f.t}</h3><p>{f.d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <span className="eyebrow">House System</span>
          <h2>Four Houses, One Family</h2>
          <p className="lead">Every student belongs to a house — competing in sports, debates and academics all year. House of the Year is announced on overall performance.</p>
          <div className="grid grid-4" style={{ marginTop: 26 }}>
            {HOUSES.map((h) => (
              <div className="card" key={h.name}>
                <span className="house-badge" style={{ background: HOUSE_COLORS[h.name] }}>{h.color}</span>
                <h3>{h.name}</h3>
                <p style={{ fontWeight: 600, color: 'var(--navy-800)' }}>{h.motto}</p>
                <p className="form-note" style={{ margin: 0 }}>{h.namedAfter}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28 }}>
            <LLink className="btn btn-gold" to="/contact">{t.visitCampus}</LLink>{' '}
            <LLink className="btn btn-outline" to="/programs">{t.pages.programs.crumbs} →</LLink>
          </div>
        </div>
      </section>
    </>
  );
}
