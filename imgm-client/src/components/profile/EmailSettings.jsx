/**
 * EmailSettings — Settings → Emails (/settings#emails): the three emails a player can
 * choose, every one off until they switch it on, and "Unsubscribe from all". Account
 * emails (password resets) aren't here: those always come.
 *
 * A switch saves as soon as it's flipped (and flips back if that fails). An unconfirmed
 * email address can choose too, but nothing is sent until it's confirmed (the Email part
 * above has "Send the email again").
 */
import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getEmailSettings, setEmailSettings } from '../../lib/api';
import { GHOST_BUTTON_SM } from '../../lib/ui';
import SwitchTrack from '../SwitchTrack';

const PANEL = 'bg-slate-900 border border-slate-700 rounded-sm p-6 flex flex-col';
const PANEL_LABEL = 'inline-flex items-center gap-2 text-sm text-slate-400';

const CHOICES = [
  { key: 'weekly', name: 'Weekly roundup', what: "Sundays: the Game of the Week, your backlog games that came out, and the week's most helpful review." },
  { key: 'releases', name: 'Release radar', what: 'The day a game in your backlog comes out.' },
  { key: 'replies', name: 'Replies and likes', what: 'When someone answers your comment or finds your review helpful, if you haven’t seen it on the site. One email a day at most.' },
];
const ALL_OFF = { weekly: false, releases: false, replies: false };

const EmailSettings = () => {
  const [settings, setSettings] = useState(null);
  const [problem, setProblem] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    getEmailSettings(controller.signal).then(setSettings).catch(() => {});
    return () => controller.abort();
  }, []);

  // Shows the change at once, puts it back if the server says no
  const save = async (change) => {
    const before = settings;
    setSettings((s) => ({ ...s, ...change }));
    setProblem(null);
    try {
      setSettings(await setEmailSettings(change));
    } catch {
      setSettings(before);
      setProblem("Couldn't save that. Please try again.");
    }
  };

  if (!settings) return null;
  const anyOn = CHOICES.some((c) => settings[c.key]);
  return (
    <div id="emails" className={`${PANEL} gap-1 scroll-mt-24`}>
      <p className={PANEL_LABEL}><Mail className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /> Emails</p>
      <p className="text-sm text-slate-300 mt-1 mb-2">
        All off until you switch one on, and never more than two a week. Account emails, like password resets, always come.
      </p>
      {!settings.verified && (
        <p className="text-sm text-slate-300 mb-2">Confirm your email address above first: until then, none of these are sent.</p>
      )}
      {CHOICES.map((choice) => (
        <button
          key={choice.key}
          type="button"
          role="switch"
          aria-checked={settings[choice.key]}
          onClick={() => save({ [choice.key]: !settings[choice.key] })}
          className="flex items-start justify-between gap-6 py-4 border-t border-slate-700 text-left"
        >
          <span>
            <span className="block font-medium text-white">{choice.name}</span>
            <span className="block text-sm text-slate-400 mt-1">{choice.what}</span>
          </span>
          <SwitchTrack on={settings[choice.key]} />
        </button>
      ))}
      {problem && <p role="alert" className="text-sm text-red-300">{problem}</p>}
      {anyOn && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-700">
          <span className="text-sm text-slate-300">Stop every email but account ones</span>
          <button type="button" onClick={() => save(ALL_OFF)} className={GHOST_BUTTON_SM}>Unsubscribe from all</button>
        </div>
      )}
    </div>
  );
};

export default EmailSettings;
