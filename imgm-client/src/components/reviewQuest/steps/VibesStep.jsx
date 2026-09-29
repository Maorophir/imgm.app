/**
 * ③ Vibe check — pick up to 3 moods.
 */
import { Chip } from '../Choice';
import { VIBES, MAX_VIBES } from '../questOptions';

const VibesStep = ({ answers, update }) => {
  const picked = answers.vibes;
  const full = picked.length >= MAX_VIBES;

  const toggle = (vibe) =>
    update({
      vibes: picked.includes(vibe)
        ? picked.filter((v) => v !== vibe) // un-pick
        : full ? picked : [...picked, vibe], // pick (if there's room)
    });

  return (
    <div>
      <p className="text-slate-400 text-sm mb-4">
        How does it <span className="text-white font-semibold">feel</span> to play? Pick up to {MAX_VIBES}.
        <span className="ml-2 font-bold tabular-nums text-blue-300">{picked.length}/{MAX_VIBES}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {VIBES.map((v) => (
          <Chip
            key={v.value}
            {...v}
            selected={picked.includes(v.value)}
            disabled={full && !picked.includes(v.value)}
            onClick={() => toggle(v.value)}
          />
        ))}
      </div>
    </div>
  );
};

export default VibesStep;
