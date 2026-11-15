"""Run: python3 scripts/make-stickers.py  (writes src/renderer/stickerpack.js)
Generates Tinto's illustrated sticker pack as SVG files (200x200 each).
One shared style: a deep plum outline, bright fills with soft gradients, white glints and kawaii faces."""
import json, math, os, sys

OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'renderer', 'stickerpack.js')
O = '#2a1e33'          # outline
SW = 5                 # outline width

def svg(body, defs=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">'
            f'<defs>{defs}</defs>'
            f'<g stroke-linejoin="round" stroke-linecap="round">{body}</g></svg>')

def lg(id, a, b, x1=0, y1=0, x2=0, y2=1):
    return f'<linearGradient id="{id}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>'

def rg(id, a, b, cx=.35, cy=.3, r=.8):
    return f'<radialGradient id="{id}" cx="{cx}" cy="{cy}" r="{r}"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></radialGradient>'

def face(cx, cy, s=1.0, mood='smile', blush=True):
    e = 13*s
    out = ''
    if mood == 'sleep':
        for dx in (-e, e):
            out += f'<path d="M{cx+dx-5*s} {cy} Q{cx+dx} {cy+5*s} {cx+dx+5*s} {cy}" fill="none" stroke="{O}" stroke-width="{3.4*s}"/>'
    elif mood == 'wink':
        out += f'<circle cx="{cx-e}" cy="{cy}" r="{5*s}" fill="{O}"/><circle cx="{cx-e+1.8*s}" cy="{cy-1.8*s}" r="{1.7*s}" fill="#fff"/>'
        out += f'<path d="M{cx+e-5*s} {cy+1*s} Q{cx+e} {cy-4*s} {cx+e+5*s} {cy+1*s}" fill="none" stroke="{O}" stroke-width="{3.4*s}"/>'
    else:
        for dx in (-e, e):
            out += f'<circle cx="{cx+dx}" cy="{cy}" r="{5*s}" fill="{O}"/><circle cx="{cx+dx+1.8*s}" cy="{cy-1.8*s}" r="{1.7*s}" fill="#fff"/>'
    if mood in ('smile', 'wink', 'sleep'):
        out += f'<path d="M{cx-6*s} {cy+8*s} Q{cx} {cy+14*s} {cx+6*s} {cy+8*s}" fill="none" stroke="{O}" stroke-width="{3.4*s}"/>'
    elif mood == 'open':
        out += f'<path d="M{cx-7*s} {cy+7*s} Q{cx} {cy+19*s} {cx+7*s} {cy+7*s} Z" fill="#ff5d7a" stroke="{O}" stroke-width="{3*s}"/>'
    if blush:
        for dx in (-e-9*s, e+9*s):
            out += f'<ellipse cx="{cx+dx}" cy="{cy+8*s}" rx="{6*s}" ry="{3.6*s}" fill="#ff7aa2" opacity=".55"/>'
    return out

def glint(x, y, s=1.0, rot=-35):
    return (f'<g transform="translate({x} {y}) rotate({rot})" fill="#fff" opacity=".85">'
            f'<ellipse cx="0" cy="0" rx="{11*s}" ry="{5*s}"/><circle cx="{17*s}" cy="0" r="{3*s}"/></g>')

def union(shapes, fill, extra_fill=''):
    """Several shapes drawn as one outlined blob: thick outlines first, fills on top."""
    o = ''.join(f'<{t} {a} fill="{O}" stroke="{O}" stroke-width="{SW*2}"/>' for t, a in shapes)
    f = ''.join(f'<{t} {a} fill="{fill}"/>' for t, a in shapes)
    return o + f + extra_fill

def star4(cx, cy, r, fill, rot=0, w=.28):
    k = r*w
    return (f'<path transform="translate({cx} {cy}) rotate({rot})" d="M0 {-r} C{k*.6} {-k} {k} {-k*.6} {r} 0 C{k} {k*.6} {k*.6} {k} 0 {r} '
            f'C{-k*.6} {k} {-k} {k*.6} {-r} 0 C{-k} {-k*.6} {-k*.6} {-k} 0 {-r} Z" fill="{fill}" stroke="{O}" stroke-width="{SW*.8}"/>')

def heart_path(cx, cy, s):
    # a plump heart, centred near cx, cy
    p = lambda x, y: f'{cx + x*s:.1f} {cy + y*s:.1f}'
    return (f'M{p(0,38)} C{p(-30,18)} {p(-52,0)} {p(-52,-18)} C{p(-52,-38)} {p(-34,-50)} {p(-18,-50)} '
            f'C{p(-6,-50)} {p(0,-42)} {p(0,-34)} C{p(0,-42)} {p(6,-50)} {p(18,-50)} '
            f'C{p(34,-50)} {p(52,-38)} {p(52,-18)} C{p(52,0)} {p(30,18)} {p(0,38)} Z')

S = {}   # id -> (category, name, svg)

# ---------------- Food ----------------
sprinkles = ''.join(
    f'<rect x="-6" y="-2" width="12" height="4.5" rx="2.2" fill="{c}" transform="translate({x} {y}) rotate({r})"/>'
    for x, y, r, c in [(68,72,30,'#74c7ff'),(84,60,-20,'#ffd54a'),(120,62,40,'#6fe3b5'),(134,80,-35,'#ffffff'),
                       (62,100,70,'#ffd54a'),(140,104,15,'#b69cff'),(112,52,-60,'#ff9f43'),(78,118,-10,'#6fe3b5')])
S['donut'] = ('food', 'Donut', svg(
    f'<circle cx="100" cy="104" r="72" fill="url(#dough)" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M38 96 C40 60 66 38 100 38 C134 38 160 60 162 96 C160 112 150 108 146 120 C142 132 130 126 126 136 C120 148 108 138 100 146 C92 138 80 148 74 136 C70 126 58 132 54 120 C50 108 40 112 38 96 Z" fill="url(#icing)" stroke="{O}" stroke-width="{SW}"/>'
    f'<ellipse cx="100" cy="86" rx="20" ry="16" fill="#d98b45" stroke="{O}" stroke-width="{SW}"/>'
    + sprinkles + glint(70, 58, .9) + face(100, 118, .85),
    lg('dough', '#f7c47f', '#e0954a') + lg('icing', '#ffb3cc', '#ff7aa8')))

S['icecream'] = ('food', 'Ice cream', svg(
    f'<path d="M66 112 L134 112 L100 190 Z" fill="url(#cone)" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M78 124 L112 168 M94 124 L118 154 M110 124 L124 140 M122 124 L88 168 M106 124 L82 154 M90 124 L76 140" stroke="#c4802f" stroke-width="3" fill="none"/>'
    + union([('path', 'd="M52 112 C46 72 72 44 100 44 C128 44 154 72 148 112 Z"')], 'url(#scoop)')
    + f'<path d="M50 110 Q58 128 66 112 Q74 126 82 112 Q92 130 100 112 Q110 128 118 112 Q126 126 134 112 Q142 128 150 110" fill="url(#scoop)" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M100 44 C104 30 110 24 118 22" fill="none" stroke="{O}" stroke-width="4"/>'
    f'<circle cx="100" cy="40" r="12" fill="url(#cherry)" stroke="{O}" stroke-width="{SW}"/>'
    + glint(70, 72, .85) + glint(94, 34, .35) + face(100, 88, .85),
    lg('cone', '#ffd08a', '#e9a04e') + lg('scoop', '#c6f2df', '#7ee0b8') + rg('cherry', '#ff7a8a', '#e01e4b')))

av_out = 'M100 18 C132 18 152 58 160 108 C168 160 140 190 100 190 C60 190 32 160 40 108 C48 58 68 18 100 18 Z'
S['avocado'] = ('food', 'Avocado', svg(
    f'<path d="{av_out}" fill="#3f8a3a" stroke="{O}" stroke-width="{SW}"/>'
    f'<path transform="translate(100 112) scale(.82) translate(-100 -112)" d="{av_out}" fill="url(#flesh)"/>'
    f'<circle cx="100" cy="134" r="31" fill="url(#pit)" stroke="{O}" stroke-width="{SW}"/>'
    + glint(88, 122, .6) + glint(78, 52, .6) + face(100, 84, .8),
    lg('flesh', '#eaf8a2', '#b8e06a') + rg('pit', '#c98a55', '#7f4a24')))

S['coffee'] = ('food', 'Coffee', svg(
    f'<path d="M58 80 H142 L132 174 Q130 184 120 184 H80 Q70 184 68 174 Z" fill="#fff6e8" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M62 114 H138 L134 150 H66 Z" fill="url(#sleeve)" stroke="{O}" stroke-width="{SW}"/>'
    f'<rect x="80" y="44" width="40" height="18" rx="7" fill="#ff8fb1" stroke="{O}" stroke-width="{SW}"/>'
    f'<rect x="48" y="58" width="104" height="26" rx="12" fill="url(#lid)" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M86 30 C80 22 92 16 86 8 M106 32 C100 24 112 18 106 10" fill="none" stroke="#b9a6c9" stroke-width="4" opacity=".8"/>'
    + glint(70, 70, .7) + face(100, 128, .8, mood='smile'),
    lg('sleeve', '#d99a66', '#a8693a') + lg('lid', '#ffb3cc', '#ff7aa8')))

seeds = ''.join(f'<ellipse cx="{x}" cy="{y}" rx="2.6" ry="4" fill="#ffe27a" transform="rotate({r} {x} {y})"/>'
                for x, y, r in [(70,100,-20),(130,100,20),(84,150,-10),(116,150,10),(100,170,0),(62,128,-25),(138,128,25),(100,104,0)])
S['strawberry'] = ('food', 'Strawberry', svg(
    f'<path d="M100 188 C58 172 32 130 38 96 C44 66 74 58 100 66 C126 58 156 66 162 96 C168 130 142 172 100 188 Z" fill="url(#berry)" stroke="{O}" stroke-width="{SW}"/>'
    + seeds +
    f'<path d="M100 72 L78 52 L92 56 L84 34 L100 50 L116 34 L108 56 L122 52 Z" fill="#5cc96b" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M100 50 L100 30" stroke="{O}" stroke-width="5"/>'
    + glint(64, 96, .75) + face(100, 124, .85),
    lg('berry', '#ff6f8a', '#e11d48')))

S['cupcake'] = ('food', 'Cupcake', svg(
    f'<path d="M56 116 H144 L132 184 H68 Z" fill="url(#wrap)" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M78 120 L82 180 M100 120 L100 180 M122 120 L118 180" stroke="#4aa3e0" stroke-width="4"/>'
    + union([('circle', 'cx="68" cy="112" r="22"'), ('circle', 'cx="132" cy="112" r="22"'),
             ('circle', 'cx="100" cy="98" r="32"'), ('circle', 'cx="100" cy="66" r="24"')], 'url(#frost)')
    + sprinkles.replace('translate(', 'translate(0 0) translate(') +
    f'<circle cx="100" cy="40" r="11" fill="url(#cherry2)" stroke="{O}" stroke-width="{SW}"/>'
    + glint(78, 62, .7) + face(100, 104, .85, mood='open'),
    lg('wrap', '#9ad8ff', '#5ab4f0') + lg('frost', '#fff7fb', '#ffd3e6') + rg('cherry2', '#ff7a8a', '#e01e4b')))

# ---------------- Summer ----------------
rays = ''.join(
    f'<path d="M{100+math.cos(a)*62:.1f} {100+math.sin(a)*62:.1f} L{100+math.cos(a+0.17)*92:.1f} {100+math.sin(a+0.17)*92:.1f} L{100+math.cos(a+0.34)*62:.1f} {100+math.sin(a+0.34)*62:.1f} Z" fill="#ffb02e" stroke="{O}" stroke-width="{SW*.8}"/>'
    for a in [i*math.pi/6 for i in range(12)])
S['sun'] = ('summer', 'Sun', svg(
    rays + f'<circle cx="100" cy="100" r="60" fill="url(#sunf)" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M58 88 H96 Q98 112 80 114 Q60 114 58 88 Z M104 88 H142 Q140 114 120 114 Q102 112 104 88 Z" fill="#2a1e33"/>'
    f'<path d="M94 92 Q100 86 106 92" fill="none" stroke="{O}" stroke-width="4"/>'
    f'<path d="M66 94 L74 104 M112 94 L120 104" stroke="#fff" stroke-width="3" opacity=".7"/>'
    f'<path d="M84 128 Q100 142 116 128" fill="none" stroke="{O}" stroke-width="4"/>'
    f'<ellipse cx="68" cy="124" rx="7" ry="4" fill="#ff7aa2" opacity=".55"/><ellipse cx="132" cy="124" rx="7" ry="4" fill="#ff7aa2" opacity=".55"/>'
    + glint(78, 62, .7),
    rg('sunf', '#fff1a6', '#ffcc33')))

S['watermelon'] = ('summer', 'Watermelon', svg(
    f'<path d="M24 66 H176 A76 76 0 0 1 24 66 Z" fill="#4fbf5a" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M36 66 H164 A64 64 0 0 1 36 66 Z" fill="#f2ffe8"/>'
    f'<path d="M44 66 H156 A56 56 0 0 1 44 66 Z" fill="url(#melon)"/>'
    + ''.join(f'<path d="M{x} {y} q3 7 0 10 q-3 -3 0 -10 Z" fill="{O}"/>' for x, y in [(70,84),(130,84),(84,104),(116,104),(100,116),(56,74),(144,74)])
    + face(100, 84, .8) + glint(62, 72, .5, rot=0),
    lg('melon', '#ff7a8a', '#ff4d6d')))

grid = ''.join(f'<path d="M{55+i*18} 70 L{55+i*18+40} 180" stroke="#e8a21e" stroke-width="3" opacity=".8"/><path d="M{145-i*18} 70 L{145-i*18-40} 180" stroke="#e8a21e" stroke-width="3" opacity=".8"/>' for i in range(5))
S['pineapple'] = ('summer', 'Pineapple', svg(
    f'<path d="M100 76 L82 30 L96 48 L92 14 L106 44 L118 18 L114 52 L132 34 L112 78 Z" fill="url(#leaf)" stroke="{O}" stroke-width="{SW}"/>'
    f'<clipPath id="pc"><ellipse cx="100" cy="128" rx="48" ry="60"/></clipPath>'
    f'<ellipse cx="100" cy="128" rx="48" ry="60" fill="url(#pine)" stroke="{O}" stroke-width="{SW}"/>'
    f'<g clip-path="url(#pc)">{grid}</g>'
    f'<ellipse cx="100" cy="128" rx="48" ry="60" fill="none" stroke="{O}" stroke-width="{SW}"/>'
    + glint(74, 96, .65) + face(100, 128, .85),
    lg('leaf', '#7ee08a', '#2f9e4a') + lg('pine', '#ffe17a', '#ffb52e')))

S['beachball'] = ('summer', 'Beach ball', svg(
    f'<clipPath id="bb"><circle cx="100" cy="100" r="74"/></clipPath>'
    f'<circle cx="100" cy="100" r="74" fill="#ffffff"/>'
    f'<g clip-path="url(#bb)">'
    f'<path d="M100 26 C60 50 52 150 100 174 L20 174 L20 26 Z" fill="#ff5d7a"/>'
    f'<path d="M100 26 C140 50 148 150 100 174 L180 174 L180 26 Z" fill="#4fb6ff"/>'
    f'<path d="M100 26 C84 60 84 140 100 174 C116 140 116 60 100 26 Z" fill="#ffd54a"/>'
    f'<path d="M100 26 C60 50 52 150 100 174 M100 26 C140 50 148 150 100 174 M100 26 C84 60 84 140 100 174 M100 26 C116 60 116 140 100 174" fill="none" stroke="{O}" stroke-width="3.5"/>'
    f'</g><circle cx="100" cy="100" r="74" fill="url(#ballshade)" stroke="{O}" stroke-width="{SW}"/>'
    f'<ellipse cx="100" cy="30" rx="12" ry="7" fill="#fff" stroke="{O}" stroke-width="3.5"/>'
    + glint(64, 62, .9),
    rg('ballshade', 'rgba(255,255,255,0)', 'rgba(42,30,51,.22)', cx=.4, cy=.35, r=.75)))

S['lolly'] = ('summer', 'Ice lolly', svg(
    f'<rect x="90" y="140" width="20" height="50" rx="10" fill="#e6b47a" stroke="{O}" stroke-width="{SW}"/>'
    f'<clipPath id="lc"><path d="M56 70 A44 44 0 0 1 144 70 V140 Q144 152 132 152 H68 Q56 152 56 140 Z"/></clipPath>'
    f'<g clip-path="url(#lc)"><rect x="50" y="20" width="100" height="140" fill="#ff8fb1"/><rect x="50" y="96" width="100" height="70" fill="#ffb02e"/>'
    f'<path d="M50 96 Q62 108 74 96 Q86 108 98 96 Q110 108 122 96 Q134 108 146 96 V100 H50 Z" fill="#ff8fb1"/></g>'
    f'<path d="M56 70 A44 44 0 0 1 144 70 V140 Q144 152 132 152 H68 Q56 152 56 140 Z" fill="none" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M144 62 A20 20 0 0 1 124 34 A44 44 0 0 1 144 62 Z" fill="#ffffff" stroke="{O}" stroke-width="{SW*.7}"/>'
    + glint(72, 58, .7) + face(100, 112, .85, mood='wink')))

# ---------------- Love ----------------
S['heartface'] = ('love', 'Happy heart', svg(
    f'<path d="{heart_path(100, 112, 1.55)}" fill="url(#heart1)" stroke="{O}" stroke-width="{SW}"/>'
    + glint(60, 62, 1) + face(100, 106, 1.05),
    lg('heart1', '#ff8fb1', '#ff3b6b')))

S['letter'] = ('love', 'Love letter', svg(
    f'<rect x="28" y="56" width="144" height="100" rx="12" fill="url(#paper)" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M30 62 L100 116 L170 62" fill="none" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M30 150 L82 104 M170 150 L118 104" stroke="{O}" stroke-width="4" opacity=".6"/>'
    f'<path d="{heart_path(100, 116, .5)}" fill="#ff3b6b" stroke="{O}" stroke-width="4"/>'
    + glint(50, 70, .55, rot=0),
    lg('paper', '#fffaf0', '#ffe8d1')))

S['heartballoon'] = ('love', 'Heart balloon', svg(
    f'<path d="M100 150 C96 166 108 176 100 194" fill="none" stroke="{O}" stroke-width="3.5"/>'
    f'<path d="M92 156 L108 156 L100 146 Z" fill="#e01e4b" stroke="{O}" stroke-width="3.5"/>'
    f'<path d="{heart_path(100, 92, 1.45)}" fill="url(#hb)" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M58 60 Q60 44 76 40" fill="none" stroke="#fff" stroke-width="7" opacity=".85"/>'
    f'<circle cx="84" cy="38" r="3.5" fill="#fff" opacity=".85"/>',
    lg('hb', '#ff7a8a', '#e01e4b')))

S['lips'] = ('love', 'Kiss', svg(
    f'<path d="M24 100 C40 66 74 62 100 82 C126 62 160 66 176 100 C150 150 50 150 24 100 Z" fill="url(#lip)" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M30 100 Q100 116 170 100" fill="none" stroke="{O}" stroke-width="4"/>'
    f'<path d="M60 124 Q82 134 96 128" fill="none" stroke="#fff" stroke-width="6" opacity=".7"/>'
    f'<path d="M58 84 Q70 76 84 80" fill="none" stroke="#fff" stroke-width="5" opacity=".7"/>',
    lg('lip', '#ff6f91', '#d6194f')))

S['twohearts'] = ('love', 'Two hearts', svg(
    f'<g transform="rotate(-14 76 96)"><path d="{heart_path(76, 98, 1.0)}" fill="url(#h2a)" stroke="{O}" stroke-width="{SW}"/></g>'
    f'<g transform="rotate(12 128 116)"><path d="{heart_path(128, 118, 1.05)}" fill="url(#h2b)" stroke="{O}" stroke-width="{SW}"/></g>'
    + glint(56, 70, .6) + glint(112, 92, .6) + star4(160, 50, 14, '#ffd54a') + star4(36, 156, 10, '#ffd54a', rot=15),
    lg('h2a', '#d4b8ff', '#9a72ff') + lg('h2b', '#ff9fc0', '#ff4f86')))

# ---------------- Party ----------------
def balloon(cx, cy, rx, ry, g):
    return (f'<path d="M{cx} {cy+ry} L{cx-7} {cy+ry+10} L{cx+7} {cy+ry+10} Z" fill="#2a1e33"/>'
            f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="url(#{g})" stroke="{O}" stroke-width="{SW}"/>'
            f'<path d="M{cx-rx*.55} {cy-ry*.35} Q{cx-rx*.45} {cy-ry*.75} {cx-rx*.1} {cy-ry*.8}" fill="none" stroke="#fff" stroke-width="6" opacity=".85"/>')
S['balloons'] = ('party', 'Balloons', svg(
    f'<path d="M64 112 Q78 150 100 190 M100 98 Q96 150 100 190 M138 108 Q120 150 100 190" fill="none" stroke="{O}" stroke-width="3"/>'
    + balloon(64, 70, 34, 42, 'b1') + balloon(138, 66, 34, 42, 'b2') + balloon(100, 54, 36, 44, 'b3'),
    lg('b1', '#8fd3ff', '#3b9ef5') + lg('b2', '#ffe27a', '#ffb52e') + lg('b3', '#ff8fb1', '#ff3b6b')))

S['partyhat'] = ('party', 'Party hat', svg(
    f'<clipPath id="ph"><path d="M100 22 L156 168 Q100 186 44 168 Z"/></clipPath>'
    f'<path d="M100 22 L156 168 Q100 186 44 168 Z" fill="url(#hat)"/>'
    f'<g clip-path="url(#ph)">' + ''.join(f'<path d="M30 {60+i*34} L170 {30+i*34} L170 {44+i*34} L30 {74+i*34} Z" fill="#ffd54a"/>' for i in range(5)) + '</g>'
    + ''.join(f'<circle cx="{x}" cy="{y}" r="4.5" fill="#fff"/>' for x, y in [(96,74),(112,104),(86,128),(124,148),(74,158)]) +
    f'<path d="M100 22 L156 168 Q100 186 44 168 Z" fill="none" stroke="{O}" stroke-width="{SW}"/>'
    + union([('circle', 'cx="100" cy="22" r="14"'), ('circle', 'cx="88" cy="16" r="9"'), ('circle', 'cx="112" cy="16" r="9"')], '#ff5d7a'),
    lg('hat', '#b69cff', '#7b55f0')))

S['gift'] = ('party', 'Gift', svg(
    f'<rect x="38" y="92" width="124" height="90" rx="10" fill="url(#box)" stroke="{O}" stroke-width="{SW}"/>'
    f'<rect x="88" y="92" width="24" height="90" fill="#ffd54a" stroke="{O}" stroke-width="{SW*.8}"/>'
    f'<rect x="28" y="70" width="144" height="32" rx="9" fill="url(#boxlid)" stroke="{O}" stroke-width="{SW}"/>'
    f'<rect x="88" y="70" width="24" height="32" fill="#ffd54a" stroke="{O}" stroke-width="{SW*.8}"/>'
    f'<path d="M100 70 C80 40 52 44 60 62 C66 74 88 72 100 70 Z" fill="#ffd54a" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M100 70 C120 40 148 44 140 62 C134 74 112 72 100 70 Z" fill="#ffd54a" stroke="{O}" stroke-width="{SW}"/>'
    + glint(52, 110, .55, rot=0) + face(64, 138, .62, blush=False),
    lg('box', '#6fe3b5', '#2bbf86') + lg('boxlid', '#8af0c8', '#3fd09a')))

S['cake'] = ('party', 'Cake slice', svg(
    f'<path d="M30 112 L170 76 L170 150 L30 184 Z" fill="url(#sponge)" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M30 140 L170 106 L170 118 L30 152 Z" fill="#ff8fb1"/>'
    f'<path d="M30 112 L170 76 L148 62 L30 92 Z" fill="#fff4f8" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M30 112 Q40 124 48 108 Q58 122 68 102 Q78 116 88 98 Q98 112 108 92 Q118 106 128 88 Q138 102 148 82 Q158 96 170 76" fill="#fff4f8" stroke="{O}" stroke-width="{SW*.8}"/>'
    f'<path d="M30 112 L170 76 L170 150 L30 184 Z" fill="none" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M126 70 C128 52 136 44 146 40" fill="none" stroke="{O}" stroke-width="4"/>'
    f'<circle cx="124" cy="70" r="13" fill="url(#cherry3)" stroke="{O}" stroke-width="{SW}"/>'
    + glint(118, 64, .3) + face(96, 146, .75),
    lg('sponge', '#ffe7b0', '#f4c272') + rg('cherry3', '#ff7a8a', '#e01e4b')))

tiles = ''.join(f'<rect x="{x}" y="{y}" width="14" height="14" fill="{c}" opacity=".9"/>'
                for i, (x, y) in enumerate([(x, y) for y in range(28, 172, 16) for x in range(28, 172, 16)])
                for c in [['#e9eef6', '#b8c3d6', '#ffffff', '#9aa8bf', '#d6def0', '#c7b8ff'][(i*7) % 6]])
S['disco'] = ('party', 'Disco ball', svg(
    f'<path d="M100 2 V28" stroke="{O}" stroke-width="4"/>'
    f'<clipPath id="db"><circle cx="100" cy="104" r="72"/></clipPath>'
    f'<circle cx="100" cy="104" r="72" fill="#c9d2e3"/>'
    f'<g clip-path="url(#db)" transform="translate(0 4)">{tiles}</g>'
    f'<circle cx="100" cy="104" r="72" fill="url(#discoshade)" stroke="{O}" stroke-width="{SW}"/>'
    + star4(70, 72, 16, '#ffffff', w=.2) + star4(150, 40, 14, '#ffd54a') + star4(40, 150, 11, '#ff8fb1'),
    rg('discoshade', 'rgba(255,255,255,.35)', 'rgba(42,30,51,.35)', cx=.35, cy=.3, r=.8)))

conf = ''.join(
    f'<rect x="-6" y="-3" width="12" height="6" rx="2" fill="{c}" stroke="{O}" stroke-width="2.5" transform="translate({x} {y}) rotate({r})"/>'
    for x, y, r, c in [(96,44,20,'#ff5d7a'),(130,30,-30,'#ffd54a'),(150,64,50,'#4fb6ff'),(118,72,-15,'#6fe3b5'),(160,100,10,'#b69cff'),(72,30,-50,'#6fe3b5')])
S['popper'] = ('party', 'Party popper', svg(
    f'<path d="M30 176 L62 92 L114 144 Z" fill="url(#pop)" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M46 134 L80 150 M38 156 L62 166 M54 112 L96 134" stroke="#ffd54a" stroke-width="7"/>'
    f'<path d="M30 176 L62 92 L114 144 Z" fill="none" stroke="{O}" stroke-width="{SW}"/>'
    f'<ellipse cx="88" cy="118" rx="12" ry="37" transform="rotate(-45 88 118)" fill="#ff8fb1" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M98 100 Q106 70 92 52 M108 110 Q140 96 160 120 M104 104 Q128 70 150 46" fill="none" stroke="#ff9f43" stroke-width="4"/>'
    + conf + star4(176, 40, 12, '#ffd54a') + star4(60, 60, 9, '#ffd54a', rot=20),
    lg('pop', '#b69cff', '#7b55f0')))

# ---------------- Dreamy ----------------
def wing(d, g):
    return f'<path d="{d}" fill="url(#{g})" stroke="{O}" stroke-width="{SW}"/>'
S['butterfly'] = ('dreamy', 'Butterfly', svg(
    wing('M98 96 C70 40 22 34 22 70 C22 100 60 108 98 104 Z', 'w1') + wing('M102 96 C130 40 178 34 178 70 C178 100 140 108 102 104 Z', 'w1')
    + wing('M98 106 C64 108 40 130 52 156 C64 176 92 150 98 116 Z', 'w2') + wing('M102 106 C136 108 160 130 148 156 C136 176 108 150 102 116 Z', 'w2')
    + ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff" opacity=".85"/>' for x, y, r in [(50,66,8),(150,66,8),(70,140,5),(130,140,5),(64,86,4),(136,86,4)])
    + f'<rect x="91" y="70" width="18" height="96" rx="9" fill="#2a1e33"/>'
    f'<path d="M96 72 C88 48 76 40 66 40 M104 72 C112 48 124 40 134 40" fill="none" stroke="{O}" stroke-width="4"/>'
    f'<circle cx="66" cy="40" r="5" fill="{O}"/><circle cx="134" cy="40" r="5" fill="{O}"/>',
    lg('w1', '#c9b2ff', '#8b63ff', 0, 0, 1, 1) + lg('w2', '#ffb3d1', '#ff6fa6', 0, 0, 1, 1)))

S['rainbow'] = ('dreamy', 'Rainbow', svg(
    ''.join(f'<path d="M{100-r} 140 A{r} {r} 0 0 1 {100+r} 140" fill="none" stroke="{O}" stroke-width="{16+SW*2}"/>' for r in [72])
    + ''.join(f'<path d="M{100-r} 140 A{r} {r} 0 0 1 {100+r} 140" fill="none" stroke="{c}" stroke-width="13"/>'
              for r, c in [(72,'#ff5d7a'),(59,'#ffb02e'),(46,'#ffe066'),(33,'#6fe3b5')])
    + f'<path d="M20 140 A80 80 0 0 1 180 140" fill="none" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M54 140 A46 46 0 0 1 146 140" fill="none" stroke="{O}" stroke-width="0"/>'
    + union([('circle', 'cx="34" cy="144" r="20"'), ('circle', 'cx="58" cy="150" r="16"'), ('circle', 'cx="16" cy="152" r="13"'), ('rect', 'x="14" y="146" width="56" height="20" rx="10"')], '#ffffff')
    + union([('circle', 'cx="166" cy="144" r="20"'), ('circle', 'cx="142" cy="150" r="16"'), ('circle', 'cx="184" cy="152" r="13"'), ('rect', 'x="130" y="146" width="56" height="20" rx="10"')], '#ffffff')
    + face(36, 152, .5, blush=False) + face(164, 152, .5, blush=False)))

S['cloud'] = ('dreamy', 'Cloud', svg(
    union([('circle', 'cx="70" cy="104" r="38"'), ('circle', 'cx="112" cy="84" r="46"'), ('circle', 'cx="148" cy="112" r="32"'),
           ('rect', 'x="36" y="104" width="138" height="44" rx="22"')], 'url(#cl)')
    + glint(84, 72, .9) + face(106, 116, 1.0, mood='smile')
    + star4(40, 46, 13, '#ffd54a') + star4(170, 54, 10, '#ffd54a', rot=20),
    lg('cl', '#ffffff', '#cfe8ff')))

S['saturn'] = ('dreamy', 'Planet', svg(
    f'<ellipse cx="100" cy="104" rx="88" ry="26" transform="rotate(-18 100 104)" fill="none" stroke="{O}" stroke-width="{12+SW*2}"/>'
    f'<ellipse cx="100" cy="104" rx="88" ry="26" transform="rotate(-18 100 104)" fill="none" stroke="#ffb3d1" stroke-width="12"/>'
    f'<circle cx="100" cy="100" r="54" fill="url(#planet)" stroke="{O}" stroke-width="{SW}"/>'
    f'<clipPath id="fr"><rect x="0" y="104" width="200" height="100" transform="rotate(-18 100 104)"/></clipPath>'
    f'<g clip-path="url(#fr)"><ellipse cx="100" cy="104" rx="88" ry="26" transform="rotate(-18 100 104)" fill="none" stroke="{O}" stroke-width="{12+SW*2}"/>'
    f'<ellipse cx="100" cy="104" rx="88" ry="26" transform="rotate(-18 100 104)" fill="none" stroke="#ffb3d1" stroke-width="12"/></g>'
    + glint(76, 70, .7) + face(100, 98, .8)
    + star4(30, 40, 12, '#ffd54a') + star4(172, 166, 10, '#ffd54a', rot=15),
    lg('planet', '#c9b2ff', '#8b63ff')))

S['moon'] = ('dreamy', 'Sleepy moon', svg(
    f'<path d="M120 22 A78 78 0 1 0 178 128 A62 62 0 1 1 120 22 Z" fill="url(#moonf)" stroke="{O}" stroke-width="{SW}"/>'
    + face(78, 112, .9, mood='sleep')
    + star4(150, 50, 16, '#ffd54a') + star4(176, 86, 9, '#ffffff', rot=20) + star4(128, 172, 11, '#ffd54a', rot=10)
    + f'<path d="M150 18 L156 4 M162 24 L174 16" stroke="{O}" stroke-width="0"/>',
    lg('moonf', '#fff1a6', '#ffcc33')))

S['sparkles'] = ('dreamy', 'Sparkles', svg(
    star4(92, 104, 66, 'url(#sp1)', w=.22) + star4(152, 48, 30, 'url(#sp2)', w=.22) + star4(156, 150, 22, 'url(#sp3)', w=.22)
    + star4(36, 40, 14, '#ffffff', w=.22) + glint(78, 76, .5),
    lg('sp1', '#fff1a6', '#ffb02e') + lg('sp2', '#ffd1e6', '#ff6fa6') + lg('sp3', '#d6c6ff', '#8b63ff')))

# ---------------- Nature ----------------
petals = [('circle', f'cx="{100+math.cos(a)*42:.1f}" cy="{100+math.sin(a)*42:.1f}" r="30"') for a in [i*2*math.pi/6 - math.pi/2 for i in range(6)]]
S['flower'] = ('nature', 'Smiley flower', svg(
    union(petals, 'url(#pet)')
    + f'<circle cx="100" cy="100" r="36" fill="url(#ctr)" stroke="{O}" stroke-width="{SW}"/>'
    + face(100, 96, .9),
    lg('pet', '#ffb3d1', '#ff6fa6') + rg('ctr', '#fff1a6', '#ffc72e')))

S['cherries'] = ('nature', 'Cherries', svg(
    f'<path d="M66 132 C70 90 96 50 128 30 M134 128 C130 92 126 60 128 30" fill="none" stroke="#3f8a3a" stroke-width="6"/>'
    f'<path d="M128 30 C150 14 176 22 180 44 C160 54 138 50 128 30 Z" fill="url(#lf)" stroke="{O}" stroke-width="{SW}"/>'
    f'<circle cx="64" cy="146" r="34" fill="url(#ch)" stroke="{O}" stroke-width="{SW}"/>'
    f'<circle cx="136" cy="144" r="34" fill="url(#ch)" stroke="{O}" stroke-width="{SW}"/>'
    + glint(50, 132, .55) + glint(122, 130, .55) + face(64, 152, .6, blush=False) + face(136, 150, .6, mood='wink', blush=False),
    rg('ch', '#ff7a8a', '#d0103e') + lg('lf', '#8be08f', '#3f9e45')))

S['mushroom'] = ('nature', 'Mushroom', svg(
    f'<path d="M70 108 Q66 170 76 182 H124 Q134 170 130 108 Z" fill="url(#stem)" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M20 112 C20 52 60 26 100 26 C140 26 180 52 180 112 Q100 126 20 112 Z" fill="url(#cap)" stroke="{O}" stroke-width="{SW}"/>'
    + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#fff"/>' for x, y, rx, ry in [(64,70,13,10),(110,52,15,11),(150,84,11,9),(92,96,9,7),(40,96,7,6)])
    + face(100, 148, .75),
    lg('cap', '#ff7a8a', '#e3264b') + lg('stem', '#fffaf0', '#f2dfc4')))

S['cactus'] = ('nature', 'Cactus', svg(
    f'<path d="M60 150 H140 L132 190 H68 Z" fill="url(#pot)" stroke="{O}" stroke-width="{SW}"/>'
    f'<rect x="54" y="138" width="92" height="18" rx="6" fill="#e07a4f" stroke="{O}" stroke-width="{SW}"/>'
    + union([('rect', 'x="78" y="34" width="44" height="112" rx="22"'), ('rect', 'x="40" y="70" width="26" height="54" rx="13"'),
             ('rect', 'x="44" y="102" width="44" height="22" rx="11"'), ('rect', 'x="134" y="56" width="26" height="54" rx="13"'),
             ('rect', 'x="112" y="88" width="44" height="22" rx="11"')], 'url(#cac)')
    + ''.join(f'<path d="M{x} {y} l5 -3" stroke="{O}" stroke-width="2.5"/>' for x, y in [(86,60),(110,74),(90,112),(52,84),(146,70),(112,128)])
    + union([('circle', 'cx="100" cy="28" r="9"'), ('circle', 'cx="90" cy="34" r="8"'), ('circle', 'cx="110" cy="34" r="8"')], '#ff8fb1')
    + face(100, 98, .7),
    lg('pot', '#ff9a6b', '#d9623a') + lg('cac', '#8be08f', '#3f9e45')))

pack = [{'id': sid, 'cat': cat, 'name': name, 'svg': body} for sid, (cat, name, body) in S.items()]
with open(OUT, 'w') as f:
    f.write('/* Generated by scripts/make-stickers.py - edit that, not this. */\n')
    f.write('window.STICKER_PACK = ' + json.dumps(pack, separators=(',', ':')) + ';\n')
print(len(pack), 'stickers ->', os.path.normpath(OUT))
