/**
 * Color resolution for calendar lanes:
 *
 * - **Self** uses `SELF_COLOR` — a fixed brand-blue distinct from every
 *   palette color, so "my events" always look the same.
 * - **Followed users** use the color stored on their `CalendarFollow`
 *   row. The BE assigns from `FOLLOW_COLOR_PALETTE` at create-time,
 *   skipping ones already used by the same follower → adjacent rows in
 *   the sidebar / overlapping chips on the timeline never look alike.
 * - **Fallback** (no follow record, no attribution) — `userColorFromId`
 *   hashes the userId into the same palette. Used for incidental
 *   attribution like attendees the viewer doesn't follow.
 *
 * Adjacent userIds previously produced near-identical hashes → similar
 * colors. Stored colors solve that.
 */

export const SELF_COLOR = "#1d4ed8" as const; // blue 700

export const FOLLOW_COLOR_PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // amber
  "#22c55e", // green
  "#14b8a6", // teal
  "#0ea5e9", // sky
  "#6366f1", // indigo
  "#a855f7", // purple
  "#ec4899", // pink
  "#78716c", // stone
] as const;

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Fallback only — prefer the stored follow.color when available. */
export function userColorFromId(userId: string | null | undefined): string {
  if (!userId) return FOLLOW_COLOR_PALETTE[0];
  return FOLLOW_COLOR_PALETTE[hashCode(userId) % FOLLOW_COLOR_PALETTE.length];
}
