'use strict';
/* A small animated-GIF writer for Tinto's animated export.
   One 255-colour palette for the whole animation (chosen by median cut from sample frames), ordered
   dithering so the pattern stays still from frame to frame, and only the pixels that changed are
   stored after the first frame (the rest are see-through), which keeps files small.
   Usage: const g = new GifWriter(w, h, sampleFrames); g.addFrame(rgba, delayCs); ... g.finish() -> Uint8Array */
(function(){
  const TRANSPARENT = 255;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v / 16 - 0.5));

  /* median cut: split the box of colours with the widest channel range until there are n boxes */
  function palette(samples, n){
    let boxes = [samples];
    while (boxes.length < n){
      let bi = -1, bestRange = -1, bestCh = 0;
      boxes.forEach((b, i) => {
        if (b.length < 6) return;
        for (let ch = 0; ch < 3; ch++){
          let lo = 255, hi = 0;
          for (let k = ch; k < b.length; k += 3){ const v = b[k]; if (v < lo) lo = v; if (v > hi) hi = v; }
          if (hi - lo > bestRange){ bestRange = hi - lo; bi = i; bestCh = ch; }
        }
      });
      if (bi < 0 || bestRange <= 0) break;
      const b = boxes[bi], m = b.length / 3, idx = new Uint32Array(m);
      for (let i = 0; i < m; i++) idx[i] = i;
      idx.sort((x, y) => b[x * 3 + bestCh] - b[y * 3 + bestCh]);
      const half = m >> 1, A = new Uint8Array(half * 3), B = new Uint8Array((m - half) * 3);
      for (let i = 0; i < m; i++){ const s = idx[i] * 3, T = i < half ? A : B, o = (i < half ? i : i - half) * 3; T[o] = b[s]; T[o + 1] = b[s + 1]; T[o + 2] = b[s + 2]; }
      boxes.splice(bi, 1, A, B);
    }
    const pal = new Uint8Array(256 * 3);
    boxes.forEach((b, i) => {
      let r = 0, g = 0, bl = 0; const m = b.length / 3 || 1;
      for (let k = 0; k < b.length; k += 3){ r += b[k]; g += b[k + 1]; bl += b[k + 2]; }
      pal[i * 3] = r / m; pal[i * 3 + 1] = g / m; pal[i * 3 + 2] = bl / m;
    });
    return {pal, count: boxes.length};
  }
  /* nearest palette colour for every 5-bit-per-channel colour, worked out once */
  function lookup(pal, count){
    const t = new Uint8Array(32768);
    for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++){
      const R = r * 8 + 4, G = g * 8 + 4, B = b * 8 + 4;
      let best = 0, bd = Infinity;
      for (let i = 0; i < count; i++){ const dr = R - pal[i * 3], dg = G - pal[i * 3 + 1], db = B - pal[i * 3 + 2], d = dr * dr * 2 + dg * dg * 3 + db * db; if (d < bd){ bd = d; best = i; } }
      t[(r << 10) | (g << 5) | b] = best;
    }
    return t;
  }

  class Bytes {
    constructor(){ this.chunks = []; this.buf = new Uint8Array(65536); this.n = 0; }
    byte(v){ if (this.n === this.buf.length){ this.chunks.push(this.buf); this.buf = new Uint8Array(65536); this.n = 0; } this.buf[this.n++] = v; }
    word(v){ this.byte(v & 255); this.byte((v >> 8) & 255); }
    bytes(a){ for (let i = 0; i < a.length; i++) this.byte(a[i]); }
    result(){ const all = [...this.chunks, this.buf.subarray(0, this.n)], len = all.reduce((s, c) => s + c.length, 0), out = new Uint8Array(len); let o = 0; for (const c of all){ out.set(c, o); o += c.length; } return out; }
  }

  /* GIF's LZW compression, with codes packed into 255-byte sub-blocks */
  function lzw(out, idx, minCode){
    out.byte(minCode);
    const clear = 1 << minCode, eoi = clear + 1;
    const dict = new Int16Array(4096 * 256);
    let next = eoi + 1, size = minCode + 1, acc = 0, bits = 0;
    const block = new Uint8Array(255); let bn = 0;
    const flushByte = v => { block[bn++] = v; if (bn === 255){ out.byte(255); out.bytes(block); bn = 0; } };
    const emit = code => { acc |= code << bits; bits += size; while (bits >= 8){ flushByte(acc & 255); acc >>>= 8; bits -= 8; } };
    const reset = () => { dict.fill(0); next = eoi + 1; size = minCode + 1; };
    emit(clear);
    let prefix = idx[0];
    for (let i = 1; i < idx.length; i++){
      const k = idx[i], key = prefix * 256 + k, hit = dict[key];
      if (hit){ prefix = hit; continue; }
      emit(prefix);
      if (next < 4096){ dict[key] = next++; if (next > (1 << size) && size < 12) size++; }
      else { emit(clear); reset(); }
      prefix = k;
    }
    emit(prefix); emit(eoi);
    if (bits > 0) flushByte(acc & 255);
    if (bn){ out.byte(bn); out.bytes(block.subarray(0, bn)); }
    out.byte(0);
  }

  class GifWriter {
    constructor(w, h, samples){
      this.w = w; this.h = h; this.out = new Bytes(); this.prev = null;
      // sample colours from the given frames
      const want = 60000, s = [], per = Math.max(1, Math.floor(samples.length ? (samples[0].length / 4) * samples.length / want : 1));
      for (const f of samples) for (let i = 0; i < f.length; i += 4 * per) s.push(f[i], f[i + 1], f[i + 2]);
      const {pal, count} = palette(new Uint8Array(s), 255);
      this.pal = pal; this.table = lookup(pal, count);
      const o = this.out;
      o.bytes([71, 73, 70, 56, 57, 97]); o.word(w); o.word(h);
      o.byte(0xF7); o.byte(0); o.byte(0); o.bytes(pal);                  // global colour table, 256 entries
      o.bytes([0x21, 0xFF, 11, 78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48, 3, 1, 0, 0, 0]);   // loop for ever
    }
    addFrame(rgba, delayCs){
      const {w, h, table} = this, n = w * h, idx = new Uint8Array(n);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
        const i = y * w + x, p = i * 4, d = BAYER[((y & 3) << 2) | (x & 3)] * 22;
        const r = Math.max(0, Math.min(255, rgba[p] + d)) >> 3, g = Math.max(0, Math.min(255, rgba[p + 1] + d)) >> 3, b = Math.max(0, Math.min(255, rgba[p + 2] + d)) >> 3;
        idx[i] = table[(r << 10) | (g << 5) | b];
      }
      // after the first frame, store only what changed, in the smallest rectangle around it
      let x0 = 0, y0 = 0, x1 = w - 1, y1 = h - 1, data = idx, transparent = false;
      if (this.prev){
        const pv = this.prev; x0 = w; y0 = h; x1 = -1; y1 = -1;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){ const i = y * w + x; if (idx[i] !== pv[i]){ if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
        if (x1 < 0){ x0 = y0 = x1 = y1 = 0; }
        const cw = x1 - x0 + 1, ch = y1 - y0 + 1; data = new Uint8Array(cw * ch); transparent = true;
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++){ const i = (y0 + y) * w + x0 + x; data[y * cw + x] = idx[i] === pv[i] ? TRANSPARENT : idx[i]; }
      }
      this.prev = idx;
      const o = this.out;
      o.bytes([0x21, 0xF9, 4, (1 << 2) | (transparent ? 1 : 0)]); o.word(delayCs); o.byte(TRANSPARENT); o.byte(0);
      o.byte(0x2C); o.word(x0); o.word(y0); o.word(x1 - x0 + 1); o.word(y1 - y0 + 1); o.byte(0);
      lzw(o, data, 8);
    }
    finish(){ this.out.byte(0x3B); return this.out.result(); }
  }
  window.GifWriter = GifWriter;
})();
