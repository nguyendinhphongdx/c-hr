/**
 * Fixed 10-color palette used to assign distinct, stable colors to each
 * follow. Picked for high mutual contrast — adjacent hues avoided so two
 * follows side-by-side in the sidebar / overlapping chips on the timeline
 * never look alike.
 *
 * Self color (the current user) is intentionally NOT in this palette —
 * see `apps/frontend/src/features/calendar/lib/calendar-colors.ts`.
 */
export const FOLLOW_COLOR_PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // amber
  '#22c55e', // green
  '#14b8a6', // teal
  '#0ea5e9', // sky
  '#6366f1', // indigo
  '#a855f7', // purple
  '#ec4899', // pink
  '#78716c', // stone
] as const;

/**
 * Pick the first palette color not already in `usedColors`. Falls back to
 * round-robin when all 10 are taken.
 */
export function pickNextFollowColor(usedColors: Iterable<string>, followIndex: number): string {
  const used = new Set(usedColors);
  for (const c of FOLLOW_COLOR_PALETTE) {
    if (!used.has(c)) return c;
  }
  return FOLLOW_COLOR_PALETTE[followIndex % FOLLOW_COLOR_PALETTE.length];
}
