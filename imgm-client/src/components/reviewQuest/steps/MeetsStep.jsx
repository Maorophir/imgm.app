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
        <span className="text-center text-sm font-medium text-slate-400">meets</span>
        <GamePicker
          value={b}
          onChange={(g) => update({ comparedB: g })}
          excludeIds={[game.id, a?.id]}
          placeholder="Second game…"
        />
      </div>

      {/* Live preview of the sentence */}
      {(a || b) && (
        // Their words, so the review-quote serif
        <p className="mt-6 text-center font-serif italic text-[21px] leading-[1.35] text-slate-300 animate-fade-in">
          “{game.title} is like <span className="text-white">{a?.title ?? '___'}</span>
          {' '}meets <span className="text-white">{b?.title ?? '___'}</span>”
        </p>
      )}
    </div>
  );
};

export default MeetsStep;
