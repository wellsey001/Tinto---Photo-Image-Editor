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
  {k:'saturation', label:'Saturation'}, {k:'vibrance', label:'Vibrance'}, {k:'warmth', label:'Warmth'}, {k:'tint', label:'Tint'},
  {k:'hue', label:'Hue'}, {k:'split', label:'Split tone'},
  {g:'Effects'},
  {k:'fade', label:'Fade', min:0}, {k:'vignette', label:'Vignette', min:0}, {k:'grain', label:'Grain', min:0}, {k:'sharpness', label:'Sharpness', min:0},
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
  {id:'cinema', name:'Cinema', d:{split:50, contrast:18, saturation:-8, shadows:-6}},
  {id:'portra', name:'Portra', d:{warmth:12, fade:15, saturation:-8, highlights:-18, shadows:12, grain:12}},
  {id:'lomo', name:'Lomo', d:{contrast:35, saturation:30, vignette:60, warmth:6}},
  {id:'cross', name:'Cross', d:{split:-40, tint:-18, contrast:22, saturation:18}},
  {id:'rose', name:'Rosé', d:{tint:30, warmth:10, fade:18, exposure:6}},
  {id:'arctic', name:'Arctic', d:{warmth:-45, exposure:8, saturation:-20, fade:12}},
  {id:'moody', name:'Moody', d:{exposure:-12, contrast:22, saturation:-25, shadows:-10, vignette:30, warmth:-8}},
  {id:'bright', name:'Bright', d:{exposure:18, shadows:22, contrast:-6, vibrance:22}},
  {id:'vintage', name:'Vintage', d:{fade:30, contrast:-10, vignette:25, grain:30}, mode:'sepia', modeAmt:0.55},
  {id:'faded', name:'Faded', d:{fade:48, saturation:-32, contrast:-15}},
  {id:'emerald', name:'Emerald', d:{tint:-32, hue:-5, contrast:10, split:-12}},
  {id:'gold', name:'Gilded', d:{warmth:40, vibrance:25, highlights:-20, split:22}},
  {id:'silver', name:'Silver', d:{contrast:28, grain:40, fade:10, highlights:-10}, mode:'mono'},
];

const FONTS = ['Hanken Grotesk','Anton','Bebas Neue','Playfair Display','Lora','Caveat','Permanent Marker','Pacifico','Space Mono','Sora','Lobster','Righteous','Dancing Script','Bungee'];
const COLOURS = ['#ffffff','#111111','#efb34a','#ff5a5f','#ff7ac6','#4da3ff','#3ddc97','#9b6bff'];

function polyPath(n, r, rot = -Math.PI/2){
  let d = '';
  for (let i=0;i<n;i++){ const a = rot + i*2*Math.PI/n; d += (i?'L':'M') + (50 + r*Math.cos(a)).toFixed(2) + ' ' + (50 + r*Math.sin(a)).toFixed(2) + ' '; }
  return d + 'Z';
}
const circ = (cx, cy, r) => `M${cx-r} ${cy} a${r} ${r} 0 1 0 ${2*r} 0 a${r} ${r} 0 1 0 ${-2*r} 0Z`;
const ell = (cx, cy, rx, ry) => `M${cx-rx} ${cy} a${rx} ${ry} 0 1 0 ${2*rx} 0 a${rx} ${ry} 0 1 0 ${-2*rx} 0Z`;
function sunPath(){
  let d = circ(50, 50, 21);
  for (let i=0;i<8;i++){ const a = i*Math.PI/4, c = Math.cos(a), s = Math.sin(a), px = -s, py = c;
    const p = (r, w) => `${(50 + c*r + px*w).toFixed(2)} ${(50 + s*r + py*w).toFixed(2)}`;
    d += `M${p(28, 6)} L${p(46, 0)} L${p(28, -6)}Z`; }
  return d;
}
function flowerPath(){
  // Five separate round petals around a centre, with a small gap so each petal reads on its own.
  let d = '';
  for (let i=0;i<5;i++){ const a = -Math.PI/2 + i*2*Math.PI/5; d += circ(+(50 + 29*Math.cos(a)).toFixed(2), +(50 + 29*Math.sin(a)).toFixed(2), 18); }
  return d + circ(50, 50, 11);
}
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
  {id:'smiley', name:'Smiley', d:circ(50,50,46) + ell(36,38,6,8) + ell(64,38,6,8) + 'M27 58 Q50 86 73 58 Q50 72 27 58Z', rule:'evenodd'},
  {id:'sun', name:'Sun', d:sunPath()},
  {id:'moon', name:'Moon', d:'M60 6 A44 44 0 1 0 94 64 A35 35 0 1 1 60 6Z'},
  {id:'cloud', name:'Cloud', d:'M24 80 H76 A19 19 0 0 0 79 42 A25 25 0 0 0 32 36 A22 22 0 0 0 24 80Z'},
  {id:'flower', name:'Flower', d:flowerPath()},
  {id:'note', name:'Music note', d:'M44 24 H49 V78 H44Z M82 14 H87 V70 H82Z M44 22 L87 12 V24 L44 34Z' + ell(36,78,12,9) + ell(74,70,12,9)},
  {id:'paw', name:'Paw', d:ell(24,42,9,11) + ell(40,24,9,11) + ell(60,24,9,11) + ell(76,42,9,11) + 'M50 48 C70 48 84 68 78 82 C72 93 60 86 50 86 C40 86 28 93 22 82 C16 68 30 48 50 48Z'},
  {id:'pin', name:'Location pin', d:'M50 96 C50 96 16 60 16 38 A34 34 0 0 1 84 38 C84 60 50 96 50 96Z' + circ(50,38,12), rule:'evenodd'},
  {id:'check', name:'Tick', d:'M12 52 L25 39 L42 56 L76 21 L89 34 L42 81Z'},
  {id:'cross', name:'Cross', d:'M22 10 L50 38 L78 10 L90 22 L62 50 L90 78 L78 90 L50 62 L22 90 L10 78 L38 50 L10 22Z'},
  {id:'gem', name:'Gem', d:'M28 12 H72 L94 38 L50 92 L6 38Z'},
  {id:'hexagon', name:'Hexagon', d:polyPath(6, 47, 0)},
  {id:'bow', name:'Bow', d:'M50 50 L8 24 Q2 50 8 76Z M50 50 L92 24 Q98 50 92 76Z' + ell(50,50,11,13)},
];
const STICKER_IMG = new Map(); // custom sticker id -> canvas; layers store only the id
const PATHS = Object.fromEntries(SHAPES.map(s => [s.id, new Path2D(s.d)]));
const RULES = Object.fromEntries(SHAPES.map(s => [s.id, s.rule || 'nonzero']));
const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';

const TEXT_PRESETS = [
  {label:'HEADLINE', text:'GOLDEN HOUR', font:'Anton', color:'#ffffff', shadow:45, outline:0},
  {label:'Handwritten', text:'Wish you were here', font:'Caveat', color:'#efb34a', shadow:30, outline:0},
  {label:'Label', text:'Lakeside, 2026', font:'Hanken Grotesk', bold:true, color:'#111111', bg:'#ffffff', outline:0, shadow:0, sizeK:0.05},
  {label:'Classic', text:'Evening light', font:'Playfair Display', color:'#ffffff', shadow:35, outline:0},
  {label:'Marker', text:'Best day!', font:'Permanent Marker', color:'#ff5a5f', outline:30, ocolor:'#ffffff', shadow:0},
  {label:'Retro', text:'Summer', font:'Pacifico', color:'#ff7ac6', outline:28, ocolor:'#111111', shadow:20},
  {label:'Neon', text:'Good vibes', font:'Righteous', color:'#ffffff', glow:'#ff4fd8', outline:0, shadow:0},
  {label:'STICKER', text:'WOW!', font:'Bungee', color:'#ff5a5f', outline:45, ocolor:'#ffffff', shadow:35},
  {label:'Typewriter', text:'Dear diary…', font:'Space Mono', bold:true, color:'#111111', bg:'#f3ece0', outline:0, shadow:0, sizeK:0.045},
  {label:'Script', text:'Forever', font:'Dancing Script', bold:true, color:'#ffffff', shadow:40, outline:0},
  {label:'CAPTION', text:'MONDAY MOOD', font:'Bebas Neue', color:'#ffffff', bg:'#111111', outline:0, shadow:0, sizeK:0.06, spacing:20},
  {label:'Fancy', text:'Party time', font:'Lobster', color:'#efb34a', outline:25, ocolor:'#111111', shadow:25},
];

/* ================= state + history ================= */
const BG_DEFAULT = {mode:'original', blur:45, colour:'#ffffff', grad:0, edge:30};
let S = {base:null, params:defaults(), filter:'none', strength:100, layers:[], bg:{...BG_DEFAULT}, name:'photo', label:''};
let hist = [], hi = -1, selId = null, nextId = 1;
const snap = () => ({base:S.base, params:{...S.params}, filter:S.filter, strength:S.strength, layers:clone(S.layers), lj:JSON.stringify(S.layers), bg:{...S.bg}, bj:JSON.stringify(S.bg)});
function same(a,b){ return a && b && a.base===b.base && a.filter===b.filter && a.strength===b.strength && a.lj===b.lj && a.bj===b.bj && KEYS.every(k => a.params[k]===b.params[k]); }
function commit(){
  const s = snap();
  if (same(s, hist[hi])) return;
  hist = hist.slice(0, hi+1); hist.push(s);
  if (hist.length > 50) hist.shift();
  hi = hist.length - 1; updateUndo();
}
function restore(st){
  const baseChanged = st.base !== S.base;
  S.base = st.base; S.params = {...st.params}; S.filter = st.filter; S.strength = st.strength; S.layers = clone(st.layers); S.bg = {...(st.bg || BG_DEFAULT)};
  if (!getSel()) selId = null; syncBg();
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
  const amt = t * (f.modeAmt ?? 1);
  p.mono = f.mode==='mono' ? amt : 0;
  p.sepia = f.mode==='sepia' ? amt : 0;
  for (const k of KEYS) if (p[k]===undefined) p[k] = 0;
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
  const vib = (p.vibrance||0)/100, spl = (p.split||0)/100, gr = Math.max(0, p.grain||0)/100*0.2;
  // Hue rotation as a colour matrix (the same one CSS hue-rotate uses).
  const ha = (p.hue||0)/100*Math.PI, hc = Math.cos(ha), hs = Math.sin(ha), hue = !!p.hue;
  const h00=.213+hc*.787-hs*.213, h01=.715-hc*.715-hs*.715, h02=.072-hc*.072+hs*.928;
  const h10=.213-hc*.213+hs*.143, h11=.715+hc*.285+hs*.140, h12=.072-hc*.072-hs*.283;
  const h20=.213-hc*.213-hs*.787, h21=.715-hc*.715+hs*.715, h22=.072+hc*.928+hs*.072;
  const cx = w/2, cy = h/2, inv = 1/Math.sqrt(cx*cx + cy*cy);
  for (let y=0; y<h; y++){
    const dy = y - cy;
    for (let x=0; x<w; x++){
      const i = (y*w + x)*4;
      let r = lr[s[i]], g = lg[s[i+1]], b = lb[s[i+2]];
      let L = 0.2126*r + 0.7152*g + 0.0722*b;
      if (hl || sh){ const Lc = clamp(L,0,1); const d = hl*Lc*Lc + sh*(1-Lc)*(1-Lc); r+=d; g+=d; b+=d; L+=d; }
      if (sat !== 1){ r = L + (r-L)*sat; g = L + (g-L)*sat; b = L + (b-L)*sat; }
      if (vib){ const mx = r>g?(r>b?r:b):(g>b?g:b), mn = r<g?(r<b?r:b):(g<b?g:b), k = 1 + vib*(1 - Math.min(1, (mx-mn)*1.6)); r = L + (r-L)*k; g = L + (g-L)*k; b = L + (b-L)*k; }
      if (hue){ const r0=r, g0=g, b0=b; r = h00*r0+h01*g0+h02*b0; g = h10*r0+h11*g0+h12*b0; b = h20*r0+h21*g0+h22*b0; }
      if (spl){ const t = (clamp(L,0,1)-0.5)*spl; r += t*0.26; g += t*0.04; b -= t*0.3; }
      if (mono){ r += (L-r)*mono; g += (L-g)*mono; b += (L-b)*mono; }
      if (sep){ r += (L*1.07+0.05 - r)*sep; g += (L*0.95+0.02 - g)*sep; b += (L*0.76 - b)*sep; }
      if (fd){ const k = 1-0.22*fd, a = 0.1*fd; r = r*k+a; g = g*k+a; b = b*k+a*1.1; }
      if (vg){ const dx = x-cx, d = Math.sqrt(dx*dx+dy*dy)*inv; if (d > 0.4){ const t = (d-0.4)/0.6, m = 1 - vg*0.78*t*t*(3-2*t); r*=m; g*=m; b*=m; } }
      if (gr){ let hsh = (x*374761393 + y*668265263) | 0; hsh = (hsh ^ (hsh >>> 13)) * 1274126177 | 0; const n = (((hsh ^ (hsh >>> 16)) & 1023) / 1023 - 0.5) * gr; r += n; g += n; b += n; }
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
const spacingPx = l => (l.spacing || 0)/100 * l.size * 0.5;
function textMetrics(l){
  mctx.font = fontStr(l); mctx.letterSpacing = spacingPx(l) + 'px';
  const lines = (l.text || ' ').split('\n'), lh = l.size*1.2;
  const widths = lines.map(t => mctx.measureText(t).width);
  const w = Math.max(l.size*0.3, ...widths), h = lines.length*lh;
  const pad = l.bg ? l.size*0.38 : (l.glow ? l.size*0.2 : 0), ow = l.outline/100*l.size*0.22;
  return {lines, widths, w, h, lh, pad, ow};
}
function bbox(l){
  if (l.type==='text'){ const m = textMetrics(l), e = m.pad + m.ow/2 + 2; return [-m.w/2-e, -m.h/2-e, m.w/2+e, m.h/2+e]; }
  if (l.type==='shape'){ const e = l.outline ? 8 : 0; return [-50-e, -50-e, 50+e, 50+e]; }
  if (l.type==='emoji') return [-52, -52, 52, 52];
  if (l.type==='image') return [-l.w/2, -l.h/2, l.w/2, l.h/2];
  if (l.type==='word') return wordBox(l);
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
  else if (l.type==='emoji') drawEmoji(ctx, l);
  else if (l.type==='image'){ const img = STICKER_IMG.get(l.ref); if (img) ctx.drawImage(img, -l.w/2, -l.h/2, l.w, l.h); }
  else if (l.type==='word') drawWord(ctx, l);
  else drawStrokes(ctx, l);
  ctx.restore();
}
function drawText(ctx, l){
  const m = textMetrics(l);
  ctx.font = fontStr(l); ctx.letterSpacing = spacingPx(l) + 'px'; ctx.textBaseline = 'middle'; ctx.textAlign = l.align; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  if (l.bg){
    ctx.save(); ctx.fillStyle = l.bg; ctx.beginPath();
    const r = l.size*0.25; ctx.roundRect(-m.w/2-m.pad, -m.h/2-m.pad*0.7, m.w+m.pad*2, m.h+m.pad*1.4, r); ctx.fill(); ctx.restore();
  }
  const ax = l.align==='left' ? -m.w/2 : l.align==='right' ? m.w/2 : 0;
  if (l.shadow){ ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = l.size*0.25*l.shadow/100; ctx.shadowOffsetY = l.size*0.06*l.shadow/100; }
  m.lines.forEach((t, i) => {
    const y = -m.h/2 + m.lh*(i+0.5) + l.size*0.04;
    if (m.ow > 0){ ctx.strokeStyle = l.ocolor; ctx.lineWidth = m.ow; ctx.strokeText(t, ax, y); if (i===m.lines.length-1) ctx.shadowColor = 'transparent'; }
  });
  if (m.ow > 0) ctx.shadowColor = 'transparent';
  ctx.fillStyle = l.color;
  const fillAll = () => m.lines.forEach((t, i) => ctx.fillText(t, ax, -m.h/2 + m.lh*(i+0.5) + l.size*0.04));
  if (l.glow){
    // Neon glow: the text drawn twice with a coloured blur, then once crisp on top.
    ctx.save(); ctx.shadowColor = l.glow; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.shadowBlur = l.size*0.5; fillAll(); ctx.shadowBlur = l.size*0.18; fillAll(); ctx.restore();
  }
  fillAll();
}
function drawShape(ctx, l){
  ctx.translate(-50, -50);
  const p = PATHS[l.shape];
  if (l.shadow){ ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4; }
  if (l.outline){ ctx.lineJoin = 'round'; ctx.lineWidth = 12; ctx.strokeStyle = l.outline; ctx.stroke(p); ctx.shadowColor = 'transparent'; }
  ctx.fillStyle = l.color; ctx.fill(p, RULES[l.shape] || 'nonzero');
}
function drawEmoji(ctx, l){
  ctx.font = `88px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (l.shadow){ ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4; }
  ctx.fillText(l.char, 0, 6);
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
  if (l.type==='emoji') return `Emoji ${l.char}`;
  if (l.type==='image') return l.name || 'My sticker';
  if (l.type==='word') return l.text;
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
  if (S.bg.mode !== 'original'){
    const m = bgMaskFor(S.base);
    if (m) applyBackground(photoC, m, S.bg); else ensureBgMask();
  }
  stage.classList.toggle('checker', S.bg.mode === 'remove' && !!bgMaskFor(S.base));
  composite();
}
function composite(){
  vctx.clearRect(0,0,view.width,view.height);
  if (comparing){ vctx.drawImage(rawC,0,0); placeSel(); return; }
  vctx.drawImage(photoC,0,0);
  drawLayers(vctx, view.width / S.base.width);
  if (WM.on) drawWatermark(vctx, view.width, view.height);
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
  hx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--histo-bg').trim() || '#202227'; hx.fillRect(0,0,W,H);
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
      if (first){
        const wrap = document.createElement('span'); wrap.style.display = 'flex'; wrap.style.gap = '12px';
        const ab = document.createElement('button'); ab.className='linkbtn'; ab.type='button'; ab.textContent='✦ Auto'; ab.title='Set light and colour for this photo automatically'; ab.onclick = autoEnhance;
        const rb = document.createElement('button'); rb.className='linkbtn'; rb.type='button'; rb.textContent='Reset all'; rb.onclick = () => { S.params = defaults(); syncUI(); render(); commit(); };
        wrap.append(ab, rb); h.appendChild(wrap); first = false;
      }
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
/* One-click enhance: reads the photo's brightness spread and sets light and colour to suit it. */
function autoEnhance(){
  if (!prevData) return;
  const d = prevData.data, lumHist = new Uint32Array(256); let n = 0, sum = 0, satSum = 0;
  for (let i=0; i<d.length; i+=16){
    const r = d[i], g = d[i+1], b = d[i+2], l = Math.round(0.2126*r + 0.7152*g + 0.0722*b);
    lumHist[l]++; n++; sum += l; satSum += (Math.max(r,g,b) - Math.min(r,g,b)) / 255;
  }
  const pct = q => { let acc = 0; for (let i=0;i<256;i++){ acc += lumHist[i]; if (acc >= q*n) return i/255; } return 1; };
  const lo = pct(0.02), hi2 = pct(0.98), mean = sum/n/255, sat = satSum/n;
  const p = defaults();
  p.exposure = Math.round(clamp(Math.log2(0.47/Math.max(mean, 0.02))/1.5*100*0.8, -45, 45));
  p.contrast = Math.round(clamp((0.82 - (hi2 - lo))*90, -15, 35));
  p.highlights = hi2 > 0.96 ? -25 : 0;
  p.shadows = lo < 0.04 ? 18 : 0;
  p.vibrance = Math.round(clamp((0.32 - sat)*120, 0, 35));
  p.sharpness = 15;
  S.params = p; syncUI(); render(); commit();
  toast('Auto-adjusted. Fine-tune with the sliders, or Undo to go back.');
}
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


/* ================= background: blur, colour, gradient or remove what's behind the subject ================= */
const BG_GRADS = [['#ffd1dc','#a1c4fd'],['#fbc2eb','#a6c1ee'],['#f6d365','#fda085'],['#84fab0','#8fd3f4'],['#a18cd1','#fbc2eb'],['#fccb90','#d57eeb'],['#43e97b','#38f9d7'],['#30cfd0','#330867'],['#ff9a9e','#fecfef'],['#232526','#414345']];
const BG_MODES = [['original','Original'],['blur','Blur'],['colour','Colour'],['gradient','Gradient'],['remove','Remove']];
const bgMasks = new WeakMap();           // photo canvas -> mask canvas (white, alpha = subject)
let bgJob = null;                        // the photo whose mask is being worked out
function bgMaskFor(base){ return base ? bgMasks.get(base) || null : null; }

function bgStatus(msg, progress){
  $('#bgStatus').hidden = !msg; if (msg) $('#bgStatusMsg').textContent = msg;
  $('#bgBar').hidden = progress === undefined;
  if (progress !== undefined) $('#bgBarFill').style.width = Math.round(progress*100) + '%';
}
async function ensureBgMask(){
  const base = S.base;
  if (!base || bgMasks.has(base) || bgJob === base) return;
  if (!desktop || !window.tinto.removeBackground){ $('#bgWebHint').hidden = false; return; }
  bgJob = base;
  // the model works at about 512 px, so a 1024 px copy is plenty and keeps it quick
  const k = Math.min(1, 1024 / Math.max(base.width, base.height));
  const w = Math.max(1, Math.round(base.width*k)), h = Math.max(1, Math.round(base.height*k));
  const d = scaleCanvas(base, w, h).getContext('2d').getImageData(0, 0, w, h).data, rgb = new Uint8Array(w*h*3);
  for (let i=0, j=0, q=0; i<w*h; i++, j+=4, q+=3){ rgb[q]=d[j]; rgb[q+1]=d[j+1]; rgb[q+2]=d[j+2]; }
  let downloading = false;
  const stop = window.tinto.onRemoveBgProgress(pr => {
    if (bgJob !== base) return;
    if (pr.phase === 'loading') bgStatus('Getting the background tool ready…');
    else if (pr.phase === 'download'){ downloading = true; bgStatus('Downloading the AI model (first time only)…', pr.progress || 0); }
    else if (pr.phase === 'working') bgStatus('Finding the person in your photo…');
  });
  bgStatus('Finding the person in your photo…');
  for (let attempt = 0; attempt < 20; attempt++){
    try {
      const mask = await window.tinto.removeBackground(rgb, w, h);
      const mc = mk(w, h), mx = mc.getContext('2d'), id = mx.createImageData(w, h);
      let solid = 0;
      for (let i=0; i<w*h; i++){ id.data[i*4]=id.data[i*4+1]=id.data[i*4+2]=255; id.data[i*4+3]=mask[i]; if (mask[i] > 128) solid++; }
      mx.putImageData(id, 0, 0);
      bgMasks.set(base, mc);
      bgStatus(null);
      if (solid < w*h*0.01) toast('Tinto couldn’t find a person in this photo, so the whole picture counts as background.');
      break;
    } catch (err) {
      const msg = String(err && err.message || err);
      if (/already being removed/.test(msg)){ await new Promise(r => setTimeout(r, 800)); continue; }   // a sticker cutout is running
      bgStatus(null);
      if (downloading || /fetch|network|ENOTFOUND|ETIMEDOUT|ECONN/i.test(msg)) toast('Couldn’t download the background tool. Check your internet connection and try again.');
      else toast('Tinto couldn’t work out the background of this photo.');
      S.bg.mode = 'original'; syncBg(); commit();
      break;
    }
  }
  stop(); if (bgJob === base) bgJob = null;
  if (S.base === base) render();
}

/* Replaces everything behind the subject on canvas c (already edited), using mask canvas m. */
function applyBackground(c, m, bg){
  const W = c.width, H = c.height, x = c.getContext('2d');
  // the subject, cut out with a softened edge
  const subj = mk(W, H), sx = subj.getContext('2d');
  sx.drawImage(c, 0, 0);
  const edge = (bg.edge / 100) * Math.max(W, H) * 0.004;
  const mm = mk(W, H), mx = mm.getContext('2d');
  mx.imageSmoothingEnabled = true; mx.imageSmoothingQuality = 'high';
  if (edge > 0.3) mx.filter = `blur(${edge.toFixed(2)}px)`;
  mx.drawImage(m, 0, 0, W, H);
  sx.globalCompositeOperation = 'destination-in'; sx.drawImage(mm, 0, 0);
  // the new background
  if (bg.mode === 'blur'){
    const r = (bg.blur / 100) * Math.max(W, H) * 0.035;
    // take the person out (a little wider than the mask) so they don't smear into the blur
    const hole = mk(W, H), hx = hole.getContext('2d');
    hx.drawImage(c, 0, 0);
    const grow = mk(W, H), gx = grow.getContext('2d');
    gx.filter = `blur(${Math.max(2, r*0.25).toFixed(1)}px)`; gx.drawImage(m, 0, 0, W, H); gx.filter = 'none';
    gx.globalCompositeOperation = 'source-in'; gx.fillStyle = '#fff'; gx.fillRect(0, 0, W, H);
    hx.globalCompositeOperation = 'destination-out'; hx.drawImage(grow, 0, 0); hx.drawImage(grow, 0, 0);
    // blur what's left; dividing by its coverage fills the gap with the colours around it
    const blurOf = (src, rad) => {
      const pad = Math.ceil(rad * 2), b = mk(W + pad*2, H + pad*2), bx = b.getContext('2d');
      bx.drawImage(src, 0, 0, W, H, 0, 0, W + pad*2, H + pad*2); bx.clearRect(pad, pad, W, H); bx.drawImage(src, pad, pad);
      const o = mk(W, H), ox = o.getContext('2d');
      ox.filter = `blur(${rad.toFixed(1)}px)`; ox.drawImage(b, -pad, -pad); ox.filter = 'none';
      const id = ox.getImageData(0, 0, W, H), d = id.data;
      for (let i=3; i<d.length; i+=4) d[i] = d[i] > 2 ? 255 : 0;
      ox.putImageData(id, 0, 0);
      return o;
    };
    const near = blurOf(hole, r), far = blurOf(hole, r * 4);
    x.clearRect(0, 0, W, H);
    x.filter = `blur(${r.toFixed(1)}px)`; x.drawImage(c, 0, 0); x.filter = 'none';   // last resort under everything
    x.drawImage(far, 0, 0); x.drawImage(near, 0, 0);
  } else if (bg.mode === 'colour'){
    x.clearRect(0, 0, W, H); x.fillStyle = bg.colour; x.fillRect(0, 0, W, H);
  } else if (bg.mode === 'gradient'){
    const [a, z] = BG_GRADS[bg.grad] || BG_GRADS[0], g = x.createLinearGradient(0, 0, W*0.35, H);
    g.addColorStop(0, a); g.addColorStop(1, z);
    x.clearRect(0, 0, W, H); x.fillStyle = g; x.fillRect(0, 0, W, H);
  } else {
    x.clearRect(0, 0, W, H);
  }
  x.drawImage(subj, 0, 0);
}

function setBg(patch, live){
  Object.assign(S.bg, patch); syncBg(); render();
  if (!live) commit();
}
const bgModeBtns = {};
for (const [id, label] of BG_MODES){
  const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = label;
  b.setAttribute('role', 'radio'); b.onclick = () => setBg({mode:id});
  $('#bgModes').appendChild(b); bgModeBtns[id] = b;
}
const bgColourSw = makeSwatches($('#bgColour'), ['#ffffff','#111111','#f7e3c4','#ffd1dc','#cfe8ff','#d9f5e3','#efb34a','#9b6bff'], (c, live, done) => setBg({colour:c}, live && !done));
(function buildGrads(){
  const el = $('#bgGrad');
  BG_GRADS.forEach(([a, z], i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'swc grad'; b.title = `Gradient ${i+1}`;
    b.style.background = `linear-gradient(160deg, ${a}, ${z})`; b.dataset.i = i;
    b.onclick = () => setBg({grad:i}); el.appendChild(b);
  });
})();
const paintBgBlur = bindRange('bgBlur', () => S.bg.blur, v => { S.bg.blur = v; render(); }, v => String(v));
const paintBgEdge = bindRange('bgEdge', () => S.bg.edge, v => { S.bg.edge = v; render(); }, v => String(v));
function syncBg(){
  const m = S.bg.mode;
  for (const id in bgModeBtns) bgModeBtns[id].setAttribute('aria-checked', String(id === m)), bgModeBtns[id].setAttribute('aria-pressed', String(id === m));
  $('#bgBlurRow').hidden = m !== 'blur';
  $('#bgColourRow').hidden = m !== 'colour';
  $('#bgGradRow').hidden = m !== 'gradient';
  $('#bgEdgeRow').hidden = m === 'original';
  $('#bgRemoveHint').hidden = m !== 'remove';
  bgColourSw.set(S.bg.colour);
  document.querySelectorAll('#bgGrad .swc').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.i === S.bg.grad)));
  paintBgBlur(); paintBgEdge();
  if (!window.tinto) $('#bgWebHint').hidden = false;
}
syncBg();

/* ================= tools / tabs ================= */
let tab = 'adjust';
document.querySelectorAll('.tool').forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));
function setTab(name){
  if (tab==='draw' && name!=='draw') drawSession = null;
  tab = name;
  document.querySelectorAll('.tool').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab===name)));
  ['adjust','filters','background','crop','resize','text','stickers','draw','layers','collage'].forEach(n => $('#pane-'+n).hidden = n!==name);
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
    bold:!!preset.bold, align:'center', outline:preset.outline||0, ocolor:preset.ocolor||'#111111', shadow:preset.shadow||0, bg:preset.bg||'',
    glow:preset.glow||'', spacing:preset.spacing||0});
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
    const t = l.type==='text' ? 'text' : (l.type==='shape' || l.type==='emoji' || l.type==='image' || l.type==='word') ? 'stickers' : null;
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
const paintTSpacing = bindRange('tspacing', () => { const l = selText(); return l ? (l.spacing || 0) : null; }, v => { const l = selText(); if (l){ l.spacing = v; composite(); } });
const paintTShadow = bindRange('tshadow', () => selText()?.shadow ?? null, v => { const l = selText(); if (l){ l.shadow = v; composite(); } });
const colourPick = (prop, getL) => (c, live, done) => { const l = getL(); if (!l) return; l[prop] = c; composite(); syncPanels(); if (!live || done) commit(); };
const tColor = makeSwatches($('#tcolor'), COLOURS, colourPick('color', selText));
const toColor = makeSwatches($('#tocolor'), ['#111111','#ffffff','#efb34a','#ff5a5f','#4da3ff'], colourPick('ocolor', selText));
const tGlow = makeSwatches($('#tglow'), ['#ff4fd8','#4de1ff','#7dff6a','#efb34a','#ffffff'], colourPick('glow', selText), {none:true});
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
    b.innerHTML = `<svg viewBox="-4 -4 108 108"><path d="${s.d}" fill="currentColor" fill-rule="${s.rule || 'nonzero'}"/></svg>`;
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
    const kind = l.type==='text' ? 'T' : l.type==='shape' ? '★' : l.type==='emoji' ? '☺' : l.type==='image' ? '▣' : l.type==='word' ? '!' : '✎';
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
    $('#font').value = t.font; paintTSize(); paintTOutline(); paintTShadow(); paintTSpacing();
    $('#toutlineColorF').hidden = t.outline===0;
    tColor.set(t.color); toColor.set(t.ocolor); tBg.set(t.bg); tGlow.set(t.glow || '');
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
    S = {base:c, params:defaults(), filter:'none', strength:100, layers:[], bg:{...BG_DEFAULT}, name:(file.name.replace(/\.[^.]+$/,'') || 'photo'), label:file.name};
    selId = null; drawSession = null; hist = []; hi = -1; commit(); syncUI(); syncBg(); rebuildPreview(); syncResize(); refreshLayerUI(); if (tab==='crop') resetCrop();
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
  if (typing()) return;
  const fs = [...(e.clipboardData?.files||[])].filter(f => f.type.startsWith('image/'));
  const text = e.clipboardData?.getData('text/plain') || '';
  if (tab!=='collage' && layerClip && !fs.length && (text===CLIP_MARK || !text)){ e.preventDefault(); pasteLayer(); return; }
  if (!fs.length) return;
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
  if (tab!=='collage' && S.bg.mode==='remove' && bgMaskFor(S.base)){
    if (fmt==='jpeg') document.querySelector('#fmtSeg button[data-f="png"]').click();
    $('#exportInfo').innerHTML += '<br>Background removed: PNG keeps it see-through.';
  }
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
    if (WM.on){ await document.fonts.ready; drawWatermark(c.getContext('2d'), c.width, c.height); }
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
  const c = mk(b.width, b.height), cx = c.getContext('2d'); cx.putImageData(out, 0, 0);
  if (S.bg.mode !== 'original'){ const m = bgMaskFor(b); if (m) applyBackground(c, m, S.bg); }
  drawLayers(cx, 1);
  return c;
}
function showFallback(blob){
  const img = $('#fallbackImg'); if (img.src) URL.revokeObjectURL(img.src);
  img.src = URL.createObjectURL(blob); $('#fallback').hidden = false; $('#exSave').hidden = true;
}

/* ================= collage ================= */
// Two kinds of collage: plain grids (spacing, corners and background are yours to set) and
// styled templates (rotated photos, shapes, frames, tape, film sprockets and editable titles).
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

/* Templates. Positions are fractions of the collage's width (x, w) and height (y, h); `sq` makes a
   cell square in pixels (its height follows its width). Rotation is in degrees around the photo's centre.
   Decorations (`deco`) draw under every photo, or after the photo numbered in `after`, or on top. */
/* Seven flat-topped hexagons in a honeycomb, centred on cx, cy (fractions of a square collage). */
function honeycomb(cx, cy, w){
  const h = w*0.866, s = 1.07;
  return [[0,0],[0,-h*s],[0,h*s],[-.75*w*s,-h/2*s],[.75*w*s,-h/2*s],[-.75*w*s,h/2*s],[.75*w*s,h/2*s]]
    .map(([dx, dy]) => ({x: cx + dx - w/2, y: cy + dy - h/2, w, h, shape:'hex'}));
}
const TEMPLATES = [
  {id:'polaroids', name:'Polaroids', ratio:4/5, bg:{type:'paper', color:'#ece5d8'},
    cells:[
      {x:.08, y:.06, w:.5, sq:true, rot:-6, frame:'polaroid', shadow:true},
      {x:.44, y:.29, w:.48, sq:true, rot:5, frame:'polaroid', shadow:true},
      {x:.12, y:.55, w:.40, sq:true, rot:-3, frame:'polaroid', shadow:true},
    ],
    deco:[
      {type:'tape', x:.33, y:.055, w:.17, h:.045, rot:-9},
      {type:'tape', x:.84, y:.285, w:.15, h:.042, rot:28},
      {type:'tape', x:.32, y:.545, w:.15, h:.042, rot:6},
      {type:'text', slot:'title', x:.74, y:.9, size:.085, font:'Caveat', weight:700, color:'#3b3530', rot:-5, maxW:.4},
    ], text:{title:'Summer days'}},
  {id:'film', name:'Film strip', ratio:9/16, bg:{type:'solid', color:'#121212'},
    cells:[
      {x:.15, y:.055, w:.70, h:.265, rad:.012},
      {x:.15, y:.345, w:.70, h:.265, rad:.012},
      {x:.15, y:.635, w:.70, h:.265, rad:.012},
    ],
    deco:[
      {type:'sprockets', x:.035, w:.07, color:'#e9e3d6'},
      {type:'sprockets', x:.895, w:.07, color:'#e9e3d6'},
      {type:'text', slot:'title', x:.5, y:.95, size:.042, font:'Space Mono', weight:700, color:'#e9e3d6', spacing:.18, upper:true},
    ], text:{title:'Roll 01 · Lakeside'}},
  {id:'magazine', name:'Magazine', ratio:4/5, bg:{type:'solid', color:'#111111'},
    cells:[
      {x:0, y:0, w:1, h:1},
      {x:.57, y:.645, w:.35, h:.27, frame:'border', shadow:true},
    ],
    deco:[
      {type:'shade', after:0, y0:0, y1:.42, alpha:.55},
      {type:'text', slot:'title', after:0, x:.5, y:.135, size:.2, font:'Anton', weight:400, color:'#ffffff', spacing:.04, upper:true},
      {type:'text', slot:'sub', after:0, x:.5, y:.225, size:.034, font:'Hanken Grotesk', weight:600, color:'#ffffff', spacing:.2, upper:true},
    ], text:{title:'Wander', sub:'Issue 12 · Autumn edition'}},
  {id:'story', name:'Story', ratio:9/16, bg:{type:'solid', color:'#f3ece0'},
    cells:[
      {x:.1, y:.065, w:.8, h:.52, shape:'arch', shadow:true},
      {x:.1, y:.62, w:.385, h:.22, rad:.08, shadow:true},
      {x:.515, y:.62, w:.385, h:.22, rad:.08, shadow:true},
    ],
    deco:[
      {type:'text', slot:'title', x:.5, y:.91, size:.09, font:'Playfair Display', weight:700, color:'#3b3530', maxW:.84},
      {type:'text', slot:'sub', x:.5, y:.955, size:.034, font:'Hanken Grotesk', weight:600, color:'#8a7f72', spacing:.25, upper:true},
    ], text:{title:'Little moments', sub:'November 2026'}},
  {id:'scrapbook', name:'Scrapbook', ratio:1, bg:{type:'dots', color:'#efe7d8', dot:'#dccfb8'},
    cells:[
      {x:.06, y:.07, w:.42, h:.36, rot:-5, frame:'border', shadow:true},
      {x:.54, y:.05, w:.40, h:.42, rot:4, frame:'border', shadow:true},
      {x:.07, y:.53, w:.38, h:.39, rot:3, frame:'border', shadow:true},
      {x:.52, y:.56, w:.42, h:.34, rot:-4, frame:'border', shadow:true},
    ],
    deco:[
      {type:'tape', x:.27, y:.075, w:.16, h:.05, rot:-12},
      {type:'tape', x:.74, y:.05, w:.15, h:.05, rot:8},
      {type:'tape', x:.26, y:.53, w:.15, h:.05, rot:4},
      {type:'tape', x:.73, y:.565, w:.16, h:.05, rot:-6},
    ], text:{}},
  {id:'circles', name:'Circles', ratio:1, bg:{type:'gradient', from:'#ffd6a5', to:'#fdb4c8'},
    cells:[
      {x:.2, y:.12, w:.6, sq:true, shape:'circle', frame:'border', shadow:true},
      {x:.06, y:.6, w:.25, sq:true, shape:'circle', frame:'border', shadow:true},
      {x:.69, y:.58, w:.25, sq:true, shape:'circle', frame:'border', shadow:true},
      {x:.77, y:.08, w:.16, sq:true, shape:'circle', frame:'border', shadow:true},
    ],
    deco:[{type:'text', slot:'title', x:.5, y:.9, size:.085, font:'Pacifico', weight:400, color:'#ffffff', shadow:true}],
    text:{title:'Best day ever'}},
  {id:'heart', name:'Heart', ratio:1, bg:{type:'gradient', from:'#ffe3ea', to:'#ffc9d6'},
    cells:[{x:.11, y:.07, w:.78, h:.72, shape:'heart', shadow:true}],
    deco:[{type:'text', slot:'title', x:.5, y:.88, size:.09, font:'Pacifico', weight:400, color:'#e2456f'}],
    text:{title:'Love you'}},
  {id:'diagonal', name:'Diagonal', ratio:16/9, bg:{type:'solid', color:'#ffffff'},
    cells:[
      {x:0, y:0, w:.38, h:1, shape:'slant', slantR:true},
      {x:.289, y:0, w:.38, h:1, shape:'slant', slantL:true, slantR:true},
      {x:.5775, y:0, w:.4225, h:1, shape:'slant', slantL:true},
    ],
    deco:[{type:'text', slot:'title', x:.13, y:.89, size:.05, font:'Bebas Neue', weight:400, color:'#ffffff', spacing:.12, upper:true, shadow:true, maxW:.2}],
    text:{title:'Weekend escape'}},
  {id:'mood', name:'Mood board', ratio:4/5, bg:{type:'solid', color:'#e9e4dc'},
    cells:[
      {x:.05, y:.12, w:.5, h:.36, frame:'thin'},
      {x:.58, y:.12, w:.37, h:.22, frame:'thin'},
      {x:.58, y:.37, w:.37, h:.30, frame:'thin'},
      {x:.05, y:.51, w:.24, h:.20, frame:'thin'},
      {x:.31, y:.51, w:.24, h:.20, frame:'thin'},
      {x:.05, y:.74, w:.5, h:.21, frame:'thin'},
      {x:.58, y:.70, w:.37, h:.25, frame:'thin'},
    ],
    deco:[{type:'text', slot:'title', x:.5, y:.065, size:.075, font:'Bebas Neue', weight:400, color:'#3b3530', spacing:.45, upper:true}],
    text:{title:'Mood'}},
  {id:'postcard', name:'Postcard', ratio:3/2, bg:{type:'paper', color:'#f7f1e6'},
    cells:[
      {x:.05, y:.08, w:.52, h:.84, rad:.01, shadow:true},
      {x:.835, y:.075, w:.105, h:.15, frame:'stamp', shadow:true},
    ],
    deco:[
      {type:'text', slot:'sub', x:.775, y:.37, size:.05, font:'Dancing Script', weight:700, color:'#c0503c', maxW:.32},
      {type:'text', slot:'title', x:.775, y:.48, size:.075, font:'Anton', weight:400, color:'#2b3a55', spacing:.06, upper:true, maxW:.32},
      {type:'lines', x:.63, w:.29, y:.63, gap:.085, count:4, color:'#cdbfa6'},
    ], text:{title:'The Lakes', sub:'Greetings from'}},
  {id:'booth', name:'Photo booth', ratio:9/16, bg:{type:'paper', color:'#fbfaf7'},
    cells:[
      {x:.1, y:.05, w:.8, h:.19, rad:.004},
      {x:.1, y:.26, w:.8, h:.19, rad:.004},
      {x:.1, y:.47, w:.8, h:.19, rad:.004},
      {x:.1, y:.68, w:.8, h:.19, rad:.004},
    ],
    deco:[
      {type:'text', slot:'title', x:.5, y:.925, size:.1, font:'Caveat', weight:700, color:'#3b3530', maxW:.8},
      {type:'text', slot:'sub', x:.5, y:.968, size:.032, font:'Space Mono', weight:700, color:'#8a7f72', spacing:.1},
    ], text:{title:'Best friends', sub:'15.11.2026'}},
  {id:'honeycomb', name:'Honeycomb', ratio:1, bg:{type:'gradient', from:'#2a2433', to:'#16141c'},
    cells: honeycomb(.5, .47, .28),
    deco:[{type:'text', slot:'title', x:.5, y:.95, size:.04, font:'Hanken Grotesk', weight:700, color:'#f6b443', spacing:.3, upper:true}],
    text:{title:'Sweet memories'}},
  {id:'gallery', name:'Gallery wall', ratio:16/9, bg:{type:'paper', color:'#d9d1c4'},
    cells:[
      {x:.37, y:.13, w:.26, h:.58, frame:'gallery', shadow:true},
      {x:.11, y:.14, w:.17, h:.24, frame:'gallery', shadow:true},
      {x:.11, y:.50, w:.17, h:.24, frame:'gallery', shadow:true},
      {x:.72, y:.14, w:.17, h:.24, frame:'gallery', shadow:true},
      {x:.72, y:.50, w:.17, h:.24, frame:'gallery', shadow:true},
    ],
    deco:[{type:'text', slot:'title', x:.5, y:.9, size:.04, font:'Playfair Display', weight:700, color:'#3b3530', maxW:.5}],
    text:{title:'Home sweet home'}},
  {id:'beforeafter', name:'Before & after', ratio:16/9, bg:{type:'solid', color:'#ffffff'},
    cells:[{x:0, y:0, w:.5, h:1}, {x:.5, y:0, w:.5, h:1}],
    deco:[
      {type:'rect', x:.4985, y:0, w:.003, h:1, color:'#ffffff'},
      {type:'badge', value:'BEFORE', x:.085, y:.1, size:.024, bg:'rgba(17,17,17,.78)', color:'#ffffff', spacing:.15},
      {type:'badge', value:'AFTER', x:.925, y:.1, size:.024, bg:'#f6b443', color:'#1c1206', spacing:.15},
    ], text:{}},
  {id:'pills', name:'Pills', ratio:9/16, bg:{type:'gradient', from:'#c6b4ff', to:'#ffb9d3'},
    cells:[
      {x:.1, y:.05, w:.48, h:.36, rad:.5, shadow:true, rot:-4},
      {x:.42, y:.27, w:.48, h:.36, rad:.5, shadow:true, rot:4},
      {x:.1, y:.5, w:.48, h:.36, rad:.5, shadow:true, rot:-3},
    ],
    deco:[{type:'text', slot:'title', x:.5, y:.93, size:.1, font:'Pacifico', weight:400, color:'#ffffff', shadow:true, maxW:.86}],
    text:{title:'Good times'}},
  {id:'stack', name:'Card stack', ratio:4/5, bg:{type:'gradient', from:'#262a35', to:'#15171d'},
    cells:[
      {x:.18, y:.22, w:.64, h:.55, rot:-9, frame:'border', shadow:true},
      {x:.18, y:.22, w:.64, h:.55, rot:6, frame:'border', shadow:true},
      {x:.18, y:.22, w:.64, h:.55, rot:0, frame:'border', shadow:true},
    ],
    deco:[
      {type:'text', slot:'title', x:.5, y:.1, size:.085, font:'Playfair Display', weight:700, color:'#ffffff', maxW:.86},
      {type:'text', slot:'sub', x:.5, y:.9, size:.03, font:'Hanken Grotesk', weight:600, color:'#f6b443', spacing:.35, upper:true},
    ], text:{title:'Highlights', sub:'Year in photos'}},
  {id:'newspaper', name:'Newspaper', ratio:4/5, bg:{type:'paper', color:'#f2ede2'},
    cells:[
      {x:.05, y:.25, w:.9, h:.42},
      {x:.05, y:.7, w:.285, h:.24},
      {x:.358, y:.7, w:.285, h:.24},
    ],
    deco:[
      {type:'text', value:'The Daily Tinto', x:.5, y:.065, size:.08, font:'Playfair Display', weight:700, color:'#1b1b1b', maxW:.9},
      {type:'rect', x:.05, y:.112, w:.9, h:.004, color:'#1b1b1b'},
      {type:'text', slot:'sub', x:.5, y:.132, size:.019, font:'Hanken Grotesk', weight:600, color:'#4a4740', spacing:.2, upper:true, maxW:.9},
      {type:'rect', x:.05, y:.15, w:.9, h:.0015, color:'#1b1b1b'},
      {type:'text', slot:'title', x:.5, y:.2, size:.062, font:'Anton', weight:400, color:'#1b1b1b', spacing:.02, upper:true, maxW:.9},
      {type:'lines', x:.67, w:.28, y:.71, gap:.027, count:9, color:'#a7a196'},
    ], text:{title:'Sunset steals the show', sub:'Sunday 15 November 2026 · Late edition'}},
  {id:'arches', name:'Arches', ratio:16/9, bg:{type:'paper', color:'#efe6d8'},
    cells:[
      {x:.08, y:.09, w:.26, h:.68, shape:'arch', shadow:true},
      {x:.37, y:.09, w:.26, h:.68, shape:'arch', shadow:true},
      {x:.66, y:.09, w:.26, h:.68, shape:'arch', shadow:true},
    ],
    deco:[{type:'text', slot:'title', x:.5, y:.88, size:.045, font:'Playfair Display', weight:700, color:'#3b3530', maxW:.8}],
    text:{title:'Golden hour'}},
  {id:'stickersheet', name:'Sticker sheet', ratio:1, bg:{type:'dots', color:'#fff4d6', dot:'#ffd98a'},
    cells:[
      {x:.07, y:.07, w:.4, sq:true, shape:'circle', frame:'border', shadow:true},
      {x:.53, y:.13, w:.36, sq:true, shape:'circle', frame:'border', shadow:true},
      {x:.13, y:.53, w:.34, sq:true, shape:'circle', frame:'border', shadow:true},
      {x:.52, y:.54, w:.4, sq:true, shape:'circle', frame:'border', shadow:true},
    ],
    deco:[
      {type:'emoji', char:'✨', x:.5, y:.08, size:.08, rot:10},
      {type:'emoji', char:'🌈', x:.93, y:.08, size:.08, rot:12},
      {type:'emoji', char:'😎', x:.49, y:.5, size:.1, rot:-10},
      {type:'emoji', char:'💛', x:.07, y:.93, size:.08, rot:-8},
      {type:'emoji', char:'⭐', x:.94, y:.95, size:.07, rot:14},
    ], text:{}},
  {id:'banner', name:'Banner', ratio:9/16, bg:{type:'solid', color:'#f6b443'},
    cells:[{x:0, y:0, w:1, h:.44}, {x:0, y:.56, w:1, h:.44}],
    deco:[{type:'text', slot:'title', x:.5, y:.5, size:.11, font:'Anton', weight:400, color:'#1c1206', spacing:.04, upper:true, maxW:.9}],
    text:{title:'Weekend vibes'}},
];
const RATIOS = [['1:1',1],['4:5',4/5],['9:16',9/16],['16:9',16/9],['3:2',3/2]];
const CLONG = 2400;
let C = {layout:LAYOUTS[3], tpl:null, ratio:4/5, gap:30, radius:12, bg:'#ffffff', text:{}, cells:[], sel:-1};
const ccv = $('#collage'), cctx = ccv.getContext('2d');
const HEART = new Path2D(SHAPES.find(s => s.id === 'heart').d);

function collageSize(ratio = C.ratio, long = CLONG){ return ratio >= 1 ? [long, Math.round(long/ratio)] : [Math.round(long*ratio), long]; }
const cellCount = () => (C.tpl ? C.tpl.cells : C.layout.cells).length;

/* Every cell as a centre, size, rotation and style, in pixels. */
function cellRects(W, H, tpl = C.tpl){
  if (tpl) return tpl.cells.map(c => {
    const w = c.w*W, h = c.sq ? w : c.h*H;
    return {cx: c.x*W + w/2, cy: c.y*H + h/2, w, h, rot: (c.rot || 0)*RAD, shape: c.shape || 'rect', rad: (c.rad || 0)*Math.max(W, H), frame: c.frame || '', shadow: !!c.shadow, c};
  });
  const g = C.gap/100 * 0.05 * Math.max(W, H), m = g/2;
  return C.layout.cells.map(([x,y,w,h]) => {
    const pw = Math.max(1, w*(W-2*m) - g), ph = Math.max(1, h*(H-2*m) - g);
    return {cx: m + x*(W-2*m) + g/2 + pw/2, cy: m + y*(H-2*m) + g/2 + ph/2, w: pw, h: ph, rot: 0, shape: 'rect', rad: C.radius/100 * 0.5 * Math.min(pw, ph), frame: '', shadow: false};
  });
}
function cellGeom(cell, r){
  const iw = cell.img.width, ih = cell.img.height, s = Math.max(r.w/iw, r.h/ih) * cell.zoom;
  const dw = iw*s, dh = ih*s, ex = (dw - r.w)/2, ey = (dh - r.h)/2;
  return {dw, dh, ex, ey, dx: -r.w/2 + (r.w - dw)/2 + cell.fx*ex, dy: -r.h/2 + (r.h - dh)/2 + cell.fy*ey};
}

/* The outline of a cell, centred on 0,0. */
function cellPath(r){
  const {w, h} = r, p = new Path2D();
  if (r.shape === 'circle') p.ellipse(0, 0, w/2, h/2, 0, 0, Math.PI*2);
  else if (r.shape === 'heart') p.addPath(HEART, new DOMMatrix().translate(-w/2, -h/2).scale(w/100, h/100));
  else if (r.shape === 'hex'){   // flat-topped hexagon
    p.moveTo(-w/2, 0); p.lineTo(-w/4, -h/2); p.lineTo(w/4, -h/2); p.lineTo(w/2, 0); p.lineTo(w/4, h/2); p.lineTo(-w/4, h/2); p.closePath();
  }
  else if (r.shape === 'arch'){ p.moveTo(-w/2, h/2); p.lineTo(-w/2, -h/2 + w/2); p.arc(0, -h/2 + w/2, w/2, Math.PI, 0); p.lineTo(w/2, h/2); p.closePath(); }
  else if (r.shape === 'slant'){
    const s = h*0.18, L = r.c && r.c.slantL ? s : 0, R = r.c && r.c.slantR ? s : 0, g = 12;
    p.moveTo(-w/2 + L + (L ? g/2 : 0), -h/2); p.lineTo(w/2 - (R ? g/2 : 0), -h/2); p.lineTo(w/2 - R - (R ? g/2 : 0), h/2); p.lineTo(-w/2 + (L ? g/2 : 0), h/2); p.closePath();
  }
  else p.roundRect(-w/2, -h/2, w, h, Math.min(r.rad, w/2, h/2));
  return p;
}
/* How far a frame reaches past the photo: [left/right/top, bottom]. */
function framePad(r, W){
  if (r.frame === 'polaroid') return [r.w*0.06, r.w*0.24];
  if (r.frame === 'stamp') return [r.w*0.12, r.w*0.12];
  if (r.frame === 'gallery'){ const p = Math.min(r.w, r.h)*0.1 + W*0.012; return [p, p]; }
  if (r.frame === 'border') return [W*0.012, W*0.012];
  if (r.frame === 'thin') return [W*0.006, W*0.006];
  return [0, 0];
}

function paintBackground(ctx, W, H, tpl){
  const bg = C.bg || (tpl && tpl.bg) || {type:'solid', color:'#ffffff'};
  if (typeof bg === 'string'){ ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); return; }
  if (bg.type === 'gradient'){ const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, bg.from); g.addColorStop(1, bg.to); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); return; }
  ctx.fillStyle = bg.color; ctx.fillRect(0, 0, W, H);
  if (bg.type === 'dots'){ ctx.fillStyle = bg.dot; const st = W*0.03; for (let y = st/2; y < H; y += st) for (let x = st/2; x < W; x += st){ ctx.beginPath(); ctx.arc(x, y, W*0.0028, 0, Math.PI*2); ctx.fill(); } }
  if (bg.type === 'paper'){
    // A faint, fixed paper grain.
    ctx.save(); ctx.globalAlpha = 0.05;
    for (let i = 0; i < 2600; i++){ const x = (i*7919 % 997)/997*W, y = (i*104729 % 991)/991*H; ctx.fillStyle = i % 2 ? '#000' : '#fff'; ctx.fillRect(x, y, W*0.002, W*0.002); }
    ctx.restore();
  }
}

function textFor(d, tpl){ const t = d.value ?? (C.text[d.slot] ?? (tpl.text || {})[d.slot] ?? ''); return d.upper ? t.toUpperCase() : t; }
function decoFont(d, W){ return `${d.weight || 400} ${Math.round(d.size*W)}px "${d.font}", system-ui, sans-serif`; }

function paintDeco(ctx, d, W, H, tpl, withText){
  ctx.save();
  if (d.type === 'text'){
    if (!withText) { ctx.restore(); return; }
    ctx.translate(d.x*W, d.y*H); ctx.rotate((d.rot || 0)*RAD);
    ctx.font = decoFont(d, W); ctx.letterSpacing = ((d.spacing || 0) * d.size * W) + 'px';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = d.color;
    if (d.shadow){ ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = d.size*W*0.25; ctx.shadowOffsetY = d.size*W*0.05; }
    ctx.fillText(textFor(d, tpl), 0, 0, (d.maxW || 0.9)*W);   // long titles shrink to fit their space
  } else if (d.type === 'badge'){
    // A pill-shaped label, like BEFORE / AFTER.
    ctx.translate(d.x*W, d.y*H); ctx.rotate((d.rot || 0)*RAD);
    const fs = d.size*W; ctx.font = `${d.weight || 700} ${Math.round(fs)}px "${d.font || 'Hanken Grotesk'}", system-ui, sans-serif`;
    ctx.letterSpacing = ((d.spacing || 0) * fs) + 'px';
    const t = d.value, tw = ctx.measureText(t).width, bw = tw + fs*1.6, bh = fs*2;
    ctx.fillStyle = d.bg; ctx.beginPath(); ctx.roundRect(-bw/2, -bh/2, bw, bh, bh/2); ctx.fill();
    ctx.fillStyle = d.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, 0, fs*0.05);
  } else if (d.type === 'emoji'){
    ctx.translate(d.x*W, d.y*H); ctx.rotate((d.rot || 0)*RAD);
    ctx.font = `${Math.round(d.size*W)}px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(d.char, 0, 0);
  } else if (d.type === 'rect'){
    ctx.fillStyle = d.color; ctx.beginPath(); ctx.roundRect(d.x*W, d.y*H, d.w*W, d.h*H, (d.r || 0)*W); ctx.fill();
  } else if (d.type === 'tape'){
    ctx.translate(d.x*W, d.y*H); ctx.rotate((d.rot || 0)*RAD);
    ctx.fillStyle = 'rgba(244,232,198,.82)'; ctx.shadowColor = 'rgba(0,0,0,.12)'; ctx.shadowBlur = W*0.004;
    const w = d.w*W, h = d.h*W; ctx.fillRect(-w/2, -h/2, w, h);
  } else if (d.type === 'sprockets'){
    const x = d.x*W, w = d.w*W, hh = w*0.62, step = hh*1.9;
    ctx.fillStyle = d.color;
    for (let y = step*0.4; y < H - hh; y += step){ ctx.beginPath(); ctx.roundRect(x + w*0.18, y, w*0.64, hh, w*0.12); ctx.fill(); }
  } else if (d.type === 'shade'){
    const g = ctx.createLinearGradient(0, d.y0*H, 0, d.y1*H); g.addColorStop(0, `rgba(0,0,0,${d.alpha})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, d.y0*H, W, (d.y1 - d.y0)*H);
  } else if (d.type === 'lines'){
    ctx.strokeStyle = d.color; ctx.lineWidth = Math.max(2, W*0.0025);
    for (let i = 0; i < d.count; i++){ const y = (d.y + i*d.gap)*H; ctx.beginPath(); ctx.moveTo(d.x*W, y); ctx.lineTo((d.x + d.w)*W, y); ctx.stroke(); }
  }
  ctx.restore();
}

function paintCell(ctx, r, cell, i, W, preview){
  const [pad, padB] = framePad(r, W), path = cellPath(r);
  ctx.save(); ctx.translate(r.cx, r.cy); ctx.rotate(r.rot);
  // Frame card (polaroid, stamp) or the shadow under a bare photo.
  if (r.frame === 'gallery'){
    // A black frame with a white mat inside it, hung with a soft shadow.
    const mat = Math.min(r.w, r.h)*0.1, fw = W*0.012;
    ctx.save();
    if (r.shadow){ ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = W*0.016; ctx.shadowOffsetY = W*0.008; }
    ctx.fillStyle = '#17171a'; ctx.fillRect(-r.w/2 - pad, -r.h/2 - pad, r.w + pad*2, r.h + pad*2);
    ctx.restore();
    ctx.fillStyle = '#fbfaf7'; ctx.fillRect(-r.w/2 - mat, -r.h/2 - mat, r.w + mat*2, r.h + mat*2);
    ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = Math.max(1, fw*0.15); ctx.strokeRect(-r.w/2, -r.h/2, r.w, r.h);
  } else if (r.frame === 'polaroid' || r.frame === 'stamp'){
    ctx.save();
    if (r.shadow){ ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = W*0.018; ctx.shadowOffsetY = W*0.006; }
    ctx.fillStyle = '#fbfaf7'; ctx.fillRect(-r.w/2 - pad, -r.h/2 - pad, r.w + pad*2, r.h + pad + padB);
    ctx.restore();
    if (r.frame === 'stamp'){
      // Perforated edge: small bites of background colour around the card.
      const bg = C.bg || (C.tpl && C.tpl.bg && C.tpl.bg.color) || '#ffffff', x0 = -r.w/2 - pad, y0 = -r.h/2 - pad, cw = r.w + pad*2, ch = r.h + pad*2, br = pad*0.32;
      ctx.fillStyle = typeof bg === 'string' ? bg : bg.color;
      for (let x = x0; x <= x0 + cw + 0.1; x += br*2.6){ ctx.beginPath(); ctx.arc(x, y0, br, 0, Math.PI*2); ctx.arc(x, y0 + ch, br, 0, Math.PI*2); ctx.fill(); }
      for (let y = y0; y <= y0 + ch + 0.1; y += br*2.6){ ctx.beginPath(); ctx.arc(x0, y, br, 0, Math.PI*2); ctx.arc(x0 + cw, y, br, 0, Math.PI*2); ctx.fill(); }
    }
  } else if (r.shadow || r.frame){
    ctx.save();
    if (r.shadow){ ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = W*0.018; ctx.shadowOffsetY = W*0.006; }
    if (r.frame){ ctx.lineJoin = 'round'; ctx.lineWidth = pad*2; ctx.strokeStyle = '#ffffff'; ctx.stroke(path); }
    ctx.fillStyle = '#ffffff'; ctx.fill(path);
    ctx.restore();
  }
  // The photo, clipped to its shape.
  ctx.save(); ctx.clip(path);
  if (cell){ const g = cellGeom(cell, r); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(cell.img, g.dx, g.dy, g.dw, g.dh); }
  else {
    ctx.fillStyle = preview ? '#cfccc6' : 'rgba(128,128,136,.15)'; ctx.fillRect(-r.w/2, -r.h/2, r.w, r.h);
    if (preview){
      const s = Math.min(r.w, r.h)*0.12;
      ctx.strokeStyle = 'rgba(80,80,88,.7)'; ctx.lineWidth = Math.max(4, s*0.18); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke();
    }
  }
  ctx.restore();
  if (preview && i === C.sel){ ctx.strokeStyle = '#efb34a'; ctx.lineWidth = Math.max(6, W*0.004); ctx.stroke(path); }
  ctx.restore();
}

function renderCollage(ctx, W, H, preview, {withText = true, tpl = C.tpl, cells = C.cells} = {}){
  paintBackground(ctx, W, H, tpl);
  const rects = cellRects(W, H, tpl), deco = tpl ? tpl.deco : [];
  const decoAt = n => deco.filter(d => (d.after ?? (d.type === 'sprockets' ? -1 : 'top')) === n);
  decoAt(-1).forEach(d => paintDeco(ctx, d, W, H, tpl, withText));
  rects.forEach((r, i) => { paintCell(ctx, r, cells[i], i, W, preview); decoAt(i).forEach(d => paintDeco(ctx, d, W, H, tpl, withText)); });
  decoAt('top').forEach(d => paintDeco(ctx, d, W, H, tpl, withText));
}
function drawCollage(){
  const [W, H] = collageSize();
  if (ccv.width !== W || ccv.height !== H){ ccv.width = W; ccv.height = H; }
  renderCollage(cctx, W, H, true);
  if (WM.on) drawWatermark(cctx, W, H);
}
function renderCollageFull(opts){ const [W, H] = collageSize(), c = mk(W, H); renderCollage(c.getContext('2d'), W, H, false, opts); return c; }
const usedCells = () => Array.from({length: cellCount()}, (_, i) => C.cells[i]).filter(Boolean).length;
function collageInfo(){ if (tab !== 'collage') return; const [W, H] = collageSize(); $('#fileInfo').textContent = `Collage${C.tpl ? ' · ' + C.tpl.name : ''} · ${usedCells()} of ${cellCount()} photos · ${W} × ${H} px`; }
function firstEmpty(from = 0){ const n = cellCount(); for (let k=0; k<n; k++){ const i = (from + k) % n; if (!C.cells[i]) return i; } return -1; }

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
  else if (left > 0) toast(`Added ${placed}. Pick a layout with more photos for the other ${left}.`);
}
let pendingCell = -1;
function pickFor(i){ pendingCell = i; $('#collageInput').click(); }
$('#collageInput').onchange = e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) fillCells(fs, pendingCell); };

/* collage UI */
function loadTemplateFonts(){
  const fonts = new Set(TEMPLATES.flatMap(t => t.deco.filter(d => d.type === 'text').map(d => `${d.weight || 400} 40px "${d.font}"`)));
  return Promise.all([...fonts].map(f => document.fonts.load(f).catch(() => {})));
}
function useTemplate(t){
  C.tpl = t; C.ratio = t.ratio; C.bg = null; C.text = {...(t.text || {})};
  if (C.sel >= cellCount()) C.sel = -1;
  syncCollage();
}
function useLayout(L){
  C.tpl = null; C.layout = L; if (!C.bg) C.bg = '#ffffff';
  if (C.sel >= cellCount()) C.sel = -1;
  syncCollage();
}
(function buildCollageUI(){
  const tg = $('#templateGrid');
  TEMPLATES.forEach(t => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tpl'; b.title = `${t.name}: ${t.cells.length} photo${t.cells.length > 1 ? 's' : ''}`;
    const c = mk(10, 10); b.appendChild(c);
    const n = document.createElement('span'); n.textContent = t.name; b.appendChild(n);
    b.onclick = () => useTemplate(t);
    tg.appendChild(b); t.btn = b; t.thumb = c;
  });
  const grid = $('#layoutGrid');
  LAYOUTS.forEach(L => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'lay'; b.title = `${L.cells.length} photos`;
    b.innerHTML = `<svg viewBox="0 0 100 100">${L.cells.map(([x,y,w,h]) => `<rect x="${x*100+3}" y="${y*100+3}" width="${w*100-6}" height="${h*100-6}" rx="4" fill="currentColor" opacity=".8"/>`).join('')}</svg>`;
    b.onclick = () => useLayout(L);
    grid.appendChild(b); L.btn = b;
  });
  const rc = $('#ratioChips');
  RATIOS.forEach(([label, v]) => {
    const c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.textContent = label; c.dataset.v = v;
    c.onclick = () => { C.ratio = v; syncCollage(); };
    rc.appendChild(c);
  });
  ['title', 'sub'].forEach(slot => {
    const inp = $(slot === 'title' ? '#cTitle' : '#cSub');
    inp.addEventListener('input', () => { C.text[slot] = inp.value; drawCollage(); });
  });
})();
/* Template previews, drawn with the photos already in the collage. */
function buildTemplateThumbs(){
  TEMPLATES.forEach(t => {
    const [W, H] = collageSize(t.ratio, 260), c = t.thumb; c.width = W; c.height = H;
    const sample = Array.from({length: t.cells.length}, (_, i) => C.cells[i % Math.max(1, C.cells.filter(Boolean).length)] || null);
    const keep = {bg: C.bg, text: C.text}; C.bg = null; C.text = {};
    renderCollage(c.getContext('2d'), W, H, false, {tpl: t, cells: sample});
    C.bg = keep.bg; C.text = keep.text;
  });
}
const cBg = makeSwatches($('#cbg'), ['#ffffff','#111111','#f3ece0','#efb34a','#ff7ac6','#4da3ff','#3ddc97'], c => { C.bg = c; syncCollage(); });
const paintCGap = bindRange('cgap', () => C.gap, v => { C.gap = v; drawCollage(); });
const paintCRadius = bindRange('cradius', () => C.radius, v => { C.radius = v; drawCollage(); });
const paintCZoom = bindRange('czoom', () => { const c = C.cells[C.sel]; return c ? Math.round(c.zoom*100) : null; }, v => { const c = C.cells[C.sel]; if (c){ c.zoom = v/100; drawCollage(); } }, v => v+'%');
$('#cReplace').onclick = () => { if (C.sel >= 0) pickFor(C.sel); };
$('#cRemove').onclick = () => { if (C.sel >= 0){ C.cells[C.sel] = null; syncCollage(); } };
$('#cAdd').onclick = () => { const e = firstEmpty(C.sel >= 0 ? C.sel : 0); if (e < 0) { toast('Every spot has a photo. Pick a layout with more photos, or select one and use Replace.'); return; } pickFor(e); };
$('#cAddCurrent').onclick = async () => {
  const e = C.sel >= 0 && !C.cells[C.sel] ? C.sel : firstEmpty(C.sel >= 0 ? C.sel : 0);
  if (e < 0) { toast('Every spot has a photo. Remove one first.'); return; }
  const img = shrinkTo(await renderEditorFull());
  C.cells[e] = {img, zoom:1, fx:0, fy:0}; C.sel = e; syncCollage(); toast('Added the photo you’re editing, with its edits.');
};
$('#cToEditor').onclick = () => {
  if (!usedCells()) { toast('Add at least one photo to the collage first.'); return; }
  const [W, H] = collageSize(), tpl = C.tpl;
  S.base = renderCollageFull({withText: false}); S.params = defaults(); S.filter = 'none'; S.strength = 100; S.bg = {...BG_DEFAULT}; syncBg();
  S.name = 'collage'; S.label = 'Collage'; selId = null; drawSession = null;
  // Template titles arrive as text layers, so they stay editable in the editor.
  const fitSize = d => {   // the same shrink-to-fit the collage uses
    mctx.font = decoFont(d, W); mctx.letterSpacing = ((d.spacing || 0) * d.size * W) + 'px';
    const tw = mctx.measureText(textFor(d, tpl)).width;
    return Math.round(d.size*W * Math.min(1, (d.maxW || 0.9)*W / Math.max(1, tw)));
  };
  S.layers = !tpl ? [] : tpl.deco.filter(d => d.type === 'text' && textFor(d, tpl).trim()).map(d => ({
    id: nextId++, type:'text', text: textFor(d, tpl), font: d.font, size: fitSize(d), color: d.color, bold: (d.weight || 400) >= 600,
    align:'center', outline:0, ocolor:'#111111', shadow: d.shadow ? 40 : 0, bg:'', glow:'', spacing: d.spacing ? Math.round(d.spacing*200) : 0,
    x: d.x*W, y: d.y*H, rot: d.rot || 0, scale:1, opacity:1, flip:false, hidden:false,
  }));
  commit(); syncUI(); setTab('adjust'); rebuildPreview(); syncResize(); refreshLayerUI();
  toast(tpl ? 'Collage sent to the editor. Its titles are text layers you can edit.' : 'Collage sent to the editor. Undo brings back your previous photo.');
};
function syncCollage(){
  const t = C.tpl;
  TEMPLATES.forEach(x => x.btn.setAttribute('aria-pressed', String(x === t)));
  LAYOUTS.forEach(L => L.btn.setAttribute('aria-pressed', String(!t && L === C.layout)));
  document.querySelectorAll('#ratioChips .chip').forEach(c => c.setAttribute('aria-pressed', String(+c.dataset.v === C.ratio)));
  $('#gridOptions').hidden = !!t;
  const slots = t ? new Set(t.deco.filter(d => d.type === 'text').map(d => d.slot)) : new Set();
  $('#cTextFields').hidden = !slots.size;
  $('#cTitleF').hidden = !slots.has('title'); $('#cSubF').hidden = !slots.has('sub');
  if (document.activeElement !== $('#cTitle')) $('#cTitle').value = C.text.title ?? '';
  if (document.activeElement !== $('#cSub')) $('#cSub').value = C.text.sub ?? '';
  cBg.set(typeof C.bg === 'string' ? C.bg : ''); paintCGap(); paintCRadius();
  $('#cellEdit').hidden = !(C.sel >= 0 && C.cells[C.sel]); paintCZoom();
  drawCollage(); collageInfo();
}

/* collage pointer: tap empty = add, drag = reposition, wheel = zoom */
function collagePoint(e){ const r = ccv.getBoundingClientRect(); return {x:(e.clientX - r.left) * ccv.width / r.width, y:(e.clientY - r.top) * ccv.height / r.height, k: ccv.width / r.width}; }
const toCellLocal = (r, p) => { const dx = p.x - r.cx, dy = p.y - r.cy, c = Math.cos(-r.rot), s = Math.sin(-r.rot); return {x: dx*c - dy*s, y: dx*s + dy*c}; };
function collageCellAt(e){
  const p = collagePoint(e), W = ccv.width, rects = cellRects(ccv.width, ccv.height);
  for (let i = rects.length - 1; i >= 0; i--){   // topmost first
    const r = rects[i], q = toCellLocal(r, p), [pad, padB] = framePad(r, W);
    if (q.x >= -r.w/2 - pad && q.x <= r.w/2 + pad && q.y >= -r.h/2 - pad && q.y <= r.h/2 + padB) return i;
  }
  return -1;
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
  cdragCell = {cell, r, p0:collagePoint(e), fx0:cell.fx, fy0:cell.fy, ex:g.ex, ey:g.ey};
  ccv.setPointerCapture(e.pointerId); ccv.style.cursor = 'grabbing';
});
ccv.addEventListener('pointermove', e => {
  if (!cdragCell) return;
  const p = collagePoint(e), d = cdragCell, c = Math.cos(-d.r.rot), s = Math.sin(-d.r.rot);
  const mx = p.x - d.p0.x, my = p.y - d.p0.y, lx = mx*c - my*s, ly = mx*s + my*c;   // drag in the photo's own direction
  if (d.ex > 0.5) d.cell.fx = clamp(d.fx0 + lx/d.ex, -1, 1);
  if (d.ey > 0.5) d.cell.fy = clamp(d.fy0 + ly/d.ey, -1, 1);
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
    {img:crop(.3, .05, .6, .6, {}, 'cinema'), zoom:1, fx:0, fy:0},
  ];
  C.tpl = TEMPLATES[0]; C.ratio = C.tpl.ratio; C.bg = null; C.text = {...C.tpl.text};
  buildTemplateThumbs();
  loadTemplateFonts().then(() => { buildTemplateThumbs(); if (tab === 'collage') drawCollage(); });
}

/* ================= cheeky (18+) word stickers ================= */
// Comic-style word stickers. Hidden until the person chooses to show them; the choice is remembered.
const CHEEKY = [
  {text:'FFS', style:'burst', bg:'#ff5a5f', fg:'#ffffff'},
  {text:'WTF?!', style:'bubble', bg:'#ffffff', fg:'#111111'},
  {text:'BOLLOCKS', style:'stamp', fg:'#e23b3b'},
  {text:'OH SHIT', style:'pill', bg:'#111111', fg:'#ffd23f'},
  {text:'FUCK YEAH!', style:'burst', bg:'#ffd23f', fg:'#111111'},
  {text:'SOD OFF', style:'bubble', bg:'#ffd23f', fg:'#111111'},
  {text:'BLOODY HELL', style:'pill', bg:'#e23b3b', fg:'#ffffff'},
  {text:'HOT MESS', style:'neon', fg:'#ff4fd8'},
  {text:'NO FUCKS GIVEN', style:'stamp', fg:'#111111'},
  {text:'BITCH PLEASE', style:'bubble', bg:'#ff7ac6', fg:'#ffffff'},
  {text:'HUNGOVER', style:'pill', bg:'#3ddc97', fg:'#111111'},
  {text:'ARSE', style:'burst', bg:'#9b6bff', fg:'#ffffff'},
  {text:"THAT'S WHAT SHE SAID", style:'bubble', bg:'#ffffff', fg:'#111111'},
  {text:"WINE O'CLOCK", style:'neon', fg:'#ffb547'},
  {text:'CHEEKY', style:'pill', bg:'#ff5a5f', fg:'#ffffff'},
  {text:'OMFG', style:'neon', fg:'#4de1ff'},
  {text:'DONE WITH THIS SHIT', style:'pill', bg:'#111111', fg:'#ffffff'},
  {text:'PISSED', style:'burst', bg:'#ff9f1a', fg:'#111111'},
  {text:'LEGEND', style:'stamp', fg:'#2b6cff'},
  {text:'KISS MY ASS', style:'bubble', bg:'#e23b3b', fg:'#ffffff'},
];
const CHEEKY_EMOJI = ['🖕','🍑','🍆','💩','🤬','🥴','🍺','🍷','🤡','💀','🙄','🥵','😈','🤪','🤭'];
const WORD_FONT = '"Bungee", "Anton", Impact, system-ui, sans-serif';
const WORD_SIZE = 60;
const burstPaths = new Map();

function wordMeasure(l){
  mctx.font = `400 ${WORD_SIZE}px ${l.style === 'neon' ? '"Righteous", ' + WORD_FONT : WORD_FONT}`; mctx.letterSpacing = '0px';
  return mctx.measureText(l.text).width;
}
/* Box around a word sticker, centred on 0,0, in its own units. */
function wordBox(l){
  const tw = wordMeasure(l);
  if (l.style === 'bubble') return [-(tw+70)/2 - 4, -55 - 4, (tw+70)/2 + 4, 55 + 34];
  if (l.style === 'burst'){ const rx = (tw/2 + 34)/0.74 + 6; return [-rx, -100, rx, 100]; }
  if (l.style === 'stamp') return [-(tw+70)/2 - 12, -64, (tw+70)/2 + 12, 64];
  if (l.style === 'neon') return [-(tw/2 + 30), -55, tw/2 + 30, 55];
  return [-(tw+64)/2, -50, (tw+64)/2, 50];
}
function drawWord(ctx, l){
  const tw = wordMeasure(l);
  ctx.font = mctx.font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const ink = '#111111';
  if (l.style === 'pill'){
    ctx.fillStyle = l.bg; ctx.beginPath(); ctx.roundRect(-(tw+64)/2, -50, tw+64, 100, 50); ctx.fill();
    ctx.fillStyle = l.fg; ctx.fillText(l.text, 0, 4);
  } else if (l.style === 'bubble'){
    const w = tw + 70, h = 110;
    ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 30);
    ctx.moveTo(-w/2 + 34, h/2 - 2); ctx.lineTo(-w/2 + 20, h/2 + 30); ctx.lineTo(-w/2 + 66, h/2 - 2);
    ctx.fillStyle = l.bg; ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.fill(); ctx.stroke();
    ctx.fillStyle = l.bg; ctx.fillRect(-w/2 + 37, h/2 - 7, 26, 8);   // hide the seam where the tail meets the bubble
    ctx.fillStyle = l.fg; ctx.fillText(l.text, 0, 4);
  } else if (l.style === 'burst'){
    const rx = (tw/2 + 34)/0.74, ry = 92, key = Math.round(rx);   // inner points clear the word
    if (!burstPaths.has(key)){
      const p = new Path2D(), n = 18;
      for (let i = 0; i < n*2; i++){ const a = -Math.PI/2 + i*Math.PI/n, k = i % 2 ? 0.74 : 1; const x = Math.cos(a)*rx*k, y = Math.sin(a)*ry*k; i ? p.lineTo(x, y) : p.moveTo(x, y); }
      p.closePath(); burstPaths.set(key, p);
    }
    const p = burstPaths.get(key);
    ctx.fillStyle = l.bg; ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.fill(p); ctx.stroke(p);
    ctx.fillStyle = l.fg; ctx.fillText(l.text, 0, 4);
  } else if (l.style === 'stamp'){
    ctx.rotate(-8*RAD);
    const w = tw + 70, h = 104;
    ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 14); ctx.fill();
    ctx.strokeStyle = l.fg; ctx.lineWidth = 7; ctx.stroke();
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(-w/2 + 11, -h/2 + 11, w - 22, h - 22, 8); ctx.stroke();
    ctx.fillStyle = l.fg; ctx.fillText(l.text, 0, 4);
  } else {
    // Neon: a white core with a coloured glow.
    ctx.save(); ctx.shadowColor = l.fg; ctx.shadowBlur = 34; ctx.fillStyle = l.fg; ctx.fillText(l.text, 0, 4); ctx.shadowBlur = 14; ctx.fillText(l.text, 0, 4); ctx.restore();
    ctx.fillStyle = '#ffffff'; ctx.fillText(l.text, 0, 4);
  }
}
function addWordSticker(w){
  const b = wordBox(w), bw = b[2] - b[0];
  addLayer({type:'word', text:w.text, style:w.style, bg:w.bg || '', fg:w.fg, shadow:false, scale: minSide()*0.42/bw});
}
let cheekyOn = false;
try { cheekyOn = localStorage.getItem('tinto.cheeky') === '1'; } catch { /* storage unavailable */ }
function syncCheeky(){
  $('#cheekyGrid').hidden = $('#cheekyEmoji').hidden = !cheekyOn;
  $('#cheekyHint').hidden = cheekyOn;
  $('#cheekyToggle').textContent = cheekyOn ? 'Hide' : 'Show';
  if (cheekyOn && !$('#cheekyGrid').childElementCount) buildCheeky();
}
function buildCheeky(){
  const grid = $('#cheekyGrid');
  CHEEKY.forEach(w => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'stk'; b.title = 'Add ' + w.text;
    const box = wordBox(w), bw = box[2] - box[0], bh = box[3] - box[1], k = Math.min(260/bw, 130/bh);
    const c = mk(Math.round(bw*k), Math.round(bh*k)), x = c.getContext('2d');
    x.scale(k, k); x.translate(-box[0], -box[1]); drawWord(x, w);
    b.appendChild(c); b.onclick = () => addWordSticker(w); grid.appendChild(b);
  });
  const eg = $('#cheekyEmoji');
  CHEEKY_EMOJI.forEach(ch => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'stk'; b.title = 'Add ' + ch; b.textContent = ch;
    b.onclick = () => addLayer({type:'emoji', char:ch, shadow:false, scale:minSide()*0.2/100});
    eg.appendChild(b);
  });
}
$('#cheekyToggle').onclick = () => {
  cheekyOn = !cheekyOn;
  try { localStorage.setItem('tinto.cheeky', cheekyOn ? '1' : '0'); } catch { /* storage unavailable */ }
  syncCheeky();
};
document.fonts.load(`400 60px "Bungee"`).then(() => { if (cheekyOn){ $('#cheekyGrid').innerHTML = ''; $('#cheekyEmoji').innerHTML = ''; buildCheeky(); } if (S.base) composite(); }).catch(() => {});
syncCheeky();

/* ================= watermark ================= */
// Optional watermark in the bottom-right corner, shown live on the photo and added to exports.
const WM_STYLES = [
  {id:'pill', name:'Pill'},
  {id:'minimal', name:'Minimal'},
  {id:'brand', name:'Logo'},
  {id:'signature', name:'Signature'},
  {id:'stamp', name:'Outline'},
  {id:'corner', name:'Corner ribbon'},
];
const WM = {on:false, style:'pill', text:'Made with Tinto', size:100, opacity:90};
try { Object.assign(WM, JSON.parse(localStorage.getItem('tinto.watermark') || '{}')); } catch { /* defaults */ }
function saveWM(){ try { localStorage.setItem('tinto.watermark', JSON.stringify(WM)); } catch { /* not remembered */ } }

/* The Tinto mark (amber tile, slider t, eye), drawn at x, y with side s. */
function drawTintoMark(ctx, x, y, s){
  ctx.save(); ctx.translate(x, y); ctx.scale(s/100, s/100);
  ctx.fillStyle = '#efb34a'; ctx.beginPath(); ctx.roundRect(0, 0, 100, 100, 24); ctx.fill();
  ctx.translate(9, 9); ctx.scale(0.82, 0.82);
  ctx.fillStyle = 'rgba(18,19,22,.28)'; ctx.beginPath(); ctx.roundRect(16, 37, 68, 9, 4.5); ctx.fill();
  ctx.strokeStyle = '#121316'; ctx.lineWidth = 13; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(42, 16); ctx.lineTo(42, 66); ctx.quadraticCurveTo(42, 80, 56, 80); ctx.lineTo(62, 80); ctx.stroke();
  ctx.fillStyle = '#121316'; ctx.beginPath(); ctx.roundRect(16, 37, 52, 9, 4.5); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(42, 25, 4.6, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#121316'; ctx.beginPath(); ctx.arc(43.2, 25, 2.1, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(68, 41.5, 11.5, 0, Math.PI*2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 5.5; ctx.stroke();
  ctx.restore();
}

function drawWatermark(ctx, W, H, wm = WM){
  const text = (wm.text || '').trim() || 'Made with Tinto';
  const base = Math.min(W, H), s = base*0.032*(wm.size/100), m = base*0.03;
  ctx.save();
  ctx.globalAlpha = wm.opacity/100;
  ctx.textBaseline = 'middle'; ctx.letterSpacing = '0px';
  const soft = () => { ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = s*0.5; ctx.shadowOffsetY = s*0.08; };
  if (wm.style === 'minimal'){
    ctx.font = `600 ${s}px "Hanken Grotesk", system-ui, sans-serif`; ctx.textAlign = 'right'; soft();
    ctx.fillStyle = '#ffffff'; ctx.fillText(text, W - m, H - m - s*0.5);
  } else if (wm.style === 'pill'){
    ctx.font = `600 ${s}px "Hanken Grotesk", system-ui, sans-serif`; ctx.textAlign = 'left';
    const tw = ctx.measureText(text).width, ph = s*2.1, icon = s*1.35, pw = s*0.8 + icon + s*0.55 + tw + s*0.9;
    const x = W - m - pw, y = H - m - ph;
    ctx.fillStyle = 'rgba(14,15,19,.6)'; ctx.beginPath(); ctx.roundRect(x, y, pw, ph, ph/2); ctx.fill();
    drawTintoMark(ctx, x + s*0.8, y + (ph - icon)/2, icon);
    ctx.fillStyle = '#ffffff'; ctx.fillText(text, x + s*0.8 + icon + s*0.55, y + ph/2 + s*0.04);
  } else if (wm.style === 'brand'){
    ctx.font = `700 ${s*1.05}px "Sora", "Hanken Grotesk", system-ui, sans-serif`; ctx.textAlign = 'right';
    const icon = s*2.1, x = W - m - icon, y = H - m - icon;
    ctx.save(); soft(); drawTintoMark(ctx, x, y, icon); ctx.restore();
    soft(); ctx.fillStyle = '#ffffff'; ctx.fillText(text, x - s*0.6, y + icon/2);
  } else if (wm.style === 'signature'){
    ctx.font = `700 ${s*1.7}px "Dancing Script", "Caveat", cursive`; ctx.textAlign = 'right'; soft();
    ctx.fillStyle = '#ffffff'; ctx.fillText(text, W - m, H - m - s*0.8);
  } else if (wm.style === 'stamp'){
    const t = text.toUpperCase(), sp = s*0.22;
    ctx.font = `700 ${s*0.85}px "Hanken Grotesk", system-ui, sans-serif`; ctx.letterSpacing = sp + 'px'; ctx.textAlign = 'center';
    const tw = ctx.measureText(t).width, bw = tw + s*1.6, bh = s*2;
    const x = W - m - bw, y = H - m - bh;
    soft(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, s*0.09); ctx.beginPath(); ctx.roundRect(x, y, bw, bh, s*0.3); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillText(t, x + bw/2 + sp/2, y + bh/2 + s*0.04);
  } else if (wm.style === 'corner'){
    // A ribbon across the corner, cut off by the edges like a sash.
    const band = s*1.9, r = s*4.6, len = r*4;
    ctx.translate(W - r, H - r); ctx.rotate(-Math.PI/4);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = s*0.6;
    const g = ctx.createLinearGradient(-len/2, 0, len/2, 0); g.addColorStop(0, '#f9c867'); g.addColorStop(1, '#ff8f5a');
    ctx.fillStyle = g; ctx.fillRect(-len/2, -band/2, len, band); ctx.restore();
    ctx.font = `700 ${s*0.78}px "Hanken Grotesk", system-ui, sans-serif`; ctx.letterSpacing = (s*0.12) + 'px'; ctx.textAlign = 'center';
    ctx.fillStyle = '#1c1206'; ctx.fillText(text.toUpperCase(), 0, s*0.04, r*2.2);
  }
  ctx.restore();
}

/* Watermark options in the Export dialog */
function wmPreviewSource(){
  // The photo (or collage) being exported, shrunk, for the style tiles.
  const src = tab === 'collage' ? ccv : view, w = 300, h = 200, c = mk(w, h), x = c.getContext('2d');
  const k = Math.max(w/src.width, h/src.height);
  x.drawImage(src, (w - src.width*k)/2, (h - src.height*k)/2, src.width*k, src.height*k);
  return c;
}
function redrawPreview(){ if (!S.base) return; if (tab === 'collage') drawCollage(); else composite(); }
function buildWmTiles(){
  const wrap = $('#wmStyles'); wrap.innerHTML = '';
  if (!S.base) return;
  const was = WM.on; WM.on = false; redrawPreview();   // tiles start from the clean picture
  const srcCanvas = wmPreviewSource();
  WM.on = was; redrawPreview();
  WM_STYLES.forEach(st => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-pressed', String(WM.style === st.id));
    const c = mk(300, 200), x = c.getContext('2d'); x.drawImage(srcCanvas, 0, 0);
    drawWatermark(x, 300, 200, {...WM, style: st.id, size: Math.max(WM.size, 130), opacity: Math.max(WM.opacity, 80)});
    const n = document.createElement('span'); n.textContent = st.name;
    b.append(c, n);
    b.onclick = () => { WM.style = st.id; saveWM(); syncWM(); };
    wrap.appendChild(b);
  });
}
function syncWM(){
  $('#wmOn').checked = WM.on; $('#wmOpts').hidden = !WM.on;
  if (document.activeElement !== $('#wmText')) $('#wmText').value = WM.text;
  document.querySelectorAll('#wmStyles button').forEach((b, i) => b.setAttribute('aria-pressed', String(WM_STYLES[i].id === WM.style)));
  ['wmSize','wmOpacity'].forEach(id => { const i = $('#'+id), v = id === 'wmSize' ? WM.size : WM.opacity; i.value = v; fill(i, v, +i.min, +i.max); $('#'+id+'Out').textContent = v + '%'; });
  redrawPreview();
}
$('#wmOn').addEventListener('change', e => { WM.on = e.target.checked; saveWM(); if (WM.on) buildWmTiles(); syncWM(); });
$('#wmText').addEventListener('input', e => { WM.text = e.target.value; saveWM(); syncWM(); });
$('#wmText').addEventListener('change', () => buildWmTiles());
$('#wmSize').addEventListener('input', e => { WM.size = +e.target.value; saveWM(); syncWM(); });
$('#wmOpacity').addEventListener('input', e => { WM.opacity = +e.target.value; saveWM(); syncWM(); });
$('#exportBtn').addEventListener('click', () => { if (WM.on) buildWmTiles(); syncWM(); });
document.fonts.load('700 40px "Dancing Script"').catch(() => {});
syncWM();

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

/* ================= updates ================= */
// The main process checks GitHub Releases on launch and every few hours, and downloads new
// versions in the background. This shows the progress, and the button to restart and install.
let updateStatus = {state:'off'}, updateHidden = false, userCheck = false, appVer = '';
function renderUpdate(){
  const s = updateStatus, bar = $('#updateBar');
  bar.hidden = updateHidden || !(s.state==='downloading' || s.state==='ready');
  if (bar.hidden) return;
  const pct = Math.round((s.progress || 0) * 100);
  $('#updateMsg').textContent = s.state==='ready' ? `Tinto ${s.version} is ready to install` : `Downloading Tinto ${s.version}… ${pct}%`;
  $('#updateTrack').hidden = s.state!=='downloading';
  $('#updateFill').style.width = pct + '%';
  $('#updateGo').hidden = s.state!=='ready';
}
function reportCheck(s){
  if (!userCheck) return;
  if (s.state==='current'){ userCheck = false; toast(`You have the latest version of Tinto${appVer ? ` (${appVer})` : ''}.`); }
  else if (s.state==='error'){ userCheck = false; toast('Couldn’t check for updates. Check your internet connection and try again.'); }
  else if (s.state==='off'){ userCheck = false; toast('Updates are off when Tinto runs from the project folder. Install it to get updates.'); }
  else if (s.state==='downloading' || s.state==='ready'){ userCheck = false; updateHidden = false; renderUpdate(); }
}
async function checkUpdatesNow(){
  userCheck = true;
  toast('Checking for updates…');
  try { reportCheck(await window.tinto.checkForUpdates()); }
  catch { reportCheck({state:'error'}); }
}
if (desktop){
  window.tinto.appVersion().then(v => { appVer = v; }).catch(() => {});
  window.tinto.updateState().then(s => { updateStatus = s; renderUpdate(); }).catch(() => {});
  window.tinto.onUpdateStatus(s => {
    if (s.state==='ready' && updateStatus.state!=='ready') updateHidden = false;
    updateStatus = s; renderUpdate(); reportCheck(s);
  });
  window.tinto.onMenu(action => { if (action==='check-updates') checkUpdatesNow(); });
  $('#updateGo').onclick = async () => {
    const res = await window.tinto.installUpdate(hi > 0);
    if (res && res.ok) $('#updateGo').disabled = true;
  };
  $('#updateHide').onclick = () => { updateHidden = true; renderUpdate(); };
}


/* ================= custom stickers: import, edit, save ================= */
// Import an image, take its background out (AI, plain colour, tap a colour, or by hand),
// add an optional sticker border, then place it as a layer. Saved ones appear in My stickers.
const SK = {src:null, mask:null, w:0, h:0, pad:0, undo:[], tool:'wand', border:'#ffffff', painting:false, busy:false};
const skC = $('#skCanvas'), skX = skC.getContext('2d');
const SK_MAX = 1200;

function stickerId(){ return 'stk-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }

async function fileToCanvas(file, max){
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const c = mk(img.naturalWidth, img.naturalHeight); c.getContext('2d').drawImage(img, 0, 0);
    return shrinkTo(c, max);
  } finally { URL.revokeObjectURL(url); }
}

async function openStickerEditor(file){
  if (!file) return;
  if (file.type && !file.type.startsWith('image/')) { toast('That file isn’t an image. Choose a JPG, PNG, WebP or GIF.'); return; }
  let c;
  try { c = await fileToCanvas(file, SK_MAX); }
  catch { toast('This image couldn’t be read. HEIC photos need converting to JPG first.'); return; }
  SK.w = c.width; SK.h = c.height;
  SK.src = c.getContext('2d').getImageData(0, 0, SK.w, SK.h);
  SK.mask = new Uint8ClampedArray(SK.w*SK.h);
  for (let i=0, j=3; i<SK.mask.length; i++, j+=4) SK.mask[i] = SK.src.data[j];   // keep any transparency the file already has
  SK.orig = SK.mask.slice();
  SK.pad = Math.round(Math.max(SK.w, SK.h) * 0.1);
  SK.undo = [];
  $('#skAi').hidden = $('#skAiHint').hidden = !desktop;
  $('#skSaveRow').hidden = !desktop;
  setSkBusy(null);
  $('#stickerModal').hidden = false;
  renderSk();
}
function closeStickerEditor(){ $('#stickerModal').hidden = true; SK.src = SK.mask = null; SK.undo = []; }

/* The picture with its current cut-out applied (no border), as a canvas. */
function skCutCanvas(){
  const out = new ImageData(SK.w, SK.h), d = out.data, s = SK.src.data, m = SK.mask;
  for (let i=0, j=0; i<m.length; i++, j+=4){ d[j]=s[j]; d[j+1]=s[j+1]; d[j+2]=s[j+2]; d[j+3]=m[i]; }
  const c = mk(SK.w, SK.h); c.getContext('2d').putImageData(out, 0, 0); return c;
}
const skBorderPx = () => SK.border ? Math.max(1, Math.round(+$('#skBorderW').value / 400 * Math.max(SK.w, SK.h))) : 0;

/* Draws a cut-out with a solid border around its outline: the silhouette stamped in a ring, then the picture on top. */
function withBorder(cut, colour, bw, pad){
  const out = mk(cut.width + pad*2, cut.height + pad*2), x = out.getContext('2d');
  if (colour && bw > 0){
    const sil = mk(cut.width, cut.height), sx = sil.getContext('2d');
    sx.drawImage(cut, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = colour; sx.fillRect(0, 0, cut.width, cut.height);
    for (const r of [bw, bw*0.66, bw*0.33]) for (let k=0; k<24; k++){ const a = k/24*Math.PI*2; x.drawImage(sil, pad + Math.cos(a)*r, pad + Math.sin(a)*r); }
  }
  x.drawImage(cut, pad, pad);
  return out;
}

function renderSk(){
  if (!SK.src) return;
  const framed = withBorder(skCutCanvas(), SK.border, skBorderPx(), SK.pad);
  if (skC.width !== framed.width || skC.height !== framed.height){ skC.width = framed.width; skC.height = framed.height; }
  skX.clearRect(0, 0, skC.width, skC.height); skX.drawImage(framed, 0, 0);
  $('#skUndo').disabled = !SK.undo.length;
}
function skPush(){ SK.undo.push(SK.mask.slice()); if (SK.undo.length > 20) SK.undo.shift(); }

/* Pixel position in the picture from a pointer event on the preview. */
function skPoint(e){
  const r = skC.getBoundingClientRect(), k = skC.width / r.width;
  return {x: Math.floor((e.clientX - r.left)*k - SK.pad), y: Math.floor((e.clientY - r.top)*k - SK.pad)};
}
const skTolerance = () => +$('#skTol').value * 2.4;

/* Removes the region of similar colour connected to the seed pixels. */
function skFloodRemove(seeds, refFor){
  const {w, h} = SK, s = SK.src.data, m = SK.mask, seen = new Uint8Array(w*h), tol = skTolerance(), t2 = tol*tol;
  const q = new Int32Array(w*h); let qh = 0, qt = 0;
  const ref = new Int32Array(w*h);
  for (const i of seeds){ if (!seen[i] && m[i] > 0){ seen[i] = 1; ref[i] = refFor(i); q[qt++] = i; } }
  let removed = 0;
  while (qh < qt){
    const i = q[qh++], r = ref[i], j = i*4, rj = r*4;
    const dr = s[j]-s[rj], dg = s[j+1]-s[rj+1], db = s[j+2]-s[rj+2];
    if (dr*dr + dg*dg + db*db > t2) continue;
    m[i] = 0; removed++;
    const x = i % w, y = (i / w) | 0;
    const nb = [x>0 ? i-1 : -1, x<w-1 ? i+1 : -1, y>0 ? i-w : -1, y<h-1 ? i+w : -1];
    for (const n of nb) if (n >= 0 && !seen[n] && m[n] > 0){ seen[n] = 1; ref[n] = r; q[qt++] = n; }
  }
  // Soften the new edge by a pixel so it doesn't look cut with scissors.
  for (let i=0; i<m.length; i++){
    if (m[i] !== 255) continue;
    const x = i % w, y = (i / w) | 0;
    if ((x>0 && m[i-1]===0) || (x<w-1 && m[i+1]===0) || (y>0 && m[i-w]===0) || (y<h-1 && m[i+w]===0)) m[i] = 150;
  }
  return removed;
}

function skPlainBackground(){
  const {w, h} = SK, seeds = [];
  for (let x=0; x<w; x++){ seeds.push(x, (h-1)*w + x); }
  for (let y=0; y<h; y++){ seeds.push(y*w, y*w + w - 1); }
  skPush();
  const n = skFloodRemove(seeds, i => i);   // each edge pixel spreads into colours close to its own
  if (n === 0) { SK.undo.pop(); toast('No plain background found at the edges. Try Tap colour, or Remove background.'); }
  else if (n > SK.w*SK.h*0.97) { SK.mask = SK.undo.pop(); toast('That would remove almost everything. Lower the tolerance and try again.'); }
  renderSk();
}

function skBrush(p, value){
  const r = Math.max(1, +$('#skBrush').value / 400 * Math.max(SK.w, SK.h)), {w, h} = SK, m = SK.mask, o = SK.orig, r2 = r*r;
  for (let y = Math.max(0, Math.floor(p.y - r)); y <= Math.min(h-1, Math.ceil(p.y + r)); y++)
    for (let x = Math.max(0, Math.floor(p.x - r)); x <= Math.min(w-1, Math.ceil(p.x + r)); x++)
      if ((x-p.x)**2 + (y-p.y)**2 <= r2){ const i = y*w + x; m[i] = value ? o[i] : 0; }
}

skC.addEventListener('pointerdown', e => {
  if (!SK.src || SK.busy) return;
  const p = skPoint(e);
  if (SK.tool === 'wand'){
    if (p.x < 0 || p.y < 0 || p.x >= SK.w || p.y >= SK.h) return;
    const i = p.y*SK.w + p.x;
    if (SK.mask[i] === 0) { toast('That part is already removed.'); return; }
    skPush(); skFloodRemove([i], () => i); renderSk(); return;
  }
  skPush(); SK.painting = true; skC.setPointerCapture(e.pointerId);
  skBrush(p, SK.tool === 'restore'); renderSk();
});
skC.addEventListener('pointermove', e => {
  if (!SK.painting) return;
  skBrush(skPoint(e), SK.tool === 'restore'); renderSk();
});
const skEndPaint = () => { SK.painting = false; };
skC.addEventListener('pointerup', skEndPaint); skC.addEventListener('pointercancel', skEndPaint);

function setSkBusy(msg, progress){
  SK.busy = !!msg;
  $('#skBusy').hidden = !msg;
  if (msg) $('#skBusyMsg').textContent = msg;
  $('#skBusyFill').parentElement.hidden = progress === undefined;
  if (progress !== undefined) $('#skBusyFill').style.width = Math.round(progress*100) + '%';
  ['#skAi','#skPlain','#skAdd','#skUndo','#skReset'].forEach(id => { $(id).disabled = !!msg || (id==='#skUndo' && !SK.undo.length); });
}

async function skRemoveWithAI(){
  if (!desktop || SK.busy) return;
  const {w, h} = SK, s = SK.src.data, rgb = new Uint8Array(w*h*3);
  for (let i=0, j=0, k=0; i<w*h; i++, j+=4, k+=3){ rgb[k]=s[j]; rgb[k+1]=s[j+1]; rgb[k+2]=s[j+2]; }
  let downloading = false;
  const stop = window.tinto.onRemoveBgProgress(pr => {
    if (pr.phase === 'loading') setSkBusy('Getting the background remover ready…');
    else if (pr.phase === 'download'){ downloading = true; setSkBusy('Downloading the AI model (first time only)…', pr.progress || 0); }
    else if (pr.phase === 'working') setSkBusy('Removing the background…');
  });
  setSkBusy('Removing the background…');
  try {
    const mask = await window.tinto.removeBackground(rgb, w, h);
    skPush();
    const m = SK.mask;
    for (let i=0; i<m.length; i++) m[i] = Math.min(m[i], mask[i]);   // keeps anything already erased
    setSkBusy(null); renderSk();
  } catch (err) {
    setSkBusy(null);
    const msg = String(err && err.message || err);
    if (/already being removed/.test(msg)) toast('A background is already being removed. Wait for it to finish.');
    else if (downloading || /fetch|network|ENOTFOUND|ETIMEDOUT|ECONN/i.test(msg)) toast('Couldn’t download the background remover. Check your internet connection and try again.');
    else toast('The background couldn’t be removed from this picture. Try Remove plain background or Tap colour.');
  } finally { stop(); }
}

/* The finished sticker: cut out, trimmed to its content, with its border. */
function skFinish(){
  const cut = skCutCanvas(), {w, h} = SK, m = SK.mask;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) if (m[y*w + x] > 8){ if (x<x0) x0=x; if (x>x1) x1=x; if (y<y0) y0=y; if (y>y1) y1=y; }
  if (x1 < 0) return null;
  const tw = x1-x0+1, th = y1-y0+1, trimmed = mk(tw, th);
  trimmed.getContext('2d').drawImage(cut, x0, y0, tw, th, 0, 0, tw, th);
  const bw = skBorderPx();
  return withBorder(trimmed, SK.border, bw, bw ? bw + 2 : 0);
}

/* ---- illustrated sticker packs: vector art, rasterised on demand with a white die-cut border and soft shadow ---- */
const PACK = window.STICKER_PACK || [];
const PACK_CATS = [['faces','Faces'],['silly','Silly'],['animals','Animals'],['snacks','Snacks'],['food','Food'],['cosy','Cosy'],['love','Love'],['party','Party'],['summer','Summer'],['retro','Retro'],['space','Space'],['dreamy','Dreamy'],['nature','Nature']];
const packURL = s => s.src || ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.svg));

async function packCanvas(s){
  const key = 'pk-' + s.id;
  if (STICKER_IMG.has(key)) return key;
  const img = new Image(); img.src = packURL(s); await img.decode();
  let framed, bw;
  if (s.svg){
    // vector art: rasterise big, then add a white die-cut border
    const N = 900, iw = img.naturalWidth || 1, ih = img.naturalHeight || 1, k = N / Math.max(iw, ih);
    const art = mk(Math.round(iw*k), Math.round(ih*k)); art.getContext('2d').drawImage(img, 0, 0, art.width, art.height);
    bw = Math.round(N*0.04); framed = withBorder(art, '#ffffff', bw, Math.round(bw*2.2));
  } else {
    // cut-out art already has its border: enlarge it smoothly so it holds up on big photos
    const k = Math.max(1, 450 / Math.max(img.naturalWidth, img.naturalHeight)), art = mk(Math.round(img.naturalWidth*k), Math.round(img.naturalHeight*k)), ax = art.getContext('2d');
    ax.imageSmoothingEnabled = true; ax.imageSmoothingQuality = 'high'; ax.drawImage(img, 0, 0, art.width, art.height);
    bw = Math.round(Math.max(art.width, art.height)*0.03); framed = withBorder(art, '', 0, Math.round(bw*2.2));
  }
  // bake a soft shadow under the die-cut so it lifts off any photo
  const out = mk(framed.width, framed.height), ox = out.getContext('2d');
  ox.shadowColor = 'rgba(25,10,35,.30)'; ox.shadowBlur = bw*1.1; ox.shadowOffsetY = bw*0.45;
  ox.drawImage(framed, 0, 0);
  STICKER_IMG.set(key, out);
  return key;
}

/* ---- emoji and sticker packs: tabs, search, Recent and Favourites ---- */
const FLUENT = window.EMOJI_PACK || [];
const FLUENT_CATS = [['faces','Faces'],['silly','Silly'],['love','Love'],['animals','Animals'],['food','Food'],['party','Party'],['sky','Sky & nature']];
const STK_BY_ID = new Map();
for (const s of FLUENT) STK_BY_ID.set(s.id, {...s, kind:'emoji', catName:(FLUENT_CATS.find(c => c[0]===s.cat)||[])[1] || ''});
for (const s of PACK) STK_BY_ID.set(s.id, {...s, kind:'sticker', catName:(PACK_CATS.find(c => c[0]===s.cat)||[])[1] || ''});
const loadIds = k => { try { const v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v.filter(id => STK_BY_ID.has(id)) : []; } catch { return []; } };
const saveIds = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* not remembered */ } };
let stkRecent = loadIds('tinto.stickers.recent'), stkFavs = loadIds('tinto.stickers.favourites');

async function addPackItem(s){
  if (!S.base){ toast('Open a photo first.'); return; }
  try {
    const key = await packCanvas(s), c = STICKER_IMG.get(key);
    addLayer({type:'image', ref:key, name:s.name, w:c.width, h:c.height, scale: minSide()*0.35/Math.max(c.width, c.height)});
    stkRecent = [s.id, ...stkRecent.filter(id => id !== s.id)].slice(0, 12);
    saveIds('tinto.stickers.recent', stkRecent); renderStkRows();
  } catch (e) { toast('Could not add that ' + (s.kind === 'emoji' ? 'emoji' : 'sticker') + '.'); }
}
function toggleFav(s){
  const on = stkFavs.includes(s.id);
  stkFavs = on ? stkFavs.filter(id => id !== s.id) : [s.id, ...stkFavs];
  saveIds('tinto.stickers.favourites', stkFavs);
  renderStkRows(); refreshFavMarks();
  toast(on ? `Removed ${s.name} from Favourites.` : `Added ${s.name} to Favourites.`);
}
function refreshFavMarks(){
  for (const t of document.querySelectorAll('#pane-stickers .stk[data-stk]')) t.classList.toggle('fav', stkFavs.includes(t.dataset.stk));
}
function stkTile(s){
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'stk' + (stkFavs.includes(s.id) ? ' fav' : ''); b.title = s.name;
  b.dataset.stk = s.id; b.setAttribute('aria-label', s.name);
  const im = document.createElement('img'); im.src = packURL(s); im.alt = ''; im.draggable = false; im.loading = 'lazy'; im.decoding = 'async';
  b.appendChild(im);
  b.onclick = () => addPackItem(s);
  b.addEventListener('contextmenu', e => {
    e.preventDefault(); e.stopPropagation();
    const fav = stkFavs.includes(s.id);
    openCtx([
      {label:'Add to photo', off:!S.base, act:() => addPackItem(s)},
      {label: fav ? 'Remove from Favourites' : 'Add to Favourites', act:() => toggleFav(s)},
    ], e.clientX, e.clientY);
  });
  return b;
}
function renderStkRows(){
  const fill = (wrap, grid, ids) => { $(wrap).hidden = !ids.length; const g = $(grid); g.innerHTML = ''; for (const id of ids) g.appendChild(stkTile(STK_BY_ID.get(id))); };
  fill('#stkFavWrap', '#stkFavGrid', stkFavs);
  fill('#stkRecentWrap', '#stkRecentGrid', stkRecent);
}
$('#stkRecentClear').onclick = () => { stkRecent = []; saveIds('tinto.stickers.recent', stkRecent); renderStkRows(); };

/* A section: a row of category tabs and a grid (used for Emoji and Sticker packs). */
function stickerSection(items, cats, tabsSel, gridSel){
  let cur = cats[0][0];
  function build(){
    const tabs = $(tabsSel), grid = $(gridSel);
    if (!tabs || !items.length) return;
    tabs.innerHTML = '';
    for (const [id, name] of cats){
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = name;
      b.setAttribute('role', 'tab'); b.setAttribute('aria-pressed', String(id === cur));
      b.onclick = () => { cur = id; build(); grid.scrollTop = 0; };
      tabs.appendChild(b);
    }
    grid.innerHTML = '';
    for (const s of items) if (s.cat === cur) grid.appendChild(stkTile(STK_BY_ID.get(s.id)));
  }
  build();
}
stickerSection(FLUENT, FLUENT_CATS, '#emojiTabs', '#emojiPackGrid');
stickerSection(PACK, PACK_CATS, '#packTabs', '#packGrid');
renderStkRows();

// search: every word typed must start a word in the name or the tab name ("hea" finds hearts)
const STK_SYNONYMS = {lol:'laughing joy', haha:'laughing joy', love:'heart', kiss:'kiss', sad:'crying', cry:'crying', angry:'grumpy steam', mad:'grumpy steam', cute:'heart', food:'food snacks', dog:'dog', puppy:'dog', kitty:'cat', bunny:'rabbit bunny', party:'party', birthday:'cake party balloon gift', cool:'sunglasses cool', sleep:'sleeping sleepy zzz', poop:'poo', star:'star', sun:'sun', fire:'fire', drink:'beverage drink cocktail tea glass', sweet:'candy lollipop doughnut cupcake cake cookie chocolate'};
function stkSearch(q){
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const out = [];
  for (const s of STK_BY_ID.values()){
    const hay = (s.name + ' ' + s.catName + ' ' + s.id.replace(/^fe-/, '').replace(/-/g, ' ')).toLowerCase().split(/[^a-z0-9]+/);
    const ok = words.every(w => hay.some(h => h.startsWith(w)) || (STK_SYNONYMS[w] || '').split(' ').some(x => x && hay.some(h => h.startsWith(x))));
    if (ok) out.push(s);
  }
  return out;
}
let stkSearchTimer = 0;
$('#stkSearch').addEventListener('input', () => {
  clearTimeout(stkSearchTimer);
  stkSearchTimer = setTimeout(() => {
    const res = stkSearch($('#stkSearch').value);
    $('#stkResults').hidden = !res; $('#stkBrowse').hidden = !!res;
    if (!res) return;
    const g = $('#stkResultsGrid'); g.innerHTML = '';
    for (const s of res.slice(0, 120)) g.appendChild(stkTile(s));
    $('#stkResultsHead').textContent = res.length ? `${res.length} result${res.length === 1 ? '' : 's'}` : 'No results';
    $('#stkNoResults').hidden = !!res.length;
  }, 90);
});
$('#stkSearch').addEventListener('keydown', e => { if (e.key === 'Escape' && e.target.value){ e.stopPropagation(); e.target.value = ''; e.target.dispatchEvent(new Event('input')); } });

function placeSticker(id){
  const c = STICKER_IMG.get(id); if (!c) return;
  addLayer({type:'image', ref:id, w:c.width, h:c.height, scale: minSide()*0.4/Math.max(c.width, c.height)});
}

async function skAdd(){
  if (SK.busy) return;
  const c = skFinish();
  if (!c) { toast('Nothing is left to make a sticker from. Undo, or Start over.'); return; }
  const id = stickerId();
  STICKER_IMG.set(id, c);
  const save = desktop && $('#skSave').checked;
  closeStickerEditor();
  if (tab !== 'stickers') setTab('stickers');
  placeSticker(id);
  if (save){
    try {
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      await window.tinto.stickers.save(id, new Uint8Array(await blob.arrayBuffer()));
      addMyStickerTile(id, c);
      toast('Sticker added and saved to My stickers.');
    } catch { toast('Sticker added, but it couldn’t be saved to My stickers.'); }
  } else toast('Sticker added.');
}

/* My stickers shelf */
function addMyStickerTile(id, canvas){
  const wrap = $('#myStickers');
  const b = document.createElement('div'); b.className = 'stk mine-item'; b.dataset.id = id;
  const add = document.createElement('button'); add.type = 'button'; add.title = 'Add this sticker';
  add.style.cssText = 'all:unset;cursor:pointer;width:100%;height:100%;display:block';
  const img = document.createElement('img'); img.alt = 'My sticker'; img.src = canvas.toDataURL('image/png');
  add.appendChild(img); add.onclick = () => placeSticker(id);
  b.appendChild(add);
  if (desktop){
    const del = document.createElement('button'); del.type = 'button'; del.className = 'del'; del.title = 'Delete from My stickers'; del.setAttribute('aria-label', 'Delete from My stickers');
    del.innerHTML = '<svg viewBox="0 0 12 12" stroke="currentColor" stroke-width="2"><path d="M2 2l8 8M10 2l-8 8"/></svg>';
    del.onclick = async () => { if (await window.tinto.stickers.remove(id)) b.remove(); };
    b.appendChild(del);
  }
  wrap.insertBefore(b, $('#importSticker').nextSibling);
}
async function loadMyStickers(){
  if (!desktop) return;
  try {
    const list = await window.tinto.stickers.list();
    for (const s of list){
      try {
        const bmp = await createImageBitmap(new Blob([s.data], {type:'image/png'}));
        const c = mk(bmp.width, bmp.height); c.getContext('2d').drawImage(bmp, 0, 0);
        STICKER_IMG.set(s.id, c); addMyStickerTile(s.id, c);
      } catch { /* skip a sticker file that can't be read */ }
    }
  } catch { /* no saved stickers */ }
}

/* Wiring */
$('#importSticker').onclick = async () => {
  if (desktop){ const files = await window.tinto.openImages(false); if (files.length) openStickerEditor(nativeToFile(files[0])); }
  else $('#stickerInput').click();
};
$('#stickerInput').onchange = e => { const f = e.target.files[0]; e.target.value = ''; openStickerEditor(f); };
$('#skAi').onclick = skRemoveWithAI;
$('#skPlain').onclick = () => { if (!SK.busy) skPlainBackground(); };
$('#skUndo').onclick = () => { if (SK.undo.length && !SK.busy){ SK.mask = SK.undo.pop(); renderSk(); } };
$('#skReset').onclick = () => { if (SK.busy) return; skPush(); SK.mask = SK.orig.slice(); renderSk(); };
$('#skCancel').onclick = () => { if (!SK.busy) closeStickerEditor(); };
$('#skAdd').onclick = skAdd;
$('#stickerModal').addEventListener('click', e => { if (e.target.id === 'stickerModal' && !SK.busy) closeStickerEditor(); });
document.querySelectorAll('#skTool button').forEach(b => b.onclick = () => {
  SK.tool = b.dataset.t;
  document.querySelectorAll('#skTool button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  $('#skTolRow').hidden = SK.tool !== 'wand'; $('#skBrushRow').hidden = SK.tool === 'wand';
});
document.querySelectorAll('#skBorder .chip').forEach(c => c.onclick = () => {
  SK.border = c.dataset.v;
  document.querySelectorAll('#skBorder .chip').forEach(x => x.setAttribute('aria-pressed', String(x === c)));
  $('#skBorderRow').hidden = !SK.border; renderSk();
});
(function skSliders(){
  const paint = (id, min, max) => { const i = $('#'+id); fill(i, +i.value, min, max); $('#'+id+'Out').textContent = i.value; };
  [['skTol',2,80],['skBrush',2,80],['skBorderW',1,40]].forEach(([id,min,max]) => {
    paint(id, min, max);
    $('#'+id).addEventListener('input', () => { paint(id, min, max); if (id === 'skBorderW') renderSk(); });
  });
})();
// While the sticker editor is open, keys act on it, never on the photo behind it.
window.addEventListener('keydown', e => {
  if ($('#stickerModal').hidden || e.key === 'Tab') return;
  e.stopImmediatePropagation();
  const mod = e.ctrlKey || e.metaKey;
  if (e.key === 'Escape' && !SK.busy) closeStickerEditor();
  else if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); $('#skUndo').click(); }
}, true);
/* ================= right-click menu ================= */
const CTX = {el:null, back:null, items:[]};
const CLIP_MARK = 'tinto:layer';      // what Copy puts on the system clipboard, so Paste knows to paste the layer
let layerClip = null;
const kbd = k => desktop && /Mac/.test(navigator.platform) ? k.replace('Ctrl+', '⌘') : k;

function copyLayer(l){
  if (!l) return;
  layerClip = clone(l);
  try { navigator.clipboard.writeText(CLIP_MARK).catch(() => {}); } catch {}
  toast(`Copied ${layerName(l)}. Paste with ${kbd('Ctrl+V')}.`);
}
function pasteLayer(at){
  if (!layerClip || !S.base) return;
  const d = clone(layerClip); d.id = nextId++; d.hidden = false;
  if (at){ d.x = at.x; d.y = at.y; }
  else { d.x = clamp(d.x + minSide()*0.04, 0, S.base.width); d.y = clamp(d.y + minSide()*0.04, 0, S.base.height); layerClip.x = d.x; layerClip.y = d.y; }
  S.layers.push(d); selId = d.id; composite(); commit(); refreshLayerUI();
}
function arrange(l, where){
  const i = S.layers.indexOf(l), n = S.layers.length; if (i < 0) return;
  S.layers.splice(i, 1);
  const to = where==='front' ? n-1 : where==='back' ? 0 : where==='up' ? Math.min(n-1, i+1) : Math.max(0, i-1);
  S.layers.splice(to, 0, l);
  composite(); commit(); refreshLayerUI();
}
function changeLayer(l, fn){ fn(l); composite(); commit(); refreshLayerUI(); }

async function copyPicture(){
  try {
    let c = await renderEditorFull();
    if (WM.on){ await document.fonts.ready; drawWatermark(c.getContext('2d'), c.width, c.height); }
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    let ok = false;
    if (desktop && window.tinto.copyImage) ok = await window.tinto.copyImage(new Uint8Array(await blob.arrayBuffer()));
    else if (window.ClipboardItem){ await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]); ok = true; }
    toast(ok ? 'Picture copied. Paste it into any app.' : 'The picture couldn’t be copied. Try Export instead.');
  } catch { toast('The picture couldn’t be copied. Try Export instead.'); }
}

function layerMenu(l, at){
  const i = S.layers.indexOf(l), top = i === S.layers.length-1, bottom = i === 0;
  const items = [];
  if (l.type==='text') items.push({label:'Edit text', act:() => { select(l.id, {switchTab:true}); setTimeout(() => { txt.focus(); txt.select(); }, 30); }}, '-');
  items.push(
    {label:'Duplicate', kbd:'Ctrl+D', act:() => { selId = l.id; duplicateSel(); }},
    {label:'Copy', kbd:'Ctrl+C', act:() => copyLayer(l)},
    {label:'Paste', kbd:'Ctrl+V', off:!layerClip, act:() => pasteLayer(at)},
    '-',
    {label:'Bring to front', off:top, act:() => arrange(l, 'front')},
    {label:'Bring forward', off:top, act:() => arrange(l, 'up')},
    {label:'Send backward', off:bottom, act:() => arrange(l, 'down')},
    {label:'Send to back', off:bottom, act:() => arrange(l, 'back')},
    '-',
    {label:'Flip horizontally', act:() => changeLayer(l, x => { x.flip = !x.flip; })},
    {label:'Straighten', off:!l.rot, act:() => changeLayer(l, x => { x.rot = 0; })},
    {label:'Centre on photo', act:() => changeLayer(l, x => { x.x = S.base.width/2; x.y = S.base.height/2; })},
    {label:'Hide', act:() => { selId = null; changeLayer(l, x => { x.hidden = true; }); toast('Hidden. Show it again from Layers.'); }},
    '-',
    {label:'Delete', kbd:'Del', danger:true, act:() => deleteLayer(l.id)},
  );
  return items;
}
function photoMenu(at){
  return [
    {label:'Add text here', act:() => {
      setTab('text'); addText();
      const t = getSel(); if (t){ t.x = at.x; t.y = at.y; composite(); hist[hi] = snap(); placeSel(); }
    }},
    {label:'Paste', kbd:'Ctrl+V', off:!layerClip, act:() => pasteLayer(at)},
    '-',
    {label:'Undo', kbd:'Ctrl+Z', off:hi <= 0, act:undo},
    {label:'Redo', kbd:'Ctrl+Y', off:hi >= hist.length-1, act:redo},
    '-',
    {label:'Copy picture', act:copyPicture},
    {label:'Export…', act:() => $('#exportBtn').click()},
    {label:'Open photo…', act:() => openPhoto()},
  ];
}

function closeCtx(refocus){
  if (!CTX.el) return;
  CTX.el.remove(); CTX.el = null; CTX.items = [];
  if (refocus && CTX.back && document.contains(CTX.back)) CTX.back.focus();
  CTX.back = null;
}
function openCtx(items, x, y){
  closeCtx();
  const m = document.createElement('div'); m.className = 'ctxmenu'; m.setAttribute('role', 'menu');
  for (const it of items){
    if (it === '-'){ const s = document.createElement('div'); s.className = 'ctx-sep'; s.setAttribute('role', 'separator'); m.appendChild(s); continue; }
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ctx-item' + (it.danger ? ' danger' : '');
    b.setAttribute('role', 'menuitem'); b.disabled = !!it.off;
    const t = document.createElement('span'); t.textContent = it.label; b.appendChild(t);
    if (it.kbd){ const k = document.createElement('kbd'); k.textContent = kbd(it.kbd); b.appendChild(k); }
    b.onclick = () => { closeCtx(); it.act(); };
    m.appendChild(b);
  }
  document.body.appendChild(m);
  const r = m.getBoundingClientRect(), pad = 8;
  m.style.left = Math.max(pad, Math.min(x, innerWidth - r.width - pad)) + 'px';
  m.style.top = Math.max(pad, Math.min(y, innerHeight - r.height - pad)) + 'px';
  CTX.el = m; CTX.back = document.activeElement; CTX.t = performance.now();
  CTX.items = [...m.querySelectorAll('.ctx-item:not(:disabled)')];
  if (CTX.items[0]) CTX.items[0].focus({preventScroll:true});
}

// right-click on the photo: the layer under the pointer, or the photo itself
stage.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (!S.base || tab==='crop' || tab==='collage') return;
  const vr = view.getBoundingClientRect();
  if (e.clientX < vr.left || e.clientX > vr.right || e.clientY < vr.top || e.clientY > vr.bottom){ closeCtx(); return; }
  const p = clientToImg(e), l = hitTest(p);
  if (l){ if (selId !== l.id) select(l.id); openCtx(layerMenu(l, p), e.clientX, e.clientY); }
  else openCtx(photoMenu(p), e.clientX, e.clientY);
});
// right-click on a sticker in My stickers
$('#myStickers').addEventListener('contextmenu', e => {
  const tile = e.target.closest('.mine-item'); if (!tile) return;
  e.preventDefault();
  const id = tile.dataset.id, c = STICKER_IMG.get(id); if (!c) return;
  openCtx([
    {label:'Add to photo', off:!S.base, act:() => placeSticker(id)},
    ...(desktop ? ['-', {label:'Delete from My stickers', danger:true, act:async () => { if (await window.tinto.stickers.remove(id)) tile.remove(); }}] : []),
  ], e.clientX, e.clientY);
});
// right-click on a row in the Layers panel
$('#layerList').addEventListener('contextmenu', e => {
  const row = e.target.closest('.lrow'); if (!row || row.classList.contains('photo')) return;
  e.preventDefault();
  const idx = [...$('#layerList').children].indexOf(row), l = S.layers[S.layers.length-1-idx]; if (!l) return;
  select(l.id); openCtx(layerMenu(l, null), e.clientX, e.clientY);
});
// no browser menu anywhere else in the editor (text boxes keep theirs)
window.addEventListener('contextmenu', e => {
  if (e.defaultPrevented) return;
  const t = e.target; if (t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
  e.preventDefault();
});
window.addEventListener('pointerdown', e => { if (CTX.el && !CTX.el.contains(e.target)) closeCtx(); }, true);
window.addEventListener('blur', () => closeCtx());
window.addEventListener('resize', () => closeCtx());
document.addEventListener('scroll', () => { if (CTX.el && performance.now() - CTX.t > 250) closeCtx(); }, true);
// while the menu is open, keys move through it and never reach the photo
window.addEventListener('keydown', e => {
  if (!CTX.el) return;
  e.stopImmediatePropagation();
  const i = CTX.items.indexOf(document.activeElement), n = CTX.items.length;
  if (e.key === 'Escape' || e.key === 'Tab'){ e.preventDefault(); closeCtx(true); }
  else if (e.key === 'ArrowDown'){ e.preventDefault(); CTX.items[(i+1+n) % n]?.focus(); }
  else if (e.key === 'ArrowUp'){ e.preventDefault(); CTX.items[(i-1+n) % n]?.focus(); }
  else if (e.key === 'Home'){ e.preventDefault(); CTX.items[0]?.focus(); }
  else if (e.key === 'End'){ e.preventDefault(); CTX.items[n-1]?.focus(); }
}, true);
// the keyboard's Menu key (or Shift+F10) opens the menu for the selected layer
window.addEventListener('keydown', e => {
  if (CTX.el || typing() || tab==='collage' || tab==='crop' || !S.base) return;
  if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')){
    const l = getSel(); if (!l) return;
    e.preventDefault();
    const c = layerCentreClient(l); openCtx(layerMenu(l, null), c.x, c.y);
  }
});
// Ctrl+C on a selected layer copies the layer
window.addEventListener('copy', e => {
  if (typing() || tab==='collage' || !selId || String(window.getSelection())) return;
  const l = getSel(); if (!l) return;
  e.preventDefault(); e.clipboardData.setData('text/plain', CLIP_MARK);
  layerClip = clone(l); toast(`Copied ${layerName(l)}. Paste with ${kbd('Ctrl+V')}.`);
});

loadMyStickers();
