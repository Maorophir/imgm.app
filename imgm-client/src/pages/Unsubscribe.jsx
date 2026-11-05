/**
 * Unsubscribe — Route: /unsubscribe?token=…
 *
 * Where every opt-in email's "Unsubscribe" link lands: it switches off all of them at
 * once, no login needed (the link's token says whose). That's the one click: opening
 * the page does it, then says so and offers Undo, which puts back exactly what was on.
 * Mail apps' own Unsubscribe button (the List-Unsubscribe header) reaches the server
 * directly and never opens this page.
 *
 * Done by the page's script rather than by opening the address, so a mail filter that
 * checks links in advance can't unsubscribe anyone by accident.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resubscribe, unsubscribeAll } from '../lib/api';
import { GHOST_BUTTON, TEXT_LINK } from '../lib/ui';

function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState(token ? 'working' : 'broken'); // working | done | undone | broken
  const [was, setWas] = useState(null); // what was on, for Undo
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return; // once, even when React runs effects twice
    started.current = true;
    unsubscribeAll(token)
      .then((r) => {
        setWas(r.was);
        setState('done');
      })
      .catch(() => setState('broken'));
  }, [token]);

  const undo = async () => {
    try {
      await resubscribe(token, was);
      setState('undone');
    } catch {
      setState('broken');
    }
  };

  const wasOn = was && Object.values(was).some(Boolean);
  const [title, words] = {
    working: ['Unsubscribing…', ''],
    done: ['You’re unsubscribed', wasOn ? 'IMGM won’t email you anymore, except account emails like password resets.' : 'You weren’t getting any IMGM emails, and you won’t: only account emails, like password resets.'],
    undone: ['Your emails are back on', 'Everything you had chosen is switched on again.'],
    broken: ['This link doesn’t work', 'It may be old or cut short. You can still switch off every email in Settings → Emails.'],
  }[state];

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 flex flex-col gap-4">
      <h1 className="font-display text-[44px] sm:text-[54px] leading-[.95] tracking-[.005em] text-white">{title}</h1>
      {words && <p role="status" className="text-slate-300">{words}</p>}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-2">
        {state === 'done' && wasOn && (
          <button type="button" onClick={undo} className={GHOST_BUTTON}>Undo</button>
        )}
        {state !== 'working' && (
          <Link to="/settings#emails" className={`font-medium text-white ${TEXT_LINK}`}>Choose which emails</Link>
        )}
      </div>
    </div>
  );
}

export default Unsubscribe;
