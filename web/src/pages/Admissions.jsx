import React, { useState } from 'react';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import { useCollege, useSite } from '../college/CollegeContext.jsx';

import { submitApplication, backendReady } from '../lib/supabase.js';
import { PROGRAMS, INSTALLMENTS, SCHOLARSHIP_TEST } from '../data/college.js';
import { FAQ_ITEMS } from '../seo/seoStrings.js';
import Seo from '../seo/Seo.jsx';
import Countdown from '../components/Countdown.jsx';
import { ICap, ICheck, IPin, IPhone, IClock } from '../components/icons.jsx';
import { WHATSAPP_NUMBER } from '../config.js';
import { useAdmissionsOpen } from '../lib/settings.js';

/* FAQ accordion — visible content + FAQPage JSON-LD via <Seo faq/>. */
function Faq() {
  const { lang } = useLang();
  const [open, setOpen] = useState(-1);
  return (
    <section className="section" aria-labelledby="faq-h">
      <div className="container" style={{ maxWidth: 820 }}>
        <span className="eyebrow">{lang === 'ur' ? 'عمومی سوالات' : 'FAQ'}</span>
        <h2 id="faq-h">{lang === 'ur' ? 'اکثر پوچھے جانے والے سوالات' : 'Frequently Asked Questions'}</h2>
        <div className="faq-list" style={{ marginTop: 18 }}>
          {FAQ_ITEMS.map((f, i) => (
            <div className={'faq-item' + (open === i ? ' open' : '')} key={i}>
              <button className="faq-q" aria-expanded={open === i}
                onClick={() => setOpen(open === i ? -1 : i)}>
                <span>{f[lang].q}</span>
                <span className="faq-chev" aria-hidden>{open === i ? '−' : '+'}</span>
              </button>
              {open === i && <div className="faq-a"><p style={{ margin: 0 }}>{f[lang].a}</p></div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const emptyForm = {
  full_name: '', father_name: '', gender: 'Male', section: 'Boys',
  program: 'Pre-Medical', previous_school: '', board_marks: '', phone: '', address: '',
};

export default function Admissions() {
  const { t, lang } = useLang();
  const { college } = useCollege();
  const site = useSite();
  /* Honest status banner — driven by the admin's admissions_open switch. */
  const admissionsOpen = useAdmissionsOpen();
  const st = t.admissionsStatus || {};
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!backendReady()) {
      setErr('The enquiry form will be live once the college system is connected. Please visit the campus or call the office for now.');
      return;
    }
    setBusy(true);
    try {
      await submitApplication({ ...form, board_marks: form.board_marks ? Number(form.board_marks) : null, college_id: college && college.id });
      setDone(true);
      setForm(emptyForm);
    } catch (ex) {
      setErr('Could not send: ' + ex.message);
    }
    setBusy(false);
  }

  const wa = (college && college.whatsapp) || WHATSAPP_NUMBER;

  return (
    <>
      <Seo page="admissions" faq
        seoTitle={admissionsOpen === false
          ? (lang === 'ur' ? 'داخلے فی الحال بند ہیں | دی برائٹن کالج' : 'Admissions Currently Closed | The Brighton College')
          : undefined}
        seoDesc={admissionsOpen === false
          ? (lang === 'ur' ? 'دی برائٹن کالج، صوابی میں داخلے فی الحال بند ہیں۔ فیس اقساط، اسکالرشپ ٹیسٹ اور اہلیت کی معلومات کے لیے یہ صفحہ دیکھیں۔' : 'Admissions at The Brighton College, Swabi are currently closed. See this page for fee installments, scholarship test and eligibility info.')
          : undefined} />
      <section className="page-hero">
        <div className="container">
          <div className="crumbs"><LLink to="/">{t.common.backHome}</LLink> / {t.pages.admissions.crumbs}</div>
          <h1>{t.pages.admissions.title}</h1>
          {/* Current admissions status — set by the admin in /secure-admin/ → Settings */}
          <div className={'alert ' + (admissionsOpen ? 'ok' : '')} style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span className={'status-dot ' + (admissionsOpen ? 'on' : 'off')} aria-hidden />
            <b>{admissionsOpen ? st.openBadge : st.closedBadge}</b>
            {!admissionsOpen && <span> — {st.closedLead}</span>}
          </div>
          <p>Admission happens at the campus — visit us with your documents, meet the office, and take the scholarship test.</p>
          <div style={{ marginTop: 14 }}><Countdown /></div>
        </div>
      </section>

      {/* ---------- Visit first: the only way to get admitted ---------- */}
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="container">
          <div className="visit-card">
            <div>
              <span className="eyebrow">How Admission Works</span>
              <h2>Come to the Campus</h2>
              <p className="lead" style={{ marginBottom: 18 }}>
                There is no online admission. Visit the college office with your documents,
                meet our counsellors, and sit the scholarship test — most students finish
                everything in a single visit.
              </p>
              <ol className="visit-steps">
                <li><b>Bring your documents</b> — B-Form copy, 4 photographs, matric result card.</li>
                <li><b>Meet the office</b> — counsellors guide you to the right program.</li>
                <li><b>Take the scholarship test</b> — 50 MCQs; high scorers win fee concessions.</li>
              </ol>
            </div>
            <div className="visit-contact">
              <h3>Find Us</h3>
              <p><IPin size={16} /> {site.address}</p>
              {site.phone && <p><IPhone size={16} /> <bdi>{site.phone}</bdi></p>}
              <p><IClock size={16} /> Call the office for visiting hours</p>
              <div className="visit-actions">
                <LLink className="btn btn-gold" to="/contact">{t.visitCampus}</LLink>
                <a className="btn btn-outline" href={`tel:+${wa}`}>{t.callOffice}</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="two-col">
            <div>
              <span className="eyebrow">Enquiry Form</span>
              <h2>Ask Us Anything</h2>
              <p className="form-note" style={{ marginBottom: 16 }}>
                Not an admission form — send a question and the office will call you back.
                For admission itself, please visit the campus.
              </p>
              {done && <div className="alert ok"><ICheck size={16} /> Enquiry received! The college office will call you back soon.</div>}
              {err && <div className="alert err">{err}</div>}
              <form onSubmit={submit}>
                <div className="form-grid">
                  <div className="field"><label>Full name *</label>
                    <input required value={form.full_name} onChange={set('full_name')} placeholder="e.g. Muhammad Ahmed" /></div>
                  <div className="field"><label>Father's name *</label>
                    <input required value={form.father_name} onChange={set('father_name')} /></div>
                  <div className="field"><label>Gender *</label>
                    <select value={form.gender} onChange={set('gender')}>
                      <option>Male</option><option>Female</option>
                    </select></div>
                  <div className="field"><label>Section *</label>
                    <select value={form.section} onChange={set('section')}>
                      <option>Boys</option><option>Girls</option>
                    </select></div>
                  <div className="field"><label>Program *</label>
                    <select value={form.program} onChange={set('program')}>
                      {PROGRAMS.map((p) => <option key={p.slug} value={p.name}>{p.name}</option>)}
                    </select></div>
                  <div className="field"><label>Previous school</label>
                    <input value={form.previous_school} onChange={set('previous_school')} placeholder="Matric school name" /></div>
                  <div className="field"><label>Matric marks (obtained)</label>
                    <input type="number" min="0" max="1100" value={form.board_marks} onChange={set('board_marks')} placeholder="e.g. 950" /></div>
                  <div className="field"><label>Phone *</label>
                    <input required value={form.phone} onChange={set('phone')} placeholder="03xx xxxxxxx" /></div>
                  <div className="field full"><label>Address</label>
                    <input value={form.address} onChange={set('address')} placeholder="Village / town" /></div>
                </div>
                <div style={{ marginTop: 18 }}>
                  <button className="btn btn-gold" disabled={busy}>{busy ? 'Sending…' : 'Send Enquiry'}</button>
                </div>
                <p className="form-note" style={{ marginTop: 10 }}>Your enquiry goes directly to the college admission office.</p>
              </form>
            </div>

            <div>
              <div className="card">
                <span className="eyebrow">Fee Plan</span>
                <h3>5 Easy Installments</h3>
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="data">
                    <thead><tr><th>#</th><th>Installment</th><th>When</th></tr></thead>
                    <tbody>
                      {INSTALLMENTS.map((r) => (
                        <tr key={r.no}><td style={{ fontWeight: 700 }}>{r.pct}</td><td>{r.no} installment</td><td>{r.when}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="form-note" style={{ marginTop: 10 }}>
                  Fees are paid at the college office — no online payment needed.
                </p>
                {site.feeNote && (
                  <p style={{ marginTop: 8 }}>{site.feeNote}</p>
                )}
              </div>
              <div className="card" style={{ marginTop: 20 }}>
                <h3>Eligibility</h3>
                <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--muted)', fontSize: 15 }}>
                  <li>Matric (or equivalent) passed from a recognized board.</li>
                  <li>Admissions are merit + interview based for Pre-Medical / Pre-Engineering.</li>
                  <li>Bring: B-Form copy, 4 photographs, matric result card.</li>
                  <li>Girls section: same programs, separate classes.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <span className="eyebrow">Scholarships</span>
          <h2>Win a Scholarship — 50 MCQs</h2>
          <p className="lead">Take the scholarship admission test. High scorers earn fee discounts and free education for toppers, orphans and merit cases.</p>
          <div className="table-wrap" style={{ marginTop: 20, maxWidth: 640 }}>
            <table className="data">
              <thead><tr><th>Subject</th><th>MCQs</th></tr></thead>
              <tbody>
                {SCHOLARSHIP_TEST.map((r) => (
                  <tr key={r.subject}><td>{r.subject}</td><td style={{ fontWeight: 700 }}>{r.mcqs}</td></tr>
                ))}
                <tr><td style={{ fontWeight: 700 }}>Total</td><td style={{ fontWeight: 700 }}>50</td></tr>
              </tbody>
            </table>
          </div>
          <div className="grid grid-2" style={{ marginTop: 24 }}>
            <div className="card">
              <h3><ICap size={20} /> Free Education &amp; Discounts</h3>
              <p style={{ margin: 0 }}>Free education for orphans and top merit students; special discounts for position holders, Hafiz-e-Quran and siblings — on a first-come, first-served basis.</p>
            </div>
            <div className="card">
              <h3><ICheck size={20} /> Fee Refund Policy</h3>
              <p style={{ margin: 0 }}>Cancel admission within 15 days and 80% of the total fee is refunded. No refund is processed if the student has attended classes.</p>
            </div>
          </div>
          <div style={{ marginTop: 24 }}>
            <LLink className="btn btn-gold" to="/contact">{t.visitCampus}</LLink>
          </div>
        </div>
      </section>

      <Faq />
    </>
  );
}
