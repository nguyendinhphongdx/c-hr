/**
 * Deterministic per-user color from a small palette. Used to tint event
 * chips so that, when overlaying multiple users' events (calendar
 * follow), the owner is visually distinguishable at a glance.
 *
 * Same userId → same color across the whole app. Hash is stable + cheap;
 * not cryptographic. Palette picked for legibility on light + dark bg.
 */

const PALETTE = [
  "#2563eb", // blue 600
  "#16a34a", // green 600
  "#ea580c", // orange 600
  "#7c3aed", // violet 600
  "#db2777", // pink 600
  "#0891b2", // cyan 600
  "#ca8a04", // yellow 600
  "#dc2626", // red 600
  "#0d9488", // teal 600
  "#9333ea", // purple 600
] as const;

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function userColorFromId(userId: string | null | undefined): string {
  if (!userId) return PALETTE[0];
  return PALETTE[hashCode(userId) % PALETTE.length];
}
