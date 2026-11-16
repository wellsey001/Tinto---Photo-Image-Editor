'use strict';
/* AI tools that run inside the page itself, for the Android app (the desktop app runs them in its
   background process instead, see ../cutout.js). Same models, same answers: MODNet finds the person,
   SegFormer finds the sky. transformers.js ships with the app in vendor/transformers/; the models
   download from Hugging Face the first time each one is used, then stay in the phone's cache. */
(function(){
  const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if (!native && !window.TINTO_WEB_AI) return;
  const LIB = new URL('vendor/transformers/transformers.min.js', document.baseURI).href;
  const SEG_MODEL = 'Xenova/modnet', SKY_MODEL = 'Xenova/segformer-b0-finetuned-ade-512-512';
  const listeners = {person: new Set(), sky: new Set()};
  const ready = {}, loading = {};
  let T = null, busy = false;

  async function lib(){
    if (T) return T;
    T = await import(LIB);
    T.env.allowLocalModels = false;
    T.env.useBrowserCache = true;
    // the WebView can't share memory between threads, so onnxruntime runs on one; its files ship with the app
    T.env.backends.onnx.wasm.numThreads = 1;
    T.env.backends.onnx.wasm.wasmPaths = new URL('vendor/transformers/', document.baseURI).href;
    return T;
  }
  function load(id, emit){
    if (ready[id]) return Promise.resolve(ready[id]);
    if (!loading[id]) loading[id] = (async () => {
      emit({phase:'loading'});
      const T = await lib(), files = {};
      const progress_callback = p => {
        if (p.status !== 'progress' || !p.total) return;
        files[p.file] = [p.loaded, p.total];
        const all = Object.values(files);
        emit({phase:'download', progress: all.reduce((s, f) => s + f[0], 0) / all.reduce((s, f) => s + f[1], 0)});
      };
      const model = await T.AutoModel.from_pretrained(id, {dtype:'fp32', device:'wasm', progress_callback});
      const processor = await T.AutoProcessor.from_pretrained(id);
      return (ready[id] = {T, model, processor});
    })().finally(() => { delete loading[id]; });
    return loading[id];
  }
  const emitter = kind => p => listeners[kind].forEach(cb => { try { cb(p); } catch {} });
  const image = (T, rgb, w, h) => new T.RawImage(new Uint8ClampedArray(rgb.buffer, rgb.byteOffset, rgb.length), w, h, 3);
  async function exclusive(fn){
    if (busy) throw new Error('Tinto is busy with another picture.');
    busy = true; try { return await fn(); } finally { busy = false; }
  }

  async function removeBackground(rgb, w, h){
    return exclusive(async () => {
      const emit = emitter('person'), {T, model, processor} = await load(SEG_MODEL, emit);
      emit({phase:'working'});
      const {pixel_values} = await processor(image(T, rgb, w, h));
      const {output} = await model({input: pixel_values});
      const mask = await T.RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(w, h);
      return new Uint8Array(mask.data);
    });
  }
  async function skyMask(rgb, w, h){
    return exclusive(async () => {
      const emit = emitter('sky'), {T, model, processor} = await load(SKY_MODEL, emit);
      emit({phase:'working'});
      const {logits} = await model(await processor(image(T, rgb, w, h)));
      const [, C, lh, lw] = logits.dims, d = logits.data, n = lh*lw;
      const labels = model.config.id2label || {};
      const sky = Number(Object.keys(labels).find(k => String(labels[k]).toLowerCase() === 'sky') ?? 2);
      const prob = new Uint8ClampedArray(n);
      for (let i=0; i<n; i++){
        let max = -Infinity; for (let c=0; c<C; c++){ const v = d[c*n + i]; if (v > max) max = v; }
        let sum = 0; for (let c=0; c<C; c++) sum += Math.exp(d[c*n + i] - max);
        prob[i] = 255 * Math.exp(d[sky*n + i] - max) / sum;
      }
      const big = await new T.RawImage(prob, lw, lh, 1).resize(w, h);
      return new Uint8Array(big.data);
    });
  }
  const on = kind => cb => { listeners[kind].add(cb); return () => listeners[kind].delete(cb); };
  window.WEB_AI = {removeBackground, onRemoveBgProgress: on('person'), skyMask, onSkyProgress: on('sky')};
})();
