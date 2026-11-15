'use strict';

// Background removal for custom stickers: MODNet portrait matting (the same model Snippy uses),
// running locally through transformers.js. The model (about 25 MB) downloads the first time it's
// used and is cached in the app data folder after that. Free of Electron, so the build can test it.

const SEG_MODEL = 'Xenova/modnet';

function createCutout({ cacheDir } = {}) {
  let seg = null;
  let loading = null;

  async function load(onProgress) {
    if (seg) return seg;
    if (!loading) {
      loading = (async () => {
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
        const model = await T.AutoModel.from_pretrained(SEG_MODEL, { dtype: 'fp32', progress_callback });
        const processor = await T.AutoProcessor.from_pretrained(SEG_MODEL);
        seg = { T, model, processor };
        return seg;
      })().finally(() => { loading = null; });
    }
    return loading;
  }

  /** RGB bytes (w*h*3) in, a 0-255 mask of the subject (w*h) out. */
  async function maskFor(rgb, w, h, onProgress = () => {}) {
    const { T, model, processor } = await load(onProgress);
    onProgress({ phase: 'working' });
    const image = new T.RawImage(new Uint8ClampedArray(rgb.buffer, rgb.byteOffset, rgb.length), w, h, 3);
    const { pixel_values } = await processor(image);
    const { output } = await model({ input: pixel_values });
    const mask = await T.RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(w, h);
    return new Uint8Array(mask.data);
  }

  return { maskFor };
}

module.exports = { createCutout, SEG_MODEL };
