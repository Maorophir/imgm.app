// A pick's place in the 5, in words: ordinal(2) → "2nd", pickName(2) → "2nd pick"
export const ordinal = (rank) => ['1st', '2nd', '3rd'][rank - 1] ?? `${rank}th`;
export const pickName = (rank) => `${ordinal(rank)} pick`;
