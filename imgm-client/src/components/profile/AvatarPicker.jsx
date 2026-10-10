/**
 * AvatarPicker — a grid of ready-made character avatars (famous game characters).
 * Used on the Welcome screen (pick one with your gamer tag) and on your profile.
 */
import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { getAvatarPresets } from '../../lib/api';

const AvatarPicker = ({ selected, onPick, size = 'w-14 h-14' }) => {
  const [presets, setPresets] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    getAvatarPresets(controller.signal).then(setPresets).catch(() => setPresets([]));
    return () => controller.abort();
  }, []);

  if (!presets) return <div className="h-32 rounded-2xl bg-slate-900/50 animate-pulse" />;
  return (
    <ul className="flex flex-wrap gap-2.5" aria-label="Character avatars">
      {presets.map((preset) => {
        const active = selected === preset.key;
        return (
          <li key={preset.key}>
            <button
              type="button"
              onClick={() => onPick(preset.key)}
              aria-pressed={active}
              title={`${preset.name} · ${preset.game}`}
              className={`relative block rounded-full transition ${active ? 'ring-2 ring-brand ring-offset-2 ring-offset-slate-900' : 'hover:scale-105 opacity-90 hover:opacity-100'}`}
            >
              <img src={preset.url} alt={preset.name} loading="lazy" className={`${size} rounded-full object-cover object-top bg-slate-800`} />
              {active && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full grid place-items-center bg-brand text-slate-950">
                  <Check className="w-3 h-3" aria-hidden="true" />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default AvatarPicker;
