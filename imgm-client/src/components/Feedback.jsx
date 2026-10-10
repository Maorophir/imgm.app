/**
 * Feedback — a floating "Feedback" button (hidden on Play Next, whose chat fills the
 * screen) and the form it opens: bug / idea / other + a message. The page it was sent
 * from goes along. Anything can open the form: openFeedback() (the footer and the
 * player menu use it).
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bug, Lightbulb, MessageSquare, MessageSquarePlus, X } from 'lucide-react';
import { sendFeedback } from '../lib/api';

const OPEN_EVENT = 'imgm:open-feedback';
// eslint-disable-next-line react-refresh/only-export-components
export const openFeedback = () => window.dispatchEvent(new Event(OPEN_EVENT));

const KINDS = [
  { value: 'bug', label: 'Something broke', Icon: Bug },
  { value: 'idea', label: 'An idea', Icon: Lightbulb },
  { value: 'other', label: 'Other', Icon: MessageSquare },
];

const Feedback = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('bug');
  const [message, setMessage] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');

  useEffect(() => {
    const show = () => {
      setOpen(true);
      setState('idle');
    };
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = async (e) => {
    e.preventDefault();
    setState('sending');
    try {
      await sendFeedback({ kind, message: message.trim(), page: location.pathname });
      setState('sent');
      setMessage('');
    } catch (err) {
      setError(err.message || "Couldn't send it. Please try again.");
      setState('error');
    }
  };

  const floating = !location.pathname.startsWith('/play-next');

  return (
    <>
      {floating && !open && (
        <button
          type="button"
          onClick={openFeedback}
          aria-label="Send feedback"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 p-3 sm:px-4 sm:py-2.5 rounded-full bg-slate-900/95 border border-slate-700 text-sm font-bold text-slate-200 shadow-xl shadow-black/40 hover:text-white hover:border-brand/60 transition"
        >
          <MessageSquarePlus className="w-5 h-5 sm:w-4 sm:h-4 text-brand" aria-hidden="true" />
          <span className="hidden sm:inline">Feedback</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 id="feedback-title" className="text-xl font-black text-white">Send feedback</h2>
                <p className="text-sm text-slate-400 mt-1">IMGM is in beta. Every bug and idea helps.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {state === 'sent' ? (
              <div className="text-center py-6">
                <p className="text-lg font-bold text-white">Thanks, got it!</p>
                <p className="text-sm text-slate-400 mt-1">It's on its way to the IMGM team.</p>
                <button type="button" onClick={() => setOpen(false)} className="mt-5 px-5 py-2.5 rounded-full font-bold bg-brand text-slate-950 hover:brightness-110 transition">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={send} className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="What kind of feedback">
                  {KINDS.map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={kind === value}
                      onClick={() => setKind(value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition ${
                        kind === value ? 'bg-brand/15 border-brand text-white' : 'border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${kind === value ? 'text-brand' : ''}`} aria-hidden="true" /> {label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder={kind === 'bug' ? 'What happened, and what did you expect?' : "Tell us what's on your mind…"}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 focus:border-brand outline-none p-3 text-sm text-white placeholder:text-slate-500"
                />
                {state === 'error' && <p className="text-sm text-red-300">{error}</p>}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">Sent with this page's address.</span>
                  <button
                    type="submit"
                    disabled={message.trim().length < 5 || state === 'sending'}
                    className="px-5 py-2.5 rounded-full font-bold bg-brand text-slate-950 hover:brightness-110 transition disabled:opacity-40"
                  >
                    {state === 'sending' ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Feedback;
