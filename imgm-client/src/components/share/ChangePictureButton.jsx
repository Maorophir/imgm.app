/**
 * ChangePictureButton — "Change picture" beside your own review's card: a small window
 * with the game's pictures (cover, artworks, screenshots). Tapping one saves it to the
 * review, so the card looks the same everywhere (game page, profile, shared picture),
 * and onChange({ art, quote }) lets the page update its copy at once.
 *
 * Props:
 *   gameId     the reviewed game
 *   onChange   ({ art, quote }) => …
 *   small      the small text size
 *   className  placement
 */
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import PictureChoices from './PictureChoices';
import { getMyCard, setMyCard } from '../../lib/api';
import { TEXT_BUTTON, TEXT_BUTTON_SM } from '../../lib/ui';

// The window's contents, made anew on every opening (so the choices are fresh)
const Choices = ({ gameId, onChange, onClose }) => {
  const [choices, setChoices] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    getMyCard(gameId, controller.signal).then(setChoices).catch((err) => err.name !== 'AbortError' && setFailed(true));
    return () => controller.abort();
  }, [gameId]);

  const choose = async (art) => {
    setBusy(true);
    try {
      const saved = await setMyCard(gameId, { art });
      setChoices(saved);
      onChange?.({ art: saved.art, quote: saved.quote });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="change-picture-title" className="font-display text-[28px] leading-none text-white">Your card’s picture</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 -mr-2 grid place-items-center text-slate-400 hover:text-white">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
      {choices ? (
        <PictureChoices pictures={choices.pictures} current={choices.art} busy={busy} onChoose={choose} />
      ) : (
        <div className="h-16 rounded-sm bg-slate-800 motion-safe:animate-pulse" />
      )}
      <p role="status" className="text-sm text-slate-400">
        {failed ? 'Couldn’t save that. Please try again.' : 'The cover, the game’s art or a screenshot. Your card changes everywhere.'}
      </p>
    </div>
  );
};

const ChangePictureButton = ({ gameId, onChange, small = false, className = '' }) => {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${small ? TEXT_BUTTON_SM : TEXT_BUTTON} ${className}`}>
        Change picture
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialogRef.current && setOpen(false)}
        aria-labelledby="change-picture-title"
        className="m-auto w-[min(520px,calc(100vw-32px))] rounded-sm border border-slate-600 bg-slate-900 p-0 text-white backdrop:bg-slate-950/80"
      >
        {open && <Choices gameId={gameId} onChange={onChange} onClose={() => setOpen(false)} />}
      </dialog>
    </>
  );
};

export default ChangePictureButton;
