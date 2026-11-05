/**
 * CompareInvite — on your own profile: "Compare your taste with a friend" and the button
 * that copies your compare link (imgm.app/compare/<your tag>). A friend who opens it
 * rates a few of your games with one tap each and sees how much you agree, so it's an
 * invite with a reason to sign up.
 *
 * Props:
 *   name        your gamer tag
 *   hasReviews  whether you've rated anything yet (the link has nothing to show without)
 */
import { useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';
import { PRIMARY_BUTTON } from '../../lib/ui';

const COPIED_FOR = 2000; // ms "Link copied" stays up

const CompareInvite = ({ name, hasReviews }) => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'copied' | 'failed'

  useEffect(() => {
    if (status === 'idle') return undefined;
    const timer = setTimeout(() => setStatus('idle'), COPIED_FOR);
    return () => clearTimeout(timer);
  }, [status]);

  const link = `${window.location.origin}/compare/${encodeURIComponent(name)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setStatus('copied');
    } catch {
      setStatus('failed'); // the clipboard said no: the link is written out below
    }
  };

  return (
    <section aria-labelledby="compare-invite-title" className="border border-slate-600 bg-slate-900 rounded-sm p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
      <div className="flex-1 min-w-0">
        <h2 id="compare-invite-title" className="font-semibold text-lg text-white">Compare your taste with a friend</h2>
        <p className="text-sm text-slate-400 mt-1">
          {hasReviews
            ? 'Send them your link. They rate a few of your games with one tap each and see how much you agree.'
            : 'Rate a few games first: your link asks friends to rate the games you rated.'}
        </p>
        {status === 'failed' && <p className="text-sm text-slate-300 mt-2 break-all select-all">{link}</p>}
      </div>
      {hasReviews && (
        <button type="button" onClick={copy} className={`${PRIMARY_BUTTON} self-start sm:self-auto`} aria-live="polite">
          <Share2 className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
          {status === 'copied' ? 'Link copied' : 'Copy my link'}
        </button>
      )}
    </section>
  );
};

export default CompareInvite;
