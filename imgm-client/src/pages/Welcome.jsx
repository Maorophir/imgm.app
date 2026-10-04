/**
 * Welcome — the one-time "Choose your gamer tag" screen. Route: /welcome
 *
 * Logged-in users without a tag are sent here (see GamerTagGate) before using
 * the site, then back to where they were going (?redirect=…). The tag is what
 * everyone sees on their reviews; their real name stays private.
 */
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../lib/authClient';
import { setUsername } from '../lib/api';
import { safeRedirect } from '../lib/safeRedirect';
import GamerTagField from '../components/GamerTagField';
import { useGamerTagCheck } from '../hooks/useGamerTagCheck';

// A few fun ideas for people who can't think of a name
const ADJECTIVES = ['Pixel', 'Shadow', 'Turbo', 'Cosmic', 'Rogue', 'Silent', 'Lucky', 'Frost', 'Neon', 'Arcane'];
const NOUNS = ['Paladin', 'Ranger', 'Goblin', 'Wizard', 'Drifter', 'Knight', 'Raccoon', 'Phoenix', 'Bard', 'Golem'];
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const suggestTags = () =>
  Array.from({ length: 3 }, () => `${pick(ADJECTIVES)}${pick(NOUNS)}${Math.floor(10 + Math.random() * 90)}`);

const Welcome = () => {
  const { data: session, isPending, refetch } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get('redirect'));

  const [name, setName] = useState('');
  const [ideas, setIdeas] = useState(suggestTags);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const check = useGamerTagCheck(name);

  if (isPending) return <div className="min-h-[70vh] animate-pulse" />;
  if (!session) return <Navigate to="/login" replace />;
  // Already has a tag (e.g. opened /welcome directly) → nothing to do here
  if (session.user.displayUsername && !saving) return <Navigate to={redirectTo} replace />;

  const save = async (e) => {
    e.preventDefault();
    if (!check.ok) return;
    setSaving(true);
    setError(null);
    try {
      await setUsername(name.trim());
      await refetch(); // the session now includes the new tag
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Couldn't save your tag. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
      <form
        onSubmit={save}
        className="w-full max-w-md bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl shadow-black/50 p-7 flex flex-col gap-5 animate-fade-in"
      >
        <div className="text-center">
          <p className="text-5xl mb-2" aria-hidden="true">🎮</p>
          <h1 className="text-2xl font-black text-white">Choose your gamer tag</h1>
          <p className="text-slate-400 text-sm mt-1.5">
            It’s the name everyone sees on your reviews. Your real name stays private.
          </p>
        </div>

        <GamerTagField value={name} onChange={setName} check={check} autoFocus />

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Need an idea?</p>
          <div className="flex flex-wrap gap-2">
            {ideas.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => setName(idea)}
                className="px-3 py-1.5 rounded-full text-sm font-semibold bg-slate-800/70 border border-slate-700/60 text-slate-200 hover:border-brand/70 hover:text-white transition"
              >
                {idea}
              </button>
            ))}
            <button type="button" onClick={() => setIdeas(suggestTags())} className="px-2 text-sm font-bold text-white hover:text-brand" aria-label="More ideas">
              ↻
            </button>
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5">{error}</p>}

        <button
          type="submit"
          disabled={!check.ok || saving}
          className="py-3.5 rounded-2xl font-bold bg-brand hover:brightness-110 text-slate-950 shadow-[0_8px_24px_-8px_var(--color-brand)] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : "Let's go →"}
        </button>
      </form>
    </div>
  );
};

export default Welcome;
