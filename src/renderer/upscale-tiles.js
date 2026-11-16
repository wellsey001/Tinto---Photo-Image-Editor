'use strict';
/* AI upscale, shared by the desktop app (run in its background process, see ../cutout.js) and the
   Android app (run in the page, see ai-web.js). Swin2SR works on small squares, so the photo is cut into
   overlapping 128 px tiles; each is enlarged, and only its middle is kept, so no seams show where they meet.
   rgb: Uint8Array (w*h*3). Returns Uint8Array (w*f * h*f * 3). */
(function (root) {
  const TILE = 128, MARGIN = 12;
  const starts = n => {
    if (n <= TILE) return [0];
    const s = []; for (let p = 0; p < n - TILE; p += TILE - 2 * MARGIN) s.push(p);
    s.push(n - TILE); return s;
  };
  async function upscaleTiles(T, model, processor, rgb, w, h, f, onProgress = () => {}, cancelled = () => false) {
    const W = w * f, H = h * f, out = new Uint8Array(W * H * 3);
    const xs = starts(w), ys = starts(h), total = xs.length * ys.length;
    let done = 0;
    for (const ty of ys) for (const tx of xs) {
      if (cancelled()) throw new Error('cancelled');
      const tw = Math.min(TILE, w), th = Math.min(TILE, h), crop = new Uint8ClampedArray(tw * th * 3);
      for (let y = 0; y < th; y++) crop.set(rgb.subarray(((ty + y) * w + tx) * 3, ((ty + y) * w + tx + tw) * 3), y * tw * 3);
      const { pixel_values } = await processor(new T.RawImage(crop, tw, th, 3));
      const { reconstruction } = await model({ pixel_values });
      const [, , oh, ow] = reconstruction.dims, d = reconstruction.data, plane = oh * ow;
      // keep the middle of the tile; the edges of the photo are kept in full
      const x0 = tx === 0 ? 0 : tx + MARGIN, x1 = tx + tw >= w ? w : tx + tw - MARGIN;
      const y0 = ty === 0 ? 0 : ty + MARGIN, y1 = ty + th >= h ? h : ty + th - MARGIN;
      for (let oy = y0 * f; oy < y1 * f; oy++) {
        const sy = oy - ty * f, row = oy * W;
        for (let ox = x0 * f; ox < x1 * f; ox++) {
          const s = sy * ow + (ox - tx * f), o = (row + ox) * 3;
          for (let c = 0; c < 3; c++) { const v = d[c * plane + s] * 255; out[o + c] = v < 0 ? 0 : v > 255 ? 255 : v + 0.5; }
        }
      }
      done++;
      onProgress({ phase: 'working', progress: done / total, done, total });
    }
    return out;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { upscaleTiles };
  else root.TintoUpscaleTiles = upscaleTiles;
})(typeof self !== 'undefined' ? self : this);
