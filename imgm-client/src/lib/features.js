/**
 * Feature switches — finished-but-not-launched features stay hidden in production.
 *
 * Play Next (the AI game recommender) is ON in local dev and OFF on imgm.app until
 * VITE_PLAY_NEXT=on is set in Vercel (the server has a matching PLAY_NEXT switch).
 */
export const PLAY_NEXT_ENABLED = import.meta.env.DEV || import.meta.env.VITE_PLAY_NEXT === 'on';
