/**
 * ShareCardButton — a quiet text button, "Share card", that shares a card's link (or,
 * with `label`, any page's: "Share profile" on a player's profile).
 *
 * With `card`, it opens the share window (ShareCardDialog): the card as a picture to
 * share or save, plus the link. Without one (e.g. "Share profile") it shares the link:
 * the device's own share sheet on phones, elsewhere the link copied to the clipboard
 * with "Link copied" for two seconds.
 *
 * Props:
 *   url        the page to share, e.g. "/game/1942?review=abc#review-abc". A path is
 *              turned into a full address on this site. Defaults to the current page.
 *   title      the share sheet's title, e.g. "IamHonie's card for Hollow Knight: Silksong"
 *   text       a line to go with the link, e.g. "10/10, Legendary on IMGM"
 *   label      the button's words (default "Share card"), e.g. "Share profile"
 *   card       CollectibleCard props: share the card as a picture (see above)
 *   className  placement
 */
import { useEffect, useState } from 'react';
import { TEXT_BUTTON } from '../lib/ui';
import ShareCardDialog from './share/ShareCardDialog';

const COPIED_FOR = 2000; // ms "Link copied" stays up

const ShareCardButton = ({ url, title, text, label = 'Share card', card, className = '' }) => {
  // 'idle', 'copied', or 'failed' (the clipboard said no)
  const [status, setStatus] = useState('idle');
  const [dialogOpen, setDialogOpen] = useState(false);

  // "Link copied" (or the failure) goes back to the label after two seconds
  useEffect(() => {
    if (status === 'idle') return;
    const timer = setTimeout(() => setStatus('idle'), COPIED_FOR);
    return () => clearTimeout(timer);
  }, [status]);

  const share = async () => {
    if (card) {
      setDialogOpen(true); // the card as a picture, and every way to send it
      return;
    }
    const link = new URL(url ?? window.location.href, window.location.origin).href;

    if (navigator.share) {
      try {
        await navigator.share({ url: link, title, text });
        return;
      } catch (err) {
        // Closing the share sheet isn't an error. Anything else: copy the link instead.
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(link);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  };

  const message = status === 'copied' ? 'Link copied' : status === 'failed' ? 'Couldn’t copy the link' : '';

  return (
    <>
      <button
        type="button"
        onClick={share}
        className={`${TEXT_BUTTON} ${className}`}
      >
        {message || label}
      </button>
      {/* Says the result out loud for screen readers (the button's new label alone isn't announced) */}
      <span role="status" className="sr-only">{message}</span>
      {card && (
        <ShareCardDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          card={card}
          url={url}
          title={title}
          text={text}
        />
      )}
    </>
  );
};

export default ShareCardButton;
