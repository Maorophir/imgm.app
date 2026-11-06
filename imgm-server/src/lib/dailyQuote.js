/**
 * The daily game's quote clue: a line from the game, looked up when the day's game is
 * picked (lib/daily.js) and saved with the puzzle, so it's looked up once.
 *
 * First the AI service (imgm-ai daily_quote.py): Gemini suggests famous lines from
 * memory and a web search keeps only one it finds word for word. Then, if it has none,
 * Wikiquote, below.
 *
 * The game's English Wikipedia article (IGDB links it) → its Wikidata item → the
 * Wikiquote page linked there. Going through Wikidata means no guessing by title (a
 * search for "Elden Ring" found the film). About 4 in 10 daily games have a page.
 *
 * A line counts if it's a short single line (a quote, or one line of a dialogue), not
 * a stage direction, and from the game's own lines (not "About", reviews, taglines).
 * The game's title words and the speakers' names are blanked ("___"), so the line is
 * a clue, not the answer. Wikiquote is CC BY-SA: the page is credited (source) once the
 * game is over (its address names the game).
 *
 * Swearing stays, starred but readable ("f***ing", the user's call); a line with a slur
 * or a link (commentFilter.js) is never used.
 */
import { randomInt } from 'node:crypto';
import { commentProblem } from './commentFilter.js';
import { aiServiceUrl, internalApiKey } from './config.js';

const UA = { 'User-Agent': 'IMGM/1.0 (https://imgm.app; daily game quotes)', Accept: 'application/json' };
const TIMEOUT = 8000;
const MIN_LENGTH = 25;
const MAX_LENGTH = 170;
// Sections that aren't the game's own lines
const NOT_LINES = /^(about|reception|reviews?|external links|see also|taglines?|cast|quotes about|sources|references|trailers?|credits|misc)/i;
// Capitalised words that aren't names, kept when blanking
const NOT_NAMES = new Set(['The', 'And', 'Main', 'Other', 'Act', 'Chapter', 'Part', 'Character', 'Characters', 'Quote', 'Quotes', 'Enemies', 'Boss', 'Bosses', 'Allies', 'Misc', 'Miscellaneous', 'Dialogue', 'Various', 'Narrator', 'Ending', 'Endings', 'Opening', 'Prologue', 'Epilogue', 'Game', 'Edition', 'Remastered']);

const getJson = async (url) => {
  const response = await fetch(url, { headers: UA, signal: AbortSignal.timeout(TIMEOUT) });
  if (!response.ok) throw new Error(`${new URL(url).hostname} answered ${response.status}`);
  return response.json();
};

// The Wikiquote page linked to this Wikipedia article (through Wikidata), or null
const wikiquotePage = async (wikipediaTitle) => {
  const data = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(wikipediaTitle)}&props=sitelinks&sitefilter=enwikiquote&redirects=yes&format=json`);
  return Object.values(data.entities ?? {})[0]?.sitelinks?.enwikiquote?.title ?? null;
};

// Wiki markup → plain text
const plain = (text) => text
  .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, '')
  .replace(/<[^>]+>/g, '')
  .replace(/\{\{[^{}]*\}\}/g, '')
  .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
  .replace(/\[https?:\S+\s([^\]]*)\]/g, '$1')
  .replace(/'''?/g, '')
  .replace(/&hellip;/g, '…').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

const namesIn = (text) => text.split(/[\s,()/&]+/).filter((word) => /^[A-Z][a-zA-Z'-]{2,}$/.test(word) && !NOT_NAMES.has(word));

// The page's usable lines, and the names to blank (speakers, section titles)
const linesOf = (wikitext) => {
  const lines = [];
  const names = new Set();
  let section = '';
  for (const raw of wikitext.split('\n')) {
    const heading = raw.match(/^==+\s*(.*?)\s*==+\s*$/);
    if (heading) {
      section = plain(heading[1]);
      if (!NOT_LINES.test(section)) namesIn(section).forEach((name) => names.add(name));
      continue;
    }
    if (NOT_LINES.test(section)) continue;
    // "* A quote." (not "** its source"), or ":'''Speaker:''' a line of dialogue"
    const quote = raw.match(/^\*\s*([^*:].*)$/)?.[1];
    const dialogue = raw.match(/^:+\s*'''([^']+?):?'''\s*:?\s*(.+)$/);
    if (dialogue) namesIn(plain(dialogue[1])).forEach((name) => names.add(name));
    const line = plain(quote ?? dialogue?.[2] ?? '');
    // Not a stage direction ("[He leaves]"), not cut off mid-dialogue
    if (line.length < MIN_LENGTH || line.length > MAX_LENGTH || /^[[(]|[\])]$|:$/.test(line)) continue;
    lines.push(line);
  }
  return { lines, names };
};

// The swear word's first letter stays, the rest of its root is starred, the ending
// stays: "fucking" → "f***ing", "bullshit" → "b***s***". Only whole-word roots, so
// "Scunthorpe" and "cocktail" are left alone.
const SWEAR = /\b(mother|bull|horse|dip|jack)?(fuck|shit|bitch|cunt|asshole|bastard|twat|wank)/gi;
const star = (word) => (word ? word[0] + '*'.repeat(word.length - 1) : '');
export const starSwearing = (text) => text.replace(SWEAR, (_, before, root) => star(before) + star(root));

// A quote ready to show: swearing starred, or null if it has a slur or a link
export const cleanQuote = (text) => (commentProblem(text) ? null : starSwearing(text));

const escape = (word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A line from the AI service, or null (none it could check, or no AI service here)
const AI_TIMEOUT = 90_000; // its models fall back one after another
const aiQuote = async ({ title, year }) => {
  if (!process.env.AI_SERVICE_URL) return null;
  try {
    const response = await fetch(`${aiServiceUrl}/daily/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(internalApiKey ? { 'X-Internal-Key': internalApiKey } : {}) },
      body: JSON.stringify({ title, year }),
      signal: AbortSignal.timeout(AI_TIMEOUT),
    });
    if (!response.ok) throw new Error(`AI service answered ${response.status}`);
    const text = (await response.json())?.quote?.text;
    const clean = typeof text === 'string' ? cleanQuote(text) : null;
    return clean ? { text: clean, source: null } : null; // only Wikiquote needs crediting
  } catch (error) {
    console.error(`Daily quote from the AI service for ${title} failed:`, error.message);
    return null;
  }
};

/**
 * A quote for the game: { text, source (a Wikiquote page to credit, or null) } or null.
 * Never throws.
 */
export const findQuote = async ({ title, year, wikipedia }) =>
  (await aiQuote({ title, year })) ?? wikiquoteQuote({ title, wikipedia });

// A line from the game's Wikiquote page: { text, source } or null (no page, no usable
// line, or Wikiquote didn't answer)
const wikiquoteQuote = async ({ title, wikipedia }) => {
  if (!wikipedia) return null;
  try {
    const page = await wikiquotePage(wikipedia);
    if (!page) return null;
    const data = await getJson(`https://en.wikiquote.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&redirects=1&format=json`);
    const { lines: all, names } = linesOf(data.parse?.wikitext?.['*'] ?? '');
    const lines = all.map(cleanQuote).filter(Boolean);
    if (lines.length === 0) return null;
    const blank = [...new Set([...namesIn(title.replace(/[:!?.]/g, ' ')), ...names])];
    const pattern = blank.length ? new RegExp(`\\b(${blank.map(escape).join('|')})\\b`, 'g') : null;
    const text = lines[randomInt(lines.length)];
    return {
      text: pattern ? text.replace(pattern, '___') : text,
      source: `https://en.wikiquote.org/wiki/${encodeURIComponent(page.replace(/ /g, '_'))}`,
    };
  } catch (error) {
    console.error(`Daily quote for ${title} failed:`, error.message);
    return null;
  }
};
