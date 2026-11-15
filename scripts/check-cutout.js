'use strict';

// Build check: downloads the background-removal model and runs it once on a made-up picture,
// so a release never ships with a sticker remover that can't load or run.
// Usage: node scripts/check-cutout.js

const os = require('node:os');
const path = require('node:path');
const { createCutout, SEG_MODEL } = require('../src/cutout');

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
})().catch(err => { console.error(err); process.exit(1); });
