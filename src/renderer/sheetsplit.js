/* Splits a sticker sheet (many stickers on one image) into separate transparent stickers.
   Works on three kinds of sheet:
   - real transparency: the stickers are already cut out, they just need separating
   - a painted grey-and-white check pattern (common in AI-made sheets that "look" transparent)
   - a plain or near-plain background colour
   Stickers whose white borders touch are separated where the join is narrow.
   window.splitStickerSheet(canvas, onProgress) -> Promise<[{canvas, x, y, w, h}]> */
(function(){
  const tick = () => new Promise(r => setTimeout(r, 0));

  // box blur of a 0..1 float map with an integral image (edges clamp)
  function boxBlur(src, W, H, r){
    const I = new Float64Array((W+1)*(H+1));
    for (let y=0; y<H; y++){
      let row = 0;
      for (let x=0; x<W; x++){ row += src[y*W+x]; I[(y+1)*(W+1)+x+1] = I[y*(W+1)+x+1] + row; }
    }
    const out = new Float32Array(W*H);
    for (let y=0; y<H; y++){
      const y0 = Math.max(0, y-r), y1 = Math.min(H, y+r+1);
      for (let x=0; x<W; x++){
        const x0 = Math.max(0, x-r), x1 = Math.min(W, x+r+1);
        const s = I[y1*(W+1)+x1] - I[y0*(W+1)+x1] - I[y1*(W+1)+x0] + I[y0*(W+1)+x0];
        out[y*W+x] = s / ((y1-y0)*(x1-x0));
      }
    }
    return out;
  }
  const toF = m => { const f = new Float32Array(m.length); for (let i=0; i<m.length; i++) f[i] = m[i]; return f; };
  function dilate(m, W, H, r){ const b = boxBlur(toF(m), W, H, r), o = new Uint8Array(m.length); for (let i=0; i<o.length; i++) o[i] = b[i] > 1e-6 ? 1 : 0; return o; }
  function erode(m, W, H, r){ const b = boxBlur(toF(m), W, H, r), o = new Uint8Array(m.length); for (let i=0; i<o.length; i++) o[i] = b[i] > 0.9999 ? 1 : 0; return o; }
  const close = (m, W, H, r) => erode(dilate(m, W, H, r), W, H, r);

  // pixels of `pass` reachable from the image edge (4-connected)
  function floodFromEdge(pass, W, H){
    const seen = new Uint8Array(W*H), q = new Int32Array(W*H); let qh = 0, qt = 0;
    const push = i => { if (pass[i] && !seen[i]){ seen[i] = 1; q[qt++] = i; } };
    for (let x=0; x<W; x++){ push(x); push((H-1)*W+x); }
    for (let y=0; y<H; y++){ push(y*W); push(y*W+W-1); }
    while (qh < qt){
      const i = q[qh++], x = i % W;
      if (x > 0) push(i-1); if (x < W-1) push(i+1);
      if (i >= W) push(i-W); if (i < W*(H-1)) push(i+W);
    }
    return seen;
  }

  // connected components of a mask (4-connected); returns labels and count
  function label(m, W, H){
    const lab = new Int32Array(W*H), q = new Int32Array(W*H); let n = 0;
    for (let s=0; s<m.length; s++){
      if (!m[s] || lab[s]) continue;
      n++; let qh = 0, qt = 0; q[qt++] = s; lab[s] = n;
      while (qh < qt){
        const i = q[qh++], x = i % W;
        const nb = [x > 0 ? i-1 : -1, x < W-1 ? i+1 : -1, i >= W ? i-W : -1, i < W*(H-1) ? i+W : -1];
        for (const j of nb) if (j >= 0 && m[j] && !lab[j]){ lab[j] = n; q[qt++] = j; }
      }
    }
    return {lab, n};
  }

  // distance to the nearest background pixel (chamfer 1 / 1.4)
  function distance(m, W, H){
    const d = new Float32Array(W*H), INF = 1e9;
    for (let i=0; i<d.length; i++) d[i] = m[i] ? INF : 0;
    for (let y=0; y<H; y++) for (let x=0; x<W; x++){
      const i = y*W+x; if (!d[i]) continue; let v = d[i];
      if (x > 0) v = Math.min(v, d[i-1]+1);
      if (y > 0){ v = Math.min(v, d[i-W]+1); if (x > 0) v = Math.min(v, d[i-W-1]+1.4); if (x < W-1) v = Math.min(v, d[i-W+1]+1.4); }
      d[i] = v;
    }
    for (let y=H-1; y>=0; y--) for (let x=W-1; x>=0; x--){
      const i = y*W+x; if (!d[i]) continue; let v = d[i];
      if (x < W-1) v = Math.min(v, d[i+1]+1);
      if (y < H-1){ v = Math.min(v, d[i+W]+1); if (x < W-1) v = Math.min(v, d[i+W+1]+1.4); if (x > 0) v = Math.min(v, d[i+W-1]+1.4); }
      d[i] = v;
    }
    return d;
  }

  // a painted check pattern mixes two distinct greys in every small patch; soft shading does not
  function checkerSeed(px, W, H, neutralTol){
    const N = W*H, dk = new Float32Array(N), br = new Float32Array(N), lum = new Float32Array(N), neu = new Uint8Array(N);
    for (let i=0, j=0; i<N; i++, j+=4){
      const r = px[j], g = px[j+1], b = px[j+2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (r+g+b)/3;
      lum[i] = l; neu[i] = (mx - mn) < neutralTol ? 1 : 0;
      dk[i] = neu[i] && l > 192 && l < 240 ? 1 : 0;
      br[i] = neu[i] && l > 243 ? 1 : 0;
    }
    const fd = boxBlur(dk, W, H, 5), fb = boxBlur(br, W, H, 5), seed = new Uint8Array(N);
    for (let i=0; i<N; i++) seed[i] = neu[i] && lum[i] > 188 && fd[i] > 0.14 && fb[i] > 0.14 && fd[i]+fb[i] > 0.58 ? 1 : 0;
    return seed;
  }

  async function splitStickerSheet(src, onProgress = () => {}){
    const W = src.width, H = src.height, N = W*H;
    const px = src.getContext('2d').getImageData(0, 0, W, H).data;
    const S = Math.max(W, H) / 1536;                 // scale the tuning numbers to the sheet's size
    onProgress('Finding the background…'); await tick();

    let transparent = 0;
    for (let j=3; j<px.length; j+=4) if (px[j] < 128) transparent++;
    let mode, fg = new Uint8Array(N), seed = null;
    if (transparent > N*0.02){
      mode = 'alpha';
      for (let i=0; i<N; i++) fg[i] = px[i*4+3] > 110 ? 1 : 0;
    } else {
      seed = checkerSeed(px, W, H, 48);   // tolerant of the faint tint that glows leave in the gaps
      let onEdge = 0, edgeN = 0;
      const edgeHit = i => { edgeN++; if (seed[i]) onEdge++; };
      for (let x=0; x<W; x++){ edgeHit(x); edgeHit((H-1)*W+x); }
      for (let y=1; y<H-1; y++){ edgeHit(y*W); edgeHit(y*W+W-1); }
      let pass;
      if (onEdge > edgeN*0.35){
        mode = 'checker'; pass = seed;
      } else {
        mode = 'plain';
        // background colour: the median of the edge pixels
        const rs = [], gs = [], bs = [];
        const take = i => { rs.push(px[i*4]); gs.push(px[i*4+1]); bs.push(px[i*4+2]); };
        for (let x=0; x<W; x+=2){ take(x); take((H-1)*W+x); }
        for (let y=0; y<H; y+=2){ take(y*W); take(y*W+W-1); }
        const med = a => a.sort((p, q) => p-q)[a.length >> 1];
        const R = med(rs), G = med(gs), B = med(bs);
        pass = new Uint8Array(N);
        for (let i=0, j=0; i<N; i++, j+=4){ const dr = px[j]-R, dg = px[j+1]-G, db = px[j+2]-B; pass[i] = dr*dr+dg*dg+db*db < 30*30 ? 1 : 0; }
      }
      let bg = floodFromEdge(pass, W, H);
      if (mode === 'checker') bg = close(bg, W, H, 2);
      for (let i=0; i<N; i++) fg[i] = bg[i] ? 0 : 1;
      if (mode === 'checker') fg = close(fg, W, H, 3);   // bridge small gaps in thin outlines
    }
    onProgress('Separating the stickers…'); await tick();

    // fill holes: anything not reachable from the edge through the background is part of a sticker
    const inv = new Uint8Array(N); for (let i=0; i<N; i++) inv[i] = fg[i] ? 0 : 1;
    const outside = floodFromEdge(inv, W, H);
    for (let i=0; i<N; i++) fg[i] = outside[i] ? 0 : 1;

    // stickers joined by a narrow bridge: find their cores, then grow each core back over its own pixels
    const dist = distance(fg, W, H), E = Math.max(3, Math.round((mode === 'alpha' ? 6 : 9) * S));
    const F = label(fg, W, H), minCore = 120 * S * S;
    // try the gentle erosion first, then harder ones; a harder split only counts if it leaves
    // two or more big, similar-sized cores (two drawings), not one drawing and a stray bit
    const seedLab = new Int32Array(N), splitDone = new Uint8Array(F.n+1);
    let nextSeed = 0;
    for (const [k, strict] of [[1, false], [1.4, true], [1.8, true]]){
      const L = E * k, core = new Uint8Array(N);
      for (let i=0; i<N; i++) core[i] = dist[i] > L && !splitDone[F.lab[i]] ? 1 : 0;
      const C = label(core, W, H), size = new Int32Array(C.n+1);
      for (let i=0; i<N; i++) size[C.lab[i]]++;
      const byComp = new Map();
      const compOf = new Int32Array(C.n+1);
      for (let i=0; i<N; i++){ const c = C.lab[i]; if (c && !compOf[c]) compOf[c] = F.lab[i]; }
      for (let c=1; c<=C.n; c++){
        if (size[c] < minCore) continue;
        const f = compOf[c]; if (!byComp.has(f)) byComp.set(f, []); byComp.get(f).push(c);
      }
      const accept = new Map();
      for (const [f, cs] of byComp){
        let keep = cs;
        if (strict){
          const big = Math.max(...cs.map(c => size[c]));
          keep = cs.filter(c => size[c] >= Math.max(minCore*3, big*0.18));
        }
        if (keep.length >= 2) for (const c of keep) accept.set(c, f);
      }
      if (!accept.size) continue;
      const newId = new Map();
      for (let i=0; i<N; i++){
        const c = C.lab[i]; if (!c || !accept.has(c)) continue;
        if (!newId.has(c)) newId.set(c, ++nextSeed);
        seedLab[i] = newId.get(c);
      }
      for (const f of accept.values()) splitDone[f] = 1;
    }
    const out = new Int32Array(N), q = new Int32Array(N); let qh = 0, qt = 0;
    for (let i=0; i<N; i++){
      if (!fg[i]) continue;
      if (splitDone[F.lab[i]]){ if (seedLab[i]){ out[i] = F.n + seedLab[i]; q[qt++] = i; } }
      else out[i] = F.lab[i];
    }
    while (qh < qt){
      const i = q[qh++], x = i % W, v = out[i];
      const nb = [x > 0 ? i-1 : -1, x < W-1 ? i+1 : -1, i >= W ? i-W : -1, i < W*(H-1) ? i+W : -1];
      for (const j of nb) if (j >= 0 && fg[j] && !out[j]){ out[j] = v; q[qt++] = j; }
    }
    onProgress('Cutting them out…'); await tick();

    // bounding boxes
    const boxes = new Map();
    for (let y=0; y<H; y++) for (let x=0; x<W; x++){
      const v = out[y*W+x]; if (!v) continue;
      let b = boxes.get(v); if (!b){ b = {x0:x, y0:y, x1:x, y1:y, area:0}; boxes.set(v, b); }
      if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y; b.area++;
    }
    const minArea = Math.max(150, 600 * S * S), pieces = [];
    for (const [v, b] of boxes){
      if (b.area < minArea) continue;
      const pad = 2, x0 = Math.max(0, b.x0-pad), y0 = Math.max(0, b.y0-pad), x1 = Math.min(W-1, b.x1+pad), y1 = Math.min(H-1, b.y1+pad);
      const w = x1-x0+1, h = y1-y0+1;
      const m = new Uint8Array(w*h);
      for (let y=0; y<h; y++) for (let x=0; x<w; x++) m[y*w+x] = out[(y0+y)*W + x0+x] === v ? 1 : 0;
      const keep = dilate(m, w, h, 1);
      // soften the cut edge a little (painted backgrounds have no real alpha)
      const soft = mode === 'alpha' ? null : boxBlur(toF(keep), w, h, 1);
      // check pattern trapped between neighbours, near this sticker's edge: clear it
      let trapped = null;
      if (mode === 'checker'){
        const sm = new Uint8Array(w*h);
        for (let y=0; y<h; y++) for (let x=0; x<w; x++) sm[y*w+x] = keep[y*w+x] && seed[(y0+y)*W + x0+x] ? 1 : 0;
        const L = label(sm, w, h), size = new Int32Array(L.n+1); for (let i=0; i<sm.length; i++) size[L.lab[i]]++;
        const dEdge = distance(keep, w, h), near = new Uint8Array(L.n+1);
        for (let i=0; i<sm.length; i++) if (L.lab[i] && dEdge[i] < 22*S && size[L.lab[i]] > 60*S*S) near[L.lab[i]] = 1;
        trapped = new Uint8Array(w*h); for (let i=0; i<sm.length; i++) trapped[i] = near[L.lab[i]];
      }
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const cx = c.getContext('2d'), id = cx.createImageData(w, h), d = id.data;
      for (let y=0; y<h; y++) for (let x=0; x<w; x++){
        const i = y*w+x, s = ((y0+y)*W + x0+x)*4, o = i*4;
        d[o] = px[s]; d[o+1] = px[s+1]; d[o+2] = px[s+2];
        let a = mode === 'alpha' ? (keep[i] ? px[s+3] : 0) : Math.round(255 * soft[i] * keep[i]);
        if (trapped && trapped[i]) a = 0;
        d[o+3] = a;
      }
      cx.putImageData(id, 0, 0);
      pieces.push({canvas:c, x:x0, y:y0, w, h});
    }
    // reading order: rows top to bottom, then left to right
    const row = Math.max(30, 60*S);
    pieces.sort((a, b) => Math.round((a.y+a.h/2)/row) - Math.round((b.y+b.h/2)/row) || (a.x - b.x));
    return pieces.slice(0, 400);
  }
  /* Splits one cut-out into several, one per tapped point: each pixel goes to the nearest tap,
     measured along the sticker itself, so the cut falls where the drawings meet. */
  function splitAtPoints(src, points){
    const W = src.width, H = src.height, img = src.getContext('2d').getImageData(0, 0, W, H), d = img.data;
    const lab = new Int32Array(W*H), q = new Int32Array(W*H); let qh = 0, qt = 0;
    points.forEach((p, k) => {
      const x = Math.max(0, Math.min(W-1, Math.round(p.x))), y = Math.max(0, Math.min(H-1, Math.round(p.y))), i = y*W+x;
      if (d[i*4+3] > 0 && !lab[i]){ lab[i] = k+1; q[qt++] = i; }
    });
    while (qh < qt){
      const i = q[qh++], x = i % W, v = lab[i];
      const nb = [x > 0 ? i-1 : -1, x < W-1 ? i+1 : -1, i >= W ? i-W : -1, i < W*(H-1) ? i+W : -1];
      for (const j of nb) if (j >= 0 && !lab[j] && d[j*4+3] > 0){ lab[j] = v; q[qt++] = j; }
    }
    const pieces = [];
    for (let k=1; k<=points.length; k++){
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let y=0; y<H; y++) for (let x=0; x<W; x++) if (lab[y*W+x] === k){ if (x<x0) x0=x; if (x>x1) x1=x; if (y<y0) y0=y; if (y>y1) y1=y; }
      if (x1 < 0) continue;
      const w = x1-x0+1, h = y1-y0+1, c = document.createElement('canvas'); c.width = w; c.height = h;
      const cx = c.getContext('2d'), o = cx.createImageData(w, h);
      for (let y=0; y<h; y++) for (let x=0; x<w; x++){
        const si = (y0+y)*W + x0+x, oi = (y*w+x)*4;
        if (lab[si] !== k) continue;
        o.data[oi] = d[si*4]; o.data[oi+1] = d[si*4+1]; o.data[oi+2] = d[si*4+2]; o.data[oi+3] = d[si*4+3];
      }
      cx.putImageData(o, 0, 0);
      pieces.push({canvas:c, x:x0, y:y0, w, h});
    }
    return pieces;
  }
  window.splitStickerSheet = splitStickerSheet;
  window.splitStickerAt = splitAtPoints;
})();
