'use strict';

// Background removal for custom stickers: MODNet portrait matting (the same model Snippy uses),
// running locally through transformers.js. The model (about 25 MB) downloads the first time it's
// used and is cached in the app data folder after that. Free of Electron, so the build can test it.

const SEG_MODEL = 'Xenova/modnet';
// Sky finding: SegFormer trained on ADE20K (150 kinds of things, "sky" among them), about 15 MB.
const SKY_MODEL = 'Xenova/segformer-b0-finetuned-ade-512-512';
// AI upscale (Swin2SR): a small, quick model for 2x (8 MB) and a "real-world" one for 4x, made for photos
// with noise and JPEG blockiness (21 MB, 8-bit).
const UPSCALE_MODELS = {
  2: { id: 'Xenova/swin2SR-lightweight-x2-64', dtype: 'fp32' },
  4: { id: 'Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr', dtype: 'q8' },
};
const { upscaleTiles } = require('./renderer/upscale-tiles.js');

function createCutout({ cacheDir } = {}) {
  const ready = {}, loading = {};

  function load(id, onProgress, { cls = 'AutoModel', dtype = 'fp32' } = {}) {
    if (ready[id]) return Promise.resolve(ready[id]);
    if (!loading[id]) {
      loading[id] = (async () => {
        onProgress({ phase: 'loading' });
        const T = await import('@huggingface/transformers');
        if (cacheDir) T.env.cacheDir = cacheDir;
        T.env.allowLocalModels = false;
        // One combined download percentage across the model's files.
        const files = {};
        const progress_callback = (p) => {
          if (p.status !== 'progress' || !p.total) return;
          files[p.file] = [p.loaded, p.total];
          const all = Object.values(files);
          onProgress({ phase: 'download', progress: all.reduce((s, f) => s + f[0], 0) / all.reduce((s, f) => s + f[1], 0) });
        };
        const model = await T[cls].from_pretrained(id, { dtype, progress_callback });
        const processor = await T.AutoProcessor.from_pretrained(id);
        ready[id] = { T, model, processor };
        return ready[id];
      })().finally(() => { delete loading[id]; });
    }
    return loading[id];
  }

  /** RGB bytes (w*h*3) in, the photo f times larger (2 or 4) out, as RGB bytes. */
  let stopUpscale = false;
  async function upscale(rgb, w, h, f, onProgress = () => {}) {
    const m = UPSCALE_MODELS[f]; if (!m) throw new Error('Upscale works at 2x or 4x.');
    const { T, model, processor } = await load(m.id, onProgress, { cls: 'AutoModelForImageToImage', dtype: m.dtype });
    stopUpscale = false;
    onProgress({ phase: 'working', progress: 0 });
    return upscaleTiles(T, model, processor, rgb, w, h, f, onProgress, () => stopUpscale);
  }
  function cancelUpscale() { stopUpscale = true; }

  /** RGB bytes (w*h*3) in, a 0-255 mask of where the sky is (w*h) out; all zeros if there's no sky. */
  async function skyMaskFor(rgb, w, h, onProgress = () => {}) {
    const { T, model, processor } = await load(SKY_MODEL, onProgress);
    onProgress({ phase: 'working' });
    const image = new T.RawImage(new Uint8ClampedArray(rgb.buffer, rgb.byteOffset, rgb.length), w, h, 3);
    const inputs = await processor(image);
    const { logits } = await model(inputs);
    const [, C, lh, lw] = logits.dims, d = logits.data, n = lh * lw;
    const labels = model.config.id2label || {};
    const sky = Number(Object.keys(labels).find(k => String(labels[k]).toLowerCase() === 'sky') ?? 2);
    // the chance each spot is sky (a softmax over the 150 kinds), as 0-255
    const prob = new Uint8ClampedArray(n);
    for (let i = 0; i < n; i++) {
      let max = -Infinity;
      for (let c = 0; c < C; c++) { const v = d[c * n + i]; if (v > max) max = v; }
      let sum = 0;
      for (let c = 0; c < C; c++) sum += Math.exp(d[c * n + i] - max);
      prob[i] = 255 * Math.exp(d[sky * n + i] - max) / sum;
    }
    const big = await new T.RawImage(prob, lw, lh, 1).resize(w, h);
    return new Uint8Array(big.data);
  }

  /** RGB bytes (w*h*3) in, a 0-255 mask of the subject (w*h) out. */
  async function maskFor(rgb, w, h, onProgress = () => {}) {
    const { T, model, processor } = await load(SEG_MODEL, onProgress);
    onProgress({ phase: 'working' });
    const image = new T.RawImage(new Uint8ClampedArray(rgb.buffer, rgb.byteOffset, rgb.length), w, h, 3);
    const { pixel_values } = await processor(image);
    const { output } = await model({ input: pixel_values });
    const mask = await T.RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(w, h);
    return new Uint8Array(mask.data);
  }

  return { maskFor, skyMaskFor, upscale, cancelUpscale };
}

module.exports = { createCutout, SEG_MODEL, SKY_MODEL, UPSCALE_MODELS };
