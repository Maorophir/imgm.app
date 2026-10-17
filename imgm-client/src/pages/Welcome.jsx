/**
 * Welcome — the one-time "Choose your gamer tag" screen. Route: /welcome
 *
 * Logged-in users without a tag are sent here (see GamerTagGate) before using
 * the site, then back to where they were going (?redirect=…). The tag is what
 * everyone sees on their reviews; their real name stays private.
 */
import { Gamepad2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../lib/authClient';
import { chooseAvatarPreset, setUsername } from '../lib/api';
import AvatarPicker from '../components/profile/AvatarPicker';
import { safeRedirect } from '../lib/safeRedirect';
import GamerTagField from '../components/GamerTagField';
import { useGamerTagCheck } from '../hooks/useGamerTagCheck';
import { AUTH_TITLE, buttonClass } from '../components/AuthCard';

// A few fun ideas for people who can't think of a name: two words, no numbers
// (a name that's already taken is flagged when picked, like any other)
const ADJECTIVES = [
  'Pixel', 'Shadow', 'Turbo', 'Cosmic', 'Rogue', 'Silent', 'Lucky', 'Frost', 'Neon', 'Arcane',
  'Crimson', 'Iron', 'Mystic', 'Wild', 'Stormy', 'Golden', 'Sneaky', 'Brave', 'Lunar', 'Solar',
  'Feral', 'Hidden', 'Rusty', 'Velvet', 'Ember',
];
const NOUNS = [
  'Paladin', 'Ranger', 'Goblin', 'Wizard', 'Drifter', 'Knight', 'Raccoon', 'Phoenix', 'Bard', 'Golem',
  'Ronin', 'Nomad', 'Wanderer', 'Fox', 'Dragon', 'Specter', 'Pilot', 'Alchemist', 'Owl', 'Hunter',
  'Rogue', 'Titan', 'Sprite', 'Corsair', 'Warden',
];
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const suggestTags = () => {
  const ideas = new Set();
  while (ideas.size < 3) {
    const [adjective, noun] = [pick(ADJECTIVES), pick(NOUNS)];
    if (adjective !== noun) ideas.add(`${adjective}${noun}`); // never "RogueRogue"
  }
  return [...ideas];
};

const Welcome = () => {
  const { data: session, isPending, refetch } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get('redirect'));

  const [name, setName] = useState('');
  const [ideas, setIdeas] = useState(suggestTags);
  const [avatar, setAvatar] = useState(null); // a character avatar (optional)
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
      if (avatar) await chooseAvatarPreset(avatar).catch(() => {}); // a bonus: never blocks the tag
      await refetch(); // the session now includes the new tag (and avatar)
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
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-sm p-7 flex flex-col gap-5 animate-fade-in"
      >
        <div className="text-center">
          <Gamepad2 className="mx-auto mb-4 w-8 h-8 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
          <h1 className={AUTH_TITLE}>Choose your gamer tag</h1>
          <p className="text-slate-400 text-sm">
            It’s the name everyone sees on your reviews. Your real name stays private.
          </p>
        </div>

        <GamerTagField value={name} onChange={setName} check={check} autoFocus />

        <div>
          <p className="text-sm text-slate-400 mb-2">Need an idea?</p>
          <div className="flex flex-wrap gap-2">
            {ideas.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => setName(idea)}
                className="h-9 px-3 rounded-sm text-sm font-medium border border-slate-500 text-white hover:border-white transition-colors duration-120"
              >
                {idea}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIdeas(suggestTags())}
              className="w-9 h-9 grid place-items-center rounded-sm text-slate-400 hover:text-white transition-colors duration-120"
              aria-label="More ideas"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div>
          <p className="text-sm text-slate-400 mb-2"><span className="font-medium text-white">Pick an avatar</span> (optional, change it any time)</p>
          <AvatarPicker selected={avatar} onPick={(key) => setAvatar((current) => (current === key ? null : key))} size="w-11 h-11" />
        </div>

        {error && <p role="alert" className="text-sm text-red-300 border border-red-400/50 rounded-sm px-4 py-2.5">{error}</p>}

        <button type="submit" disabled={!check.ok || saving} className={buttonClass}>
          {saving ? 'Saving…' : "Let's go"}
        </button>
      </form>
    </div>
  );
};

export default Welcome;
