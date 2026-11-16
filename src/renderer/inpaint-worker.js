'use strict';
/* Object eraser: fills a painted-over area with picture made from the rest of the photo.
   Multi-scale PatchMatch completion (the idea behind "content-aware fill"): starting from a tiny
   copy of the photo, every small patch in the hole is matched with the most similar patch outside
   it, the matches vote on each pixel's colour, and the answer is refined at each larger size.
   Runs in a worker so the editor stays responsive.
   In:  {id, w, h, rgba: Uint8ClampedArray (w*h*4), hole: Uint8Array (w*h, 1 = fill this)}
   Out: {id, rgba} with the hole filled, or {id, error}. */

// In a worker it answers messages; loaded as a normal script it offers TintoInpaint() instead
// (used if a worker can't be started).
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) self.onmessage = e => {
  const { id, w, h, rgba, hole } = e.data;
  try {
    const out = complete(rgba, w, h, hole);
    self.postMessage({ id, rgba: out }, [out.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
else self.TintoInpaint = complete;

function complete(rgba, W, H, hole0) {
  // the pyramid: each level half the size of the one before, down to a hole a few pixels across
  const levels = [{ w: W, h: H, img: toFloat(rgba, W * H), hole: hole0 }];
  while (true) {
    const L = levels[levels.length - 1];
    if (Math.min(L.w, L.h) < 48 || holeExtent(L) < 10) break;
    levels.push(down(L));
  }
  let nnf = null;
  for (let li = levels.length - 1; li >= 0; li--) {
    const L = levels[li], coarse = li === levels.length - 1;
    const P = L.w * L.h > 120000 ? 2 : 3;               // patch radius: 5x5 at the finest sizes, 7x7 below
    prepare(L, P);
    if (!L.sources.length) { diffuse(L); continue; }    // nothing left to copy from
    if (coarse) { diffuse(L); nnf = randomNNF(L); }
    else { nnf = upsampleNNF(nnf, levels[li + 1], L); vote(L, nnf, P); }
    const em = coarse ? 6 : li === 0 ? 2 : 4;
    for (let it = 0; it < em; it++) {
      for (let pass = 0; pass < 3; pass++) patchMatch(L, nnf, P, (it * 3 + pass) % 2 === 1);
      vote(L, nnf, P);
    }
    L.nnf = nnf;
  }
  const top = levels[0], out = new Uint8ClampedArray(rgba);
  for (let i = 0, n = W * H; i < n; i++) if (hole0[i]) { out[i * 4] = top.img[i * 3]; out[i * 4 + 1] = top.img[i * 3 + 1]; out[i * 4 + 2] = top.img[i * 3 + 2]; out[i * 4 + 3] = 255; }
  return out;
}

function toFloat(rgba, n) { const f = new Float32Array(n * 3); for (let i = 0; i < n; i++) { f[i * 3] = rgba[i * 4]; f[i * 3 + 1] = rgba[i * 4 + 1]; f[i * 3 + 2] = rgba[i * 4 + 2]; } return f; }
function holeExtent(L) {
  let x0 = L.w, y0 = L.h, x1 = -1, y1 = -1;
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if (L.hole[y * L.w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? 0 : Math.max(x1 - x0, y1 - y0) + 1;
}
function down(L) {
  const w = Math.max(1, L.w >> 1), h = Math.max(1, L.h >> 1), img = new Float32Array(w * h * 3), hole = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, n = 0, any = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const sx = Math.min(L.w - 1, x * 2 + dx), sy = Math.min(L.h - 1, y * 2 + dy), si = sy * L.w + sx;
      if (L.hole[si]) { any = 1; continue; }
      r += L.img[si * 3]; g += L.img[si * 3 + 1]; b += L.img[si * 3 + 2]; n++;
    }
    const i = y * w + x;
    if (any) hole[i] = 1;
    if (n) { img[i * 3] = r / n; img[i * 3 + 1] = g / n; img[i * 3 + 2] = b / n; }
  }
  return { w, h, img, hole };
}
/* which pixels need a match (any patch touching the hole), and where patches may be copied from */
function prepare(L, P) {
  const { w, h, hole } = L, near = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!hole[y * w + x]) continue;
    for (let dy = -P; dy <= P; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue; for (let dx = -P; dx <= P; dx++) { const xx = x + dx; if (xx >= 0 && xx < w) near[yy * w + xx] = 1; } }
  }
  const targets = [], sources = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (near[i]) targets.push(i);
    // a source patch must lie inside the picture and not overlap the hole at all
    if (x >= P && y >= P && x < w - P && y < h - P) {
      let ok = true;
      for (let dy = -P; dy <= P && ok; dy++) for (let dx = -P; dx <= P; dx++) if (hole[(y + dy) * w + x + dx]) { ok = false; break; }
      if (ok) sources.push(i);
    }
  }
  L.targets = Int32Array.from(targets); L.sources = Int32Array.from(sources);
  L.isSource = new Uint8Array(w * h); for (const s of sources) L.isSource[s] = 1;
}
/* rough first guess for the smallest level: grow the edges inwards */
function diffuse(L) {
  const { w, h, img } = L, known = new Uint8Array(w * h);
  let left = 0; for (let i = 0; i < w * h; i++) { if (L.hole[i]) left++; else known[i] = 1; }
  if (left === w * h) return;
  while (left > 0) {
    const fill = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (known[i]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx; if (!known[j]) continue;
        r += img[j * 3]; g += img[j * 3 + 1]; b += img[j * 3 + 2]; n++;
      }
      if (n) fill.push(i, r / n, g / n, b / n);
    }
    if (!fill.length) break;
    for (let k = 0; k < fill.length; k += 4) { const i = fill[k]; img[i * 3] = fill[k + 1]; img[i * 3 + 1] = fill[k + 2]; img[i * 3 + 2] = fill[k + 3]; known[i] = 1; left--; }
  }
}
const rnd = (() => { let s = 0x9e3779b9; return () => (s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x297a2d39) >>> 0) / 4294967296; })();
function randomNNF(L) {
  const nnf = new Int32Array(L.w * L.h).fill(-1), S = L.sources;
  for (const t of L.targets) nnf[t] = S[(rnd() * S.length) | 0];
  return nnf;
}
function upsampleNNF(cn, C, L) {
  const nnf = new Int32Array(L.w * L.h).fill(-1), S = L.sources;
  for (const t of L.targets) {
    const x = t % L.w, y = (t / L.w) | 0, cx = Math.min(C.w - 1, x >> 1), cy = Math.min(C.h - 1, y >> 1), cs = cn[cy * C.w + cx];
    let s = -1;
    if (cs >= 0) {
      const sx = (cs % C.w) * 2 + (x & 1), sy = ((cs / C.w) | 0) * 2 + (y & 1);
      if (sx < L.w && sy < L.h && L.isSource[sy * L.w + sx]) s = sy * L.w + sx;
    }
    nnf[t] = s >= 0 ? s : S[(rnd() * S.length) | 0];
  }
  return nnf;
}
/* how different two patches are (sum of squared colour differences), giving up once past `best` */
function dist(L, t, s, P, best) {
  const { w, h, img } = L, tx = t % w, ty = (t / w) | 0, sx = s % w, sy = (s / w) | 0;
  let d = 0;
  for (let dy = -P; dy <= P; dy++) {
    const y1 = ty + dy; if (y1 < 0 || y1 >= h) continue;
    const y2 = sy + dy;
    for (let dx = -P; dx <= P; dx++) {
      const x1 = tx + dx; if (x1 < 0 || x1 >= w) continue;
      const a = (y1 * w + x1) * 3, b = (y2 * w + sx + dx) * 3;
      const r = img[a] - img[b], g = img[a + 1] - img[b + 1], bl = img[a + 2] - img[b + 2];
      d += r * r + g * g + bl * bl;
    }
    if (d >= best) return d;
  }
  return d;
}
function patchMatch(L, nnf, P, reverse) {
  const { w, h, targets, sources, isSource } = L, n = targets.length;
  const cost = L.cost && L.cost.length === w * h ? L.cost : (L.cost = new Float32Array(w * h));
  for (let k = 0; k < n; k++) { const t = targets[k]; cost[t] = dist(L, t, nnf[t], P, Infinity); }
  const step = reverse ? -1 : 1, maxR = Math.max(w, h);
  for (let k = reverse ? n - 1 : 0; reverse ? k >= 0 : k < n; k += step) {
    const t = targets[k], tx = t % w, ty = (t / w) | 0;
    let best = nnf[t], bc = cost[t];
    // propagation: a neighbour's match, shifted by one, often fits here too
    for (const [ox, oy] of [[-step, 0], [0, -step]]) {
      const nx = tx + ox, ny = ty + oy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ns = nnf[ny * w + nx]; if (ns < 0) continue;
      const cx = ns % w - ox, cy = ((ns / w) | 0) - oy; if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
      const c = cy * w + cx; if (!isSource[c] || c === best) continue;
      const d = dist(L, t, c, P, bc); if (d < bc) { bc = d; best = c; }
    }
    // random search in shrinking windows around the current best
    const bx = best % w, by = (best / w) | 0;
    for (let r = maxR; r >= 1; r >>= 1) {
      const cx = Math.round(bx + (rnd() * 2 - 1) * r), cy = Math.round(by + (rnd() * 2 - 1) * r);
      if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
      const c = cy * w + cx; if (!isSource[c]) continue;
      const d = dist(L, t, c, P, bc); if (d < bc) { bc = d; best = c; }
    }
    // and now and then anywhere at all, so a better region elsewhere can be found
    const c = sources[(rnd() * sources.length) | 0], d = dist(L, t, c, P, bc); if (d < bc) { bc = d; best = c; }
    nnf[t] = best; cost[t] = bc;
  }
}
/* each hole pixel becomes the weighted average of what the overlapping patches say it should be */
function vote(L, nnf, P) {
  const { w, h, img, hole, targets } = L, acc = new Float32Array(w * h * 3), wsum = new Float32Array(w * h);
  const area = (2 * P + 1) ** 2, sigma2 = 2 * 3 * 22 * 22 * area;
  for (const t of targets) {
    const s = nnf[t]; if (s < 0) continue;
    const tx = t % w, ty = (t / w) | 0, sx = s % w, sy = (s / w) | 0;
    const wt = Math.exp(-(L.cost ? L.cost[t] : 0) / sigma2) + 1e-4;
    for (let dy = -P; dy <= P; dy++) {
      const y1 = ty + dy; if (y1 < 0 || y1 >= h) continue;
      for (let dx = -P; dx <= P; dx++) {
        const x1 = tx + dx; if (x1 < 0 || x1 >= w) continue;
        const q = y1 * w + x1; if (!hole[q]) continue;
        const b = ((sy + dy) * w + sx + dx) * 3;
        acc[q * 3] += img[b] * wt; acc[q * 3 + 1] += img[b + 1] * wt; acc[q * 3 + 2] += img[b + 2] * wt; wsum[q] += wt;
      }
    }
  }
  for (let q = 0; q < w * h; q++) if (hole[q] && wsum[q] > 0) { img[q * 3] = acc[q * 3] / wsum[q]; img[q * 3 + 1] = acc[q * 3 + 1] / wsum[q]; img[q * 3 + 2] = acc[q * 3 + 2] / wsum[q]; }
}
