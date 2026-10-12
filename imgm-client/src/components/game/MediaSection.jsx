/**
 * MediaSection — a game's screenshots and videos, in two tabs.
 * Screenshots come first (not everyone wants to watch videos); tap one to open
 * it big. Videos are filtered to the few that matter (see pickVideos.js).
 *
 * Noir: square-cornered media with no shadows, the tabs and the video list as
 * segmented controls (the picked one ivory), and a plain dark viewer.
 */
import { ArrowLeft, ArrowRight, Clapperboard, Image as ImageIcon, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { pickVideos, allVideos } from './pickVideos';
import { WRAP, SECTION_TITLE, TEXT_BUTTON_SM, SEGMENTS, segment } from '../../lib/ui';

const GRID_LIMIT = 8; // screenshots shown before "Show all"

// IGDB serves every image in several sizes — swap the size in the URL
const thumb = (url) => url.replace('/t_1080p/', '/t_screenshot_med/');

// ── Full-screen screenshot viewer ──
const Lightbox = ({ images, index, onChange, onClose }) => {
  const go = (step) => onChange((index + step + images.length) % images.length);

  // Keyboard: ← → to browse, Esc to close. Also stop the page scrolling behind it.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onChange((i) => (i + 1) % images.length);
      if (e.key === 'ArrowLeft') onChange((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [images.length, onChange, onClose]);

  // Square ghost buttons on card stock
  const iconButton =
    'absolute w-11 h-11 grid place-items-center rounded-sm bg-slate-900 border border-slate-500 text-white hover:border-white transition-colors duration-120';
  const arrow = `${iconButton} top-1/2 -translate-y-1/2`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Screenshot ${index + 1} of ${images.length}`}
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-slate-950/95 flex items-center justify-center p-4 animate-fade-in"
    >
      <img
        src={images[index]}
        alt={`Screenshot ${index + 1}`}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[85vh] rounded-sm object-contain"
      />
      <button type="button" onClick={onClose} aria-label="Close" className={`${iconButton} top-4 right-4`}>
        <X className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
      </button>
      {images.length > 1 && (
        <>
          <button type="button" aria-label="Previous screenshot" className={`${arrow} left-3 sm:left-6`} onClick={(e) => { e.stopPropagation(); go(-1); }}>
            <ArrowLeft className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next screenshot" className={`${arrow} right-3 sm:right-6`} onClick={(e) => { e.stopPropagation(); go(1); }}>
            <ArrowRight className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
          </button>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm text-slate-300 tabular-nums">
            {index + 1} / {images.length}
          </span>
        </>
      )}
    </div>
  );
};

const Screenshots = ({ images, title }) => {
  const [open, setOpen] = useState(null); // index of the open screenshot, or null
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? images : images.slice(0, GRID_LIMIT);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {shown.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`Open screenshot ${i + 1}`}
            className="group relative aspect-video rounded-sm overflow-hidden bg-slate-900"
          >
            <img
              src={thumb(url)}
              alt={`${title} screenshot ${i + 1}`}
              loading="lazy"
              className="w-full h-full object-cover transition-opacity duration-120 group-hover:opacity-85"
            />
          </button>
        ))}
      </div>
      {images.length > GRID_LIMIT && (
        <button type="button" onClick={() => setShowAll((s) => !s)} aria-expanded={showAll} className={`mt-2 ${TEXT_BUTTON_SM}`}>
          {showAll ? 'Show fewer' : `Show all ${images.length} screenshots`}
        </button>
      )}
      {open != null && <Lightbox images={images} index={open} onChange={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
};

const Videos = ({ videos }) => {
  const [showAll, setShowAll] = useState(false);
  const everything = allVideos(videos);
  const list = showAll ? everything : pickVideos(videos);
  const [activeId, setActiveId] = useState(list[0]?.youtubeId);
  const active = everything.find((v) => v.youtubeId === activeId) ?? list[0];

  return (
    <>
      <div className="aspect-video rounded-sm overflow-hidden bg-slate-900 mb-4">
        <iframe
          key={active.youtubeId}
          src={`https://www.youtube.com/embed/${active.youtubeId}`}
          title={active.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {list.length > 1 && (
          <div className={SEGMENTS} role="group" aria-label="Videos">
            {list.map((video) => (
              <button
                key={video.youtubeId}
                type="button"
                aria-pressed={video.youtubeId === active.youtubeId}
                onClick={() => setActiveId(video.youtubeId)}
                className={segment(video.youtubeId === active.youtubeId)}
              >
                {video.name}
              </button>
            ))}
          </div>
        )}
        {everything.length > list.length || showAll ? (
          <button type="button" onClick={() => setShowAll((s) => !s)} aria-expanded={showAll} className={TEXT_BUTTON_SM}>
            {showAll ? 'Show fewer' : `Show all ${everything.length} videos`}
          </button>
        ) : null}
      </div>
    </>
  );
};

const MediaSection = ({ game }) => {
  const screenshots = game.screenshots ?? [];
  const videos = game.videos ?? [];
  const tabs = [
    screenshots.length > 0 && { key: 'screenshots', icon: ImageIcon, label: 'Screenshots', count: screenshots.length },
    videos.length > 0 && { key: 'videos', icon: Clapperboard, label: 'Videos', count: allVideos(videos).length },
  ].filter(Boolean);
  const [tab, setTab] = useState(tabs[0]?.key);

  if (tabs.length === 0) return null;

  return (
    <section className={`${WRAP} py-10`}>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <h2 className={SECTION_TITLE}>Screenshots &amp; videos</h2>
        {tabs.length > 1 && (
          <div role="tablist" aria-label="Media" className={SEGMENTS}>
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={segment(tab === t.key)}
              >
                <t.icon className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />{t.label} <span className="font-medium opacity-70 tabular-nums">{t.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'screenshots' && <Screenshots images={screenshots} title={game.title} />}
      {tab === 'videos' && <Videos videos={videos} />}
    </section>
  );
};

export default MediaSection;
