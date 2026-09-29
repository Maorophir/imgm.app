/**
 * Review validation — describes exactly what a valid review looks like.
 * Anything the browser sends is checked against this before it touches the DB.
 * Unknown fields are dropped; empty text becomes null (= skipped).
 */
import { z } from 'zod';
import {
  COMPLETION_STATUSES, DIFFICULTIES, PLAY_STYLES, VIBES, MAX_VIBES,
  GOT_GOOD_AFTER, WORTH_PRICE, REPLAY,
} from './reviewOptions.js';

const score = z.int().min(1).max(10);

// Optional text: trimmed, length-capped, and "" turns into null (skipped)
const optionalText = (max) =>
  z.string().trim().max(max).transform((s) => s || null).nullish();

// Pros / cons chips: up to 5 short phrases
const chips = z.array(z.string().trim().min(1).max(60)).max(5).default([]);

export const reviewSchema = z
  .object({
    gameId: z.int().positive(),

    // ① Rating — the only required answer
    rating: score,

    // ② Your setup
    platform: optionalText(60),
    hoursPlayed: z.int().min(0).max(100000).nullish(),
    completionStatus: z.enum(COMPLETION_STATUSES).nullish(),
    difficulty: z.enum(DIFFICULTIES).nullish(),
    playStyle: z.enum(PLAY_STYLES).nullish(),

    // ③ Vibe check — duplicates removed
    vibes: z
      .array(z.enum(VIBES))
      .max(MAX_VIBES)
      .default([])
      .transform((v) => [...new Set(v)]),

    // ④ When did it get good?
    gotGoodAfter: z.enum(GOT_GOOD_AFTER).nullish(),

    // ⑤ Rate the parts (null = N/A)
    scoreStory: score.nullish(),
    scoreGameplay: score.nullish(),
    scoreVisuals: score.nullish(),
    scoreSound: score.nullish(),
    scorePerformance: score.nullish(),

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

    // ⑨ Worth the price + replay
    worthPrice: z.enum(WORTH_PRICE).nullish(),
    replay: z.enum(REPLAY).nullish(),

    // ⑩ Your words
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
