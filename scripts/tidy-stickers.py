"""Tidies cut-out stickers: keeps the drawing, throws away leftover background and specks around it,
and gives it a fresh, even white die-cut border.
Run: python3 scripts/tidy-stickers.py IN_DIR OUT_DIR"""
import glob, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd


def box(a, r):
    return nd.uniform_filter(a.astype(np.float32), size=2 * r + 1, mode='nearest')


def tidy(im):
    a = np.array(im.convert('RGBA')).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    lum = rgb.mean(2)
    neutral = (rgb.max(2) - rgb.min(2)) < 30
    # the drawing: anything visible that isn't white border or grey check pattern
    art = (alpha > 128) & ~(neutral & (lum > 195))
    art = nd.binary_closing(art, iterations=1)
    # white-bodied drawings with small gaps in their outline: close the gaps just to find the inside
    closed = nd.binary_closing(np.pad(art, 6), iterations=6)[6:-6, 6:-6]
    art = art | (nd.binary_fill_holes(closed) & (alpha > 128))
    art = nd.binary_fill_holes(art)
    if art.sum() < 30:
        return im
    # drop specks: keep big parts, and small parts that sit right next to a big one
    lab, n = nd.label(art, structure=np.ones((3, 3)))
    sizes = nd.sum(art, lab, range(1, n + 1))
    big = max(sizes)
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 0.05 * big])
    near = nd.distance_transform_edt(~keep) <= 2.5
    small = [i + 1 for i, s in enumerate(sizes) if s < 0.05 * big and s >= 4 and near[lab == i + 1].any()]
    art = keep | np.isin(lab, small)
    art = nd.binary_fill_holes(art)

    # border width: how far the original white border reached past the drawing (typical value)
    d = nd.distance_transform_edt(~art)
    edge = (alpha > 128) & ~nd.binary_erosion(alpha > 128)
    ring = d[edge & (d > 0) & (d < 20)]
    R = float(np.clip(np.median(ring) if ring.size else 5, 3.5, 8))

    # new sticker: drawing as it was, then a clean white band of width R with a soft edge
    pad = int(np.ceil(R)) + 2
    H, W = art.shape
    big_art = np.zeros((H + 2 * pad, W + 2 * pad), bool); big_art[pad:pad + H, pad:pad + W] = art
    D = nd.distance_transform_edt(~big_art)
    new_a = np.clip(R + 0.5 - D, 0, 1)
    out = np.zeros((H + 2 * pad, W + 2 * pad, 4), np.float32)
    out[..., :3] = 255
    inner = big_art
    src = np.zeros_like(out); src[pad:pad + H, pad:pad + W] = a
    out[inner, :3] = src[inner, :3]
    # soften the join between drawing and border by one pixel
    edge_px = inner & ~nd.binary_erosion(inner)
    out[edge_px, :3] = 0.65 * src[edge_px, :3] + 0.35 * 255
    out[..., 3] = new_a * 255
    out[inner, 3] = src[inner, 3]          # see-through gaps inside a drawing stay see-through
    res = Image.fromarray(out.round().clip(0, 255).astype(np.uint8), 'RGBA')
    return res.crop(res.getbbox())


if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(src, '*.png'))):
        tidy(Image.open(f)).save(os.path.join(dst, os.path.basename(f)))
