/**
 * RaritySection — "Your score sets the rarity." The home page's short lesson in what a
 * review's score does: a real review card from the last few days beside the ladder of
 * the six tiers on the 1–10 scale.
 *
 * The ladder: one row per tier, highest first. Each row shows the ten scores as cells
 * with the tier's own cells painted in its edge colour, then its mark, name and range.
 * With no review to show, the ladder stands alone.
 *
 * Props:
 *   card     CollectibleCard props for the example review (with its quote), or null
 *   loading  true while the reviews are on their way: a quiet placeholder keeps the
 *            card's space, so the ladder doesn't jump when the card arrives
 */
import CardStage from '../CardStage';
import CollectibleCard from '../CollectibleCard';
import RarityMark from '../RarityMark';
import { RARITIES, getRarity } from '../reviewQuest/questOptions';
import { WRAP, SECTION_TITLE } from '../../lib/ui';

const SCORES = Array.from({ length: 10 }, (_, i) => i + 1);
// Highest tier first, like a trophy shelf
const LADDER = [...RARITIES].reverse();

// The ladder's two columns: the ten score cells, then the tier. On phones the tier gets
// the room its name needs and the cells take the rest; from tablets up the cells stop
// at 240px. Every row shares these columns (subgrid), so the scores line up over them.
const LADDER_GRID =
  'grid grid-cols-[minmax(120px,1fr)_auto] gap-x-4 sm:grid-cols-[minmax(120px,240px)_minmax(0,1fr)] sm:gap-x-7';
const ROW = 'col-span-2 grid grid-cols-subgrid';
// The cells: ten equal blocks with a hairline of page showing between them
const CELLS = 'grid grid-cols-10 gap-[3px]';

const RaritySection = ({ card, loading }) => {
  const withCard = Boolean(card) || loading;

  return (
    <section aria-labelledby="rarity-title" className="mt-10 sm:mt-12">
      <div className={WRAP}>
        {/* Desktop: the card on the left, the words and ladder on the right. Smaller
            screens: the words first, then the card. */}
        <div className={withCard ? 'grid gap-y-16 items-center lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-12 xl:gap-x-16' : ''}>
          <div className="min-w-0 lg:col-start-2 lg:row-start-1">
            <h2 id="rarity-title" className={SECTION_TITLE}>
              Your score sets the rarity.
            </h2>
            <p className="mt-6 max-w-[520px] text-base leading-[1.6] text-white">
              Every review ends with a card. The score you give decides how rare it is, from Junk at 1–2 up to
              Legendary, which only a 10 earns.
            </p>

            <div className={`mt-12 max-w-[600px] ${LADDER_GRID}`}>
              {/* The scores over the cells (decoration: each row says its range in words) */}
              <div aria-hidden="true" className={`${ROW} mb-0.5`}>
                <span className={`${CELLS} text-xs leading-normal tabular-nums text-center text-slate-400`}>
                  {SCORES.map((score) => <span key={score}>{score}</span>)}
                </span>
              </div>
              <ul aria-label="Rarity by score, highest first" className={ROW}>
                {LADDER.map((tier) => (
                  <li
                    key={tier.key}
                    className={`${ROW} items-center min-h-11`}
                    style={{ '--ink': tier.color, '--edge': tier.edge }}
                  >
                    <span aria-hidden="true" className={`${CELLS} h-2`}>
                      {SCORES.map((score) => (
                        <span key={score} className={getRarity(score).key === tier.key ? 'bg-(--edge)' : 'bg-slate-700'} />
                      ))}
                    </span>
                    <span className="flex items-center gap-3 min-w-0">
                      <RarityMark tier={tier.key} className="text-(--ink)" />
                      <span className="w-24 shrink-0 text-base leading-[1.2] text-white">{tier.label}</span>
                      <span className="text-xs leading-[1.2] tabular-nums text-slate-400">{tier.range}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {withCard && (
            <div className="lg:col-start-1 lg:row-start-1 justify-self-start w-[min(380px,100%)]">
              {card ? (
                // Standing straight (no resting angle), with a slightly gentler lean
                <CardStage tier={getRarity(card.score).key} rest={0} maxTilt={10} front={<CollectibleCard {...card} />} />
              ) : (
                <div aria-hidden="true" className="aspect-[63/88] rounded-[4.76%/3.41%] bg-slate-900 motion-safe:animate-pulse" />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default RaritySection;
