/** Variety colours, assigned in sorted order so they never reshuffle on reload (the legacy page's DPAL). */
export const PALETTE = ["#c8515f", "#2a6f8f", "#3f8f4f", "#d9962e", "#7a5ea8", "#2f8f8a", "#b4632a", "#8a5a7a", "#4a7a3a", "#a8452f", "#3a6ea8", "#8f7a2a"];
export const colourFor = (all: string[], v: string) => PALETTE[[...new Set(all)].sort().indexOf(v) % PALETTE.length];
