/**
 * ⑥ It's like ___ meets ___ — pick two games this one reminds you of.
 */
import GamePicker from '../GamePicker';

const MeetsStep = ({ answers, update, game }) => {
  const { comparedA: a, comparedB: b } = answers;

  return (
    <div>
      <p className="text-slate-400 text-sm mb-4">
        Describe <span className="text-white font-semibold">{game.title}</span> as a mix of two other games.
      </p>

      <div className="grid sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
        <GamePicker
          value={a}
          onChange={(g) => update({ comparedA: g })}
          excludeIds={[game.id, b?.id]}
          placeholder="First game…"
        />
        <span className="text-center font-black uppercase tracking-widest text-sm text-blue-300">meets</span>
        <GamePicker
          value={b}
          onChange={(g) => update({ comparedB: g })}
          excludeIds={[game.id, a?.id]}
          placeholder="Second game…"
        />
      </div>

      {/* Live preview of the sentence */}
      {(a || b) && (
        <p className="mt-6 text-center text-lg text-slate-300 animate-fade-in">
          “{game.title} is like <span className="text-white font-bold">{a?.title ?? '___'}</span>
          {' '}meets <span className="text-white font-bold">{b?.title ?? '___'}</span>”
        </p>
      )}
    </div>
  );
};

export default MeetsStep;
