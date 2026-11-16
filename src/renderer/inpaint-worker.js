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
  const { id, w, h, rgba, hole, reach } = e.data;
  try {
    const out = complete(rgba, w, h, hole, reach);
    self.postMessage({ id, rgba: out }, [out.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
else self.TintoInpaint = complete;

function complete(rgba, W, H, hole0, reach) {
  if (reach > 0) hole0 = growHole(rgba, W, H, hole0, reach);
  // the pyramid: each level half the size of the one before, down to a hole a few pixels across
  const levels = [{ w: W, h: H, img: toFloat(rgba, W * H), hole: hole0 }];
  while (true) {
    const L = levels[levels.length - 1];
    // stop once the hole is only a few pixels thick: below that, the picture around it is too blurry to choose from
    if (Math.min(L.w, L.h) < 48 || holeThickness(L) <= 8 || levels.length > 3) break;
    levels.push(down(L));
  }
  let nnf = null;
  for (let li = levels.length - 1; li >= 0; li--) {
    const L = levels[li], first = !nnf;
    L.level = li;
    const P = 3;                                         // 7x7 patches
    prepare(L, P);
    if (!L.sources.length) { diffuse(L); nnf = null; continue; }    // nothing left to copy from
    if (first) { nnf = randomNNF(L); peelInit(L, nnf, P); }
    else { nnf = upsampleNNF(nnf, levels[li + 1], L); vote(L, nnf, P); }
    const em = first ? 6 : li === 0 ? 3 : 4;
    for (let it = 0; it < em; it++) {
      for (let pass = 0; pass < 3; pass++) patchMatch(L, nnf, P, (it * 3 + pass) % 2 === 1);
      // averaging the votes is smooth and stable while the matches settle; the very last pass
      // copies each pixel from its single best match instead, so grain, lines and texture stay crisp
      if (li === 0 && it === em - 1) voteBest(L, nnf, P); else vote(L, nnf, P);
    }
    L.nnf = nnf;
  }
  const top = levels[0];
  if (top.targets && top.sources.length) matchSeam(top);
  const out = new Uint8ClampedArray(rgba);
  // filled pixels are marked with alpha 250, so the editor knows exactly which area was replaced
  for (let i = 0, n = W * H; i < n; i++) if (hole0[i]) { out[i * 4] = top.img[i * 3]; out[i * 4 + 1] = top.img[i * 3 + 1]; out[i * 4 + 2] = top.img[i * 3 + 2]; out[i * 4 + 3] = 250; } else out[i * 4 + 3] = 255;
  return out;
}

/* People rarely paint over all of a thing: a sliver of it, its outline or its shadow is left just outside
   the brush, and stays behind as a ghost. So before filling, the painted area spreads over anything
   touching it (within `reach` pixels) that stands out from what the background there should look like. */
function growHole(rgba, W, H, hole, reach) {
  // what the background should look like: the photo at quarter size with the hole smoothed over, blurred
  const L0 = { w: W, h: H, img: toFloat(rgba, W * H), hole };
  const L1 = down(L0), L2 = down(L1); diffuse(L2);
  const bw = L2.w, bh = L2.h; let b = L2.img;
  for (let pass = 0; pass < 2; pass++) {
    const o = new Float32Array(b.length);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      let r = 0, g = 0, bl = 0, n = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= bw || yy >= bh) continue; const j = (yy * bw + xx) * 3; r += b[j]; g += b[j + 1]; bl += b[j + 2]; n++; }
      const i = (y * bw + x) * 3; o[i] = r / n; o[i + 1] = g / n; o[i + 2] = bl / n;
    }
    b = o;
  }
  const diff = i => {
    const x = i % W, y = (i / W) | 0, fx = Math.min(bw - 1.001, Math.max(0, x / 4 - 0.375)), fy = Math.min(bh - 1.001, Math.max(0, y / 4 - 0.375));
    const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0, a = (y0 * bw + x0) * 3, c = a + bw * 3;
    let d = 0;
    for (let ch = 0; ch < 3; ch++) {
      const v = (b[a + ch] * (1 - tx) + b[a + 3 + ch] * tx) * (1 - ty) + (b[c + ch] * (1 - tx) + b[c + 3 + ch] * tx) * ty;
      d = Math.max(d, Math.abs(rgba[i * 4 + ch] - v));
    }
    return d;
  };
  // how far each nearby pixel is from the painted area
  const far = reach * 2, dist = new Int16Array(W * H).fill(-1);
  let ring = [];
  for (let i = 0; i < W * H; i++) if (hole[i]) dist[i] = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (hole[i] && ((x > 0 && !hole[i - 1]) || (x < W - 1 && !hole[i + 1]) || (y > 0 && !hole[i - W]) || (y < H - 1 && !hole[i + W]))) ring.push(i); }
  const edge = ring.slice(), outer = [];
  for (let d = 1; d <= far && ring.length; d++) {
    const next = [];
    for (const i of ring) { const x = i % W, y = (i / W) | 0; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && dist[j] < 0) { dist[j] = d; next.push(j); if (d > reach) outer.push(j); } }
    ring = next;
  }
  // how much ordinary background differs from its own blur (grain, wood, grass): standing out means well above that
  const sample = []; for (let k = 0; k < outer.length; k += Math.max(1, (outer.length / 3000) | 0)) sample.push(diff(outer[k]));
  sample.sort((a, c) => a - c);
  const typical = sample.length ? sample[(sample.length * 0.75) | 0] : 8;
  let holeArea = 0; for (let i = 0; i < W * H; i++) if (hole[i]) holeArea++;
  // the colours of the thing itself: whatever stands out inside the painted area. Only more of the same
  // may be added, so a street light or a face next to the brush is left alone.
  const bins = new Uint16Array(4096), bin = i => ((rgba[i * 4] >> 4) << 8) | ((rgba[i * 4 + 1] >> 4) << 4) | (rgba[i * 4 + 2] >> 4);
  const base = Math.max(20, typical * 2.6);
  for (let i = 0; i < W * H; i++) if (hole[i] && diff(i) > base) bins[bin(i)]++;
  const need = Math.max(3, holeArea * 0.0015);
  const likeObject = i => {
    const r = rgba[i * 4] >> 4, g = rgba[i * 4 + 1] >> 4, bl = rgba[i * 4 + 2] >> 4; let n = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dg = -1; dg <= 1; dg++) for (let db = -1; db <= 1; db++) {
      const R = r + dr, G = g + dg, B = bl + db; if (R < 0 || G < 0 || B < 0 || R > 15 || G > 15 || B > 15) continue;
      n += bins[(R << 8) | (G << 4) | B];
    }
    return n >= need;
  };
  for (let thr = base, attempt = 0; attempt < 1; attempt++) {
    const grown = hole.slice(); let added = 0; const q = edge.slice();
    while (q.length) {
      const i = q.pop(), x = i % W, y = (i / W) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j < 0 || grown[j] || dist[j] < 0 || dist[j] > reach) continue;
        if (diff(j) > thr && likeObject(j)) { grown[j] = 1; added++; q.push(j); }
      }
    }
    // a leftover sliver is small. If it spread a long way, the background is busy or another object is
    // touching: leave it, and fill just what was painted
    if (added > holeArea * 0.1) break;
    if (!added) return hole;
    // two pixels more round what was added, for its soft edges
    const out = grown.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!grown[i] || hole[i]) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) out[yy * W + xx] = 1; }
    }
    return out;
  }
  return hole;
}

/* each hole pixel takes its colour from the overlapping patch that matched best */
function voteBest(L, nnf, P) {
  const { w, h, img, hole, targets, cost } = L, best = new Float32Array(w * h).fill(Infinity), src = new Int32Array(w * h).fill(-1);
  for (const t of targets) {
    const s = nnf[t]; if (s < 0) continue;
    const c = cost[t], tx = t % w, ty = (t / w) | 0, sx = s % w, sy = (s / w) | 0;
    for (let dy = -P; dy <= P; dy++) {
      const y1 = ty + dy; if (y1 < 0 || y1 >= h) continue;
      for (let dx = -P; dx <= P; dx++) {
        const x1 = tx + dx; if (x1 < 0 || x1 >= w) continue;
        const q = y1 * w + x1; if (!hole[q]) continue;
        // prefer patches centred near this pixel: the middle of a patch is matched most reliably
        const d = c * (1 + 0.15 * (Math.abs(dx) + Math.abs(dy)));
        if (d < best[q]) { best[q] = d; src[q] = (sy + dy) * w + sx + dx; }
      }
    }
  }
  const prev = img.slice();
  for (let q = 0; q < w * h; q++) if (hole[q] && src[q] >= 0) { const b = src[q] * 3; img[q * 3] = prev[b]; img[q * 3 + 1] = prev[b + 1]; img[q * 3 + 2] = prev[b + 2]; }
}

/* any remaining step in brightness or colour where the fill meets the photo is spread smoothly
   across the fill (a membrane), so no outline of the old object shows */
function matchSeam(L) {
  const { w, h, img, hole } = L, bx = [], by = [], bd = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!hole[i]) continue;
    let r = 0, g = 0, b = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const j = yy * w + xx; if (hole[j]) continue;
      r += img[j * 3]; g += img[j * 3 + 1]; b += img[j * 3 + 2]; n++;
    }
    // a bright line or sharp edge crossing the border isn't a colour mismatch: cap each difference
    const c = v => Math.max(-18, Math.min(18, v));
    if (n) { bx.push(x); by.push(y); bd.push(c(r / n - img[i * 3]), c(g / n - img[i * 3 + 1]), c(b / n - img[i * 3 + 2])); }
  }
  if (!bx.length) return;
  // smooth the differences along the edge a little (single noisy pixels shouldn't count), and use at most ~500 of them
  const m = bx.length, step = Math.max(1, Math.floor(m / 500)), sx = [], sy = [], sd = [];
  for (let k = 0; k < m; k += step) {
    // the median of the nearby differences, so a few pixels of a bright line don't tint the fill
    const R = [], G = [], B = [];
    for (let j = 0; j < m; j++) if (Math.abs(bx[j] - bx[k]) <= 6 && Math.abs(by[j] - by[k]) <= 6) { R.push(bd[j * 3]); G.push(bd[j * 3 + 1]); B.push(bd[j * 3 + 2]); }
    const med = a => { a.sort((x, y) => x - y); return a[a.length >> 1]; };
    sx.push(bx[k]); sy.push(by[k]); sd.push(med(R), med(G), med(B));
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!hole[i]) continue;
    let r = 0, g = 0, b = 0, ws = 0;
    for (let k = 0; k < sx.length; k++) {
      const dx = x - sx[k], dy = y - sy[k], d2 = dx * dx + dy * dy + 0.5, wt = 1 / (d2 * Math.sqrt(d2));
      r += sd[k * 3] * wt; g += sd[k * 3 + 1] * wt; b += sd[k * 3 + 2] * wt; ws += wt;
    }
    img[i * 3] += r / ws; img[i * 3 + 1] += g / ws; img[i * 3 + 2] += b / ws;
  }
}

function toFloat(rgba, n) { const f = new Float32Array(n * 3); for (let i = 0; i < n; i++) { f[i * 3] = rgba[i * 4]; f[i * 3 + 1] = rgba[i * 4 + 1]; f[i * 3 + 2] = rgba[i * 4 + 2]; } return f; }
function holeExtent(L) {
  let x0 = L.w, y0 = L.h, x1 = -1, y1 = -1;
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if (L.hole[y * L.w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? 0 : Math.max(x1 - x0, y1 - y0) + 1;
}
/* how many pixels you can go inwards from the hole's edge before it runs out (half its thickness) */
function holeThickness(L) {
  const { w, h } = L; let cur = L.hole.slice(), n = 0;
  while (n < 64) {
    let any = 0; const nx = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (cur[i] && cur[i - 1] && cur[i + 1] && cur[i - w] && cur[i + w]) { nx[i] = 1; any = 1; }
    }
    n++; if (!any) break; cur = nx;
  }
  return n;
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
/* first guess at the smallest size: fill from the edge inwards, one ring at a time, each pixel copied
   from the patch that best matches what's already known around it (so a saucer's rim carries on as
   saucer, rather than everything becoming the commonest texture in the photo) */
function peelInit(L, nnf, P) {
  const { w, h, img, hole, sources, isSource } = L, known = new Uint8Array(w * h), depth = new Int32Array(w * h).fill(-1);
  let ring = [];
  for (let i = 0; i < w * h; i++) if (!hole[i]) known[i] = 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!hole[i]) continue;
    if ((x > 0 && !hole[i - 1]) || (x < w - 1 && !hole[i + 1]) || (y > 0 && !hole[i - w]) || (y < h - 1 && !hole[i + w])) { depth[i] = 0; ring.push(i); }
  }
  const order = [];
  while (ring.length) {
    order.push(...ring); const next = [];
    for (const i of ring) {
      const x = i % w, y = (i / w) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && hole[j] && depth[j] < 0) { depth[j] = depth[i] + 1; next.push(j); }
    }
    ring = next;
  }
  const partial = (t, s, best) => {
    const tx = t % w, ty = (t / w) | 0, sx = s % w, sy = (s / w) | 0, k = 1 << (L.level || 0);
    let d = ((sx - tx) * (sx - tx) * NEAR_X + (sy - ty) * (sy - ty) * NEAR_Y) * k * k, n = 0;
    for (let dy = -P; dy <= P; dy++) {
      const y1 = ty + dy; if (y1 < 0 || y1 >= h) continue;
      for (let dx = -P; dx <= P; dx++) {
        const x1 = tx + dx; if (x1 < 0 || x1 >= w) continue;
        const a = y1 * w + x1; if (!known[a]) continue;
        const b = ((sy + dy) * w + sx + dx) * 3, a3 = a * 3;
        const r = img[a3] - img[b], g = img[a3 + 1] - img[b + 1], bl = img[a3 + 2] - img[b + 2];
        d += r * r + g * g + bl * bl; n++;
      }
    }
    return n ? d / n : Infinity;
  };
  const tries = Math.min(sources.length, 400);
  for (const q of order) {
    const qx = q % w, qy = (q / w) | 0;
    let best = -1, bc = Infinity;
    const consider = c => { if (c < 0 || !isSource[c]) return; const d = partial(q, c, bc); if (d < bc) { bc = d; best = c; } };
    // what the neighbours already copied, shifted along
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = qx + dx, ny = qy + dy; if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx; if (!hole[j] || !known[j] || nnf[j] < 0) continue;
      const s = nnf[j], cx = s % w - dx, cy = ((s / w) | 0) - dy; if (cx >= 0 && cy >= 0 && cx < w && cy < h) consider(cy * w + cx);
    }
    // the photo just around it, and a spread of places further away
    for (let k = 0; k < tries; k++) {
      const r = k < tries / 2 ? 6 + k : Math.max(w, h);
      const cx = Math.round(qx + (rnd() * 2 - 1) * r), cy = Math.round(qy + (rnd() * 2 - 1) * r);
      if (cx >= 0 && cy >= 0 && cx < w && cy < h) consider(cy * w + cx);
    }
    if (best < 0) best = sources[(rnd() * sources.length) | 0];
    nnf[q] = best; img[q * 3] = img[best * 3]; img[q * 3 + 1] = img[best * 3 + 1]; img[q * 3 + 2] = img[best * 3 + 2]; known[q] = 1;
  }
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
// copying from nearby (and above all, from the same height in the photo) keeps skies, water and walls
// the right shade: a patch from far up or down a smooth gradient looks alike but is lighter or darker
const NEAR_X = 0.2, NEAR_Y = 3;
function dist(L, t, s, P, best) {
  const { w, h, img } = L, tx = t % w, ty = (t / w) | 0, sx = s % w, sy = (s / w) | 0;
  const k = 1 << (L.level || 0);       // the penalty is in full-size pixels, at every level
  let d = ((sx - tx) * (sx - tx) * NEAR_X + (sy - ty) * (sy - ty) * NEAR_Y) * k * k;
  if (d >= best) return d;
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
