/**
 * The venue screen's bottom sheet heights. It starts at `down`, low enough that most of the map
 * shows; the map fits its view into whatever the sheet leaves visible.
 * e.g. snapPositions(650, 92) → { up: 48, mid: 325, down: 426 } (the map keeps 426 of 650 px)
 */
export type SheetSnap = 'down' | 'mid' | 'up';

/** Raised sheet's gap below the header, and how much of the lowered sheet shows above the tab bar. */
export const UP_GAP = 48;
export const PEEK = 132;

/** Sheet tops for each snap, in the map area's coordinates, for a map area `h` tall. */
export function snapPositions(h: number, tabClearance: number): Record<SheetSnap, number> {
  const down = Math.max(h - PEEK - tabClearance, UP_GAP);
  return { up: UP_GAP, mid: Math.min(Math.round(h * 0.5), down), down };
}
