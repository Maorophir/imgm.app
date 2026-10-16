/**
 * ShareCardDialog — "Share your card": the card as a picture, and the ways to send it.
 *
 * Opening it photographs the card's ShareImage (drawn off screen) into a PNG and shows
 * it. Then:
 *   Share image  the device's own share sheet with the picture (and the link in the
 *                text), so it can go straight to WhatsApp, Instagram, Messages…
 *                Only where the browser can share files (most phones); elsewhere
 *                "Save image" takes its place as the main action.
 *   Save image   downloads the PNG
 *   Copy link    the card's page on IMGM
 *   WhatsApp, X  a message or post with the line and the link
 *
 * Props:
 *   open, onClose   shown or not, and closing it (Escape, the ✕, or a click outside)
 *   card            CollectibleCard props (the picture uses the share edition)
 *   url             the card's page, e.g. "/game/1942?review=abc#review-abc"
 *   title, text     the share sheet's title and line, e.g. "10/10, Legendary on IMGM"
 *   customize       for your own review: { gameId, onChange } adds "Make it yours", to
 *                   choose the card's picture (the game's cover, artworks, screenshots)
 *                   and its words (a sentence of your review). Choices are saved to the
 *                   review (the card looks the same everywhere) and onChange({ art, quote })
 *                   lets the page update its own copy.
 */
import { useEffect, useRef, useState } from 'react';
import { Download, Link2, Share2, X } from 'lucide-react';
import ShareImage from './ShareImage';
import { makeCardImage, SHARE_IMAGE_SIZE } from '../../lib/cardImage';
import { getMyCard, setMyCard } from '../../lib/api';
import { cardArtUrl, igdbImage, isCover } from '../../lib/igdbImage';
import { PRIMARY_BUTTON, GHOST_BUTTON, TEXT_BUTTON_SM } from '../../lib/ui';

// "Hollow Knight: Silksong" → "imgm-hollow-knight-silksong-card.png"
const fileName = (title) => `imgm-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-card.png`;

// "Make it yours": the card's picture (the game's own: cover, artworks, screenshots) and
// its words (one sentence of the review, or IMGM's pick). Thumbnails scroll sideways.
const CHOICE = 'shrink-0 rounded-sm border-2 transition-colors duration-120 disabled:opacity-50';
const MakeItYours = ({ choices, busy, onChoose }) => (
  <fieldset className="flex flex-col gap-4 border-t border-slate-700 pt-4" disabled={busy}>
    <legend className="sr-only">Make your card yours</legend>
    <div>
      <p className="text-sm font-medium text-white mb-2">Picture</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {choices.pictures.map((picture) => {
          const on = picture === choices.art;
          return (
            <button
              key={picture}
              type="button"
              onClick={() => !on && onChoose({ art: picture })}
              aria-pressed={on}
              aria-label={isCover(picture) ? 'The cover' : 'Game art'}
              className={`${CHOICE} ${on ? 'border-white' : 'border-transparent hover:border-slate-500'}`}
            >
              <img
                src={isCover(picture) ? picture : igdbImage(picture, 't_screenshot_med')}
                alt=""
                loading="lazy"
                className={`block h-16 rounded-[1px] object-cover ${isCover(picture) ? 'w-12' : 'w-28'}`}
              />
            </button>
          );
        })}
      </div>
    </div>
    {choices.sentences.length > 1 && (
      <div>
        <p className="text-sm font-medium text-white mb-2">Words on the card</p>
        <ul className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
          <li>
            <button
              type="button"
              onClick={() => choices.sentence != null && onChoose({ sentence: null })}
              aria-pressed={choices.sentence == null}
              className={`w-full text-left text-sm px-3 py-2 rounded-sm border ${choices.sentence == null ? 'border-white text-white' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}
            >
              IMGM’s pick: <span className="font-serif italic">“{choices.pick}”</span>
            </button>
          </li>
          {choices.sentences.map((sentence, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => choices.sentence !== i && onChoose({ sentence: i })}
                aria-pressed={choices.sentence === i}
                className={`w-full text-left text-sm px-3 py-2 rounded-sm border font-serif italic ${choices.sentence === i ? 'border-white text-white' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}
              >
                “{sentence}”
              </button>
            </li>
          ))}
        </ul>
      </div>
    )}
  </fieldset>
);

// The window's contents. Made anew on every opening (so the picture starts fresh: the
// card may have changed since)
const ShareCardBody = ({ onClose, card: cardNow, url, title, text, customize }) => {
  // The card as it was when the window opened (pages rebuild their card props on every
  // redraw, and a new object each time would re-photograph it again and again), then as
  // the player makes it theirs
  const [card, setCard] = useState(cardNow);
  const imageRef = useRef(null);
  const [picture, setPicture] = useState(null); // { file, preview } once made
  const [status, setStatus] = useState('making'); // 'making' | 'ready' | 'failed'
  const [note, setNote] = useState(''); // "Link copied" and the like, for a moment

  const link = new URL(url ?? window.location.href, window.location.origin).href;
  const line = [text, link].filter(Boolean).join(' ');
  const canShareFiles = Boolean(picture && navigator.canShare?.({ files: [picture.file] }));

  // Photograph the off-screen picture, one frame in (so it's laid out first)
  useEffect(() => {
    let cancelled = false;
    let preview = null;
    const frame = requestAnimationFrame(async () => {
      try {
        const blob = await makeCardImage(imageRef.current, SHARE_IMAGE_SIZE);
        if (cancelled) return;
        preview = URL.createObjectURL(blob);
        setPicture({ file: new File([blob], fileName(card.title), { type: 'image/png' }), preview });
        setStatus('ready');
      } catch (error) {
        console.error('Card picture failed:', error);
        if (!cancelled) setStatus('failed');
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [card]);

  // A short note ("Link copied") goes away by itself
  useEffect(() => {
    if (!note) return undefined;
    const timer = setTimeout(() => setNote(''), 2000);
    return () => clearTimeout(timer);
  }, [note]);

  // "Make it yours": the choices, loaded once (only for your own review)
  const [choices, setChoices] = useState(null);
  const [saving, setSaving] = useState(false);
  const gameId = customize?.gameId;
  const onChange = customize?.onChange;
  useEffect(() => {
    if (!gameId) return undefined;
    const controller = new AbortController();
    getMyCard(gameId, controller.signal).then(setChoices).catch(() => {});
    return () => controller.abort();
  }, [gameId]);

  // Choose a picture or a sentence: saved to the review, then the card (and its picture)
  // follow
  const choose = async (choice) => {
    setSaving(true);
    try {
      const saved = await setMyCard(gameId, choice);
      setChoices(saved);
      setStatus('making');
      setCard((current) => {
        const studio = current.credit?.split(' · ').slice(1).join(' · ');
        return {
          ...current,
          coverUrl: cardArtUrl(saved.art),
          quote: saved.quote ?? undefined,
          credit: studio ? `${isCover(saved.art) ? 'Cover' : 'Art'} · ${studio}` : current.credit,
        };
      });
      onChange?.({ art: saved.art, quote: saved.quote });
    } catch {
      setNote('Couldn’t save that. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const shareImage = async () => {
    try {
      await navigator.share({ files: [picture.file], title, text: line });
    } catch (error) {
      if (error.name !== 'AbortError') setNote('Couldn’t open sharing. Try Save image.');
    }
  };
  const saveImage = () => {
    const a = document.createElement('a');
    a.href = picture.preview;
    a.download = picture.file.name;
    a.click();
    setNote('Image saved');
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setNote('Link copied');
    } catch {
      setNote('Couldn’t copy the link');
    }
  };

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(line)}`;
  const xPost = `https://x.com/intent/post?text=${encodeURIComponent(text ?? '')}&url=${encodeURIComponent(link)}`;

  return (
    <>
      <div className="p-5 sm:p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <h2 id="share-card-title" className="font-display text-[32px] leading-none text-white">Share your card</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 -mr-2 grid place-items-center text-slate-400 hover:text-white">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* The picture that will be shared */}
        <div className="aspect-[1080/1350] w-full rounded-sm overflow-hidden bg-slate-950 border border-slate-700 grid place-items-center">
          {status === 'ready' ? (
            <img src={picture.preview} alt={`Your card for ${card.title}, as a picture`} className="w-full h-full object-contain" />
          ) : status === 'failed' ? (
            <p className="px-6 text-center text-sm text-slate-400">Couldn’t make the picture. You can still share the link below.</p>
          ) : (
            <p className="text-sm text-slate-400 motion-safe:animate-pulse">Making your card…</p>
          )}
        </div>

        {choices && (
          <MakeItYours choices={choices} busy={saving} onChoose={choose} />
        )}

        <div className="flex flex-col gap-3">
          {canShareFiles ? (
            <button type="button" onClick={shareImage} className={PRIMARY_BUTTON}>
              <Share2 className="w-5 h-5" aria-hidden="true" /> Share image
            </button>
          ) : (
            <button type="button" onClick={saveImage} disabled={status !== 'ready'} className={PRIMARY_BUTTON}>
              <Download className="w-5 h-5" aria-hidden="true" /> Save image
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            {canShareFiles ? (
              <button type="button" onClick={saveImage} className={GHOST_BUTTON}>
                <Download className="w-4 h-4" aria-hidden="true" /> Save image
              </button>
            ) : null}
            <button type="button" onClick={copyLink} className={`${GHOST_BUTTON} ${canShareFiles ? '' : 'col-span-2'}`}>
              <Link2 className="w-4 h-4" aria-hidden="true" /> Copy link
            </button>
          </div>
          <p className="flex items-center justify-center gap-6 text-sm text-slate-400">
            Send the link:
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={TEXT_BUTTON_SM}>WhatsApp</a>
            <a href={xPost} target="_blank" rel="noopener noreferrer" className={TEXT_BUTTON_SM}>X</a>
          </p>
          <p role="status" className="min-h-5 text-center text-sm text-slate-300">{note}</p>
        </div>
      </div>
      {/* The picture's original, drawn off screen at its real size to be photographed */}
      <div aria-hidden="true" className="fixed top-0 left-[-20000px] pointer-events-none">
        <ShareImage ref={imageRef} card={card} />
      </div>
    </>
  );
};

const ShareCardDialog = ({ open, onClose, card, url, title, text, customize }) => {
  const dialogRef = useRef(null);

  // Opening and closing the native dialog (it handles Escape and the page behind)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // A click on the dim backdrop (the dialog element itself, outside its box) closes it
      onClick={(e) => e.target === dialogRef.current && onClose()}
      aria-labelledby="share-card-title"
      className="m-auto w-[min(440px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-sm border border-slate-600 bg-slate-900 p-0 text-white backdrop:bg-slate-950/80"
    >
      {open && <ShareCardBody onClose={onClose} card={card} url={url} title={title} text={text} customize={customize} />}
    </dialog>
  );
};

export default ShareCardDialog;
