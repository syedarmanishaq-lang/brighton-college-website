import React, { useState } from 'react';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import { useCollege, useSite } from '../college/CollegeContext.jsx';

import { submitContact, backendReady } from '../lib/supabase.js';
import { WHATSAPP_NUMBER } from '../config.js';
import Seo from '../seo/Seo.jsx';
import { IPin, IPhone, IMail, IClock, IWhats, ICheck } from '../components/icons.jsx';

export default function Contact() {
  const { t } = useLang();
  const { college } = useCollege();
  const site = useSite();
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!backendReady()) {
      setErr('The contact form will be live once the college system is connected. Please use WhatsApp or visit the office.');
      return;
    }
    setBusy(true);
    try {
      await submitContact({ ...form, college_id: college && college.id });
      setDone(true);
      setForm({ name: '', phone: '', message: '' });
    } catch (ex) {
      setErr('Could not send: ' + ex.message);
    }
    setBusy(false);
  }

  const waNumber = (college && college.whatsapp) || WHATSAPP_NUMBER;
  const wa = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent('Assalam-o-Alaikum! I have a question about The Brighton College.')}`
    : null;

  return (
    <>
      <Seo page="contact" />
      <section className="page-hero">
        <div className="container">
          <div className="crumbs"><LLink to="/">{t.common.backHome}</LLink> / {t.pages.contact.crumbs}</div>
          <h1>{t.pages.contact.title}</h1>
          <p>Visit the campus, call the office, or send us a message.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="two-col">
            <div>
              <span className="eyebrow">Get in Touch</span>
              <h2>We'd Love to Hear From You</h2>
              <div className="card" style={{ marginTop: 18 }}>
                <h4 style={{ fontFamily: 'var(--font-body)' }}><IPin size={17} /> Address</h4>
                <p style={{ color: 'var(--muted)' }}>{site.address}</p>
                {site.phone && <><h4 style={{ fontFamily: 'var(--font-body)' }}><IPhone size={17} /> Phone</h4><p style={{ color: 'var(--muted)' }}><bdi>{site.phone}</bdi></p></>}
                {site.email && <><h4 style={{ fontFamily: 'var(--font-body)' }}><IMail size={17} /> Email</h4><p style={{ color: 'var(--muted)' }}>{site.email}</p></>}
                <h4 style={{ fontFamily: 'var(--font-body)' }}><IClock size={17} /> Office Hours</h4>
                <p style={{ color: 'var(--muted)' }}>Call the office for visiting hours</p>
                {wa && <a className="btn btn-navy" href={wa} target="_blank" rel="noreferrer"><IWhats size={17} /> WhatsApp Us</a>}
              </div>
            </div>
            <div>
              <div className="card">
                <h3>Send a Message</h3>
                {done && <div className="alert ok"><ICheck size={16} /> Message sent! We'll get back to you soon.</div>}
                {err && <div className="alert err">{err}</div>}
                <form onSubmit={submit}>
                  <div className="form-grid">
                    <div className="field"><label>Your name *</label>
                      <input required value={form.name} onChange={set('name')} /></div>
                    <div className="field"><label>Phone *</label>
                      <input required value={form.phone} onChange={set('phone')} /></div>
                    <div className="field full"><label>Message *</label>
                      <textarea required rows={5} value={form.message} onChange={set('message')}
                        placeholder="Your question about admissions, fees, programs…" /></div>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <button className="btn btn-gold" disabled={busy}>{busy ? 'Sending…' : 'Send Message'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="map-frame" style={{ marginTop: 36 }}>
            <iframe
              title="The Brighton College — Kalu Khan, Swabi"
              src="https://www.openstreetmap.org/export/embed.html?bbox=72.30%2C34.05%2C72.50%2C34.20&layer=mapnik&marker=34.12%2C72.40"
              loading="lazy"
            />
          </div>
          <p className="form-note" style={{ marginTop: 8 }}>Map: Kalu Khan, Swabi — KKS Plaza, Main Mardan Swabi Road.</p>
        </div>
      </section>
    </>
  );
}
