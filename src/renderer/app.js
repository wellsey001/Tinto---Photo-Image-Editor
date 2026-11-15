const $ = s => document.querySelector(s);
const view = $('#view'), vctx = view.getContext('2d');
const stage = $('#stage');
const mk = (w,h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const clamp = (v,a,b) => Math.min(b, Math.max(a, v));
const RAD = Math.PI/180;
const clone = o => JSON.parse(JSON.stringify(o));

/* ================= definitions ================= */
const ADJ = [
  {g:'Light'},
  {k:'exposure', label:'Exposure'}, {k:'brightness', label:'Brightness'}, {k:'contrast', label:'Contrast'},
  {k:'highlights', label:'Highlights'}, {k:'shadows', label:'Shadows'},
  {g:'Colour'},
  {k:'saturation', label:'Saturation'}, {k:'warmth', label:'Warmth'}, {k:'tint', label:'Tint'},
  {g:'Effects'},
  {k:'fade', label:'Fade', min:0}, {k:'vignette', label:'Vignette', min:0}, {k:'sharpness', label:'Sharpness', min:0},
];
const KEYS = ADJ.filter(a => a.k).map(a => a.k);
const defaults = () => Object.fromEntries(KEYS.map(k => [k, 0]));

const FILTERS = [
  {id:'none', name:'Original', d:{}},
  {id:'vivid', name:'Vivid', d:{contrast:15, saturation:35, shadows:10}},
  {id:'warm', name:'Golden', d:{warmth:35, saturation:10, highlights:-10}},
  {id:'cool', name:'Nordic', d:{warmth:-35, tint:-6, contrast:5}},
  {id:'film', name:'Film', d:{fade:35, contrast:-8, warmth:12, saturation:-15}},
  {id:'matte', name:'Matte', d:{fade:55, contrast:-20, saturation:-10}},
  {id:'drama', name:'Drama', d:{contrast:40, highlights:-30, shadows:25, saturation:-10, vignette:35}},
  {id:'mono', name:'Mono', d:{contrast:10}, mode:'mono'},
  {id:'noir', name:'Noir', d:{contrast:45, shadows:-20, vignette:40}, mode:'mono'},
  {id:'sepia', name:'Sepia', d:{fade:15, contrast:5}, mode:'sepia'},
  {id:'fresh', name:'Fresh', d:{exposure:10, saturation:15, warmth:-8, highlights:-15}},
  {id:'dusk', name:'Dusk', d:{tint:25, warmth:15, fade:20, vignette:20}},
];

const FONTS = ['Hanken Grotesk','Anton','Bebas Neue','Playfair Display','Lora','Caveat','Permanent Marker','Pacifico','Space Mono','Sora'];
const COLOURS = ['#ffffff','#111111','#efb34a','#ff5a5f','#ff7ac6','#4da3ff','#3ddc97','#9b6bff'];

function starPath(n, inner){
  let d = '';
  for (let i=0;i<n*2;i++){ const r = i%2 ? 48*inner : 48, a = -Math.PI/2 + i*Math.PI/n; d += (i?'L':'M') + (50 + r*Math.cos(a)).toFixed(2) + ' ' + (50 + r*Math.sin(a)).toFixed(2) + ' '; }
  return d + 'Z';
}
const SHAPES = [
  {id:'heart', name:'Heart', d:'M50 90 C22 70 4 52 4 32 C4 17 15 7 29 7 C39 7 46 13 50 21 C54 13 61 7 71 7 C85 7 96 17 96 32 C96 52 78 70 50 90Z'},
  {id:'star', name:'Star', d:starPath(5, 0.45)},
  {id:'sparkle', name:'Sparkle', d:'M50 2 C54 34 66 46 98 50 C66 54 54 66 50 98 C46 66 34 54 2 50 C34 46 46 34 50 2Z'},
  {id:'circle', name:'Circle', d:'M50 4 A46 46 0 1 1 49.99 4Z'},
  {id:'arrow', name:'Arrow', d:'M4 38 H58 V14 L96 50 L58 86 V62 H4Z'},
  {id:'bubble', name:'Speech bubble', d:'M12 10 H88 Q96 10 96 18 V62 Q96 70 88 70 H42 L22 90 L26 70 H12 Q4 70 4 62 V18 Q4 10 12 10Z'},
  {id:'burst', name:'Burst', d:starPath(14, 0.78)},
  {id:'bolt', name:'Lightning', d:'M60 2 L14 56 H44 L36 98 L86 40 H55 Z'},
  {id:'crown', name:'Crown', d:'M6 82 L10 26 L32 50 L50 14 L68 50 L90 26 L94 82Z'},
  {id:'banner', name:'Banner', d:'M2 30 H98 L88 50 L98 70 H2 L12 50Z'},
  {id:'square', name:'Rounded square', d:'M18 6 H82 Q94 6 94 18 V82 Q94 94 82 94 H18 Q6 94 6 82 V18 Q6 6 18 6Z'},
  {id:'drop', name:'Drop', d:'M50 4 C66 28 84 46 84 64 C84 83 69 96 50 96 C31 96 16 83 16 64 C16 46 34 28 50 4Z'},
];
const PATHS = Object.fromEntries(SHAPES.map(s => [s.id, new Path2D(s.d)]));

const TEXT_PRESETS = [
  {label:'HEADLINE', text:'GOLDEN HOUR', font:'Anton', color:'#ffffff', shadow:45, outline:0},
  {label:'Handwritten', text:'Wish you were here', font:'Caveat', color:'#efb34a', shadow:30, outline:0},
  {label:'Label', text:'Lakeside, 2026', font:'Hanken Grotesk', bold:true, color:'#111111', bg:'#ffffff', outline:0, shadow:0, sizeK:0.05},
  {label:'Classic', text:'Evening light', font:'Playfair Display', color:'#ffffff', shadow:35, outline:0},
  {label:'Marker', text:'Best day!', font:'Permanent Marker', color:'#ff5a5f', outline:30, ocolor:'#ffffff', shadow:0},
  {label:'Retro', text:'Summer', font:'Pacifico', color:'#ff7ac6', outline:28, ocolor:'#111111', shadow:20},
];

/* ================= state + history ================= */
let S = {base:null, params:defaults(), filter:'none', strength:100, layers:[], name:'photo', label:''};
let hist = [], hi = -1, selId = null, nextId = 1;
const snap = () => ({base:S.base, params:{...S.params}, filter:S.filter, strength:S.strength, layers:clone(S.layers), lj:JSON.stringify(S.layers)});
function same(a,b){ return a && b && a.base===b.base && a.filter===b.filter && a.strength===b.strength && a.lj===b.lj && KEYS.every(k => a.params[k]===b.params[k]); }
function commit(){
  const s = snap();
  if (same(s, hist[hi])) return;
  hist = hist.slice(0, hi+1); hist.push(s);
  if (hist.length > 50) hist.shift();
  hi = hist.length - 1; updateUndo();
}
function restore(st){
  const baseChanged = st.base !== S.base;
  S.base = st.base; S.params = {...st.params}; S.filter = st.filter; S.strength = st.strength; S.layers = clone(st.layers);
  if (!getSel()) selId = null;
  syncUI();
  if (baseChanged) { rebuildPreview(); if (tab==='crop') resetCrop(); syncResize(); } else render();
  refreshLayerUI(); updateUndo();
}
function undo(){ if (hi > 0) { hi--; restore(hist[hi]); } }
function redo(){ if (hi < hist.length-1) { hi++; restore(hist[hi]); } }
function updateUndo(){ const col = typeof tab!=='undefined' && tab==='collage'; $('#undoBtn').disabled = col || hi <= 0; $('#redoBtn').disabled = col || hi >= hist.length-1; }

function effective(filterId=S.filter, strength=S.strength, params=S.params){
  const f = FILTERS.find(x => x.id===filterId) || FILTERS[0];
  const t = strength/100, p = {...params};
  for (const k in f.d) p[k] = (p[k]||0) + f.d[k]*t;
  p.mono = f.mode==='mono' ? t : 0;
  p.sepia = f.mode==='sepia' ? t : 0;
  return p;
}

/* ================= image processing ================= */
function processImage(src, p){
  const w = src.width, h = src.height, s = src.data;
  const out = new ImageData(w, h), o = out.data;
  const ex = Math.pow(2, (p.exposure/100)*1.5);
  const gam = Math.pow(2, -(p.brightness/100)*0.8);
  const c = p.contrast/100, cf = c >= 0 ? 1 + c*1.4 : 1 + c*0.9;
  const wa = p.warmth/100, ti = p.tint/100;
  const mR = ex*(1 + wa*0.10 + ti*0.04), mG = ex*(1 - ti*0.08), mB = ex*(1 - wa*0.12 + ti*0.04);
  const lr = new Float32Array(256), lg = new Float32Array(256), lb = new Float32Array(256);
  const curve = v => { v = clamp(v,0,1); v = Math.pow(v, gam); return (v-0.5)*cf + 0.5; };
  for (let i=0;i<256;i++){ const v=i/255; lr[i]=curve(v*mR); lg[i]=curve(v*mG); lb[i]=curve(v*mB); }
  const hl = p.highlights/100*0.32, sh = p.shadows/100*0.32, sat = 1 + p.saturation/100;
  const mono = p.mono, sep = p.sepia, fd = Math.max(0,p.fade)/100, vg = Math.max(0,p.vignette)/100;
  const cx = w/2, cy = h/2, inv = 1/Math.sqrt(cx*cx + cy*cy);
  for (let y=0; y<h; y++){
    const dy = y - cy;
    for (let x=0; x<w; x++){
      const i = (y*w + x)*4;
      let r = lr[s[i]], g = lg[s[i+1]], b = lb[s[i+2]];
      let L = 0.2126*r + 0.7152*g + 0.0722*b;
      if (hl || sh){ const Lc = clamp(L,0,1); const d = hl*Lc*Lc + sh*(1-Lc)*(1-Lc); r+=d; g+=d; b+=d; L+=d; }
      if (sat !== 1){ r = L + (r-L)*sat; g = L + (g-L)*sat; b = L + (b-L)*sat; }
      if (mono){ r += (L-r)*mono; g += (L-g)*mono; b += (L-b)*mono; }
      if (sep){ r += (L*1.07+0.05 - r)*sep; g += (L*0.95+0.02 - g)*sep; b += (L*0.76 - b)*sep; }
      if (fd){ const k = 1-0.22*fd, a = 0.1*fd; r = r*k+a; g = g*k+a; b = b*k+a*1.1; }
      if (vg){ const dx = x-cx, d = Math.sqrt(dx*dx+dy*dy)*inv; if (d > 0.4){ const t = (d-0.4)/0.6, m = 1 - vg*0.78*t*t*(3-2*t); r*=m; g*=m; b*=m; } }
      o[i] = r*255; o[i+1] = g*255; o[i+2] = b*255; o[i+3] = s[i+3];
    }
  }
  if (p.sharpness > 0) sharpen(out, p.sharpness/100);
  return out;
}
function sharpen(img, a){
  const w = img.width, h = img.height, d = img.data, src = new Uint8ClampedArray(d), k = a*1.1, row = w*4;
  for (let y=1; y<h-1; y++) for (let x=1; x<w-1; x++){
    const i = (y*w + x)*4;
    for (let c=0;c<3;c++){ const j=i+c, v=src[j]; d[j] = v + k*(4*v - src[j-4] - src[j+4] - src[j-row] - src[j+row]); }
  }
}
function scaleCanvas(src, w, h){
  let cur = src, cw = src.width, ch = src.height;
  while (cw/2 >= w && ch/2 >= h){
    cw = Math.round(cw/2); ch = Math.round(ch/2);
    const t = mk(cw,ch), x = t.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur,0,0,cw,ch); cur = t;
  }
  const out = mk(w,h), x = out.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(cur,0,0,w,h);
  return out;
}

/* ================= layers: geometry + drawing ================= */
const mctx = mk(4,4).getContext('2d');
const minSide = () => Math.min(S.base.width, S.base.height);
const getSel = () => S.layers.find(l => l.id===selId) || null;
function fontStr(l){ return `${l.bold ? 700 : 400} ${l.size}px "${l.font}", system-ui, sans-serif`; }
function textMetrics(l){
  mctx.font = fontStr(l);
  const lines = (l.text || ' ').split('\n'), lh = l.size*1.2;
  const widths = lines.map(t => mctx.measureText(t).width);
  const w = Math.max(l.size*0.3, ...widths), h = lines.length*lh;
  const pad = l.bg ? l.size*0.38 : 0, ow = l.outline/100*l.size*0.22;
  return {lines, widths, w, h, lh, pad, ow};
}
function bbox(l){
  if (l.type==='text'){ const m = textMetrics(l), e = m.pad + m.ow/2 + 2; return [-m.w/2-e, -m.h/2-e, m.w/2+e, m.h/2+e]; }
  if (l.type==='shape'){ const e = l.outline ? 8 : 0; return [-50-e, -50-e, 50+e, 50+e]; }
  let x0=Infinity, y0=Infinity, x1=-Infinity, y1=-Infinity;
  for (const st of l.strokes){ const r = st.size/2; for (let i=0;i<st.pts.length;i+=2){ const x=st.pts[i], y=st.pts[i+1]; if (x-r<x0) x0=x-r; if (y-r<y0) y0=y-r; if (x+r>x1) x1=x+r; if (y+r>y1) y1=y+r; } }
  return x0===Infinity ? [-1,-1,1,1] : [x0,y0,x1,y1];
}
function toLocal(l, p){
  const dx = p.x - l.x, dy = p.y - l.y, a = -l.rot*RAD, c = Math.cos(a), s = Math.sin(a);
  let rx = (dx*c - dy*s)/l.scale, ry = (dx*s + dy*c)/l.scale;
  if (l.flip) rx = -rx;
  return {x:rx, y:ry};
}
function fromLocal(l, lx, ly){
  if (l.flip) lx = -lx;
  lx *= l.scale; ly *= l.scale;
  const a = l.rot*RAD, c = Math.cos(a), s = Math.sin(a);
  return {x: l.x + lx*c - ly*s, y: l.y + lx*s + ly*c};
}
function drawLayer(ctx, l){
  ctx.save();
  ctx.globalAlpha = l.opacity;
  ctx.translate(l.x, l.y); ctx.rotate(l.rot*RAD); ctx.scale(l.scale*(l.flip?-1:1), l.scale);
  if (l.type==='text') drawText(ctx, l);
  else if (l.type==='shape') drawShape(ctx, l);
  else drawStrokes(ctx, l);
  ctx.restore();
}
function drawText(ctx, l){
  const m = textMetrics(l);
  ctx.font = fontStr(l); ctx.textBaseline = 'middle'; ctx.textAlign = l.align; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  if (l.bg){
    ctx.fillStyle = l.bg; ctx.beginPath();
    const r = l.size*0.25; ctx.roundRect(-m.w/2-m.pad, -m.h/2-m.pad*0.7, m.w+m.pad*2, m.h+m.pad*1.4, r); ctx.fill();
  }
  const ax = l.align==='left' ? -m.w/2 : l.align==='right' ? m.w/2 : 0;
  if (l.shadow){ ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = l.size*0.25*l.shadow/100; ctx.shadowOffsetY = l.size*0.06*l.shadow/100; }
  m.lines.forEach((t, i) => {
    const y = -m.h/2 + m.lh*(i+0.5) + l.size*0.04;
    if (m.ow > 0){ ctx.strokeStyle = l.ocolor; ctx.lineWidth = m.ow; ctx.strokeText(t, ax, y); if (i===m.lines.length-1) ctx.shadowColor = 'transparent'; }
  });
  if (m.ow > 0) ctx.shadowColor = 'transparent';
  ctx.fillStyle = l.color;
  m.lines.forEach((t, i) => ctx.fillText(t, ax, -m.h/2 + m.lh*(i+0.5) + l.size*0.04));
}
function drawShape(ctx, l){
  ctx.translate(-50, -50);
  const p = PATHS[l.shape];
  if (l.shadow){ ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4; }
  if (l.outline){ ctx.lineJoin = 'round'; ctx.lineWidth = 12; ctx.strokeStyle = l.outline; ctx.stroke(p); ctx.shadowColor = 'transparent'; }
  ctx.fillStyle = l.color; ctx.fill(p);
}
function drawStrokes(ctx, l){
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const st of l.strokes){
    const p = st.pts;
    ctx.save();
    if (st.marker){ ctx.globalAlpha *= 0.45; ctx.lineCap = 'square'; }
    ctx.strokeStyle = st.color; ctx.fillStyle = st.color; ctx.lineWidth = st.size;
    if (p.length <= 2){ ctx.beginPath(); ctx.arc(p[0], p[1], st.size/2, 0, Math.PI*2); ctx.fill(); ctx.restore(); continue; }
    ctx.beginPath(); ctx.moveTo(p[0], p[1]);
    for (let i=2; i<p.length-2; i+=2){ const mx = (p[i]+p[i+2])/2, my = (p[i+1]+p[i+3])/2; ctx.quadraticCurveTo(p[i], p[i+1], mx, my); }
    ctx.lineTo(p[p.length-2], p[p.length-1]); ctx.stroke();
    ctx.restore();
  }
}
function drawLayers(ctx, k){
  ctx.save(); ctx.scale(k, k);
  for (const l of S.layers) if (!l.hidden) drawLayer(ctx, l);
  ctx.restore();
}
function hitTest(p){
  const k = view.width / S.base.width;
  for (let i=S.layers.length-1; i>=0; i--){
    const l = S.layers[i]; if (l.hidden) continue;
    const q = toLocal(l, p), b = bbox(l), t = 6/(k*l.scale);
    if (q.x >= b[0]-t && q.x <= b[2]+t && q.y >= b[1]-t && q.y <= b[3]+t) return l;
  }
  return null;
}
function layerName(l){
  if (l.type==='text') return (l.text || 'Text').split('\n')[0].slice(0, 28) || 'Text';
  if (l.type==='shape') return (SHAPES.find(s => s.id===l.shape) || {}).name || 'Sticker';
  return 'Drawing';
}

/* ================= preview + render ================= */
let prevData = null, comparing = false, raf = 0;
const photoC = mk(10,10), photoX = photoC.getContext('2d');
const rawC = mk(10,10), rawX = rawC.getContext('2d');
function rebuildPreview(){
  const b = S.base, st = stage.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  const maxD = Math.min(1800, Math.max(700, Math.max(st.width, st.height)*dpr));
  const sc = Math.min(1, maxD/Math.max(b.width, b.height));
  const w = Math.max(1, Math.round(b.width*sc)), h = Math.max(1, Math.round(b.height*sc));
  prevData = scaleCanvas(b, w, h).getContext('2d').getImageData(0,0,w,h);
  for (const c of [view, photoC, rawC]){ c.width = w; c.height = h; }
  rawX.putImageData(prevData, 0, 0);
  buildThumbs(); draw(); updateInfo();
  if (tab==='crop') requestAnimationFrame(placeOverlay);
}
function render(){ if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); }
function draw(){
  if (!prevData) return;
  const out = processImage(prevData, effective());
  photoX.putImageData(out, 0, 0); drawHisto(out);
  composite();
}
function composite(){
  vctx.clearRect(0,0,view.width,view.height);
  if (comparing){ vctx.drawImage(rawC,0,0); placeSel(); return; }
  vctx.drawImage(photoC,0,0);
  drawLayers(vctx, view.width / S.base.width);
  placeSel();
}
function updateInfo(){
  const b = S.base, mp = (b.width*b.height/1e6).toFixed(1);
  $('#fileInfo').textContent = `${S.label} · ${b.width} × ${b.height} px · ${mp} MP`;
}

/* histogram */
const hc = $('#histo'), hx = hc.getContext('2d');
function drawHisto(img){
  const d = img.data, R = new Uint32Array(256), G = new Uint32Array(256), B = new Uint32Array(256);
  let n = 0, clipHi = 0, clipLo = 0;
  for (let i=0; i<d.length; i+=16){
    const r=d[i], g=d[i+1], b=d[i+2]; R[r]++; G[g]++; B[b]++; n++;
    if (r>=254 && g>=254 && b>=254) clipHi++; if (r<=1 && g<=1 && b<=1) clipLo++;
  }
  let max = 1; for (let i=2;i<254;i++) max = Math.max(max, R[i], G[i], B[i]);
  const W = hc.width, H = hc.height, bw = W/255;
  hx.fillStyle = '#202227'; hx.fillRect(0,0,W,H);
  hx.globalCompositeOperation = 'lighter';
  [[R,'rgba(220,70,60,.75)'],[G,'rgba(70,190,90,.7)'],[B,'rgba(70,120,235,.8)']].forEach(([arr,col]) => {
    hx.fillStyle = col; hx.beginPath(); hx.moveTo(0,H);
    for (let i=0;i<256;i++) hx.lineTo(i*bw, H - Math.min(1, arr[i]/max)*H*0.95);
    hx.lineTo(W,H); hx.closePath(); hx.fill();
  });
  hx.globalCompositeOperation = 'source-over';
  const hiPct = clipHi/n*100, loPct = clipLo/n*100, ci = $('#clipInfo');
  if (hiPct > 0.5) { ci.textContent = `${hiPct.toFixed(1)}% blown`; ci.className = 'clip'; }
  else if (loPct > 0.5) { ci.textContent = `${loPct.toFixed(1)}% crushed`; ci.className = 'clip'; }
  else { ci.textContent = 'No clipping'; ci.className = ''; }
}

/* ================= shared UI helpers ================= */
function fill(inp, v, min, max=100){
  const pos = (v-min)/(max-min)*100, zero = min<0 ? 50 : 0;
  inp.style.setProperty('--lo', Math.min(pos,zero)+'%'); inp.style.setProperty('--hi', Math.max(pos,zero)+'%');
}
function makeSwatches(el, list, onPick, {none=false} = {}){
  el.innerHTML = '';
  const btns = [];
  if (none){ const b = document.createElement('button'); b.type='button'; b.className='swc'; b.title='None'; b.dataset.v=''; b.style.background='linear-gradient(135deg,transparent 45%,var(--warn) 45%,var(--warn) 55%,transparent 55%),var(--raise)'; b.onclick=()=>onPick(''); el.appendChild(b); btns.push(b); }
  for (const c of list){ const b = document.createElement('button'); b.type='button'; b.className='swc'; b.title=c; b.dataset.v=c; b.style.background=c; b.onclick=()=>onPick(c); el.appendChild(b); btns.push(b); }
  const cw = document.createElement('label'); cw.className='swc custom'; cw.title='Custom colour';
  const ci = document.createElement('input'); ci.type='color'; ci.value='#ffffff'; cw.appendChild(ci); el.appendChild(cw);
  ci.addEventListener('input', () => onPick(ci.value, true));
  ci.addEventListener('change', () => onPick(ci.value, false, true));
  return { set(v){ let found = false; btns.forEach(b => { const on = b.dataset.v.toLowerCase()===(v||'').toLowerCase(); b.setAttribute('aria-pressed', String(on)); if (on) found = true; }); cw.setAttribute('aria-pressed', String(!found && !!v)); if (v && /^#[0-9a-f]{6}$/i.test(v)) ci.value = v; } };
}
function bindRange(id, get, set, fmt = v => String(v)){
  const inp = $('#'+id), out = $('#'+id+'Out');
  const paint = () => { const v = get(); if (v===null) return; inp.value = v; fill(inp, v, +inp.min, +inp.max); if (out) out.textContent = fmt(v); };
  inp.addEventListener('input', () => { set(+inp.value); paint(); });
  inp.addEventListener('change', commit);
  return paint;
}

/* ================= Adjust panel ================= */
const sliders = {};
(function buildAdjust(){
  const pane = $('#pane-adjust'); let first = true;
  const title = document.createElement('h2'); title.className = 'pane-title'; title.textContent = 'Adjust'; pane.appendChild(title);
  for (const a of ADJ){
    if (a.g){
      const h = document.createElement('div'); h.className = 'group-h'; h.textContent = a.g;
      if (first){ const rb = document.createElement('button'); rb.className='linkbtn'; rb.type='button'; rb.textContent='Reset all'; rb.onclick = () => { S.params = defaults(); syncUI(); render(); commit(); }; h.appendChild(rb); first = false; }
      pane.appendChild(h); continue;
    }
    const row = document.createElement('div'); row.className = 'row';
    const min = a.min ?? -100;
    row.innerHTML = `<label for="adj-${a.k}">${a.label}</label><output id="out-${a.k}">0</output><input type="range" id="adj-${a.k}" min="${min}" max="100" value="0" step="1">`;
    pane.appendChild(row);
    const inp = row.querySelector('input');
    inp.addEventListener('input', () => { S.params[a.k] = +inp.value; paintSlider(a.k); render(); });
    inp.addEventListener('change', commit);
    inp.addEventListener('dblclick', () => { S.params[a.k] = 0; paintSlider(a.k); render(); commit(); });
    sliders[a.k] = {inp, out: row.querySelector('output'), min};
  }
  const p = document.createElement('p'); p.className = 'hint'; p.textContent = 'Double-click a slider to reset it.'; pane.appendChild(p);
})();
function paintSlider(k){
  const s = sliders[k], v = S.params[k];
  s.inp.value = v; fill(s.inp, v, s.min);
  s.out.textContent = v > 0 && s.min < 0 ? '+'+v : v < 0 ? '−'+(-v) : String(v);
  s.out.classList.toggle('mod', v !== 0);
}

/* ================= Filters panel ================= */
const thumbs = {};
(function buildFilters(){
  const grid = $('#filterGrid');
  for (const f of FILTERS){
    const b = document.createElement('button'); b.type='button'; b.className='fbtn'; b.setAttribute('aria-pressed','false');
    const c = mk(96,96); b.appendChild(c); const sp = document.createElement('span'); sp.textContent = f.name; b.appendChild(sp);
    b.onclick = () => { S.filter = f.id; if (f.id!=='none' && S.strength===0) S.strength=100; syncUI(); render(); commit(); };
    grid.appendChild(b); thumbs[f.id] = {b, c};
  }
  const st = $('#strength');
  st.addEventListener('input', () => { S.strength = +st.value; paintStrength(); render(); });
  st.addEventListener('change', commit);
})();
function buildThumbs(){
  const b = S.base, side = Math.min(b.width, b.height);
  const sq = mk(96,96), x = sq.getContext('2d'); x.imageSmoothingQuality='high';
  const small = scaleCanvas(b, Math.max(96, Math.round(b.width/side*96)), Math.max(96, Math.round(b.height/side*96)));
  x.drawImage(small, (small.width-96)/2, (small.height-96)/2, 96, 96, 0, 0, 96, 96);
  const src = x.getImageData(0,0,96,96);
  for (const f of FILTERS) thumbs[f.id].c.getContext('2d').putImageData(processImage(src, effective(f.id, 100, defaults())), 0, 0);
}
function paintStrength(){ const st = $('#strength'); st.value = S.strength; fill(st, S.strength, 0); $('#strengthOut').textContent = S.strength; }
function syncUI(){
  KEYS.forEach(paintSlider);
  for (const id in thumbs) thumbs[id].b.setAttribute('aria-pressed', String(id===S.filter));
  $('#strengthRow').hidden = S.filter==='none'; paintStrength();
}

/* ================= tools / tabs ================= */
let tab = 'adjust';
document.querySelectorAll('.tool').forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));
function setTab(name){
  if (tab==='draw' && name!=='draw') drawSession = null;
  tab = name;
  document.querySelectorAll('.tool').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab===name)));
  ['adjust','filters','crop','resize','text','stickers','draw','layers','collage'].forEach(n => $('#pane-'+n).hidden = n!==name);
  $('#cropLayer').hidden = name!=='crop';
  stage.classList.toggle('drawing', name==='draw');
  const col = name==='collage';
  $('#viewWrap').hidden = col; $('#collageWrap').hidden = !col;
  $('.panel').classList.toggle('no-histo', col);
  $('#compareBtn').disabled = col;
  updateUndo();
  if (col) { drawCollage(); collageInfo(); } else if (S.base) updateInfo();
  if (name==='crop'){ resetCrop(); requestAnimationFrame(placeOverlay); }
  if (name==='resize') syncResize();
  refreshLayerUI();
}

/* ================= crop ================= */
const ASPECTS = [['Free',null],['Original','orig'],['1:1',1],['4:5',4/5],['3:2',3/2],['16:9',16/9],['9:16',9/16]];
let crop = {x:0,y:0,w:1,h:1}, aspect = null, cdrag = null;
const layer = $('#cropLayer'), box = $('#cropBox');
(function buildAspects(){
  const wrap = $('#aspectChips');
  ASPECTS.forEach(([label, val]) => {
    const c = document.createElement('button'); c.type='button'; c.className='chip'; c.textContent = label; c.setAttribute('aria-pressed', String(val===null));
    c.onclick = () => { aspect = val; wrap.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', String(x===c))); crop = {x:0,y:0,w:1,h:1}; fitAspect(); drawCrop(); };
    wrap.appendChild(c);
  });
})();
function ratioN(){ if (aspect===null) return null; const b = S.base; const a = aspect==='orig' ? b.width/b.height : aspect; return a * b.height / b.width; }
function fitAspect(){
  const r = ratioN(); if (!r) return;
  let w = 1, h = 1/r; if (h > 1){ h = 1; w = r; }
  crop = {x:(1-w)/2, y:(1-h)/2, w, h};
}
function resetCrop(){ crop = {x:0,y:0,w:1,h:1}; fitAspect(); drawCrop(); }
function placeOverlay(){
  const sr = stage.getBoundingClientRect(), vr = view.getBoundingClientRect();
  Object.assign(layer.style, {left:(vr.left-sr.left)+'px', top:(vr.top-sr.top)+'px', width:vr.width+'px', height:vr.height+'px'});
  drawCrop();
}
function drawCrop(){
  Object.assign(box.style, {left:crop.x*100+'%', top:crop.y*100+'%', width:crop.w*100+'%', height:crop.h*100+'%'});
  box.classList.toggle('locked', aspect!==null);
  const r = cropPx();
  $('#cropReadout').innerHTML = `Crop to <b>${r.w} × ${r.h}</b> px`;
}
function cropPx(){
  const b = S.base, x = Math.round(crop.x*b.width), y = Math.round(crop.y*b.height);
  return {x, y, w: Math.max(1, Math.min(b.width-x, Math.round(crop.w*b.width))), h: Math.max(1, Math.min(b.height-y, Math.round(crop.h*b.height)))};
}
const MIN = 0.04;
function resizeRect(s, h, dx, dy){
  if (h==='move') return {x:clamp(s.x+dx,0,1-s.w), y:clamp(s.y+dy,0,1-s.h), w:s.w, h:s.h};
  let L = s.x, T = s.y, R = s.x+s.w, B = s.y+s.h;
  if (h.includes('w')) L = clamp(L+dx, 0, R-MIN);
  if (h.includes('e')) R = clamp(R+dx, L+MIN, 1);
  if (h.includes('n')) T = clamp(T+dy, 0, B-MIN);
  if (h.includes('s')) B = clamp(B+dy, T+MIN, 1);
  const r = ratioN();
  if (r && h.length===2){
    let w = R-L, hh = w/r;
    const avail = h.includes('n') ? s.y+s.h : 1-s.y;
    if (hh > avail){ hh = avail; w = hh*r; }
    if (h.includes('w')) L = R-w; else R = L+w;
    if (h.includes('n')) T = B-hh; else B = T+hh;
  }
  return {x:L, y:T, w:R-L, h:B-T};
}
layer.addEventListener('pointerdown', e => {
  e.stopPropagation();
  const h = e.target.dataset.h || (e.target.closest('.crop-box') ? 'move' : null);
  if (!h) return;
  e.preventDefault();
  const r = layer.getBoundingClientRect();
  cdrag = {h, sx:e.clientX, sy:e.clientY, W:r.width, H:r.height, start:{...crop}};
  layer.setPointerCapture(e.pointerId);
});
layer.addEventListener('pointermove', e => {
  if (!cdrag) return;
  crop = resizeRect(cdrag.start, cdrag.h, (e.clientX-cdrag.sx)/cdrag.W, (e.clientY-cdrag.sy)/cdrag.H);
  drawCrop();
});
const endCDrag = () => { cdrag = null; };
layer.addEventListener('pointerup', endCDrag); layer.addEventListener('pointercancel', endCDrag);
$('#cropReset').onclick = resetCrop;
$('#cropApply').onclick = () => {
  const b = S.base, r = cropPx();
  if (r.x===0 && r.y===0 && r.w===b.width && r.h===b.height){ toast('Drag the corners to choose an area first.'); return; }
  const c = mk(r.w, r.h); c.getContext('2d').drawImage(b, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  for (const l of S.layers){ l.x -= r.x; l.y -= r.y; }
  S.base = c; commit(); rebuildPreview(); resetCrop(); toast(`Cropped to ${r.w} × ${r.h} px`);
};
document.querySelectorAll('[data-tf]').forEach(btn => btn.onclick = () => transformBase(btn.dataset.tf));
function transformBase(kind){
  const b = S.base, W = b.width, H = b.height; let c, x;
  if (kind==='rl' || kind==='rr'){
    c = mk(H, W); x = c.getContext('2d');
    x.translate(c.width/2, c.height/2); x.rotate(kind==='rr' ? Math.PI/2 : -Math.PI/2); x.drawImage(b, -W/2, -H/2);
  } else {
    c = mk(W, H); x = c.getContext('2d');
    if (kind==='fh'){ x.translate(W,0); x.scale(-1,1); } else { x.translate(0,H); x.scale(1,-1); }
    x.drawImage(b,0,0);
  }
  for (const l of S.layers){
    if (kind==='rr'){ [l.x, l.y] = [H - l.y, l.x]; l.rot += 90; }
    else if (kind==='rl'){ [l.x, l.y] = [l.y, W - l.x]; l.rot -= 90; }
    else if (kind==='fh'){ l.x = W - l.x; l.rot = -l.rot; if (l.type!=='text') l.flip = !l.flip; }
    else { l.y = H - l.y; if (l.type==='text') l.rot = -l.rot; else { l.rot = 180 - l.rot; l.flip = !l.flip; } }
    l.rot = ((l.rot + 540) % 360) - 180;
  }
  S.base = c; commit(); rebuildPreview(); if (tab==='crop') resetCrop();
}
new ResizeObserver(() => { if (tab==='crop') placeOverlay(); placeSel(); }).observe(stage);

/* ================= resize ================= */
let locked = true;
const rw = $('#rw'), rh = $('#rh');
function syncResize(){ rw.value = S.base.width; rh.value = S.base.height; resizeReadout(); }
function resizeReadout(){
  const w = +rw.value||0, h = +rh.value||0, b = S.base;
  const pct = Math.round(w/b.width*100);
  $('#resizeReadout').innerHTML = `From ${b.width} × ${b.height} to <b>${w} × ${h}</b> px · ${pct}% · ${(w*h/1e6).toFixed(1)} MP`;
}
rw.addEventListener('input', () => { if (locked) rh.value = Math.max(1, Math.round(+rw.value * S.base.height / S.base.width)); resizeReadout(); });
rh.addEventListener('input', () => { if (locked) rw.value = Math.max(1, Math.round(+rh.value * S.base.width / S.base.height)); resizeReadout(); });
$('#lockBtn').onclick = e => { locked = !locked; e.currentTarget.classList.toggle('on', locked); e.currentTarget.setAttribute('aria-pressed', String(locked)); if (locked){ rh.value = Math.round(+rw.value * S.base.height / S.base.width); resizeReadout(); } };
(function buildPct(){
  const wrap = $('#pctChips');
  [25,50,75,150,200].forEach(p => {
    const c = document.createElement('button'); c.type='button'; c.className='chip'; c.textContent = p+'%'; c.setAttribute('aria-pressed','false');
    c.onclick = () => { rw.value = Math.max(1, Math.round(S.base.width*p/100)); rh.value = Math.max(1, Math.round(S.base.height*p/100)); resizeReadout(); };
    wrap.appendChild(c);
  });
})();
$('#resizeApply').onclick = () => {
  const w = Math.round(+rw.value), h = Math.round(+rh.value), b = S.base;
  if (!(w>=1 && h>=1)) { toast('Enter a width and height of at least 1 px.'); return; }
  if (w>12000 || h>12000) { toast('The largest size is 12000 px on either side.'); return; }
  if (w===b.width && h===b.height) { toast('That is already the current size.'); return; }
  const fx = w/b.width, fy = h/b.height, fs = Math.sqrt(fx*fy);
  for (const l of S.layers){ l.x *= fx; l.y *= fy; if (l.type==='text') l.size *= fs; else l.scale *= fs; }
  S.base = scaleCanvas(b, w, h); commit(); rebuildPreview(); syncResize(); toast(`Resized to ${w} × ${h} px`);
};

/* ================= adding layers ================= */
function addLayer(props){
  const b = S.base;
  const l = Object.assign({id:nextId++, x:b.width/2, y:b.height/2, rot:0, scale:1, opacity:1, flip:false, hidden:false}, props);
  S.layers.push(l); selId = l.id;
  composite(); commit(); refreshLayerUI();
  return l;
}
function addText(preset = TEXT_PRESETS[0]){
  const l = addLayer({type:'text', text:preset.text, font:preset.font, size:Math.round(minSide()*(preset.sizeK || 0.09)), color:preset.color,
    bold:!!preset.bold, align:'center', outline:preset.outline||0, ocolor:preset.ocolor||'#111111', shadow:preset.shadow||0, bg:preset.bg||''});
  document.fonts.load(`${l.bold?700:400} 40px "${l.font}"`).then(composite).catch(()=>{});
  setTimeout(() => { const t = $('#txt'); if (!t.closest('[hidden]')) { t.focus(); t.select(); } }, 30);
}
function duplicateSel(){
  const l = getSel(); if (!l) return;
  const d = clone(l); d.id = nextId++; d.x += minSide()*0.04; d.y += minSide()*0.04;
  S.layers.splice(S.layers.indexOf(l)+1, 0, d); selId = d.id; composite(); commit(); refreshLayerUI();
}
function deleteLayer(id){
  const i = S.layers.findIndex(l => l.id===id); if (i<0) return;
  S.layers.splice(i,1); if (selId===id) selId = null; if (drawSession===id) drawSession = null;
  composite(); commit(); refreshLayerUI();
}
function select(id, {switchTab=false} = {}){
  selId = id;
  const l = getSel();
  if (l && switchTab && tab!=='layers'){
    const t = l.type==='text' ? 'text' : l.type==='shape' ? 'stickers' : null;
    if (t && t!==tab) setTab(t);
  }
  refreshLayerUI(); placeSel();
}

/* Text panel */
(function buildTextPanel(){
  const wrap = $('#textPresets');
  TEXT_PRESETS.forEach(p => {
    const b = document.createElement('button'); b.type='button'; b.className='preset'; b.textContent = p.label;
    b.style.fontFamily = `"${p.font}", system-ui, sans-serif`; b.style.fontWeight = p.bold ? 700 : 400; b.style.color = p.color==='#111111' ? 'var(--fg)' : p.color;
    if (p.bg){ b.style.background = p.bg; b.style.color = p.color; }
    b.onclick = () => addText(p); wrap.appendChild(b);
  });
  const fs = $('#font');
  FONTS.forEach(f => { const o = document.createElement('option'); o.value = f; o.textContent = f; fs.appendChild(o); });
})();
const selText = () => { const l = getSel(); return l && l.type==='text' ? l : null; };
const txt = $('#txt');
txt.addEventListener('input', () => { const l = selText(); if (!l) return; l.text = txt.value; composite(); refreshLayerList(); });
txt.addEventListener('change', commit);
$('#font').addEventListener('change', e => { const l = selText(); if (!l) return; l.font = e.target.value; document.fonts.load(`${l.bold?700:400} 40px "${l.font}"`).then(composite).catch(()=>{}); composite(); commit(); });
const sizeMax = () => Math.round(minSide()*0.4), sizeMin = () => Math.max(6, Math.round(minSide()*0.01));
const paintTSize = bindRange('tsize', () => { const l = selText(); if (!l) return null; const t = $('#tsize'); t.min = sizeMin(); t.max = sizeMax(); return Math.round(l.size); }, v => { const l = selText(); if (l){ l.size = v; composite(); } }, v => v+' px');
const paintTOutline = bindRange('toutline', () => selText()?.outline ?? null, v => { const l = selText(); if (l){ l.outline = v; composite(); $('#toutlineColorF').hidden = v===0; } });
const paintTShadow = bindRange('tshadow', () => selText()?.shadow ?? null, v => { const l = selText(); if (l){ l.shadow = v; composite(); } });
const colourPick = (prop, getL) => (c, live, done) => { const l = getL(); if (!l) return; l[prop] = c; composite(); syncPanels(); if (!live || done) commit(); };
const tColor = makeSwatches($('#tcolor'), COLOURS, colourPick('color', selText));
const toColor = makeSwatches($('#tocolor'), ['#111111','#ffffff','#efb34a','#ff5a5f','#4da3ff'], colourPick('ocolor', selText));
const tBg = makeSwatches($('#tbg'), ['#ffffff','#111111','#efb34a','#ff5a5f','#4da3ff'], colourPick('bg', selText), {none:true});
document.querySelectorAll('#talign button').forEach(b => b.onclick = () => { const l = selText(); if (!l) return; l.align = b.dataset.v; composite(); syncPanels(); commit(); });
$('#tbold').onclick = () => { const l = selText(); if (!l) return; l.bold = !l.bold; document.fonts.load(`700 40px "${l.font}"`).then(composite).catch(()=>{}); composite(); syncPanels(); commit(); };
$('#tdup').onclick = duplicateSel;
$('#tnew').onclick = () => addText(TEXT_PRESETS[0]);

/* Sticker panel */
(function buildStickers(){
  const grid = $('#stickerGrid');
  SHAPES.forEach(s => {
    const b = document.createElement('button'); b.type='button'; b.className='stk'; b.title = 'Add ' + s.name.toLowerCase();
    b.innerHTML = `<svg viewBox="-4 -4 108 108"><path d="${s.d}" fill="currentColor"/></svg>`;
    b.onclick = () => addLayer({type:'shape', shape:s.id, color:stickerColour, outline:'#ffffff', shadow:true, scale:minSide()*0.22/100});
    grid.appendChild(b);
  });
})();
let stickerColour = '#ff5a5f';
const selShape = () => { const l = getSel(); return l && l.type==='shape' ? l : null; };
const sColor = makeSwatches($('#scolor'), COLOURS, (c, live, done) => { stickerColour = c; const l = selShape(); if (!l) return; l.color = c; composite(); syncPanels(); if (!live || done) commit(); });
(function buildOutlineChips(){
  const wrap = $('#soutline');
  [['None',''],['White','#ffffff'],['Black','#111111']].forEach(([label, v]) => {
    const c = document.createElement('button'); c.type='button'; c.className='chip'; c.textContent = label; c.dataset.v = v;
    c.onclick = () => { const l = selShape(); if (!l) return; l.outline = v; composite(); syncPanels(); commit(); };
    wrap.appendChild(c);
  });
})();
$('#sshadow').onclick = () => { const l = selShape(); if (!l) return; l.shadow = !l.shadow; composite(); syncPanels(); commit(); };

/* Draw panel */
const brush = {color:'#efb34a', size:8, marker:false};
let drawSession = null;
const bColor = makeSwatches($('#bcolor'), COLOURS, c => { brush.color = c; bColor.set(c); });
bColor.set(brush.color);
(function(){ const b = $('#bsize'); const paint = () => { b.value = brush.size; fill(b, brush.size, 1, 60); $('#bsizeOut').textContent = brush.size; }; b.addEventListener('input', () => { brush.size = +b.value; paint(); }); paint(); })();
$('#bmarker').onclick = e => { brush.marker = !brush.marker; e.currentTarget.setAttribute('aria-pressed', String(brush.marker)); };
$('#bnew').onclick = () => { drawSession = null; selId = null; refreshLayerUI(); toast('Your next stroke starts a new drawing layer.'); };

/* Layers panel */
const ICON = {
  eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  off:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6C3.8 8.4 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 4.4-1.1"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 15l6-6 6 6"/></svg>',
  down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>',
};
function refreshLayerList(){
  const ul = $('#layerList'); ul.innerHTML = '';
  for (let i=S.layers.length-1; i>=0; i--){
    const l = S.layers[i], li = document.createElement('li');
    li.className = 'lrow' + (l.id===selId ? ' on' : '') + (l.hidden ? ' hid' : '');
    const kind = l.type==='text' ? 'T' : l.type==='shape' ? '★' : '✎';
    li.innerHTML = `<span class="kind" aria-hidden="true">${kind}</span><button class="name" type="button"></button><span><button class="ib" data-a="vis" type="button" title="${l.hidden?'Show':'Hide'}">${l.hidden?ICON.off:ICON.eye}</button><button class="ib" data-a="up" type="button" title="Bring forward" ${i===S.layers.length-1?'disabled':''}>${ICON.up}</button><button class="ib" data-a="down" type="button" title="Send backward" ${i===0?'disabled':''}>${ICON.down}</button></span>`;
    li.querySelector('.name').textContent = layerName(l);
    li.querySelector('.name').onclick = () => select(l.id);
    li.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      const a = b.dataset.a, idx = S.layers.indexOf(l);
      if (a==='vis') l.hidden = !l.hidden;
      else if (a==='up' && idx < S.layers.length-1) [S.layers[idx], S.layers[idx+1]] = [S.layers[idx+1], S.layers[idx]];
      else if (a==='down' && idx > 0) [S.layers[idx], S.layers[idx-1]] = [S.layers[idx-1], S.layers[idx]];
      composite(); commit(); refreshLayerUI();
    });
    ul.appendChild(li);
  }
  const ph = document.createElement('li'); ph.className = 'lrow photo';
  ph.innerHTML = `<span class="kind" aria-hidden="true">▦</span><span class="name" style="cursor:default">Photo</span><span></span>`;
  ul.appendChild(ph);
}
const paintOpacity = bindRange('lopacity', () => { const l = getSel(); return l ? Math.round(l.opacity*100) : null; }, v => { const l = getSel(); if (l){ l.opacity = v/100; composite(); } }, v => v+'%');
$('#ldup').onclick = duplicateSel;
$('#ldel').onclick = () => { if (selId) deleteLayer(selId); };

function syncPanels(){
  const t = selText();
  $('#textEdit').hidden = !t; $('#textAdd').hidden = !!t;
  if (t){
    if (document.activeElement !== txt) txt.value = t.text;
    $('#font').value = t.font; paintTSize(); paintTOutline(); paintTShadow();
    $('#toutlineColorF').hidden = t.outline===0;
    tColor.set(t.color); toColor.set(t.ocolor); tBg.set(t.bg);
    document.querySelectorAll('#talign button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v===t.align)));
    $('#tbold').classList.toggle('on', t.bold); $('#tbold').setAttribute('aria-pressed', String(t.bold));
  }
  const s = selShape();
  $('#stickerEdit').hidden = !s;
  if (s){ sColor.set(s.color); document.querySelectorAll('#soutline .chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.v===s.outline))); $('#sshadow').setAttribute('aria-pressed', String(!!s.shadow)); }
  else sColor.set(stickerColour);
  $('#layerEdit').hidden = !getSel(); paintOpacity();
}
function refreshLayerUI(){ refreshLayerList(); syncPanels(); placeSel(); }

/* ================= selection box ================= */
const selEl = $('#sel');
function imgToStage(p){
  const sr = stage.getBoundingClientRect(), vr = view.getBoundingClientRect(), k = vr.width / S.base.width;
  return {x: vr.left - sr.left + p.x*k, y: vr.top - sr.top + p.y*k, k, sr};
}
function placeSel(){
  const l = getSel();
  if (!l || l.hidden || comparing || tab==='crop' || tab==='draw'){ selEl.hidden = true; return; }
  const b = bbox(l), c = fromLocal(l, (b[0]+b[2])/2, (b[1]+b[3])/2), s = imgToStage(c);
  selEl.hidden = false;
  Object.assign(selEl.style, {left:s.x+'px', top:s.y+'px', width:((b[2]-b[0])*l.scale*s.k + 10)+'px', height:((b[3]-b[1])*l.scale*s.k + 10)+'px', transform:`translate(-50%,-50%) rotate(${l.rot}deg)`});
}

/* ================= stage pointer: select, move, scale, rotate, draw ================= */
let ldrag = null;
function clientToImg(e){
  const vr = view.getBoundingClientRect(), k = S.base.width / vr.width;
  return {x:(e.clientX - vr.left)*k, y:(e.clientY - vr.top)*k};
}
function layerCentreClient(l){
  const b = bbox(l), c = fromLocal(l, (b[0]+b[2])/2, (b[1]+b[3])/2), s = imgToStage(c);
  return {x: s.x + s.sr.left, y: s.y + s.sr.top};
}
stage.addEventListener('pointerdown', e => {
  if (tab==='crop' || tab==='collage' || e.button > 0) return;
  const sh = e.target.dataset && e.target.dataset.sh;
  if (sh==='del'){ if (selId) deleteLayer(selId); return; }
  const p = clientToImg(e);
  e.preventDefault();
  if (sh==='rot' || sh==='scale'){
    const l = getSel(); if (!l) return;
    const c = layerCentreClient(l);
    ldrag = {type:sh, l, c, d0:Math.hypot(e.clientX-c.x, e.clientY-c.y) || 1, a0:Math.atan2(e.clientY-c.y, e.clientX-c.x), r0:l.rot, s0:l.type==='text' ? l.size : l.scale};
  } else if (tab==='draw'){
    let l = S.layers.find(x => x.id===drawSession && x.type==='draw');
    if (!l){
      l = {id:nextId++, type:'draw', strokes:[], x:S.base.width/2, y:S.base.height/2, rot:0, scale:1, opacity:1, flip:false, hidden:false};
      S.layers.push(l); drawSession = l.id; selId = l.id;
    }
    const q = toLocal(l, p), st = {color:brush.color, size:Math.max(1, minSide()*brush.size/400)/l.scale, marker:brush.marker, pts:[q.x, q.y]};
    l.strokes.push(st); ldrag = {type:'stroke', l, st, k: view.getBoundingClientRect().width / S.base.width};
    composite();
  } else {
    const hit = hitTest(p);
    if (hit){ select(hit.id, {switchTab:true}); ldrag = {type:'move', l:hit, p0:p, x0:hit.x, y0:hit.y, moved:false}; }
    else { if (selId) select(null); return; }
  }
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', e => {
  if (!ldrag) return;
  const l = ldrag.l;
  if (ldrag.type==='move'){ const p = clientToImg(e); l.x = ldrag.x0 + p.x - ldrag.p0.x; l.y = ldrag.y0 + p.y - ldrag.p0.y; ldrag.moved = true; }
  else if (ldrag.type==='scale'){
    const f = Math.hypot(e.clientX-ldrag.c.x, e.clientY-ldrag.c.y) / ldrag.d0;
    if (l.type==='text') l.size = clamp(ldrag.s0*f, 4, minSide()*1.5); else l.scale = clamp(ldrag.s0*f, 0.02, 100);
  } else if (ldrag.type==='rot'){
    let r = ldrag.r0 + (Math.atan2(e.clientY-ldrag.c.y, e.clientX-ldrag.c.x) - ldrag.a0)/RAD;
    r = ((r + 540) % 360) - 180;
    const snapTo = e.shiftKey ? 15 : 45, near = Math.round(r/snapTo)*snapTo;
    if (e.shiftKey || Math.abs(r-near) < 3) r = near;
    l.rot = r;
  } else if (ldrag.type==='stroke'){
    const q = toLocal(l, clientToImg(e)), p = ldrag.st.pts, lx = p[p.length-2], ly = p[p.length-1];
    if (Math.hypot(q.x-lx, q.y-ly)*l.scale*ldrag.k < 1.5) return;
    p.push(q.x, q.y);
  }
  composite();
});
function endLDrag(){
  if (!ldrag) return;
  const t = ldrag.type, moved = ldrag.moved; ldrag = null;
  if (t!=='move' || moved){ commit(); syncPanels(); }
  if (t==='stroke') refreshLayerList();
}
stage.addEventListener('pointerup', endLDrag); stage.addEventListener('pointercancel', endLDrag);
stage.addEventListener('dblclick', e => {
  if (tab==='crop' || tab==='draw' || tab==='collage') return;
  const hit = hitTest(clientToImg(e));
  if (hit && hit.type==='text'){ select(hit.id, {switchTab:true}); setTimeout(() => { txt.focus(); txt.select(); }, 20); }
});

/* ================= compare ================= */
const cmp = $('#compareBtn');
function setCompare(on){ if (comparing===on) return; comparing = on; $('#compareBadge').hidden = !on; cmp.classList.toggle('on', on); composite(); }
cmp.addEventListener('pointerdown', e => { e.preventDefault(); setCompare(true); });
['pointerup','pointerleave','pointercancel'].forEach(ev => cmp.addEventListener(ev, () => setCompare(false)));

/* ================= open ================= */
/* In the desktop app, window.tinto (from preload.js) gives native dialogs. In a plain browser it is absent and file inputs are used. */
const desktop = !!window.tinto;
const MIME = {jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', gif:'image/gif', bmp:'image/bmp'};
function nativeToFile(f){
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  return new File([f.data], f.name, {type: MIME[ext] || 'application/octet-stream'});
}
async function openPhoto(){
  if (!desktop) { $('#fileInput').click(); return; }
  const files = await window.tinto.openImages(false);
  if (files.length) { if (tab==='collage') setTab('adjust'); openFile(nativeToFile(files[0])); }
}
$('#openBtn').onclick = openPhoto;
if (desktop){
  window.tinto.onOpenFile(f => { if (tab==='collage') setTab('adjust'); openFile(nativeToFile(f)); });
  window.tinto.onMenu(action => {
    if (action==='open') openPhoto();
    else if (action==='export' && $('#exportModal').hidden) $('#exportBtn').click();
  });
}
$('#fileInput').onchange = e => { openFile(e.target.files[0]); e.target.value = ''; };
function openFile(file){
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('That file isn’t an image. Open a JPG, PNG, WebP or GIF.'); return; }
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    const c = mk(img.naturalWidth, img.naturalHeight); c.getContext('2d').drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    S = {base:c, params:defaults(), filter:'none', strength:100, layers:[], name:(file.name.replace(/\.[^.]+$/,'') || 'photo'), label:file.name};
    selId = null; drawSession = null; hist = []; hi = -1; commit(); syncUI(); rebuildPreview(); syncResize(); refreshLayerUI(); if (tab==='crop') resetCrop();
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast('This browser can’t read that image. HEIC photos need converting to JPG first.'); };
  img.src = url;
}
let dragDepth = 0;
window.addEventListener('dragenter', e => { if ([...e.dataTransfer.types].includes('Files')) { dragDepth++; $('#dropHint').hidden = false; } });
window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth-1); if (!dragDepth) $('#dropHint').hidden = true; });
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
  e.preventDefault(); dragDepth = 0; $('#dropHint').hidden = true;
  if (tab==='collage') { const r = collageCellAt(e); fillCells([...e.dataTransfer.files], r >= 0 ? r : firstEmpty()); }
  else openFile(e.dataTransfer.files[0]);
});
window.addEventListener('paste', e => {
  const fs = [...(e.clipboardData?.files||[])].filter(f => f.type.startsWith('image/')); if (!fs.length) return;
  if (tab==='collage') fillCells(fs, C.sel >= 0 ? C.sel : firstEmpty()); else openFile(fs[0]);
});

/* ================= keyboard ================= */
const typing = () => { const a = document.activeElement; return a && (a.tagName==='TEXTAREA' || (a.tagName==='INPUT' && a.type!=='range') || a.tagName==='SELECT'); };
window.addEventListener('keydown', e => {
  const mod = e.ctrlKey || e.metaKey;
  if (typing()) { if (e.key==='Escape') document.activeElement.blur(); return; }
  if (tab==='collage'){
    if ((e.key==='Delete' || e.key==='Backspace') && C.sel >= 0 && C.cells[C.sel]){ e.preventDefault(); C.cells[C.sel] = null; syncCollage(); }
    else if (e.key==='Escape' && $('#exportModal').hidden){ C.sel = -1; syncCollage(); }
    else if (e.key==='Escape') closeModal();
    if (mod) e.preventDefault();
    return;
  }
  if (mod && e.key.toLowerCase()==='z'){ e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && e.key.toLowerCase()==='y'){ e.preventDefault(); redo(); }
  else if (mod && e.key.toLowerCase()==='d' && selId){ e.preventDefault(); duplicateSel(); }
  else if ((e.key==='Delete' || e.key==='Backspace') && selId){ e.preventDefault(); deleteLayer(selId); }
  else if (e.key==='\\' && !e.repeat) setCompare(true);
  else if (e.key==='Escape'){ if (!$('#exportModal').hidden) closeModal(); else if (selId) select(null); }
});
window.addEventListener('keyup', e => { if (e.key==='\\') setCompare(false); });
$('#undoBtn').onclick = undo; $('#redoBtn').onclick = redo;

/* ================= export ================= */
let fmt = 'jpeg';
$('#exportBtn').onclick = () => {
  $('#fallback').hidden = true; $('#exSave').hidden = false;
  const n = S.layers.filter(l => !l.hidden).length;
  if (tab==='collage'){ const [w,h] = collageSize(); $('#exTitle').textContent = 'Export collage'; $('#exportInfo').innerHTML = `Collage: <b>${w} × ${h}</b> px, empty cells left as background`; }
  else { $('#exTitle').textContent = 'Export photo'; $('#exportInfo').innerHTML = `Full size: <b>${S.base.width} × ${S.base.height}</b> px, with every edit applied${n ? ` and ${n} layer${n>1?'s':''} merged` : ''}`; }
  $('#exportModal').hidden = false; $('#exSave').focus();
};
function closeModal(){ $('#exportModal').hidden = true; }
$('#exCancel').onclick = closeModal;
$('#exportModal').addEventListener('click', e => { if (e.target.id==='exportModal') closeModal(); });
document.querySelectorAll('#fmtSeg button').forEach(b => b.onclick = () => {
  fmt = b.dataset.f; document.querySelectorAll('#fmtSeg button').forEach(x => x.setAttribute('aria-pressed', String(x===b)));
  $('#qualityRow').hidden = fmt==='png';
});
const q = $('#quality');
const paintQ = () => { fill(q, +q.value, 40); $('#qualityOut').textContent = q.value; };
q.addEventListener('input', paintQ); paintQ();
$('#exSave').onclick = async () => {
  const btn = $('#exSave'); btn.disabled = true; btn.textContent = 'Preparing…';
  await new Promise(r => setTimeout(r, 30));
  try {
    const col = tab==='collage';
    let c = col ? renderCollageFull() : await renderEditorFull();
    if (fmt==='jpeg'){ const j = mk(c.width,c.height), x = j.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0,0,j.width,j.height); x.drawImage(c,0,0); c = j; }
    const blob = await new Promise(r => c.toBlob(r, 'image/'+fmt, +q.value/100));
    if (!blob) throw new Error('encode');
    const ext = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[blob.type] || 'png';
    const filename = col ? `collage.${ext}` : `${S.name}-edited.${ext}`;
    if (desktop){
      const res = await window.tinto.saveImage(filename, new Uint8Array(await blob.arrayBuffer()), ext);
      if (res.saved){ closeModal(); toast(`Saved ${res.path.split(/[\\/]/).pop()}`, 'Show in folder', () => window.tinto.showInFolder(res.path)); }
      else if (res.error) toast(`Couldn’t save: ${res.error}`);
    } else showFallback(blob);
  } catch (e) { toast('The photo couldn’t be encoded. Try PNG, or a smaller size.'); }
  btn.disabled = false; btn.textContent = 'Save file';
};
async function renderEditorFull(){
  await document.fonts.ready;
  const b = S.base;
  const out = processImage(b.getContext('2d').getImageData(0,0,b.width,b.height), effective());
  const c = mk(b.width, b.height), cx = c.getContext('2d'); cx.putImageData(out, 0, 0); drawLayers(cx, 1);
  return c;
}
function showFallback(blob){
  const img = $('#fallbackImg'); if (img.src) URL.revokeObjectURL(img.src);
  img.src = URL.createObjectURL(blob); $('#fallback').hidden = false; $('#exSave').hidden = true;
}

/* ================= collage ================= */
const R3 = 1/3;
const LAYOUTS = [
  {id:'two', cells:[[0,0,.5,1],[.5,0,.5,1]]},
  {id:'stack', cells:[[0,0,1,.5],[0,.5,1,.5]]},
  {id:'three', cells:[[0,0,R3,1],[R3,0,R3,1],[2*R3,0,R3,1]]},
  {id:'feature', cells:[[0,0,.6,1],[.6,0,.4,.5],[.6,.5,.4,.5]]},
  {id:'top', cells:[[0,0,1,.58],[0,.58,.5,.42],[.5,.58,.5,.42]]},
  {id:'grid4', cells:[[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5]]},
  {id:'hero', cells:[[0,0,1,.62],[0,.62,R3,.38],[R3,.62,R3,.38],[2*R3,.62,R3,.38]]},
  {id:'side', cells:[[0,0,.36,R3],[0,R3,.36,R3],[0,2*R3,.36,R3],[.36,0,.64,1]]},
  {id:'mosaic', cells:[[0,0,.5,.6],[.5,0,.5,.4],[.5,.4,.5,.6],[0,.6,.25,.4],[.25,.6,.25,.4]]},
  {id:'grid6', cells:[[0,0,R3,.5],[R3,0,R3,.5],[2*R3,0,R3,.5],[0,.5,R3,.5],[R3,.5,R3,.5],[2*R3,.5,R3,.5]]},
  {id:'strip', cells:[[0,0,1,.25],[0,.25,1,.25],[0,.5,1,.25],[0,.75,1,.25]]},
  {id:'grid9', cells:[0,1,2].flatMap(r => [0,1,2].map(c => [c*R3, r*R3, R3, R3]))},
];
const RATIOS = [['1:1',1],['4:5',4/5],['9:16',9/16],['16:9',16/9],['3:2',3/2]];
const CLONG = 2400;
let C = {layout:LAYOUTS[3], ratio:4/5, gap:30, radius:12, bg:'#ffffff', cells:[], sel:-1};
const ccv = $('#collage'), cctx = ccv.getContext('2d');

function collageSize(){ return C.ratio >= 1 ? [CLONG, Math.round(CLONG/C.ratio)] : [Math.round(CLONG*C.ratio), CLONG]; }
function cellRects(W, H){
  const g = C.gap/100 * 0.05 * Math.max(W, H), m = g/2;
  return C.layout.cells.map(([x,y,w,h]) => ({x: m + x*(W-2*m) + g/2, y: m + y*(H-2*m) + g/2, w: Math.max(1, w*(W-2*m) - g), h: Math.max(1, h*(H-2*m) - g)}));
}
function cellGeom(cell, r){
  const iw = cell.img.width, ih = cell.img.height, s = Math.max(r.w/iw, r.h/ih) * cell.zoom;
  const dw = iw*s, dh = ih*s, ex = (dw - r.w)/2, ey = (dh - r.h)/2;
  return {dw, dh, ex, ey, dx: r.x + (r.w - dw)/2 + cell.fx*ex, dy: r.y + (r.h - dh)/2 + cell.fy*ey};
}
function renderCollage(ctx, W, H, preview){
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const rects = cellRects(W, H);
  rects.forEach((r, i) => {
    const cell = C.cells[i], rad = C.radius/100 * 0.5 * Math.min(r.w, r.h);
    ctx.save(); ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, rad); ctx.clip();
    if (cell){ const g = cellGeom(cell, r); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(cell.img, g.dx, g.dy, g.dw, g.dh); }
    else if (preview){
      ctx.fillStyle = 'rgba(128,128,136,.22)'; ctx.fillRect(r.x, r.y, r.w, r.h);
      const s = Math.min(r.w, r.h)*0.12, cx = r.x + r.w/2, cy = r.y + r.h/2;
      ctx.strokeStyle = 'rgba(128,128,136,.85)'; ctx.lineWidth = Math.max(4, s*0.18); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy); ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s); ctx.stroke();
    }
    ctx.restore();
    if (preview && i===C.sel){
      ctx.save(); ctx.strokeStyle = '#efb34a'; ctx.lineWidth = Math.max(6, W*0.004);
      ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, rad); ctx.stroke(); ctx.restore();
    }
  });
}
function drawCollage(){
  const [W, H] = collageSize();
  if (ccv.width !== W || ccv.height !== H){ ccv.width = W; ccv.height = H; }
  renderCollage(cctx, W, H, true);
}
function renderCollageFull(){ const [W, H] = collageSize(), c = mk(W, H); renderCollage(c.getContext('2d'), W, H, false); return c; }
const usedCells = () => C.layout.cells.map((_, i) => C.cells[i]).filter(Boolean).length;
function collageInfo(){ if (tab !== 'collage') return; const [W, H] = collageSize(); $('#fileInfo').textContent = `Collage · ${usedCells()} of ${C.layout.cells.length} photos · ${W} × ${H} px`; }
function firstEmpty(from = 0){ const n = C.layout.cells.length; for (let k=0; k<n; k++){ const i = (from + k) % n; if (!C.cells[i]) return i; } return -1; }

function shrinkTo(src, max = CLONG){
  const s = Math.min(1, max / Math.max(src.width, src.height));
  return s < 1 ? scaleCanvas(src, Math.round(src.width*s), Math.round(src.height*s)) : src;
}
function loadImageFile(file){
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { const c = mk(img.naturalWidth, img.naturalHeight); c.getContext('2d').drawImage(img, 0, 0); URL.revokeObjectURL(url); res(shrinkTo(c)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode')); };
    img.src = url;
  });
}
async function fillCells(files, start){
  files = files.filter(f => f.type.startsWith('image/'));
  if (!files.length){ toast('Choose JPG, PNG, WebP or GIF photos.'); return; }
  let i = start < 0 ? firstEmpty(0) : start, placed = 0, failed = 0, left = 0;
  for (const f of files){
    if (i < 0){ left++; continue; }
    try {
      const img = await loadImageFile(f);
      C.cells[i] = {img, zoom:1, fx:0, fy:0}; C.sel = i; placed++;
      syncCollage();
      i = firstEmpty(i);
    } catch (e) { failed++; }
  }
  if (failed) toast(`${failed} photo${failed>1?'s':''} couldn’t be read. HEIC needs converting to JPG first.`);
  else if (left > 0) toast(`Added ${placed}. Pick a layout with more cells for the other ${left}.`);
}
let pendingCell = -1;
function pickFor(i){ pendingCell = i; $('#collageInput').click(); }
$('#collageInput').onchange = e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) fillCells(fs, pendingCell); };

/* collage UI */
(function buildCollageUI(){
  const grid = $('#layoutGrid');
  LAYOUTS.forEach(L => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'lay'; b.title = `${L.cells.length} photos`;
    b.innerHTML = `<svg viewBox="0 0 100 100">${L.cells.map(([x,y,w,h]) => `<rect x="${x*100+3}" y="${y*100+3}" width="${w*100-6}" height="${h*100-6}" rx="4" fill="currentColor" opacity=".8"/>`).join('')}</svg>`;
    b.onclick = () => { C.layout = L; if (C.sel >= L.cells.length) C.sel = -1; syncCollage(); };
    grid.appendChild(b); L.btn = b;
  });
  const rc = $('#ratioChips');
  RATIOS.forEach(([label, v]) => {
    const c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.textContent = label; c.dataset.v = v;
    c.onclick = () => { C.ratio = v; syncCollage(); };
    rc.appendChild(c);
  });
})();
const cBg = makeSwatches($('#cbg'), ['#ffffff','#111111','#f3ece0','#efb34a','#ff7ac6','#4da3ff','#3ddc97'], c => { C.bg = c; syncCollage(); });
const paintCGap = bindRange('cgap', () => C.gap, v => { C.gap = v; drawCollage(); });
const paintCRadius = bindRange('cradius', () => C.radius, v => { C.radius = v; drawCollage(); });
const paintCZoom = bindRange('czoom', () => { const c = C.cells[C.sel]; return c ? Math.round(c.zoom*100) : null; }, v => { const c = C.cells[C.sel]; if (c){ c.zoom = v/100; drawCollage(); } }, v => v+'%');
$('#cReplace').onclick = () => { if (C.sel >= 0) pickFor(C.sel); };
$('#cRemove').onclick = () => { if (C.sel >= 0){ C.cells[C.sel] = null; syncCollage(); } };
$('#cAdd').onclick = () => { const e = firstEmpty(C.sel >= 0 ? C.sel : 0); if (e < 0) { toast('Every cell has a photo. Pick a layout with more cells, or select one and use Replace.'); return; } pickFor(e); };
$('#cAddCurrent').onclick = async () => {
  const e = C.sel >= 0 && !C.cells[C.sel] ? C.sel : firstEmpty(C.sel >= 0 ? C.sel : 0);
  if (e < 0) { toast('Every cell has a photo. Remove one first.'); return; }
  const img = shrinkTo(await renderEditorFull());
  C.cells[e] = {img, zoom:1, fx:0, fy:0}; C.sel = e; syncCollage(); toast('Added the photo you’re editing, with its edits.');
};
$('#cToEditor').onclick = () => {
  if (!usedCells()) { toast('Add at least one photo to the collage first.'); return; }
  S.base = renderCollageFull(); S.layers = []; S.params = defaults(); S.filter = 'none'; S.strength = 100;
  S.name = 'collage'; S.label = 'Collage'; selId = null; drawSession = null;
  commit(); syncUI(); setTab('adjust'); rebuildPreview(); syncResize(); refreshLayerUI();
  toast('Collage sent to the editor. Undo brings back your previous photo.');
};
function syncCollage(){
  LAYOUTS.forEach(L => L.btn.setAttribute('aria-pressed', String(L===C.layout)));
  document.querySelectorAll('#ratioChips .chip').forEach(c => c.setAttribute('aria-pressed', String(+c.dataset.v===C.ratio)));
  cBg.set(C.bg); paintCGap(); paintCRadius();
  $('#cellEdit').hidden = !(C.sel >= 0 && C.cells[C.sel]); paintCZoom();
  drawCollage(); collageInfo();
}

/* collage pointer: tap empty = add, drag = reposition, wheel = zoom */
function collagePoint(e){ const r = ccv.getBoundingClientRect(); return {x:(e.clientX - r.left) * ccv.width / r.width, y:(e.clientY - r.top) * ccv.height / r.height, k: ccv.width / r.width}; }
function collageCellAt(e){
  const p = collagePoint(e), rects = cellRects(ccv.width, ccv.height);
  return rects.findIndex(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
}
let cdragCell = null;
ccv.addEventListener('pointerdown', e => {
  e.stopPropagation();
  const i = collageCellAt(e);
  if (i < 0){ C.sel = -1; syncCollage(); return; }
  C.sel = i; syncCollage();
  const cell = C.cells[i];
  if (!cell){ pickFor(i); return; }
  const r = cellRects(ccv.width, ccv.height)[i], g = cellGeom(cell, r);
  cdragCell = {cell, p0:collagePoint(e), fx0:cell.fx, fy0:cell.fy, ex:g.ex, ey:g.ey};
  ccv.setPointerCapture(e.pointerId); ccv.style.cursor = 'grabbing';
});
ccv.addEventListener('pointermove', e => {
  if (!cdragCell) return;
  const p = collagePoint(e), d = cdragCell;
  if (d.ex > 0.5) d.cell.fx = clamp(d.fx0 + (p.x - d.p0.x)/d.ex, -1, 1);
  if (d.ey > 0.5) d.cell.fy = clamp(d.fy0 + (p.y - d.p0.y)/d.ey, -1, 1);
  drawCollage();
});
const endCollageDrag = () => { cdragCell = null; ccv.style.cursor = ''; };
ccv.addEventListener('pointerup', endCollageDrag); ccv.addEventListener('pointercancel', endCollageDrag);
ccv.addEventListener('wheel', e => {
  const i = collageCellAt(e), cell = C.cells[i]; if (!cell) return;
  e.preventDefault();
  cell.zoom = clamp(cell.zoom * (e.deltaY < 0 ? 1.07 : 1/1.07), 1, 4);
  if (C.sel !== i){ C.sel = i; syncCollage(); } else { paintCZoom(); drawCollage(); }
}, {passive:false});

function seedCollage(){
  const b = S.base, W = b.width, H = b.height;
  const crop = (x, y, w, h, params, filter) => {
    const c = mk(Math.round(w*W), Math.round(h*H)); c.getContext('2d').drawImage(b, x*W, y*H, w*W, h*H, 0, 0, c.width, c.height);
    const d = processImage(c.getContext('2d').getImageData(0,0,c.width,c.height), effective(filter, 100, Object.assign(defaults(), params)));
    c.getContext('2d').putImageData(d, 0, 0); return c;
  };
  C.cells = [
    {img:crop(0, 0, 1, 1, {}, 'none'), zoom:1.15, fx:0.3, fy:0},
    {img:crop(.45, .2, .4, .45, {}, 'warm'), zoom:1, fx:0, fy:0},
    {img:crop(0, .45, .5, .55, {}, 'noir'), zoom:1, fx:0, fy:0},
  ];
}

/* ================= toast ================= */
let tt = 0;
function toast(msg, actionLabel, action){
  const t = $('#toast'); t.textContent = msg;
  if (actionLabel){
    const b = document.createElement('button'); b.type = 'button'; b.className = 'linkbtn'; b.textContent = actionLabel; b.style.marginLeft = '12px';
    b.onclick = () => { t.hidden = true; action(); }; t.appendChild(b);
  }
  t.hidden = false; clearTimeout(tt); tt = setTimeout(() => t.hidden = true, actionLabel ? 6000 : 2600);
}

/* ================= sample photo ================= */
function makeSample(){
  const W = 1600, H = 1067, c = mk(W,H), x = c.getContext('2d'), hz = H*0.56;
  const sky = x.createLinearGradient(0,0,0,hz);
  sky.addColorStop(0,'#24345f'); sky.addColorStop(0.45,'#7a5a86'); sky.addColorStop(0.8,'#e7895a'); sky.addColorStop(1,'#f7c27c');
  x.fillStyle = sky; x.fillRect(0,0,W,hz);
  const sun = x.createRadialGradient(W*0.63,hz-40,4,W*0.63,hz-40,260);
  sun.addColorStop(0,'rgba(255,246,214,1)'); sun.addColorStop(0.12,'rgba(255,224,150,.9)'); sun.addColorStop(1,'rgba(255,180,100,0)');
  x.fillStyle = sun; x.fillRect(0,0,W,hz);
  x.fillStyle = 'rgba(255,214,170,.35)';
  for (let i=0;i<6;i++){ x.beginPath(); x.ellipse(200+i*260, 120+((i*97)%140), 160, 14, 0, 0, Math.PI*2); x.fill(); }
  const ridge = (base, amp, f, seed, col) => {
    x.fillStyle = col; x.beginPath(); x.moveTo(0,hz);
    for (let px=0; px<=W; px+=8){ const y = base - amp*(0.55*Math.sin(px*f+seed) + 0.3*Math.sin(px*f*2.7+seed*2) + 0.15*Math.sin(px*f*7.3+seed*3)); x.lineTo(px,y); }
    x.lineTo(W,hz); x.closePath(); x.fill();
  };
  ridge(hz-70, 90, 0.004, 1, '#8c6a8a'); ridge(hz-30, 70, 0.006, 4, '#5b4568'); ridge(hz-5, 45, 0.009, 9, '#2f2640');
  const lake = x.createLinearGradient(0,hz,0,H);
  lake.addColorStop(0,'#c98a6a'); lake.addColorStop(0.35,'#5e4a6e'); lake.addColorStop(1,'#1b1a2c');
  x.fillStyle = lake; x.fillRect(0,hz,W,H-hz);
  for (let i=0;i<70;i++){ const y = hz+6+i*i*0.09, w = 220 - i*2.6; if (w<10) break; x.fillStyle = `rgba(255,226,170,${0.5 - i*0.006})`; x.fillRect(W*0.63 - w/2 + Math.sin(i*1.7)*14, y, w, 2); }
  x.fillStyle = '#100e18';
  for (let i=0;i<14;i++){ const tx = -20 + i*34 + (i%3)*9, th = 180 + (i*53)%160, ty = H-60+(i%4)*8; x.beginPath(); x.moveTo(tx, ty-th); x.lineTo(tx-34, ty); x.lineTo(tx+34, ty); x.closePath(); x.fill(); }
  x.fillRect(0, H-70, 520, 70);
  const id = x.getImageData(0,0,W,H), d = id.data;
  for (let i=0;i<d.length;i+=4){ const n = (Math.random()-0.5)*10; d[i]+=n; d[i+1]+=n; d[i+2]+=n; }
  x.putImageData(id,0,0);
  return c;
}

/* ================= boot ================= */
S.base = makeSample(); S.name = 'lakeside-dusk'; S.label = 'Sample: lakeside-dusk.jpg';
S.layers.push({id:nextId++, type:'text', text:'Golden hour', font:'Caveat', size:120, color:'#fff3d6', bold:true, align:'center', outline:0, ocolor:'#111111', shadow:40, bg:'', x:1010, y:250, rot:-6, scale:1, opacity:1, flip:false, hidden:false});
S.layers.push({id:nextId++, type:'shape', shape:'sparkle', color:'#fff3d6', outline:'', shadow:false, x:1260, y:190, rot:0, scale:0.7, opacity:0.9, flip:false, hidden:false});
commit(); syncUI(); rebuildPreview(); syncResize(); refreshLayerUI();
seedCollage(); syncCollage();
if (desktop) window.tinto.startupFile().then(f => { if (f) openFile(nativeToFile(f)); }).catch(() => {});
document.fonts.load('700 40px "Caveat"').then(composite).catch(()=>{});
FONTS.forEach(f => document.fonts.load(`400 40px "${f}"`).catch(()=>{}));

/* ================= logo animation ================= */
(function logoAnimation(){
  const logo = document.querySelector('.tlogo'), brand = document.querySelector('.brand');
  if (!logo || !brand) return;
  const play = () => { logo.classList.remove('play'); void brand.offsetWidth; logo.classList.add('play'); };
  let busy = false;
  logo.addEventListener('animationend', e => { if (e.animationName === 't-slide') busy = false; });
  brand.addEventListener('mouseenter', () => { if (!busy){ busy = true; play(); } });
  // The window stays hidden behind the startup screen at first, so wait until it can be seen.
  const firstPlay = () => setTimeout(() => { busy = true; play(); }, 400);
  if (document.visibilityState === 'visible') firstPlay();
  else document.addEventListener('visibilitychange', function once(){
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', once); firstPlay();
  });
})();
