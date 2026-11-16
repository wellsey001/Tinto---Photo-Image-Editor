'use strict';

// Build check: downloads the background-removal model and runs it once on a made-up picture,
// so a release never ships with a sticker remover that can't load or run.
// Usage: node scripts/check-cutout.js

const os = require('node:os');
const path = require('node:path');
const { createCutout, SEG_MODEL, SKY_MODEL, UPSCALE_MODELS } = require('../src/cutout');

(async () => {
  const w = 320, h = 240;
  // A warm round "face" on a flat blue-grey background.
  const rgb = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 3, inside = (x - 160) ** 2 / 70 ** 2 + (y - 120) ** 2 / 90 ** 2 < 1;
    rgb.set(inside ? [224, 172, 140] : [96, 110, 128], i);
  }
  const phases = new Set();
  const started = Date.now();
  const cutout = createCutout({ cacheDir: path.join(os.tmpdir(), 'tinto-models') });
  const mask = await cutout.maskFor(rgb, w, h, p => phases.add(p.phase));

  if (!(mask instanceof Uint8Array) || mask.length !== w * h) throw new Error(`Mask has the wrong size: ${mask && mask.length}`);
  let min = 255, max = 0, sum = 0;
  for (const v of mask) { if (v < min) min = v; if (v > max) max = v; sum += v; }
  console.log(`${SEG_MODEL}: ${w}x${h} mask in ${Date.now() - started} ms; values ${min}-${max}, mean ${(sum / mask.length).toFixed(1)}; phases: ${[...phases].join(', ')}`);
  if (max === min) throw new Error('The mask is flat: the model ran but found nothing.');

  // The sky finder: blue sky over green grass should be sky at the top and not at the bottom.
  const sw = 320, sh = 240, sky = new Uint8Array(sw * sh * 3);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const t = y / sh, i = (y * sw + x) * 3;
    sky.set(t < 0.6 ? [70 + 90 * t, 130 + 90 * t, 220 + 30 * t] : [60 + 20 * Math.sin(x * 0.3), 120 + 15 * Math.sin(x * 0.17 + y), 50], i);
  }
  const t1 = Date.now(), sm = await cutout.skyMaskFor(sky, sw, sh);
  const avg = (y0, y1) => { let s = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < sw; x++) { s += sm[y * sw + x]; n++; } return s / n; };
  const top = avg(0, 80), bottom = avg(170, 240);
  console.log(`${SKY_MODEL}: sky mask in ${Date.now() - t1} ms; top ${top.toFixed(1)}, bottom ${bottom.toFixed(1)}`);
  if (sm.length !== sw * sh || !(top > bottom + 60)) throw new Error('The sky finder didn’t find the sky.');

  // Upscale: a 160x120 picture with a sharp-edged square, at 2x and 4x. Bigger, and still the same picture.
  const uw = 160, uh = 120, up = new Uint8Array(uw * uh * 3);
  for (let y = 0; y < uh; y++) for (let x = 0; x < uw; x++) up.set(x > 50 && x < 110 && y > 30 && y < 90 ? [230, 80, 60] : [40 + x, 90, 160 - y], (y * uw + x) * 3);
  for (const f of [2, 4]) {
    const t2 = Date.now(); let tiles = 0;
    const big = await cutout.upscale(up, uw, uh, f, p => { if (p.total) tiles = p.total; });
    const ms = Date.now() - t2;
    if (!(big instanceof Uint8Array) || big.length !== uw * f * uh * f * 3) throw new Error(`Upscale ${f}x gave the wrong size: ${big && big.length}`);
    // the middle of the red square should still be red, and the corner still blue-ish
    const at = (x, y) => big.subarray(((y * f) * uw * f + x * f) * 3, ((y * f) * uw * f + x * f) * 3 + 3);
    const mid = at(80, 60), corner = at(5, 110);
    console.log(`${UPSCALE_MODELS[f].id}: ${uw}x${uh} -> ${uw * f}x${uh * f} in ${ms} ms (${tiles} tiles, ${Math.round(ms / Math.max(1, tiles))} ms each); middle ${[...mid]}, corner ${[...corner]}`);
    if (!(mid[0] > 180 && mid[1] < 130) || !(corner[2] > corner[0])) throw new Error(`Upscale ${f}x changed the picture.`);
  }
})().catch(err => { console.error(err); process.exit(1); });
