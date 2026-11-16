// Build check for the Android app's AI tools: serves the packaged web files (mobile/www), opens them
// in Chrome (the same engine as Android's WebView), and runs the person finder and the sky finder
// once each on made-up pictures, through the same code the phone uses (src/renderer/ai-web.js).
// Usage: node scripts/check-web-ai.mjs [path to Chrome]
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.resolve('mobile/package.json'));   // puppeteer-core is installed there
const puppeteer = require('puppeteer-core');
const root = path.resolve('mobile/www');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try { const body = await fs.readFile(file); res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(body); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(8799, r));
const browser = await puppeteer.launch({ executablePath: process.argv[2] || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('page error:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
  await page.evaluateOnNewDocument(() => { window.TINTO_WEB_AI = true; });
  await page.goto('http://localhost:8799/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.WEB_AI && typeof S !== 'undefined' && S.base, { timeout: 30000 });
  const result = await page.evaluate(async () => {
    const out = {};
    // a warm round "face" on a flat blue-grey background
    let w = 320, h = 240, rgb = new Uint8Array(w * h * 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const inside = (x - 160) ** 2 / 70 ** 2 + (y - 120) ** 2 / 90 ** 2 < 1;
      rgb.set(inside ? [224, 172, 140] : [96, 110, 128], (y * w + x) * 3);
    }
    let t = performance.now(), m = await WEB_AI.removeBackground(rgb, w, h);
    let min = 255, max = 0; for (const v of m) { if (v < min) min = v; if (v > max) max = v; }
    out.person = { ms: Math.round(performance.now() - t), length: m.length, min, max };
    // blue sky over green grass
    rgb = new Uint8Array(w * h * 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = y / h;
      rgb.set(k < 0.6 ? [70 + 90 * k, 130 + 90 * k, 220 + 30 * k] : [60 + 20 * Math.sin(x * 0.3), 120 + 15 * Math.sin(x * 0.17 + y), 50], (y * w + x) * 3);
    }
    t = performance.now(); m = await WEB_AI.skyMask(rgb, w, h);
    const avg = (y0, y1) => { let s = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) { s += m[y * w + x]; n++; } return s / n; };
    out.sky = { ms: Math.round(performance.now() - t), length: m.length, top: avg(0, 80), bottom: avg(170, 240) };
    // upscale a 160x120 picture with a red square, 2x and 4x
    const uw = 160, uh = 120, up = new Uint8Array(uw * uh * 3);
    for (let y = 0; y < uh; y++) for (let x = 0; x < uw; x++) up.set(x > 50 && x < 110 && y > 30 && y < 90 ? [230, 80, 60] : [40 + x, 90, 160 - y], (y * uw + x) * 3);
    out.upscale = {};
    for (const f of [2, 4]) {
      t = performance.now(); let tiles = 0;
      const stop = WEB_AI.onUpscaleProgress(p => { if (p.total) tiles = p.total; });
      const big = await WEB_AI.upscale(up, uw, uh, f); stop();
      const at = (x, y) => [...big.subarray(((y * f) * uw * f + x * f) * 3, ((y * f) * uw * f + x * f) * 3 + 3)];
      out.upscale[f] = { ms: Math.round(performance.now() - t), tiles, length: big.length, mid: at(80, 60), corner: at(5, 110) };
    }
    return out;
  });
  console.log(JSON.stringify(result));
  const ok = result.person.length === 320 * 240 && result.person.max > result.person.min && result.sky.length === 320 * 240 && result.sky.top > result.sky.bottom + 60
    && [2, 4].every(f => { const u = result.upscale[f]; return u.length === 160 * f * 120 * f * 3 && u.mid[0] > 180 && u.mid[1] < 130 && u.corner[2] > u.corner[0]; });
  if (!ok) throw new Error('The in-page AI tools gave the wrong answer.');
  console.log('Web AI tools work.');
} finally {
  await browser.close(); server.close();
}
