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
    return out;
  });
  console.log(JSON.stringify(result));
  const ok = result.person.length === 320 * 240 && result.person.max > result.person.min && result.sky.length === 320 * 240 && result.sky.top > result.sky.bottom + 60;
  if (!ok) throw new Error('The in-page AI tools gave the wrong answer.');
  console.log('Web AI tools work.');
} finally {
  await browser.close(); server.close();
}
