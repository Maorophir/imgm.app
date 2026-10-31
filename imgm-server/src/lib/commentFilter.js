/**
 * What a Discover comment may not contain, checked before it's saved: links (spam's
 * favourite) and a short list of slurs and "kill yourself" (a short list on purpose:
 * swearing about a game is fine; attacking people isn't). Reports catch the rest.
 *
 * Players dodge filters with l33t letters, accents, dots and spaces ("n.i.g", "f4g"),
 * so the text is folded first: lower case, no accents, digits/symbols read as the
 * letters they stand for, long repeats cut to two. Whole words are compared, so
 * "Scunthorpe", "spice", "raccoon" and "Niger" pass; the worst few are also looked for
 * with the spaces taken out. Words with an everyday meaning too ("a chink in the
 * armour") are left to reports.
 */
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|gg|ru|xyz|ly|me|tv|co|info|biz|link|site|shop|app)\b)/i;

// A word that is (or is one of these plus s/es/ed/ing) is refused
const SLURS = [
  'nigger', 'nigga', 'faggot', 'fag', 'kike', 'spic', 'wetback', 'gook',
  'raghead', 'towelhead', 'beaner', 'tranny', 'retard', 'coon', 'dyke', 'paki',
];
// Found even with the spaces and dots taken out ("n i g g e r"): never inside an
// ordinary word or phrase ("wet backpack" would be, so it isn't here)
const SQUASHED = ['nigger', 'nigga', 'faggot'];
const HARASSMENT = /\b(kys|kill (yo)?ur ?sel(f|ves))\b/;

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'i' };

const fold = (text) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/[013457@$!|8]/g, (ch) => LEET[ch])
    .replace(/(.)\1{2,}/g, '$1$1'); // "niggggger" -> "nigger"

const forms = (word) => [word, `${word}s`, `${word}es`, `${word}ed`, `${word}ing`];
const BANNED = new Set(SLURS.flatMap(forms));

// Why a comment can't be posted (shown to its writer), or null when it's fine
export const commentProblem = (text) => {
  if (LINK.test(text)) return "Links aren't allowed in comments.";
  const folded = fold(text);
  const words = folded.split(/[^a-z]+/).filter(Boolean);
  const squashed = folded.replace(/[^a-z]/g, '');
  if (
    words.some((w) => BANNED.has(w)) ||
    SQUASHED.some((w) => squashed.includes(w)) ||
    HARASSMENT.test(folded.replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' '))
  ) {
    return "That comment breaks IMGM's rules: no slurs or attacks on people.";
  }
  return null;
};
