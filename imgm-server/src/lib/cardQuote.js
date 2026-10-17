/**
 * The words on a review's card: one sentence of the review (never words it doesn't
 * contain). The player can choose it; until then the most quotable one is picked.
 *
 * Thorough reviews tend to open with the setup ("At first I was bored, the opening is
 * slow…") and get to the verdict later, so the first line is often the worst one to put
 * on a card. Each sentence is scored instead:
 *   - a good length for a card (about 40-160 characters)
 *   - verdict words (best, love, masterpiece, hooked, every…) count for it
 *   - setup openers (At first, Initially, When I started, I was skeptical…) count
 *     against it
 *   - later sentences get a small lift: reviews usually end on their conclusion
 *
 * A choice is stored as the sentence's position, so masked swearing stays masked on
 * the card and a rewritten review simply falls back to the automatic pick.
 */
export const CARD_QUOTE_MAX = 220; // characters; longer sentences are cut with "…"

// "First. Second! Third?" → ['First.', 'Second!', 'Third?'] (line breaks split too)
export const sentencesOf = (text) =>
  (text ?? '')
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

const SETUP = /^(at first|initially|in the beginning|when i (first )?(started|began|bought|got)|i (was|went in) (skeptical|sceptical|unsure|doubtful|hesitant)|going in|before (playing|i played)|so,? |ok(ay)?,? |well,? |honestly,? at first|i('ve| have) been (waiting|playing)|let me|to be honest,? at first)/i;
const VERDICT = /\b(best|love[ds]?|loving|masterpiece|incredible|amazing|brilliant|beautiful|perfect|hooked|unforgettable|stunning|gorgeous|addictive|worth|favou?rite|every|never|still|must[- ]play|goty|peak|banger|gem|worst|boring|broken|disappointing|waste)\b/i;

const score = (sentence, index, count) => {
  const length = sentence.length;
  let points = 0;
  points += length >= 40 && length <= 160 ? 3 : length >= 20 && length <= CARD_QUOTE_MAX ? 1 : -2;
  if (VERDICT.test(sentence)) points += 3;
  if (SETUP.test(sentence)) points -= 4;
  if (/\bbut\b/i.test(sentence) && index === 0) points -= 1; // "At first X, but…" openers
  points += count > 1 ? (index / (count - 1)) * 1.5 : 0;
  return points;
};

// The position of the most quotable sentence (null when there are no words)
export const pickQuoteIndex = (text) => {
  const sentences = sentencesOf(text);
  if (sentences.length === 0) return null;
  let best = 0;
  sentences.forEach((sentence, i) => {
    if (score(sentence, i, sentences.length) > score(sentences[best], best, sentences.length)) best = i;
  });
  return best;
};

const fit = (sentence) => (sentence.length > CARD_QUOTE_MAX ? `${sentence.slice(0, CARD_QUOTE_MAX - 1).trimEnd()}…` : sentence);

// The card's words: the chosen sentence while it still exists, else the automatic pick
export const cardQuoteOf = (text, chosen) => {
  const sentences = sentencesOf(text);
  if (sentences.length === 0) return null;
  const index = Number.isInteger(chosen) && chosen >= 0 && chosen < sentences.length ? chosen : pickQuoteIndex(text);
  return fit(sentences[index]);
};
