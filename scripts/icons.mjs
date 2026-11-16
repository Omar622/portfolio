// Draws the OA monogram from public/favicon.svg into PNG app icons, with no image libraries.
// Run: node scripts/icons.mjs   (writes public/apple-touch-icon.png and public/icon-512.png)
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const PAPER = hex('#0e192e'), GRID = hex('#21304c'), INK = hex('#aac8ff');

// Shapes in the SVG's 64-unit space, as signed distances (negative = inside).
const segment = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - k * dx, py - ay - k * dy);
};
const roundedSquare = (x, y) => { const q = 32 - 14, dx = Math.max(Math.abs(x - 32) - q, 0), dy = Math.max(Math.abs(y - 32) - q, 0); return Math.hypot(dx, dy) - 14; };
const monogram = (x, y) => Math.min(
  Math.abs(Math.hypot(x - 20.5, y - 32) - 10.5),
  segment(x, y, 37, 44, 46.5, 20), segment(x, y, 46.5, 20, 56, 44), segment(x, y, 40.8, 35.5, 52.2, 35.5),
) - 3;
const grid = (x, y) => Math.min(...[16, 32, 48].map(g => Math.min(Math.abs(x - g), Math.abs(y - g)))) - .5;

function pixel(px, py, size) {
  const s = 64 / size, x = (px + .5) * s, y = (py + .5) * s, aa = s * .75;
  const cover = d => Math.max(0, Math.min(1, .5 - d / (2 * aa)));
  let rgb = PAPER.slice();
  const mix = (c, a) => { rgb = rgb.map((v, i) => v + (c[i] - v) * a); };
  mix(GRID, cover(grid(x, y)));
  mix(INK, cover(monogram(x, y)));
  return [...rgb.map(Math.round), Math.round(255 * cover(roundedSquare(x, y)))];
}

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) raw.set(pixel(x, y, size), y * (size * 4 + 1) + 1 + x * 4);
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = ~0; for (const v of b) c = crcTable[(c ^ v) & 255] ^ (c >>> 8); return (~c) >>> 0; };
  const chunk = (type, data) => {
    const t = Buffer.from(type), len = Buffer.alloc(4), sum = Buffer.alloc(4);
    len.writeUInt32BE(data.length); sum.writeUInt32BE(crc(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, sum]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

writeFileSync(new URL('../public/apple-touch-icon.png', import.meta.url), png(180));
writeFileSync(new URL('../public/icon-512.png', import.meta.url), png(512));
console.log('wrote apple-touch-icon.png (180) and icon-512.png (512)');
