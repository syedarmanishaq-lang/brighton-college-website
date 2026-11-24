import React, { useCallback, useEffect, useRef, useState } from 'react';
import './VideoPlayer.css';

/* ==========================================================================
   THE BRIGHTON COLLEGE — custom video player.
   Apna player: no plain Drive embed. Dark navy/gold chrome, bilingual
   caption support (EN/اردو), bookmarks, timestamped notes, transcript,
   auto-resume — all keys namespaced per-video via the `videoId` prop.
   --------------------------------------------------------------------------
   Props:
     src          direct video URL (mp4/webm)
     title        string shown above the video
     videoId      stable id — localStorage keys are bcp_*_<videoId>
     subtitles    optional [{ label:'English'|'اردو', srcLang:'en'|'ur', src:'<vtt url>' }]
     onEnded      callback fired when the video finishes
     autoplayNext bool — auto-play when `src` changes (playlist behaviour)
     onStreamError optional — called on <video> error instead of inline error UI
     onPlaying     optional — called when playback actually starts/resumes
                   (CourseView uses it to hide the Drive-preview fallback)
     curriculum   optional React node rendered in the "Curriculum" side tab
   ========================================================================== */

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const HIDE_DELAY = 3000; // ms before controls auto-hide while playing
const SAVE_EVERY = 5000; // ms between position saves

const lsPos = (id) => `bcp_pos_${id}`;
const lsBookmarks = (id) => `bcp_bookmarks_${id}`;
const lsNotes = (id) => `bcp_notes_${id}`;

function safeGet(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function safeSet(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode — ignore */ }
}
function safeDel(key) {
  try { window.localStorage.removeItem(key); } catch { /* ignore */ }
}

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return (h > 0 ? h + ':' : '') + mm + ':' + String(r).padStart(2, '0');
}

/* ------------------------------- icons ---------------------------------- */
const I = {
  play:   <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5z"/></svg>,
  pause:  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>,
  back10: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M11 4.5A8.5 8.5 0 1 0 19.5 13" strokeLinecap="round"/><path d="M11 2.5v4h-4" strokeLinecap="round" strokeLinejoin="round"/><text x="8.2" y="16.2" fontSize="7.5" fontWeight="700" fill="currentColor" stroke="none">10</text></svg>,
  fwd10:  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M13 4.5a8.5 8.5 0 1 1-8.5 8.5" strokeLinecap="round"/><path d="M13 2.5v4h4" strokeLinecap="round" strokeLinejoin="round"/><text x="10.2" y="16.2" fontSize="7.5" fontWeight="700" fill="currentColor" stroke="none">10</text></svg>,
  vol:    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>,
  mute:   <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  cc:     <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 10.2a2.4 2.4 0 0 0-3.6 2.1 2.4 2.4 0 0 0 3.6 2.1M17.5 10.2a2.4 2.4 0 0 0-3.6 2.1 2.4 2.4 0 0 0 3.6 2.1" strokeLinecap="round"/></svg>,
  pip:    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><rect x="12.5" y="11" width="7" height="5" rx="1" fill="currentColor" stroke="none"/></svg>,
  full:   <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  unfull: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  bkm:    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M7 4h10v16l-5-3.6L7 20V4z" strokeLinejoin="round"/></svg>,
  bkmFill:<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M7 4h10v16l-5-3.6L7 20V4z"/></svg>,
  trash:  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M6.5 7l1 13h9l1-13" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  x:      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round"/></svg>,
  help:   <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.8.3-1 .8-1 1.7" strokeLinecap="round"/><circle cx="12" cy="16.6" r="1.1" fill="currentColor" stroke="none"/></svg>,
  plus:   <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>,
  warn:   <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 4L2.8 20h18.4L12 4z" strokeLinejoin="round"/><path d="M12 10v4" strokeLinecap="round"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/></svg>,
  spin:   <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className="bcp-spin"><path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round"/></svg>,
};

export default function VideoPlayer(props) {
  const { src, title, videoId, subtitles, onEnded, autoplayNext, onStreamError, onPlaying, curriculum } = props;
  const hasSubs = Array.isArray(subtitles) && subtitles.length > 0;

  const videoRef = useRef(null);
  const stageRef = useRef(null);
  const hideTimer = useRef(null);
  const transcriptListRef = useRef(null);
  const cueGuard = useRef(-2);

  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [capIdx, setCapIdx] = useState(-1); // -1 = off, else index into subtitles
  const [pipActive, setPipActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [cues, setCues] = useState([]);
  const [activeCue, setActiveCue] = useState(-1);

  const tabs = ['bookmarks', 'notes'];
  if (hasSubs) tabs.push('transcript');
  if (curriculum) tabs.push('curriculum');
  const [activeTab, setActiveTab] = useState('bookmarks');
  const [loop, setLoop] = useState(false);
  const lastTapRef = useRef({ t: 0, x: 0 });

  /* ------------------------- per-video reset ------------------------- */
  useEffect(() => {
    setPlaying(false); setTime(0); setDuration(0); setBufferedPct(0);
    setError(null); setToast(null); setSpeed(1); setSpeedOpen(false);
    setCapIdx(-1); setCues([]); setActiveCue(-1); setNoteText('');
    cueGuard.current = -2;
    if (videoId) {
      const b = safeGet(lsBookmarks(videoId));
      setBookmarks(Array.isArray(b) ? b : []);
      const n = safeGet(lsNotes(videoId));
      setNotes(Array.isArray(n) ? n : []);
    }
    setActiveTab('bookmarks');
  }, [src, videoId]);

  /* --------------------- caption track modes ------------------------- */
  const applyTrackModes = useCallback((idx) => {
    const v = videoRef.current;
    if (!v || !hasSubs) return;
    for (let i = 0; i < v.textTracks.length && i < subtitles.length; i++) {
      try { v.textTracks[i].mode = i === idx ? 'showing' : 'hidden'; } catch { /* noop */ }
    }
  }, [hasSubs, subtitles]);

  const refreshCues = useCallback((preferredIdx) => {
    const v = videoRef.current;
    if (!v || !hasSubs) return;
    const idx = typeof preferredIdx === 'number' ? preferredIdx : (capIdx >= 0 ? capIdx : 0);
    const track = v.textTracks && v.textTracks[idx];
    if (track && track.cues && track.cues.length) {
      const arr = [];
      for (let i = 0; i < track.cues.length; i++) {
        const c = track.cues[i];
        arr.push({ start: c.startTime, end: c.endTime, text: c.text });
      }
      setCues(arr);
      return true;
    }
    return false;
  }, [hasSubs, capIdx]);

  /* --------------------- video element wiring ------------------------ */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onLoaded = () => {
      setDuration(v.duration || 0);
      setError(null);
      applyTrackModes(capIdx);
      // cues can arrive a beat after metadata; try now and once more shortly after
      if (!refreshCues(capIdx)) setTimeout(() => refreshCues(capIdx), 1200);
      // auto-resume
      if (videoId) {
        const saved = safeGet(lsPos(videoId));
        const s = typeof saved === 'number' ? saved : parseFloat(saved);
        if (isFinite(s) && s > 3 && v.duration && s < v.duration - 10) {
          v.currentTime = s;
          setTime(s);
          setToast({ msg: `Resumed from ${formatTime(s)}` });
        }
      }
      if (autoplayNext) {
        const p = v.play();
        if (p && p.catch) p.catch(() => { /* autoplay blocked — user taps play */ });
      }
    };
    const onTime = () => {
      setTime(v.currentTime);
      if (v.buffered && v.buffered.length && v.duration) {
        try { setBufferedPct((v.buffered.end(v.buffered.length - 1) / v.duration) * 100); } catch { /* noop */ }
      }
    };
    const onPlay = () => { setPlaying(true); setBuffering(false); scheduleHide(); if (typeof onPlaying === 'function') onPlaying(); };
    const onPause = () => { setPlaying(false); showControls(); savePosition(); };
    const onWaiting = () => setBuffering(true);
    const onCanPlay = () => setBuffering(false);
    const onEnded = () => {
      setPlaying(false); showControls();
      if (videoId) safeDel(lsPos(videoId)); // finished — don't resume at the end
      if (typeof onEnded === 'function') onEnded();
    };
    const onErr = () => {
      if (typeof onStreamError === 'function') { onStreamError(); return; }
      setError('This video could not be loaded. The file may be private, the link expired, or the network dropped.');
      setBuffering(false);
    };

    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('waiting', onWaiting);
    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('ended', onEnded);
    v.addEventListener('error', onErr);
    return () => {
      v.removeEventListener('loadedmetadata', onLoaded);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('waiting', onWaiting);
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('ended', onEnded);
      v.removeEventListener('error', onErr);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, videoId, autoplayNext]);

  /* ------------------ position autosave (every 5s) ------------------- */
  const savePosition = useCallback(() => {
    const v = videoRef.current;
    if (!v || !videoId) return;
    if (v.ended) { safeDel(lsPos(videoId)); return; }
    if (v.currentTime > 1) safeSet(lsPos(videoId), v.currentTime);
  }, [videoId]);

  useEffect(() => {
    const id = setInterval(savePosition, SAVE_EVERY);
    const onHide = () => { if (document.visibilityState === 'hidden') savePosition(); };
    document.addEventListener('visibilitychange', onHide);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onHide); };
  }, [savePosition]);

  /* ----------------------- toast auto-dismiss ------------------------ */
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  /* -------------------- controls auto-hide --------------------------- */
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);
  const scheduleHide = useCallback(() => {
    showControls();
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused && !v.ended) setControlsVisible(false);
    }, HIDE_DELAY);
  }, [showControls]);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  /* ------------------------ fullscreen sync -------------------------- */
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  /* --------------------- transcript active line ---------------------- */
  useEffect(() => {
    if (!cues.length) return;
    let idx = -1;
    for (let i = 0; i < cues.length; i++) {
      if (time >= cues[i].start && time < cues[i].end) { idx = i; break; }
    }
    if (idx !== cueGuard.current) { cueGuard.current = idx; setActiveCue(idx); }
  }, [time, cues]);

  useEffect(() => {
    if (activeTab === 'transcript' && activeCue >= 0 && transcriptListRef.current) {
      const el = transcriptListRef.current.querySelector(`[data-cue="${activeCue}"]`);
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeCue, activeTab]);

  /* --------------------------- actions ------------------------------- */
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || error) return;
    if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    else v.pause();
  }, [error]);

  const skip = useCallback((secs) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(0, v.currentTime + secs), v.duration || Infinity);
    setTime(v.currentTime);
    showControls();
  }, [showControls]);

  const seekTo = useCallback((t) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
    setTime(t);
    showControls();
  }, [showControls]);

  const changeSpeed = useCallback((s) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = s;
    setSpeed(s);
    setSpeedOpen(false);
    showControls();
  }, [showControls]);

  const stepSpeed = useCallback((dir) => {
    const i = SPEEDS.indexOf(speed);
    const next = SPEEDS[Math.min(SPEEDS.length - 1, Math.max(0, (i < 0 ? 2 : i) + dir))];
    changeSpeed(next);
  }, [speed, changeSpeed]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    showControls();
  }, [showControls]);

  const setVol = useCallback((val) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setMuted(v.muted);
  }, []);

  const togglePip = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
      setPipActive(!!document.pictureInPictureElement);
    } catch { /* PiP rejected — leave state as-is */ }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      // Unlock screen orientation when exiting fullscreen
      if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    } else if (stage.requestFullscreen) {
      stage.requestFullscreen().then(() => {
        // Lock to landscape on mobile for better viewing
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => {});
        }
      }).catch(() => {});
    }
  }, []);

  /* Rotate button — enters fullscreen and locks to landscape for proper rotation */
  const rotateScreen = useCallback(async () => {
    const stage = stageRef.current;
    try {
      // Must be in fullscreen for orientation lock to work on mobile
      if (!document.fullscreenElement && stage && stage.requestFullscreen) {
        await stage.requestFullscreen();
      }
      // Small delay to let fullscreen engage
      await new Promise(r => setTimeout(r, 300));
      if (screen.orientation && screen.orientation.lock) {
        const current = screen.orientation.type || '';
        const target = current.startsWith('landscape') ? 'portrait' : 'landscape';
        await screen.orientation.lock(target);
      }
    } catch (e) {
      // If lock fails, at least we're in fullscreen
      if (!document.fullscreenElement) toggleFullscreen();
    }
    showControls();
  }, [toggleFullscreen, showControls]);

  const cycleCaptions = useCallback(() => {
    if (!hasSubs) return;
    const next = capIdx + 1 > subtitles.length - 1 ? -1 : capIdx + 1;
    setCapIdx(next);
    applyTrackModes(next);
    refreshCues(next);
    showControls();
  }, [capIdx, hasSubs, subtitles, applyTrackModes, refreshCues, showControls]);

  const capLabel = capIdx === -1 ? 'Off' : (subtitles[capIdx] ? subtitles[capIdx].label : 'On');

  const addBookmark = useCallback(() => {
    const v = videoRef.current;
    if (!v || !videoId) return;
    const t = v.currentTime;
    const entry = { t, label: `Bookmark · ${formatTime(t)}`, at: new Date().toISOString() };
    setBookmarks((prev) => {
      const next = [...prev, entry].sort((a, b) => a.t - b.t);
      safeSet(lsBookmarks(videoId), next);
      return next;
    });
    setActiveTab('bookmarks');
    setToast({ msg: `Bookmarked at ${formatTime(t)}` });
    showControls();
  }, [videoId, showControls]);

  const delBookmark = useCallback((idx) => {
    setBookmarks((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (videoId) safeSet(lsBookmarks(videoId), next);
      return next;
    });
  }, [videoId]);

  const addNote = useCallback(() => {
    const v = videoRef.current;
    const text = noteText.trim();
    if (!v || !videoId || !text) return;
    const entry = { t: v.currentTime, text, at: new Date().toISOString() };
    setNotes((prev) => {
      const next = [...prev, entry].sort((a, b) => a.t - b.t);
      safeSet(lsNotes(videoId), next);
      return next;
    });
    setNoteText('');
  }, [noteText, videoId]);

  const delNote = useCallback((idx) => {
    setNotes((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (videoId) safeSet(lsNotes(videoId), next);
      return next;
    });
  }, [videoId]);

  const retryLoad = useCallback(() => {
    const v = videoRef.current;
    setError(null);
    if (v) v.load();
  }, []);

  /* ------------------------- keyboard -------------------------------- */
  const onKeyDown = (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const k = e.key;
    if (k === ' ') { e.preventDefault(); togglePlay(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); e.shiftKey ? stepSpeed(-1) : skip(-5); }
    else if (k === 'ArrowRight') { e.preventDefault(); e.shiftKey ? stepSpeed(1) : skip(5); }
    else if (k === 'f' || k === 'F') toggleFullscreen();
    else if (k === 'm' || k === 'M') toggleMute();
    else if (k === 'b' || k === 'B') addBookmark();
    else if (k === '?') setHelpOpen((o) => !o);
    else if (k === 'Escape') { setHelpOpen(false); setSpeedOpen(false); }
  };

  /* --------------------------- render -------------------------------- */
  const seekPct = duration ? (time / duration) * 100 : 0;
  const pipSupported = typeof document !== 'undefined' && !!document.pictureInPictureEnabled;

  return (
    <div
      className="bcp"
      role="region"
      aria-label={(title || 'Lesson') + ' video player'}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div
        ref={stageRef}
        className={'bcp-stage' + (controlsVisible ? '' : ' bcp-controls-hidden')}
        onMouseMove={showControls}
        onTouchStart={showControls}
      >
        {/* title ribbon */}
        <div className="bcp-titlebar" aria-hidden={controlsVisible ? 'false' : 'true'}>
          <span className="bcp-title">{title}</span>
        </div>

        <video
          ref={videoRef}
          className="bcp-video"
          src={src}
          preload="metadata"
          playsInline
          loop={loop}
          onClick={togglePlay}
          onDoubleClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - r.left;
            skip(x < r.width / 2 ? -10 : 10);
          }}
          aria-label={title}
        >
          {hasSubs && subtitles.map((s, i) => (
            <track
              key={s.srcLang + '-' + i}
              kind="subtitles"
              srcLang={s.srcLang}
              label={s.label}
              src={s.src}
              onLoad={() => refreshCues(capIdx >= 0 ? capIdx : 0)}
            />
          ))}
        </video>

        {/* buffering spinner */}
        {buffering && !error && (
          <div className="bcp-overlay" aria-hidden="true">{I.spin}</div>
        )}

        {/* big center play when paused */}
        {!playing && !error && !buffering && (
          <button
            type="button"
            className="bcp-bigplay"
            onClick={togglePlay}
            aria-label={time > 0 ? 'Resume video' : 'Play video'}
          >
            {I.play}
          </button>
        )}

        {/* error state */}
        {error && (
          <div className="bcp-error" role="alert">
            <div className="bcp-error-icon">{I.warn}</div>
            <p className="bcp-error-title">Video unavailable</p>
            <p className="bcp-error-msg">{error}</p>
            <button type="button" className="bcp-error-retry" onClick={retryLoad}>
              Try again
            </button>
          </div>
        )}

        {/* resume toast */}
        {toast && (
          <div className="bcp-toast" role="status">
            <span>{toast.msg}</span>
            <button
              type="button"
              className="bcp-toast-x"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
            >
              {I.x}
            </button>
          </div>
        )}

        {/* control bar */}
        <div
          className="bcp-controls"
          onFocus={showControls}
          onMouseMove={(e) => e.stopPropagation()}
        >
          {/* seek row — timeline is intentionally LTR even on RTL pages */}
          <div className="bcp-seekrow" dir="ltr">
            <span className="bcp-time">{formatTime(time)}</span>
            <div className="bcp-slider-wrap">
              <div
                className="bcp-buffered"
                style={{ width: Math.min(100, bufferedPct) + '%' }}
                aria-hidden="true"
              />
              <input
                type="range"
                className="bcp-seek"
                min={0}
                max={duration || 0}
                step={0.1}
                value={time}
                style={{ '--fill': seekPct + '%' }}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                aria-label="Seek"
                aria-valuetext={formatTime(time) + ' of ' + formatTime(duration)}
              />
              {duration > 0 && bookmarks.map((b, i) => (
                <button
                  key={i}
                  type="button"
                  className="bcp-tick"
                  style={{ left: `calc(${(b.t / duration) * 100}% - 6px)` }}
                  onClick={(e) => { e.stopPropagation(); seekTo(b.t); }}
                  title={b.label}
                  aria-label={'Jump to ' + b.label}
                />
              ))}
            </div>
            <span className="bcp-time">{formatTime(duration)}</span>
          </div>

          {/* button row */}
          <div className="bcp-btnrow">
            <button type="button" className="bcp-btn" onClick={togglePlay}
              aria-label={playing ? 'Pause (Space)' : 'Play (Space)'}>
              {playing ? I.pause : I.play}
            </button>
            <button type="button" className="bcp-btn" onClick={() => skip(-10)} aria-label="Back 10 seconds">
              {I.back10}
            </button>
            <button type="button" className="bcp-btn" onClick={() => skip(10)} aria-label="Forward 10 seconds">
              {I.fwd10}
            </button>

            <div className="bcp-vol">
              <button type="button" className="bcp-btn" onClick={toggleMute}
                aria-label={muted ? 'Unmute (M)' : 'Mute (M)'} aria-pressed={muted}>
                {muted || volume === 0 ? I.mute : I.vol}
              </button>
              <input
                type="range" className="bcp-vol-slider" dir="ltr"
                min={0} max={1} step={0.05} value={muted ? 0 : volume}
                style={{ '--fill': ((muted ? 0 : volume) * 100) + '%' }}
                onChange={(e) => setVol(parseFloat(e.target.value))}
                aria-label="Volume"
              />
            </div>

            <span className="bcp-spacer" />

            {/* speed menu */}
            <div className="bcp-menu-wrap">
              <button
                type="button" className="bcp-btn bcp-speed-btn"
                onClick={() => setSpeedOpen((o) => !o)}
                aria-label={'Playback speed ' + speed + 'x (Shift + arrow keys)'}
                aria-expanded={speedOpen} aria-haspopup="menu"
              >
                <span className="bcp-speed-label">{speed}x</span>
              </button>
              {speedOpen && (
                <div className="bcp-menu" role="menu" aria-label="Playback speed">
                  {SPEEDS.map((s) => (
                    <button
                      key={s} type="button" role="menuitemradio" aria-checked={s === speed}
                      className={'bcp-menu-item' + (s === speed ? ' bcp-active' : '')}
                      onClick={() => changeSpeed(s)}
                    >
                      {s}x{s === 1 ? ' (Normal)' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {hasSubs && (
              <button
                type="button"
                className={'bcp-btn' + (capIdx >= 0 ? ' bcp-on' : '')}
                onClick={cycleCaptions}
                aria-label={'Subtitles: ' + capLabel + ' — activate to change'}
                aria-pressed={capIdx >= 0}
                title={'Subtitles: ' + capLabel}
              >
                {I.cc}
                <span className="bcp-cc-tag">{capIdx === -1 ? 'Off' : capLabel}</span>
              </button>
            )}

            <button type="button" className="bcp-btn" onClick={addBookmark}
              aria-label="Add bookmark at current time (B)" title="Bookmark (B)">
              {I.bkm}
            </button>

            <button type="button" className="bcp-btn" onClick={() => setLoop((l) => { const v = videoRef.current; if (v) v.loop = !l; return !l; })}
              aria-label={loop ? 'Loop off' : 'Loop video'} aria-pressed={loop}
              title="Loop" style={loop ? { color: '#d4a94e' } : undefined}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 014-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 01-4 4H3"/></svg>
            </button>

            {pipSupported && (
              <button type="button" className="bcp-btn" onClick={togglePip}
                aria-label={pipActive ? 'Exit picture-in-picture' : 'Picture-in-picture'}
                aria-pressed={pipActive} title="Picture-in-picture">
                {I.pip}
              </button>
            )}

            <button type="button" className="bcp-btn" onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
              title="Fullscreen (F)">
              {isFullscreen ? I.unfull : I.full}
            </button>

            <button type="button" className="bcp-btn" onClick={rotateScreen}
              aria-label="Rotate screen" title="Rotate screen">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button>

            <button type="button" className="bcp-btn" onClick={() => setHelpOpen((o) => !o)}
              aria-label="Keyboard shortcuts (?)" title="Shortcuts (?)">
              {I.help}
            </button>
          </div>
        </div>

        {/* shortcut help overlay */}
        {helpOpen && (
          <div className="bcp-help" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
            <div className="bcp-help-card">
              <div className="bcp-help-head">
                <h3>Keyboard shortcuts</h3>
                <button type="button" className="bcp-btn" onClick={() => setHelpOpen(false)}
                  aria-label="Close shortcuts">{I.x}</button>
              </div>
              <ul className="bcp-help-list">
                <li><kbd>Space</kbd><span>Play / pause</span></li>
                <li><kbd>←</kbd><kbd>→</kbd><span>Seek back / forward 5 seconds</span></li>
                <li><kbd>Shift</kbd>+<kbd>←</kbd><kbd>→</kbd><span>Slower / faster playback</span></li>
                <li><kbd>F</kbd><span>Fullscreen</span></li>
                <li><kbd>M</kbd><span>Mute / unmute</span></li>
                <li><kbd>B</kbd><span>Add bookmark here</span></li>
                <li><kbd>?</kbd><span>Open / close this panel</span></li>
                <li><kbd>Esc</kbd><span>Close this panel</span></li>
              </ul>
              <p className="bcp-help-note">Click the player once so it can hear your keyboard.</p>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------- side panel ------------------------- */}
      <aside className="bcp-panel" aria-label="Video companion panel">
        <div className="bcp-tabs" role="tablist" aria-label="Player panels">
          {tabs.map((t) => (
            <button
              key={t} type="button" role="tab"
              aria-selected={activeTab === t}
              className={'bcp-tab' + (activeTab === t ? ' bcp-active' : '')}
              onClick={() => setActiveTab(t)}
            >
              {t === 'bookmarks' && `Bookmarks${bookmarks.length ? ` (${bookmarks.length})` : ''}`}
              {t === 'notes' && `Notes${notes.length ? ` (${notes.length})` : ''}`}
              {t === 'transcript' && 'Transcript'}
              {t === 'curriculum' && 'Curriculum'}
            </button>
          ))}
        </div>

        <div className="bcp-tabbody" role="tabpanel">
          {activeTab === 'bookmarks' && (
            <div>
              <button type="button" className="bcp-addline" onClick={addBookmark}>
                {I.plus}<span>Bookmark this moment ({formatTime(time)})</span>
              </button>
              {bookmarks.length === 0 && (
                <p className="bcp-empty">No bookmarks yet. Press <kbd>B</kbd> anytime to mark a moment worth revisiting.</p>
              )}
              <ul className="bcp-list">
                {bookmarks.map((b, i) => (
                  <li key={i} className="bcp-row">
                    <button type="button" className="bcp-timechip" onClick={() => seekTo(b.t)}>
                      {formatTime(b.t)}
                    </button>
                    <span className="bcp-row-label">{b.label}</span>
                    <button type="button" className="bcp-iconbtn" onClick={() => delBookmark(i)}
                      aria-label={'Delete ' + b.label}>{I.trash}</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'notes' && (
            <div>
              <div className="bcp-noteform">
                <input
                  type="text" className="bcp-noteinput" value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }}
                  placeholder={`Note at ${formatTime(time)}…`}
                  aria-label="Write a note for the current moment"
                  maxLength={500}
                />
                <button type="button" className="bcp-addbtn" onClick={addNote}
                  disabled={!noteText.trim()} aria-label="Add note">
                  {I.plus}
                </button>
              </div>
              {notes.length === 0 && (
                <p className="bcp-empty">No notes yet. Jot down a formula, a definition, anything — each note remembers its timestamp.</p>
              )}
              <ul className="bcp-list">
                {notes.map((n, i) => (
                  <li key={i} className="bcp-row">
                    <button type="button" className="bcp-timechip" onClick={() => seekTo(n.t)}>
                      {formatTime(n.t)}
                    </button>
                    <span className="bcp-row-label">{n.text}</span>
                    <button type="button" className="bcp-iconbtn" onClick={() => delNote(i)}
                      aria-label={'Delete note at ' + formatTime(n.t)}>{I.trash}</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'transcript' && hasSubs && (
            <div>
              {cues.length === 0 && (
                <p className="bcp-empty">Transcript is loading… if it stays empty, the subtitle file could not be read.</p>
              )}
              <ol className="bcp-transcript" ref={transcriptListRef}>
                {cues.map((c, i) => (
                  <li key={i} data-cue={i}
                    className={'bcp-cue' + (i === activeCue ? ' bcp-cue-active' : '')}>
                    <button type="button" className="bcp-cue-btn" onClick={() => seekTo(c.start)}
                      aria-label={'Jump to ' + formatTime(c.start)}>
                      <span className="bcp-cue-time">{formatTime(c.start)}</span>
                      <span className="bcp-cue-text">{c.text}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {activeTab === 'curriculum' && curriculum && (
            <div className="bcp-curriculum">{curriculum}</div>
          )}
        </div>
      </aside>
    </div>
  );
}
