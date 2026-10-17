/**
 * AvatarPicker — a grid of ready-made avatars: IMGM's 24 original characters (each a
 * nod to a kind of game, drawn for IMGM; the pictures come from our own server).
 * Used on the Welcome screen (pick one with your gamer tag) and on your profile.
 *
 * Props:
 *   selected  the key of the picked character, if any
 *   onPick    called with a character's key
 *   onUpload  optional: puts an "Upload" circle first in the grid (your profile), for
 *             your own photo
 *   busy      true while a picture is being saved (everything waits)
 *   size      the circles' size classes
 */
import { useEffect, useState } from 'react';
import { Check, ImagePlus } from 'lucide-react';
import { API_BASE, getAvatarPresets } from '../../lib/api';

const AvatarPicker = ({ selected, onPick, onUpload, busy = false, size = 'w-14 h-14' }) => {
  const [presets, setPresets] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    getAvatarPresets(controller.signal).then(setPresets).catch(() => setPresets([]));
    return () => controller.abort();
  }, []);

  if (!presets) return <div className="h-32 rounded-sm bg-slate-900 motion-safe:animate-pulse" />;
  return (
    <ul className="flex flex-wrap gap-2.5" aria-label="Character avatars">
      {onUpload && (
        <li>
          <button
            type="button"
            onClick={onUpload}
            disabled={busy}
            title="Upload your own photo"
            className={`${size} rounded-full grid place-items-center content-center gap-0.5 border border-dashed border-slate-400 text-white hover:border-white hover:bg-slate-800 transition-colors duration-120 disabled:opacity-50`}
          >
            <ImagePlus className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
            <span className="text-[10px] font-medium leading-none">Upload</span>
          </button>
        </li>
      )}
      {presets.map((preset) => {
        const active = selected === preset.key;
        return (
          <li key={preset.key}>
            <button
              type="button"
              onClick={() => onPick(preset.key)}
              disabled={busy}
              aria-pressed={active}
              title={preset.name}
              // The picked one gets an ivory ring and a tick (no lime: that's each page's main action's)
              className={`relative block rounded-full transition-[opacity,box-shadow] duration-120 ${active ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-85 hover:opacity-100'}`}
            >
              <img src={`${API_BASE}${preset.url}`} alt={preset.name} loading="lazy" className={`${size} rounded-full object-cover bg-slate-800`} />
              {active && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full grid place-items-center bg-white text-slate-950">
                  <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" />
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
