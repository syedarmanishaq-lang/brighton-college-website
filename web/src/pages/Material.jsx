import React, { useEffect, useState } from 'react';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import { useCollege, useSite } from '../college/CollegeContext.jsx';

import { fetchMaterial, backendReady } from '../lib/supabase.js';
import { isRealCollegeId } from '../lib/settings.js';
import { driveListAll, drivePreviewUrl, driveDownloadUrl, driveReady, isFolder } from '../lib/drive.js';
import { DRIVE_FOLDER_ID } from '../config.js';
import { CLASS_LEVELS } from '../data/college.js';
import Seo from '../seo/Seo.jsx';
import '../components/BookLibrary.css';
import { IVideo, IDoc, IImage, IFolder, IBook, ISearch } from '../components/icons.jsx';

const TYPE_ICON = { video: IVideo, document: IDoc, image: IImage };
const TYPE_LABEL = { video: 'Video', document: 'Document', image: 'Image' };

/* Curated entries added by the admin (study_material table). */
function CuratedList({ items }) {
  const [watch, setWatch] = useState(null);   // video being played
  const [viewImg, setViewImg] = useState(null); // image lightbox
  if (!items.length) return null;
  return (
    <>
      {watch && (
        <div className="video-frame" style={{ marginBottom: 22 }}>
          <div className="vf-head"><span className="play">▶</span> {watch.title}
            <button className="chip" style={{ marginLeft: 'auto' }} onClick={() => setWatch(null)}>✕ Close</button>
          </div>
          <iframe src={drivePreviewUrl(watch.drive_file_id)} title={watch.title}
            allow="autoplay; fullscreen" allowFullScreen />
        </div>
      )}
      {items.map((m) => (
        <div className="mat-row" key={m.id}>
          <span className="mat-icon">{React.createElement(TYPE_ICON[m.file_type] || IFolder, { size: 22 })}</span>
          <div>
            <h4>{m.title}</h4>
            <div className="meta">
              {TYPE_LABEL[m.file_type] || m.file_type} • {m.subject} • {m.class_level}
            </div>
          </div>
          <span className="spacer" />
          {m.file_type === 'video' && (
            <button className="btn btn-navy" onClick={() => setWatch(m)}>▶ Play</button>
          )}
          {m.file_type === 'document' && (
            <a className="btn btn-outline" href={drivePreviewUrl(m.drive_file_id)} target="_blank" rel="noreferrer">Open</a>
          )}
          {m.file_type === 'image' && (
            <button className="btn btn-outline" onClick={() => setViewImg(m)}>View</button>
          )}
        </div>
      ))}
      {viewImg && (
        <div className="lightbox" onClick={() => setViewImg(null)}>
          <button className="lb-close" onClick={() => setViewImg(null)}>×</button>
          <img src={drivePreviewUrl(viewImg.drive_file_id).replace('/preview', '/view?usp=drivesdk')}
            alt={viewImg.title} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

/* Raw Drive folder browser (when Drive API key is configured). */
function DriveBrowser() {
  const [path, setPath] = useState([]); // stack of {id, name}
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [watch, setWatch] = useState(null);

  const current = path.length ? path[path.length - 1] : null;

  useEffect(() => {
    setLoading(true); setErr('');
    driveListAll(current ? current.id : DRIVE_FOLDER_ID)
      .then((f) => setFiles(f))
      .catch(() => setErr('Could not load the Drive folder. Check the API key and sharing settings.'))
      .finally(() => setLoading(false));
  }, [path.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!driveReady()) {
    return (
      <div className="empty">
        <div className="big" aria-hidden><IBook size={44} /></div>
        <h3>Study library coming soon</h3>
        <p>Notes, past papers and video lectures will be available here once the library is connected.</p>
      </div>
    );
  }

  const guessType = (f) =>
    f.mimeType.startsWith('video/') ? 'video'
    : f.mimeType.startsWith('image/') ? 'image' : 'document';

  return (
    <div>
      {path.length > 0 && (
        <div className="crumbs" style={{ color: 'var(--muted)', marginBottom: 14 }}>
          <IFolder size={14} /> {path.map((p) => p.name).join(' / ')}
          {' '}<button className="chip" onClick={() => setPath(path.slice(0, -1))}>← Back</button>
        </div>
      )}
      {watch && (
        <div className="video-frame" style={{ marginBottom: 22 }}>
          <div className="vf-head"><span className="play">▶</span> {watch.name}
            <button className="chip" style={{ marginLeft: 'auto' }} onClick={() => setWatch(null)}>✕ Close</button>
          </div>
          <iframe src={drivePreviewUrl(watch.id)} title={watch.name} allow="autoplay; fullscreen" allowFullScreen />
        </div>
      )}
      {loading ? <div className="loading">Loading library…</div>
        : err ? <div className="alert err">{err}</div>
        : files.length === 0 ? (
          <div className="empty"><div className="big" aria-hidden><IFolder size={44} /></div><h3>Folder is empty</h3></div>
        ) : files.map((f) => {
          const t = guessType(f);
          const FIcon = isFolder(f.mimeType) ? IFolder : (TYPE_ICON[t] || IFolder);
          return (
            <div className="mat-row" key={f.id}>
              <span className="mat-icon"><FIcon size={22} /></span>
              <div>
                <h4>{f.name}</h4>
                <div className="meta">
                  {isFolder(f.mimeType) ? 'Folder' : TYPE_LABEL[t]}
                  {f.size ? ' • ' + Math.round(Number(f.size) / 1024) + ' KB' : ''}
                </div>
              </div>
              <span className="spacer" />
              {isFolder(f.mimeType)
                ? <button className="btn btn-outline" onClick={() => setPath([...path, { id: f.id, name: f.name }])}>Open →</button>
                : t === 'video'
                  ? <button className="btn btn-navy" onClick={() => setWatch(f)}>▶ Play</button>
                  : <a className="btn btn-outline" href={drivePreviewUrl(f.id)} target="_blank" rel="noreferrer">Open</a>}
            </div>
          );
        })}
      <p className="form-note" style={{ marginTop: 12 }}>
        <a href={driveDownloadUrl((current && current.id) || '')} target="_blank" rel="noreferrer" style={{ display: 'none' }}>x</a>
        Files stream directly from the college's Google Drive.
      </p>
    </div>
  );
}

export default function Material() {
  const { t } = useLang();
  const { college } = useCollege();
  const collegeId = college && college.id; /* stable dep (see Courses.jsx) */
  const [curated, setCurated] = useState([]);
  const [cls, setCls] = useState('All');

  useEffect(() => {
    if (!backendReady()) return;
    if (!isRealCollegeId(collegeId)) return; // wait for the real UUID
    fetchMaterial({ classLevel: cls === 'All' ? null : cls, collegeId })
      .then((r) => setCurated(r || [])).catch(() => {});
  }, [cls, collegeId]);

  return (
    <>
      <Seo page="material" />
      <section className="page-hero">
        <div className="container">
          <div className="crumbs"><LLink to="/">{t.common.backHome}</LLink> / {t.pages.material.crumbs}</div>
          <h1>{t.pages.material.title}</h1>
          <p>Notes, past papers, picture guides and video lectures — free for Brighton students.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <span className="eyebrow">Featured</span>
          <h2 style={{ marginBottom: 6 }}>Recommended by Teachers</h2>
          <div className="filters" style={{ marginTop: 16 }}>
            {['All', ...CLASS_LEVELS].map((c) => (
              <button key={c} className={'chip' + (cls === c ? ' on' : '')} onClick={() => setCls(c)}>
                {c === 'All' ? 'All Classes' : c + ' Class'}
              </button>
            ))}
          </div>
          <CuratedList items={curated} />

          <div className="card" style={{ marginTop: 8, background: 'var(--navy-950)', border: 'none', borderTop: '3px solid var(--gold-500)' }}>
            <span className="tag">Video Courses</span>
            <h3 style={{ color: '#fff', marginTop: 8 }}>Full Video Course Library</h3>
            <p style={{ color: '#c8d4e6' }}>
              Complete courses (e.g. Cyber Security) with all lectures, organized course-wise.
              Pick a course and stream every video.
            </p>
            <LLink className="btn btn-gold" to="/courses">Browse Courses →</LLink>
          </div>

          <span className="eyebrow" style={{ marginTop: 40, display: 'inline-block' }}>Study Hub</span>
          <h2 style={{ marginBottom: 18 }}>Textbooks, Past Papers, MCQs & Notes</h2>
          <div className="hub-grid">
            <LLink className="card hub-card" to="/books">
              <span className="tag">PDF Library</span>
              <h3>Free Textbooks</h3>
              <p>Official 11th & 12th textbooks — KPK (Mardan Board), Punjab, Federal, Sindh & Balochistan.</p>
              <span className="btn btn-outline">Browse Books →</span>
            </LLink>
            <LLink className="card hub-card" to="/past-papers">
              <span className="tag">Exam Practice</span>
              <h3>Past Papers</h3>
              <p>Solved board papers with MCQs — practice the exact pattern before your exams.</p>
              <span className="btn btn-outline">Browse Papers →</span>
            </LLink>
            <LLink className="card hub-card" to="/mcqs">
              <span className="tag">Quick Practice</span>
              <h3>MCQ Bank</h3>
              <p>Chapter-wise multiple-choice questions for every subject, Mardan Board pattern.</p>
              <span className="btn btn-outline">Practice MCQs →</span>
            </LLink>
            <LLink className="card hub-card" to="/notes">
              <span className="tag">Revision</span>
              <h3>Key Notes</h3>
              <p>Short, exam-focused key notes and guides for fast revision of every chapter.</p>
              <span className="btn btn-outline">Read Notes →</span>
            </LLink>
          </div>

          <span className="eyebrow" style={{ marginTop: 40, display: 'inline-block' }}>Full Library</span>
          <h2 style={{ marginBottom: 18 }}>Browse Everything</h2>
          <DriveBrowser />
        </div>
      </section>
    </>
  );
}
