/**
 * Feature switches — finished-but-not-launched features stay hidden in production.
 *
 * Play Next (the AI game recommender) is ON in local dev and OFF on imgm.app until
 * Not needed in production any more: the server's PLAY_NEXT=on switch decides, and the
 * site asks it (hooks/usePlayNextAccess.js). Local development always has Play Next.
 */
export const PLAY_NEXT_ENABLED = import.meta.env.DEV || import.meta.env.VITE_PLAY_NEXT === 'on';
