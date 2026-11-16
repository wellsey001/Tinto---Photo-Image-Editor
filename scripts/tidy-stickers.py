"""Tidies cut-out stickers: keeps only the drawing (up to its own outline), throws away the old
white border, sketchy rim lines, leftover background and specks around it, and gives it one
thin, even white die-cut edge.
Run: python3 scripts/tidy-stickers.py IN_DIR OUT_DIR"""
import glob, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

CROSS = nd.generate_binary_structure(2, 1)


def fill_holes(m):
    return nd.binary_fill_holes(m)


def close(m, r):
    return nd.binary_closing(np.pad(m, r + 1), structure=CROSS, iterations=r)[r + 1:-r - 1, r + 1:-r - 1]


def tidy(im, border=None):
    a = np.array(im.convert('RGBA')).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    H, W = alpha.shape
    lum = rgb.mean(2)
    neutral = (rgb.max(2) - rgb.min(2)) < 30
    solid = alpha > 128
    # anything visible that isn't white (old border) or pale grey (check pattern)
    ink = solid & ~(neutral & (lum > 195))
    # thin lines (the sketchy rim some sheets draw outside the white border) vanish under opening;
    # the drawing and its proper outline are thicker and survive
    thick = nd.binary_opening(ink, structure=CROSS, iterations=1)
    lab, n = nd.label(thick, structure=np.ones((3, 3)))
    if n == 0:
        return im
    sizes = nd.sum(thick, lab, range(1, n + 1))
    big = sizes.max()
    # grow outwards from the biggest part: keep parts that sit close to what is already kept
    core = lab == (int(np.argmax(sizes)) + 1)
    pending = set(range(1, n + 1)) - {int(np.argmax(sizes)) + 1}
    while True:
        near = nd.distance_transform_edt(~core)
        added = [i for i in pending if sizes[i - 1] >= 6 and near[lab == i].min() <= (8 if sizes[i - 1] >= 0.04 * big else 3)]
        if not added:
            break
        core |= np.isin(lab, added); pending -= set(added)
    # the inside of the drawing (white faces, bodies) counts too, even where its outline has small gaps
    body = fill_holes(close(core, 6)) & solid
    body |= fill_holes(core)
    # put back fine detail and anti-aliased edge pixels hugging the drawing (but not a rim further out)
    body |= ink & (nd.distance_transform_edt(~body) <= 1.5)
    body = fill_holes(body)
    if body.sum() < 30:
        return im

    # one thin, even white edge
    R = border if border else max(2.5, 0.022 * max(H, W))
    pad = int(np.ceil(R)) + 2
    big_body = np.zeros((H + 2 * pad, W + 2 * pad), bool); big_body[pad:pad + H, pad:pad + W] = body
    D = nd.distance_transform_edt(~big_body)
    out = np.zeros((H + 2 * pad, W + 2 * pad, 4), np.float32)
    out[..., :3] = 255
    out[..., 3] = np.clip(R + 0.5 - D, 0, 1) * 255
    src = np.zeros_like(out); src[pad:pad + H, pad:pad + W] = a
    out[big_body, :3] = src[big_body, :3]
    out[big_body, 3] = src[big_body, 3]          # see-through gaps inside a drawing stay see-through
    rim = big_body & ~nd.binary_erosion(big_body)
    out[rim, :3] = 0.7 * src[rim, :3] + 0.3 * 255
    res = Image.fromarray(out.round().clip(0, 255).astype(np.uint8), 'RGBA')
    return res.crop(res.getbbox())


if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(src, '*.png'))):
        tidy(Image.open(f)).save(os.path.join(dst, os.path.basename(f)))
