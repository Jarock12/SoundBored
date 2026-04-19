import type { CSSProperties } from "react";

// ─── Sprite sheet layout ───────────────────────────────────────────────────────
// Sheet lives at /public/oot-sprites.png (6 columns × 13 rows).
// CELL = px width of one sprite cell in the sheet.
// Run scripts/remove-sprite-bg.js — it prints the exact value for your sheet.
// If a sprite appears one slot off, adjust col/row below.
const SHEET_COLS = 6;
const CELL = 38; // px — update this if the script prints a different number

// Grid position of each badge sprite (0-indexed, left-to-right, top-to-bottom)
const SPRITE_POS: Record<string, { col: number; row: number }> = {
  ocarina: { col: 2, row: 1 }, // Ocarina of Time (blue instrument, ID 8)
  shield:  { col: 2, row: 10 }, // Deku Shield
  cucco:   { col: 5, row: 7 }, // Blue Cucco (chicken)
};

export const BADGE_META: Record<string, { name: string; color: string; glow: string }> = {
  ocarina: { name: "Zelda's Lullaby",  color: "#3b82f6", glow: "rgba(59,130,246,0.55)"  },
  shield:  { name: "Saria's Song",     color: "#22c55e", glow: "rgba(34,197,94,0.55)"   },
  cucco:   { name: "Song of Storms",   color: "#818cf8", glow: "rgba(129,140,248,0.55)" },
};

export function BadgeIcon({
  badge,
  size = 36,
  style,
}: {
  badge: string;
  size?: number;
  style?: CSSProperties;
}) {
  const meta = BADGE_META[badge];
  const pos  = SPRITE_POS[badge];
  if (!meta || !pos) return null;

  const scale  = size / CELL;
  const sheetW = (SHEET_COLS * CELL * scale).toFixed(1);
  const bpX    = (-(pos.col * CELL * scale)).toFixed(1);
  const bpY    = (-(pos.row * CELL * scale)).toFixed(1);

  return (
    <div
      style={{
        width:              size,
        height:             size,
        backgroundImage:    "url('/oot-sprites.png')",
        backgroundPosition: `${bpX}px ${bpY}px`,
        backgroundSize:     `${sheetW}px auto`,
        backgroundRepeat:   "no-repeat",
        imageRendering:     "pixelated",
        filter:             `drop-shadow(0 0 5px ${meta.glow})`,
        flexShrink:         0,
        ...style,
      }}
    />
  );
}
