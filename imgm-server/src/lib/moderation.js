/**
 * Moderation — profanity handling for display names and reviews.
 *
 * Built on the `obscenity` library, which already catches common tricks
 * (leetspeak like "sh1t", repeated letters like "fuuuck", mixed case) while
 * avoiding classic false alarms ("Scunthorpe", "assassin", "shiitake").
 *
 * IMGM's policy:
 *   - Display names: no profanity at all (hasProfanity).
 *   - Reviews: slurs & hate are blocked (hasSlur); casual swearing is allowed
 *     but shown masked by default, e.g. "f***" (maskProfanity).
 */
import {
  DataSet, RegExpMatcher, TextCensor, englishDataset, englishRecommendedTransformers,
  parseRawPattern, keepStartCensorStrategy, asteriskCensorStrategy,
} from 'obscenity';

// Slurs from obscenity's English list: blocked in reviews (and in names).
const SLURS = [
  'abeed', 'abo', 'africoon', 'arabush', 'boonga', 'chingchong', 'chink', 'dyke', 'fag',
  'kike', 'negro', 'nigger', 'retard', 'spastic', 'tranny',
];

// Hate terms blocked in NAMES only. Not blocked in reviews: people legitimately
// write about fighting Nazis in Wolfenstein or WW2 games.
const NAME_ONLY_BLOCKED = ['nazi', 'hitler', 'heil', 'kkk', 'gestapo'];

// Innocent words that contain a flagged word
const EXTRA_ALLOWED = ['cockpit', 'cocktail', 'peacock', 'hancock', 'shuttlecock', 'woodcock', 'gamecock'];

// One matcher per job, all sharing the same allow list and trick-catching transformers
const buildMatcher = (dataset) => {
  const built = dataset.build();
  return new RegExpMatcher({
    ...built,
    whitelistedTerms: [...built.whitelistedTerms, ...EXTRA_ALLOWED],
    ...englishRecommendedTransformers,
  });
};

const withExtraWords = (dataset, words) => {
  for (const word of words) {
    dataset.addPhrase((phrase) => phrase.setMetadata({ originalWord: word }).addPattern(parseRawPattern(word)));
  }
  return dataset;
};

// Names: everything, plus the name-only hate terms
const nameMatcher = buildMatcher(withExtraWords(new DataSet().addAll(englishDataset), NAME_ONLY_BLOCKED));
// Reviews, masking: every word in the English list
const textMatcher = buildMatcher(new DataSet().addAll(englishDataset));
// Reviews, blocking: only the slurs
const slurMatcher = buildMatcher(
  new DataSet().addAll(englishDataset).removePhrasesIf((phrase) => !SLURS.includes(phrase.metadata?.originalWord))
);

// "fuck" → "f***": keep the first letter, stars for the rest
const censor = new TextCensor().setStrategy(keepStartCensorStrategy(asteriskCensorStrategy()));

/**
 * Names: does the text contain profanity?
 * `ignoreSeparators` also checks it with spaces/_/-/. removed, to catch "f_u_c_k".
 */
export const hasProfanity = (text, { ignoreSeparators = false } = {}) => {
  const value = String(text ?? '');
  if (nameMatcher.hasMatch(value)) return true;
  return ignoreSeparators && nameMatcher.hasMatch(value.replace(/[\s_\-.]+/g, ''));
};

// Reviews: does the text contain a slur? (→ refuse to post)
export const hasSlur = (text) => slurMatcher.hasMatch(String(text ?? ''));

// Reviews: the text with swearing masked ("this boss is f***ing hard")
export const maskProfanity = (text) => {
  const value = String(text ?? '');
  const matches = textMatcher.getAllMatches(value);
  return matches.length ? censor.applyTo(value, matches) : value;
};
