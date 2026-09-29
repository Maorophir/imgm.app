/**
 * Review validation — describes exactly what a valid review looks like.
 * Anything the browser sends is checked against this before it touches the DB.
 * Unknown fields are dropped; empty text becomes null (= skipped).
 */
import { z } from 'zod';
import {
  COMPLETION_STATUSES, PLAY_STYLES, VIBES, MAX_VIBES, GOT_GOOD_AFTER, CHECKLIST,
} from './reviewOptions.js';

const score = z.int().min(1).max(10);

// Optional text: trimmed, length-capped, and "" turns into null (skipped)
const optionalText = (max) =>
  z.string().trim().max(max).transform((s) => s || null).nullish();

// Pros / cons chips: up to 5 short phrases
const chips = z.array(z.string().trim().min(1).max(60)).max(5).default([]);

// ⑤ The checklist: one optional field per category, built from the CHECKLIST
// config — e.g. { graphics: z.enum(['ms_paint', …]).nullish(), bugs: …, … }
const checklistFields = Object.fromEntries(
  Object.entries(CHECKLIST).map(([field, keys]) => [field, z.enum(keys).nullish()])
);

export const reviewSchema = z
  .object({
    gameId: z.int().positive(),

    // ① Rating — the only required answer
    rating: score,

    // ② Your setup
    platform: optionalText(60),
    hoursPlayed: z.int().min(0).max(100000).nullish(),
    completionStatus: z.enum(COMPLETION_STATUSES).nullish(),
    playStyle: z.enum(PLAY_STYLES).nullish(),

    // ③ Vibe check — duplicates removed
    vibes: z
      .array(z.enum(VIBES))
      .max(MAX_VIBES)
      .default([])
      .transform((v) => [...new Set(v)]),

    // ④ When did it get good?
    gotGoodAfter: z.enum(GOT_GOOD_AFTER).nullish(),

    // ⑤ The checklist (graphics, gameplay, … price, replay)
    ...checklistFields,

    // ⑥ It's like ___ meets ___ (IGDB game ids)
    comparedAId: z.int().positive().nullish(),
    comparedBId: z.int().positive().nullish(),

    // ⑦ Pros & cons
    pros: chips,
    cons: chips,

    // ⑧ Best / worst moment
    bestMoment: optionalText(280),
    worstMoment: optionalText(280),
    hasSpoilers: z.boolean().default(false),

    // ⑨ Final words
    reviewText: optionalText(5000),
  })
  // A game can't be "like itself", and A and B must be two different games
  .refine(
    (r) => ![r.comparedAId, r.comparedBId].includes(r.gameId),
    { message: "A game can't be compared to itself", path: ['comparedAId'] }
  )
  .refine(
    (r) => !r.comparedAId || r.comparedAId !== r.comparedBId,
    { message: 'Pick two different games', path: ['comparedBId'] }
  );
