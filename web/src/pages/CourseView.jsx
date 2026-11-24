/* CourseView — R4 course-page template (Udemy skeleton, premium-ified).
   Dark trust header → custom VideoPlayer (R5) → curriculum accordion
   (Drive folders = sections) → what-you'll-learn → instructor.
   Progress tracked via lib/progress.js (R6, localStorage, Supabase-ready). */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import { useCollege, useSite } from '../college/CollegeContext.jsx';

import VideoPlayer from '../components/VideoPlayer.jsx';
import AdSlot from '../components/AdSlot.jsx';
import MonetagVignette from '../components/MonetagVignette.jsx';
import { isRealCollegeId } from '../lib/settings.js';
import { getCourseProgress, markLessonWatched } from '../lib/progress.js';
import { fetchCourseById, fetchCourses, backendReady } from '../lib/supabase.js';
import { driveListAll, driveGetFile, drivePreviewUrl, driveDownloadUrl, driveReady, isFolder, cleanCourseName, cleanVideoName, courseThumbFor, courseArtFor } from '../lib/drive.js';
import Seo from '../seo/Seo.jsx';
import { IVideo, IFolder, ISearch, IBook } from '../components/icons.jsx';

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return ''; }
}

/* One accordion section = one Drive subfolder (lazy-loaded on expand). */
function CurriculumSection({ folder, activeId, onPlay, watched, index }) {
  const [open, setOpen] = useState(false);
  const [videos, setVideos] = useState(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (videos !== null) return;
    setLoading(true);
    try {
      const files = await driveListAll(folder.id);
      setVideos(files.filter((f) => !isFolder(f.mimeType) && f.mimeType.startsWith('video/')));
    } catch { setVideos([]); }
    setLoading(false);
  }

  return (
    <div className={'cur-sec' + (open ? ' open' : '')}>
      <button className="cur-sec-head" onClick={toggle} aria-expanded={open}>
        <span className="sec-num" aria-hidden>{String((index || 0) + 1).padStart(2, '0')}</span>
        <h4>{cleanVideoName(folder.name)}</h4>
        <span className="count">{videos ? `${videos.length} lessons` : ''}</span>
        <span className="chev" aria-hidden>▶</span>
      </button>
      {open && (
        <ul className="cur-lessons">
          {loading && <li className="cur-lesson"><span className="t">Loading…</span></li>}
          {videos && videos.length === 0 && <li className="cur-lesson"><span className="t">No videos here yet.</span></li>}
          {videos && videos.map((v, i) => (
            <li key={v.id}
              className={'cur-lesson' + (activeId === v.id ? ' active' : '')}
              onClick={() => onPlay(v)}
              role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') onPlay(v); }}>
              <span className="n">{String(i + 1).padStart(2, '0')}</span>
              <span className="play-ic" aria-hidden>▶</span>
              <span className="t">{cleanVideoName(v.name)}</span>
              {watched && watched.has(v.id) && <span className="done" title="Watched">✓</span>}
              <span className="dur">{v.size ? Math.round(Number(v.size) / 1048576) + ' MB' : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* Root-level videos section: loads with the course. */
function RootSection({ videos, ...rest }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={'cur-sec' + (open ? ' open' : '')}>
      <button className="cur-sec-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="sec-num" aria-hidden>▶</span>
        <h4>All Lessons</h4>
        <span className="count">{videos.length} lessons</span>
        <span className="chev" aria-hidden>▶</span>
      </button>
      {open && (
        <ul className="cur-lessons">
          {videos.map((v, i) => (
            <li key={v.id}
              className={'cur-lesson' + (rest.activeId === v.id ? ' active' : '')}
              onClick={() => rest.onPlay(v)}
              role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') rest.onPlay(v); }}>
              <span className="n">{String(i + 1).padStart(2, '0')}</span>
              <span className="play-ic" aria-hidden>▶</span>
              <span className="t">{cleanVideoName(v.name)}</span>
              {rest.watched && rest.watched.has(v.id) && <span className="done" title="Watched">✓</span>}
              <span className="dur">{v.size ? Math.round(Number(v.size) / 1048576) + ' MB' : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CourseView() {
  const { id } = useParams();
  const { t, lang } = useLang();
  const { college } = useCollege();
  const collegeId = college && college.id; /* stable dep (see Courses.jsx) */
  const [course, setCourse] = useState(null);
  const [folders, setFolders] = useState([]);
  const [rootVideos, setRootVideos] = useState([]);
  const [watch, setWatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [watched, setWatched] = useState(new Set());
  const [streamFallback, setStreamFallback] = useState(false);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    /* Wait for the real college UUID before the table lookup: with the
       local placeholder id the lookup misses and the code falls through
       to a Drive API call for a UUID that is not a Drive folder — so a
       direct (refreshed / shared) course link showed an error. */
    if (backendReady() && !isRealCollegeId(collegeId)) return;
    if (!backendReady() && !driveReady()) { setLoading(false); return; }
    fetchCourseById(id, collegeId)
      .then(async (c) => {
        if (c) {
          setCourse(c);
          if (c.drive_folder_id && driveReady()) {
            try {
              const files = await driveListAll(c.drive_folder_id);
              setFolders(files.filter((f) => isFolder(f.mimeType)));
              setRootVideos(files.filter((f) => !isFolder(f.mimeType) && f.mimeType.startsWith('video/')));
            } catch (e) {
              setErr('Could not load videos. Check that the Drive folder is shared ("Anyone with the link") and the API key is set.');
            }
          }
        } else if (driveReady()) {
          /* Drive-folder course: the id is a Drive folder ID (from the
             course library). Build the course from the folder itself. */
          try {
            const meta = await driveGetFile(id);
            if (meta && isFolder(meta.mimeType)) {
              setCourse({ id, title: cleanCourseName(meta.name), description: '', drive_folder_id: id, isDriveFolder: true });
              const files = await driveListAll(id);
              setFolders(files.filter((f) => isFolder(f.mimeType)));
              setRootVideos(files.filter((f) => !isFolder(f.mimeType) && f.mimeType.startsWith('video/')));
            } else {
              setCourse(null);
            }
          } catch (e) {
            setErr('Could not load videos. Check that the Drive folder is shared ("Anyone with the link") and the API key is set.');
            setCourse(null);
          }
        } else {
          setCourse(null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, collegeId]);

  // Progress (R6): restore watched marks via progress.js
  useEffect(() => {
    try {
      const p = getCourseProgress(id, 1);
      setWatched(new Set(p.watched || []));
    } catch {}
  }, [id]);

  /* Related courses (internal linking for SEO): other published courses,
     excluding the current one. */
  useEffect(() => {
    if (!backendReady()) return;
    if (!isRealCollegeId(collegeId)) return; // wait for the real UUID
    fetchCourses({ collegeId })
      .then((all) => setRelated((all || []).filter((c) => String(c.id) !== String(id)).slice(0, 3)))
      .catch(() => {});
  }, [id, collegeId]);

  function playVideo(v) {
    setWatch(v);
    setStreamFallback(false);
    setTimeout(() => document.getElementById('course-player')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  }

  function onPlay(v) {
    /* Watch ad is the Monetag Vignette on this page (MonetagVignette:
       ONE ad per video per session — a different lesson shows a NEW
       ad, no 10-minute wait (user's order 24 Nov 21:01); re-tapping
       the same lesson never re-gates. Gated by the admin
       rewarded-ads switch) — so videos play at once here.
       The old placeholder 5s gate is gone: no fake wait. */
    playVideo(v);
  }

  function handleEnded(v) {
    try {
      const p = markLessonWatched(id, v.id, 1.0, v.name);
      setWatched(new Set(p.watched || []));
    } catch {}
  }

  /* Subtitle tracks — active when the course row provides VTT URLs. */
  const subtitles = [];
  if (course && course.subtitles_en) subtitles.push({ label: 'English', srcLang: 'en', src: course.subtitles_en });
  if (course && course.subtitles_ur) subtitles.push({ label: 'اردو', srcLang: 'ur', src: course.subtitles_ur });

  const learnPoints = course && course.learn_points
    ? (Array.isArray(course.learn_points) ? course.learn_points : String(course.learn_points).split('\n').filter(Boolean))
    : [];

  /* Video SEO (ranking weapon): VideoObject JSON-LD for Google Video results.
     Emitted only when a real playable video exists — never faked. */
  const videoSeo = [];
  const firstVideo = rootVideos && rootVideos.length ? rootVideos[0] : null;
  /* Effective thumbnail: admin's thumbnail_url → first video's Drive
     thumbnail → professional category thumbnail (never broken).
     NOTE: lh3 thumbnailLinks 403 for anonymous visitors — never use them. */
  const adminThumb = (course && course.thumbnail_url && course.thumbnail_url.indexOf('lh3.googleusercontent.com') === -1)
    ? course.thumbnail_url : null;
  const effectiveThumb = (course && course.isDriveFolder && courseArtFor(course.id)) ||
    adminThumb ||
    (firstVideo && firstVideo.id && ('https://drive.google.com/thumbnail?id=' + firstVideo.id + '&sz=w1000')) ||
    (course && courseThumbFor(course.title));
  if (course && firstVideo && firstVideo.id) {
    const vo = {
      '@type': 'VideoObject',
      name: (course.title || 'Course video') + ' — ' + firstVideo.name,
      description: (course.description || '').slice(0, 300) || ('Video lesson from ' + (course.title || 'this course') + ' at The Brighton College.'),
      uploadDate: course.created_at || new Date().toISOString(),
      contentUrl: driveDownloadUrl(firstVideo.id),
      embedUrl: (typeof window !== 'undefined' ? window.location.href : ''),
    };
    if (effectiveThumb) vo.thumbnailUrl = [effectiveThumb];
    videoSeo.push(vo);
  }
  /* Course JSON-LD: helps Google show rich course results. */
  const courseSeo = [];
  if (course) {
    const co = {
      '@type': 'Course',
      name: course.title,
      description: (course.description || '').slice(0, 500) || ('Video course at The Brighton College: ' + course.title),
      provider: {
        '@type': 'CollegeOrUniversity',
        name: 'The Brighton College',
        sameAs: 'https://brightoniankpk.com/',
      },
    };
    if (effectiveThumb) co.image = [effectiveThumb];
    courseSeo.push(co);
  }
  const allSeoExtra = [...courseSeo, ...videoSeo];

  return (
    <>
      <Seo page="courses"
        pathOverride={college ? `/${college.slug}/${lang}/courses/${id}` : null}
        seoTitle={course ? `${course.title} | The Brighton College` : null}
        seoDesc={course && course.description ? course.description.slice(0, 160) : null}
        ogImage={effectiveThumb}
        extra={allSeoExtra.length ? allSeoExtra : null}
      />
      {/* ---------- Dark trust header (R4) ---------- */}
      <section className="course-hero">
        <div className="container">
          <div className="crumbs">
            <LLink to="/">{t.common.backHome}</LLink> / <LLink to="/courses">{t.pages.courses.crumbs}</LLink>
          </div>
          <h1>{course ? course.title : '…'}</h1>
          {course && course.description && <p className="sub">{course.description.slice(0, 220)}</p>}
          {course && (
            <div className="trust-row">
              {course.class_level && <span className="tag">{course.class_level}</span>}
              <span><IVideo size={15} /> <b>{folders.length ? folders.length + ' sections' : rootVideos.length + ' video lessons'}</b></span>
              {folders.length > 0 && <span><IFolder size={15} /> <b>{folders.length}</b> sections</span>}
              {course.updated_at && <span>Updated {fmtDate(course.updated_at)}</span>}
              <span>{lang === 'ur' ? 'اردو اور انگریزی' : 'English & Urdu'}</span>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading ? (
            <div aria-busy="true" aria-label="Loading course">
              <div className="skel" style={{ marginBottom: 26 }}>
                <div className="skel-thumb" style={{ aspectRatio: '16/8' }} />
              </div>
              <div className="skel-line" style={{ width: '55%', height: 22 }} />
              <div className="skel-line" style={{ width: '85%' }} />
              <div className="skel-line" style={{ width: '70%' }} />
            </div>
          )
            : !course ? (
              <div className="empty"><div className="big" aria-hidden><ISearch size={44} /></div><h3>Course not found</h3>
                <p><LLink to="/courses">{t.common.backTo} {t.pages.courses.crumbs}</LLink></p></div>
            ) : !driveReady() ? (
              <div className="empty">
                <div className="big" aria-hidden><IBook size={44} /></div>
                <h3>Video library not connected yet</h3>
                <p>Add the Drive API key in the site config to stream this course's videos.</p>
              </div>
            ) : (
              <div className="course-layout">
                {(rootVideos.length > 0 || folders.length > 0) && (
                  <MonetagVignette videoId={watch?.id} />
                )}
                <div>
                  {/* ---------- Custom video player (R5) ---------- */}
                  {watch && (
                    <div id="course-player" style={{ marginBottom: 26 }}>
                      {watch && (
                      <>
                      <VideoPlayer
                        key={watch.id}
                        src={driveDownloadUrl(watch.id)}
                        title={cleanVideoName(watch.name)}
                        videoId={watch.id}
                        subtitles={subtitles}
                        onEnded={() => handleEnded(watch)}
                        onStreamError={() => setStreamFallback(true)}
                        onPlaying={() => setStreamFallback(false)}
                      />
                      <div className="course-now-playing">
                        <span className="np-dot" aria-hidden />
                        <span className="np-title">{cleanVideoName(watch.name)}</span>
                        <span className="np-badge">Now Playing</span>
                      </div>
                      </>
                      )}
                      {/* Drive preview = backup ONLY: shows when our player errors,
                          hides again as soon as our player plays (onPlaying clears it) —
                          so the video plays on our own player, never two players at once. */}
                      {streamFallback && (
                        <div className="video-frame" style={{ marginTop: 12 }}>
                          <div className="vf-head"><span className="play">▶</span> {watch.name} — Drive preview</div>
                          <iframe src={drivePreviewUrl(watch.id)} title={watch.name}
                            allow="autoplay; fullscreen" allowFullScreen />
                        </div>
                      )}
                    </div>
                  )}
                  {err && <div className="alert err">{err}</div>}

                  {/* ---------- Curriculum accordion ---------- */}
                  <h2 style={{ marginBottom: 14 }}>Course Content</h2>
                  <div className="curriculum" style={{ marginBottom: 34 }}>
                    {rootVideos.length > 0 && (
                      <RootSection videos={rootVideos} activeId={watch && watch.id} onPlay={onPlay} watched={watched} />
                    )}
                    {folders.map((f, fi) => (
                      <CurriculumSection key={f.id} folder={f} index={fi}
                        activeId={watch && watch.id} onPlay={onPlay} watched={watched} />
                    ))}
                    {rootVideos.length === 0 && folders.length === 0 && (
                      <div className="empty"><div className="big" aria-hidden><IFolder size={44} /></div><h3>No videos in this course yet</h3></div>
                    )}
                  </div>

                  {/* ---------- What you'll learn ---------- */}
                  {learnPoints.length > 0 && (
                    <>
                      <h2 style={{ marginBottom: 14 }}>What You&apos;ll Learn</h2>
                      <ul className="learn-grid" style={{ marginBottom: 34 }}>
                        {learnPoints.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </>
                  )}

                  {/* ---------- Description ---------- */}
                  {course.description && (
                    <>
                      <h2 style={{ marginBottom: 14 }}>About This Course</h2>
                      <div className="prose" style={{ marginBottom: 34 }}>
                        <p>{course.description}</p>
                      </div>
                    </>
                  )}

                  {/* ---------- Instructor ---------- */}
                  <h2 style={{ marginBottom: 14 }}>Instructor</h2>
                  {course.instructor_name ? (
                    <div className="instructor-card">
                      {course.instructor_photo && <img src={course.instructor_photo} alt={course.instructor_name} loading="lazy" decoding="async" />}
                      <div>
                        <h3 style={{ margin: '0 0 4px' }}>{course.instructor_name}</h3>
                        {course.instructor_bio && <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14.5 }}>{course.instructor_bio}</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="instructor-card">
                      <div className="avatar-circle" style={{ margin: 0, flex: 'none' }}>B</div>
                      <div>
                        <h3 style={{ margin: '0 0 4px' }}>The Brighton College Faculty</h3>
                        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14.5 }}>
                          Lessons recorded by the college&apos;s own subject teachers — the same teachers from your classroom.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ---------- Related courses (internal linking) ---------- */}
                  {related.length > 0 && (
                    <>
                      <h2 style={{ marginBottom: 14 }}>{lang === 'ur' ? 'متعلقہ کورسز' : 'Related Courses'}</h2>
                      <div className="grid grid-3" style={{ marginBottom: 34 }}>
                        {related.map((rc) => (
                          <div className="card" key={rc.id} style={{ padding: 0, overflow: 'hidden' }}>
                            <LLink to={`/courses/${rc.id}`} style={{ display: 'block', aspectRatio: '16/9' }}>
                              {rc.thumbnail_url
                                ? <img src={rc.thumbnail_url} alt={rc.title} loading="lazy" decoding="async"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    onError={(e) => { if (!e.currentTarget.dataset.fb) { e.currentTarget.dataset.fb = '1'; e.currentTarget.src = courseThumbFor(rc.title); } }} />
                                : <div className="thumb-fallback">
                                    <span className="tf-icon" aria-hidden><IVideo size={32} /></span>
                                    <span className="tf-title">{rc.title}</span>
                                  </div>}
                            </LLink>
                            <div style={{ padding: 18 }}>
                              <h3 style={{ margin: '0 0 10px', fontSize: 17 }}>
                                <LLink to={`/courses/${rc.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>{rc.title}</LLink>
                              </h3>
                              <LLink className="btn btn-navy btn-sm" to={`/courses/${rc.id}`}>
                                {lang === 'ur' ? 'کورس کھولیں' : 'Open Course →'}
                              </LLink>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* ---------- Sticky enroll card ---------- */}
                <aside>
                  <div className="enroll-card">
                    <div className="enroll-card-thumb">
                      {effectiveThumb
                        ? <img src={effectiveThumb} alt={course.title}
                            onError={(e) => { if (!e.currentTarget.dataset.fb) { e.currentTarget.dataset.fb = '1'; e.currentTarget.src = courseThumbFor(course.title); } }} />
                        : <div className="thumb-fallback">
                            <span className="tf-icon" aria-hidden><IVideo size={40} /></span>
                            <span className="tf-title">{course.title}</span>
                          </div>}
                    </div>
                    <div className="enroll-card-body">
                      {rootVideos.length > 0 && (
                        <button className="btn btn-gold" onClick={() => onPlay(rootVideos[0])}>
                          ▶ Start Learning
                        </button>
                      )}
                      {watched.size > 0 && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, margin: '6px 0' }}>
                            <span>Your progress</span>
                            <b>{watched.size} / {rootVideos.length || '…'}</b>
                          </div>
                          <div className="progress-track"><div className="progress-fill"
                            style={{ width: rootVideos.length ? (watched.size / rootVideos.length * 100) + '%' : '0%' }} /></div>
                        </>
                      )}
                      <ul className="includes">
                        <li>{folders.length ? folders.length + ' sections' : rootVideos.length + ' video lessons'}</li>
                        <li>Watch at your own pace</li>
                        <li>Works on mobile & desktop</li>
                        <li>{lang === 'ur' ? 'اردو اور انگریزی میں' : 'In English & Urdu'}</li>
                      </ul>
                    </div>
                  </div>
                  <AdSlot id="course-sidebar" format="box" />
                </aside>
              </div>
            )}
        </div>
      </section>
    </>
  );
}
