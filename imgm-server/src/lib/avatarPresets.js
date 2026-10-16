/**
 * Ready-made avatars: 24 original IMGM characters, so every player can have a face from
 * the start, no upload needed. Each is a nod to a kind of game (a soulslike knight, a
 * cyberpunk netrunner, a wild-west gunslinger…) but nobody's character: they were drawn
 * for IMGM with Google's Gemini image model, so no other company's art is used.
 *
 * The pictures are 256px WebP files in src/assets/avatars/<key>.webp, served by this
 * server (GET /api/users/avatars/presets/<key>.webp), cached for good: a redrawn
 * picture gets a new key. Choosing one stores just its key.
 */
import { fileURLToPath } from 'node:url';

export const AVATAR_PRESETS = [
  { key: 'rogue', name: 'Rogue' },
  { key: 'knight', name: 'Knight' },
  { key: 'mage', name: 'Mage' },
  { key: 'pilot', name: 'Pilot' },
  { key: 'ranger', name: 'Ranger' },
  { key: 'cyborg', name: 'Cyborg' },
  { key: 'mechanic', name: 'Mechanic' },
  { key: 'witchhunter', name: 'Witch Hunter' },
  { key: 'survivor', name: 'Survivor' },
  { key: 'netrunner', name: 'Netrunner' },
  { key: 'soulknight', name: 'Fallen Knight' },
  { key: 'viking', name: 'Viking' },
  { key: 'gunslinger', name: 'Gunslinger' },
  { key: 'ronin', name: 'Ronin' },
  { key: 'bountyhunter', name: 'Bounty Hunter' },
  { key: 'elfarcher', name: 'Elf Archer' },
  { key: 'dwarf', name: 'Dwarf' },
  { key: 'orc', name: 'Orc' },
  { key: 'robot', name: 'Robot' },
  { key: 'alien', name: 'Alien' },
  { key: 'detective', name: 'Detective' },
  { key: 'racer', name: 'Racer' },
  { key: 'farmer', name: 'Farmer' },
  { key: 'esports', name: 'Esports Pro' },
].map((preset) => ({ ...preset, url: `/api/users/avatars/presets/${preset.key}.webp` }));

export const presetByKey = new Map(AVATAR_PRESETS.map((preset) => [preset.key, preset]));

// The picture's file on disk
export const presetFile = (key) => fileURLToPath(new URL(`../assets/avatars/${key}.webp`, import.meta.url));
