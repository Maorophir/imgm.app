// A pick's place in the 5, in words: pickName(2) → "2nd pick"
export const pickName = (rank) => `${['1st', '2nd', '3rd'][rank - 1] ?? `${rank}th`} pick`;
