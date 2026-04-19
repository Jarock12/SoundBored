/**
 * Removes the solid background from the OoT sprite sheet and saves a
 * transparent PNG to public/oot-sprites.png.
 *
 * Usage:
 *   1. Place the downloaded sprite sheet at <project-root>/oot-sprites-raw.png
 *   2. Run:  node scripts/remove-sprite-bg.js
 *   3. The script prints the sheet dimensions — use (width / 6) as CELL in BadgeIcon.tsx
 */

const sharp = require("sharp");
const path  = require("path");

async function run() {
  const input  = path.join(process.cwd(), "oot-sprites-raw.png");
  const output = path.join(process.cwd(), "public", "oot-sprites.png");

  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Sample background colour from the top-left pixel
  const bgR = data[0], bgG = data[1], bgB = data[2];
  const TOLERANCE = 40; // raise if grey fringing remains around sprites

  const out = Buffer.from(data);
  for (let i = 0; i < info.width * info.height; i++) {
    const o = i * 4;
    const diff = Math.abs(out[o] - bgR) + Math.abs(out[o + 1] - bgG) + Math.abs(out[o + 2] - bgB);
    if (diff < TOLERANCE * 3) out[o + 3] = 0; // fully transparent
  }

  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(output);

  const cellW = Math.round(info.width  / 6);
  const cellH = Math.round(info.height / 13);

  console.log(`✓  Saved to public/oot-sprites.png  (${info.width}×${info.height}px)`);
  console.log(`   BG colour sampled : rgb(${bgR},${bgG},${bgB})`);
  console.log(`   Estimated CELL    : ${cellW}px wide × ${cellH}px tall`);
  console.log(`   → Set CELL = ${cellW} in app/components/BadgeIcon.tsx if different from 38`);
}

run().catch((err) => { console.error("Error:", err.message); process.exit(1); });
