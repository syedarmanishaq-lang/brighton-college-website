import React, { useEffect, useState } from 'react';
import { LLink, useLang } from '../i18n/LangContext.jsx';
import { useCollege, useSite } from '../college/CollegeContext.jsx';

import { fetchGallery, fetchGalleryImages, backendReady } from '../lib/supabase.js';
import { driveDownloadUrl } from '../lib/drive.js';
import Seo from '../seo/Seo.jsx';

/* Grid thumbs are small (220px cards) — w400 is plenty. The lightbox /
   full view keeps w1000. Never use lh3 thumbnailLinks (403 anonymous). */
const DRIVE_THUMB = (id) => `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
const DRIVE_FULL = (id) => `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
/* Fallback stream URL if the Drive API stream ever fails (e.g. key revoked). */
const DRIVE_UC = (id) => `https://drive.google.com/uc?export=download&id=${id}`;

/* Two videos open on a black frame, so Drive's poster thumbnail is a
   black box — use a related real college photo for those two instead. */
const VIDEO_THUMB_OVERRIDE = {
  '1uWkavYa8PI1RsFVj1dIjVZh1OnRzLHJl': DRIVE_THUMB('1m2WFVran1pLgVobiH5LIK-gWHxPGFeBz'),
  '1tixCpPe3WDZ0xTe8UKpaF_SUs05ikMum': DRIVE_THUMB('1QdxTT3QaqwsuS71eK0EI7uLBgrMY0jFM'),
};
const VIDEO_THUMB_OVERRIDE_FULL = {
  '1uWkavYa8PI1RsFVj1dIjVZh1OnRzLHJl': DRIVE_FULL('1m2WFVran1pLgVobiH5LIK-gWHxPGFeBz'),
  '1tixCpPe3WDZ0xTe8UKpaF_SUs05ikMum': DRIVE_FULL('1QdxTT3QaqwsuS71eK0EI7uLBgrMY0jFM'),
};
const FB_MEDIA = [
  { id: 'fb-campus', type: 'image', src: DRIVE_THUMB('1v60IYWhMxsP1pVO_tGq2iGVHP7X-yQ6y'), full: DRIVE_FULL('1v60IYWhMxsP1pVO_tGq2iGVHP7X-yQ6y'), caption: 'Campus — Aerial View' },
  { id: 'fb-principal', type: 'image', src: DRIVE_THUMB('1CYTnm--mHOCB8USgCd8Sb63zlUxcpD4s'), full: DRIVE_FULL('1CYTnm--mHOCB8USgCd8Sb63zlUxcpD4s'), caption: 'Principal — Mr. Fayoun Khan' },
  { id: 'fb-teacher-1', type: 'image', src: DRIVE_THUMB('1m2WFVran1pLgVobiH5LIK-gWHxPGFeBz'), full: DRIVE_FULL('1m2WFVran1pLgVobiH5LIK-gWHxPGFeBz'), caption: 'Welcome Party 2026' },
  { id: 'fb-teacher-2', type: 'image', src: DRIVE_THUMB('1QdxTT3QaqwsuS71eK0EI7uLBgrMY0jFM'), full: DRIVE_FULL('1QdxTT3QaqwsuS71eK0EI7uLBgrMY0jFM'), caption: 'Teachers Address' },
  { id: 'fb-teacher-3', type: 'image', src: DRIVE_THUMB('1d44ayMWKSOkD7IzKLYkssK8OpSWvUAMc'), full: DRIVE_FULL('1d44ayMWKSOkD7IzKLYkssK8OpSWvUAMc'), caption: 'Welcome Party 2026' },
  { id: 'fb-vid-welcome', type: 'video', drive_file_id: '1uWkavYa8PI1RsFVj1dIjVZh1OnRzLHJl', thumb: DRIVE_THUMB('1m2WFVran1pLgVobiH5LIK-gWHxPGFeBz'), thumbFull: DRIVE_FULL('1m2WFVran1pLgVobiH5LIK-gWHxPGFeBz'), caption: 'Welcome Party 2026 — Highlights' },
  { id: 'fb-vid-excellence', type: 'video', drive_file_id: '1tixCpPe3WDZ0xTe8UKpaF_SUs05ikMum', thumb: DRIVE_THUMB('1QdxTT3QaqwsuS71eK0EI7uLBgrMY0jFM'), thumbFull: DRIVE_FULL('1QdxTT3QaqwsuS71eK0EI7uLBgrMY0jFM'), caption: 'Excellence is Tested, Not Just Taught' },
  { id: 'fb-vid-hockey', type: 'video', drive_file_id: '1kpyDlI_G5TBKkWBplrMWGjzJJG0eCIgQ', thumb: DRIVE_THUMB('1kpyDlI_G5TBKkWBplrMWGjzJJG0eCIgQ'), thumbFull: DRIVE_FULL('1kpyDlI_G5TBKkWBplrMWGjzJJG0eCIgQ'), caption: 'Hockey — Through to the Semi-Final' },
  { id: 'fb-vid-mdcat', type: 'video', drive_file_id: '17qy7ZK-Lf1aeTokWq-8hGJoiyJQpTO6n', thumb: DRIVE_THUMB('17qy7ZK-Lf1aeTokWq-8hGJoiyJQpTO6n'), thumbFull: DRIVE_FULL('17qy7ZK-Lf1aeTokWq-8hGJoiyJQpTO6n'), caption: 'MDCAT 2026 Qualifier — Munazza Hamid' },
  { id: 'fb-reel-teachers', type: 'video', drive_file_id: '1rY42FQteXJDDo1OS0ZB6L5RRTD-bHVmc', thumb: DRIVE_THUMB('1rY42FQteXJDDo1OS0ZB6L5RRTD-bHVmc'), thumbFull: DRIVE_FULL('1rY42FQteXJDDo1OS0ZB6L5RRTD-bHVmc'), caption: 'Invitation for Our Respected Teachers' },
  { id: 'fb-reel-campus', type: 'video', drive_file_id: '1m9xrHNKOCL91BcuHblt_vo_FI_cPoLQb', thumb: DRIVE_THUMB('1m9xrHNKOCL91BcuHblt_vo_FI_cPoLQb'), thumbFull: DRIVE_FULL('1m9xrHNKOCL91BcuHblt_vo_FI_cPoLQb'), caption: 'Campus Life' },
];

/* HD Gallery — all photos from the college official Facebook page.
   Old blurry prospectus crops REMOVED (see hidden_files/gallery-blurry-removed.md). */
const DEFAULT_GALLERY = [
  { id: 'hd-campus', image_url: DRIVE_THUMB('1v60IYWhMxsP1pVO_tGq2iGVHP7X-yQ6y'), full: DRIVE_FULL('1v60IYWhMxsP1pVO_tGq2iGVHP7X-yQ6y'), caption: 'Campus' },
  { id: 'hd-principal', image_url: DRIVE_THUMB('1CYTnm--mHOCB8USgCd8Sb63zlUxcpD4s'), full: DRIVE_FULL('1CYTnm--mHOCB8USgCd8Sb63zlUxcpD4s'), caption: 'Principal — Mr. Fayoun Khan' },
  { id: 'hd-teacher-1', image_url: DRIVE_THUMB('1m2WFVran1pLgVobiH5LIK-gWHxPGFeBz'), full: DRIVE_FULL('1m2WFVran1pLgVobiH5LIK-gWHxPGFeBz'), caption: 'Welcome Party 2026' },
  { id: 'hd-teacher-2', image_url: DRIVE_THUMB('1QdxTT3QaqwsuS71eK0EI7uLBgrMY0jFM'), full: DRIVE_FULL('1QdxTT3QaqwsuS71eK0EI7uLBgrMY0jFM'), caption: 'Teachers Address' },
  { id: 'hd-teacher-3', image_url: DRIVE_THUMB('1d44ayMWKSOkD7IzKLYkssK8OpSWvUAMc'), full: DRIVE_FULL('1d44ayMWKSOkD7IzKLYkssK8OpSWvUAMc'), caption: 'Welcome Party 2026' },
];

/* Native video player for the lightbox.
   The old Drive preview iframe loaded Google's whole viewer web app
   (multi-MB JS) before the mp4 even started, with no adaptive bitrate.
   This mounts a plain <video> whose src is set only when the lightbox
   opens (i.e. on tap) — nothing streams on page load. Primary stream is
   the Drive API alt=media URL (range requests, verified 206 video/mp4);
   on error it falls back once to the uc?export=download URL. */
function GalleryVideo({ item, onClose }) {
  const [src, setSrc] = useState(() => driveDownloadUrl(item.drive_file_id));
  const [failed, setFailed] = useState(false);
  const [fellBack, setFellBack] = useState(false);
  const poster = item.thumbFull || item.thumb;
  return (
    <div className="video-frame" onClick={(e) => e.stopPropagation()} style={{ width: 'min(92vw, 960px)' }}>
      <div className="vf-head"><span className="play">▶</span><span>{item.caption}</span></div>
      {failed ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: '#fff', background: '#000' }}>
          <p style={{ margin: '0 0 8px', fontWeight: 700 }}>This video could not be played.</p>
          <p className="muted" style={{ margin: 0 }}>Please check your connection and try again.</p>
        </div>
      ) : (
        <video
          src={src}
          poster={poster}
          controls
          playsInline
          preload="none"
          autoPlay
          style={{ display: 'block', width: '100%', aspectRatio: '16/9', background: '#000' }}
          onError={() => {
            if (!fellBack) { setFellBack(true); setSrc(DRIVE_UC(item.drive_file_id)); }
            else setFailed(true);
          }}
          title={item.caption}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 14px', background: 'var(--navy-950)' }}>
        <button type="button" className="btn btn-outline-light" onClick={onClose} style={{ minHeight: 40 }}>Close ×</button>
      </div>
    </div>
  );
}

export default function Gallery() {
  const { t, lang } = useLang();
  const { college } = useCollege();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [light, setLight] = useState(null);

  useEffect(() => {
    if (!backendReady()) { setItems(DEFAULT_GALLERY); setLoading(false); return; }
    Promise.all([
      fetchGallery(college && college.id).catch(() => []),
      fetchGalleryImages(college && college.id).catch(() => []),
    ]).then(([r, uploaded]) => {
      // Map gallery_media rows to display format
      const driveMapped = (r && r.length) ? r.filter((m) => m.is_active !== false).map((m) => ({
        id: m.id,
        type: m.media_type === 'video' ? 'video' : 'image',
        src: m.media_type === 'video' ? null : DRIVE_THUMB(m.drive_file_id),
        full: DRIVE_FULL(m.drive_file_id),
        thumb: VIDEO_THUMB_OVERRIDE[m.drive_file_id] || DRIVE_THUMB(m.drive_file_id),
        thumbFull: VIDEO_THUMB_OVERRIDE_FULL[m.drive_file_id] || DRIVE_FULL(m.drive_file_id),
        drive_file_id: m.drive_file_id,
        caption: m.title,
        description: m.description,
      })) : [];
      // Admin-uploaded photos (gallery_images) go first, newest first
      const uploadedMapped = (uploaded || []).filter((g) => g.image_url).map((g) => ({
        id: g.id,
        type: 'image',
        src: g.image_url,
        full: g.image_url,
        thumb: g.image_url,
        thumbFull: g.image_url,
        drive_file_id: null,
        caption: g.caption || '',
        description: '',
      }));
      const combined = [...uploadedMapped, ...driveMapped];
      setItems(combined.length ? combined : DEFAULT_GALLERY);
    }).catch(() => setItems(DEFAULT_GALLERY)).finally(() => setLoading(false));
  }, [college]);

  /* Single list: the old page rendered the same 11 items twice
     ("Latest from Facebook" + "All Photos"). While loading, the
     fallback FB_MEDIA list is shown once. */
  const list = loading ? FB_MEDIA : items;

  return (
    <>
      <Seo page="gallery" />
      <section className="page-hero">
        <div className="container">
          <div className="crumbs"><LLink to="/">{t.common.backHome}</LLink> / {t.pages.gallery.crumbs}</div>
          <h1>{t.pages.gallery.title}</h1>
          <p>Campus life at The Brighton College — Shewa Adda, Kalu Khan, Swabi.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 style={{ marginBottom: 6 }}>{t.pages.gallery.allPhotos}</h2>
          <p className="muted" style={{ marginBottom: 22 }}>
            {lang === 'ur'
              ? 'کالج کے آفیشل فیس بک پیج سے HD تصاویر اور ریلز۔'
              : 'HD photos and reels from the college official Facebook page.'}
          </p>
          {loading ? <div className="loading">Loading gallery…</div> : null}
          <div className="gallery-grid">
            {list.map((m) => (
              <div className="g-item" key={m.id} onClick={() => setLight(m)} style={{ cursor: 'pointer' }}>
                {m.type === 'video' ? (
                  <div style={{ position: 'relative' }}>
                    <img src={m.thumb || m.src} alt={m.caption} loading="lazy" style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff' }}>▶</div>
                    </div>
                  </div>
                ) : (
                  <img src={m.src || m.image_url} alt={m.caption} loading="lazy" />
                )}
                {m.caption && <div className="g-cap">{m.caption}</div>}
              </div>
            ))}
          </div>
          {/* Photo stories are hidden until the college brings original
              photos: the 34 local story photos were blurry brochure-scan
              crops (194–309 px) and have been removed. stories.js and the
              /gallery/:slug routes are untouched, so the stories return
              as soon as original photos are added. */}
          {light && (
            <div className="lightbox" onClick={() => setLight(null)} style={{ zIndex: 9999 }}>
              <button className="lb-close" onClick={() => setLight(null)}>×</button>
              {light.type === 'video' ? (
                <GalleryVideo item={light} onClose={() => setLight(null)} />
              ) : (
                <img src={light.full || light.image_url || light.src} alt={light.caption || ''} onClick={(e) => e.stopPropagation()} />
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
