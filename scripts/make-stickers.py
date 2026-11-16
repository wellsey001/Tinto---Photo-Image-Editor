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
    + glint(52, 110, .55, rot=0) + face(63, 136, .8, blush=False),
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


def star5(cx, cy, R, r, rot=-90):
    pts = []
    for i in range(10):
        a = math.radians(rot + i * 36); rr = R if i % 2 == 0 else r
        pts.append(f'{cx + math.cos(a) * rr:.1f},{cy + math.sin(a) * rr:.1f}')
    return 'M' + ' L'.join(pts) + ' Z'

def ol(d, fill, w=SW):
    return f'<path d="{d}" fill="{fill}" stroke="{O}" stroke-width="{w}"/>'

# ---------------- Animals ----------------
S['cat'] = ('animals', 'Cat', svg(
    ol('M46 86 L40 30 L84 56 Z', 'url(#fur)') + ol('M154 86 L160 30 L116 56 Z', 'url(#fur)')
    + '<path d="M52 72 L49 44 L72 58 Z M148 72 L151 44 L128 58 Z" fill="#ffb3c7"/>'
    + f'<ellipse cx="100" cy="112" rx="70" ry="60" fill="url(#fur)" stroke="{O}" stroke-width="{SW}"/>'
    + '<path d="M82 60 Q86 74 80 84 M100 54 L100 74 M118 60 Q114 74 120 84" fill="none" stroke="#e8893a" stroke-width="7" opacity=".6"/>'
    + face(100, 116, 1.0)
    + f'<path d="M40 118 L66 122 M40 132 L66 130 M160 118 L134 122 M160 132 L134 130" stroke="{O}" stroke-width="3"/>'
    + '<path d="M95 118 L105 118 L100 124 Z" fill="#ff7aa2"/>' + glint(62, 92, .7),
    lg('fur', '#ffd9a8', '#ffb15e')))

S['bunny'] = ('animals', 'Bunny', svg(
    f'<ellipse cx="72" cy="56" rx="17" ry="46" transform="rotate(-12 72 56)" fill="url(#bfur)" stroke="{O}" stroke-width="{SW}"/>'
    f'<ellipse cx="128" cy="56" rx="17" ry="46" transform="rotate(12 128 56)" fill="url(#bfur)" stroke="{O}" stroke-width="{SW}"/>'
    '<ellipse cx="72" cy="60" rx="8" ry="32" transform="rotate(-12 72 60)" fill="#ffb3c7"/>'
    '<ellipse cx="128" cy="60" rx="8" ry="32" transform="rotate(12 128 60)" fill="#ffb3c7"/>'
    f'<ellipse cx="100" cy="132" rx="64" ry="54" fill="url(#bfur)" stroke="{O}" stroke-width="{SW}"/>'
    + face(100, 134, 1.0) + '<path d="M95 136 L105 136 L100 142 Z" fill="#ff7aa2"/>' + glint(64, 110, .7),
    lg('bfur', '#ffffff', '#f1e6f5')))

S['bear'] = ('animals', 'Bear', svg(
    f'<circle cx="52" cy="58" r="24" fill="url(#bear)" stroke="{O}" stroke-width="{SW}"/><circle cx="148" cy="58" r="24" fill="url(#bear)" stroke="{O}" stroke-width="{SW}"/>'
    '<circle cx="52" cy="58" r="12" fill="#e7a873"/><circle cx="148" cy="58" r="12" fill="#e7a873"/>'
    f'<ellipse cx="100" cy="112" rx="72" ry="66" fill="url(#bear)" stroke="{O}" stroke-width="{SW}"/>'
    f'<ellipse cx="100" cy="134" rx="30" ry="22" fill="#f6d6b3" stroke="{O}" stroke-width="3.5"/>'
    + f'<ellipse cx="100" cy="124" rx="9" ry="6.5" fill="{O}"/>'
    f'<path d="M100 130 V138 M100 138 Q92 146 86 140 M100 138 Q108 146 114 140" fill="none" stroke="{O}" stroke-width="3.4"/>'
    f'<circle cx="74" cy="104" r="6" fill="{O}"/><circle cx="76" cy="102" r="2" fill="#fff"/><circle cx="126" cy="104" r="6" fill="{O}"/><circle cx="128" cy="102" r="2" fill="#fff"/>'
    '<ellipse cx="58" cy="124" rx="8" ry="5" fill="#ff7aa2" opacity=".5"/><ellipse cx="142" cy="124" rx="8" ry="5" fill="#ff7aa2" opacity=".5"/>'
    + glint(62, 82, .75),
    lg('bear', '#c98a55', '#9a5e33')))

S['panda'] = ('animals', 'Panda', svg(
    f'<circle cx="54" cy="56" r="24" fill="{O}"/><circle cx="146" cy="56" r="24" fill="{O}"/>'
    f'<ellipse cx="100" cy="112" rx="74" ry="66" fill="url(#pw)" stroke="{O}" stroke-width="{SW}"/>'
    f'<ellipse cx="70" cy="108" rx="18" ry="22" transform="rotate(25 70 108)" fill="{O}"/><ellipse cx="130" cy="108" rx="18" ry="22" transform="rotate(-25 130 108)" fill="{O}"/>'
    '<circle cx="73" cy="104" r="6.5" fill="#fff"/><circle cx="127" cy="104" r="6.5" fill="#fff"/>'
    f'<circle cx="74" cy="105" r="3.2" fill="{O}"/><circle cx="126" cy="105" r="3.2" fill="{O}"/>'
    f'<ellipse cx="100" cy="130" rx="8" ry="5.5" fill="{O}"/>'
    f'<path d="M92 140 Q100 147 108 140" fill="none" stroke="{O}" stroke-width="3.4"/>'
    '<ellipse cx="52" cy="136" rx="9" ry="5" fill="#ff7aa2" opacity=".55"/><ellipse cx="148" cy="136" rx="9" ry="5" fill="#ff7aa2" opacity=".55"/>'
    + glint(70, 74, .7),
    lg('pw', '#ffffff', '#e9eef5')))

S['frog'] = ('animals', 'Frog', svg(
    union([('circle', 'cx="62" cy="68" r="28"'), ('circle', 'cx="138" cy="68" r="28"'), ('ellipse', 'cx="100" cy="118" rx="80" ry="58"')], 'url(#frog)')
    + f'<circle cx="62" cy="66" r="16" fill="#fff" stroke="{O}" stroke-width="3.5"/><circle cx="138" cy="66" r="16" fill="#fff" stroke="{O}" stroke-width="3.5"/>'
    f'<circle cx="64" cy="68" r="9" fill="{O}"/><circle cx="140" cy="68" r="9" fill="{O}"/><circle cx="67" cy="64" r="3" fill="#fff"/><circle cx="143" cy="64" r="3" fill="#fff"/>'
    f'<path d="M70 124 Q100 150 130 124" fill="none" stroke="{O}" stroke-width="4"/>'
    '<ellipse cx="50" cy="124" rx="12" ry="7" fill="#ff7aa2" opacity=".55"/><ellipse cx="150" cy="124" rx="12" ry="7" fill="#ff7aa2" opacity=".55"/>'
    + glint(56, 98, .8),
    lg('frog', '#a8ec7a', '#5cc25a')))

S['chick'] = ('animals', 'Chick', svg(
    f'<path d="M96 34 C90 20 104 16 100 30 C106 18 118 24 106 36" fill="#ffd54a" stroke="{O}" stroke-width="4"/>'
    f'<ellipse cx="100" cy="112" rx="70" ry="74" fill="url(#chick)" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M34 120 C18 116 20 140 40 140" fill="#ffc72e" stroke="{O}" stroke-width="4"/><path d="M166 120 C182 116 180 140 160 140" fill="#ffc72e" stroke="{O}" stroke-width="4"/>'
    f'<circle cx="76" cy="100" r="7" fill="{O}"/><circle cx="78" cy="97" r="2.4" fill="#fff"/><circle cx="124" cy="100" r="7" fill="{O}"/><circle cx="126" cy="97" r="2.4" fill="#fff"/>'
    f'<path d="M88 114 L112 114 L100 128 Z" fill="#ff9f43" stroke="{O}" stroke-width="3.5"/>'
    '<ellipse cx="62" cy="122" rx="9" ry="5" fill="#ff7aa2" opacity=".55"/><ellipse cx="138" cy="122" rx="9" ry="5" fill="#ff7aa2" opacity=".55"/>'
    f'<path d="M80 186 L76 196 M90 186 L90 196 M110 186 L110 196 M120 186 L124 196" stroke="#ff9f43" stroke-width="5"/>'
    + glint(62, 74, .8),
    rg('chick', '#fff5b0', '#ffcf3a')))

S['penguin'] = ('animals', 'Penguin', svg(
    f'<ellipse cx="78" cy="186" rx="18" ry="8" fill="#ff9f43" stroke="{O}" stroke-width="4"/><ellipse cx="122" cy="186" rx="18" ry="8" fill="#ff9f43" stroke="{O}" stroke-width="4"/>'
    f'<path d="M100 18 C150 18 168 74 166 120 C164 164 140 184 100 184 C60 184 36 164 34 120 C32 74 50 18 100 18 Z" fill="url(#peng)" stroke="{O}" stroke-width="{SW}"/>'
    '<path d="M100 56 C78 40 58 60 62 86 C56 112 60 168 100 172 C140 168 144 112 138 86 C142 60 122 40 100 56 Z" fill="#fffaf2"/>'
    f'<path d="M36 104 C20 120 22 146 34 150 M164 104 C180 120 178 146 166 150" fill="none" stroke="{O}" stroke-width="{SW}"/>'
    + face(100, 92, .95)
    + f'<path d="M92 104 L108 104 L100 114 Z" fill="#ff9f43" stroke="{O}" stroke-width="3"/>'
    + glint(64, 48, .7),
    lg('peng', '#4a5d8a', '#26304f')))

S['fox'] = ('animals', 'Fox', svg(
    ol('M38 104 L34 30 L86 66 Z', 'url(#fox)') + ol('M162 104 L166 30 L114 66 Z', 'url(#fox)')
    + f'<path d="M46 80 L44 46 L72 66 Z M154 80 L156 46 L128 66 Z" fill="{O}" opacity=".85"/>'
    + ol('M100 182 C62 182 26 140 30 96 C46 72 74 60 100 60 C126 60 154 72 170 96 C174 140 138 182 100 182 Z', 'url(#fox)')
    + '<path d="M100 182 C80 182 56 160 46 132 C66 128 86 138 100 150 C114 138 134 128 154 132 C144 160 120 182 100 182 Z" fill="#fff6ea"/>'
    + f'<circle cx="74" cy="114" r="6.5" fill="{O}"/><circle cx="76" cy="111" r="2.2" fill="#fff"/><circle cx="126" cy="114" r="6.5" fill="{O}"/><circle cx="128" cy="111" r="2.2" fill="#fff"/>'
    + f'<ellipse cx="100" cy="146" rx="9" ry="6" fill="{O}"/><path d="M92 158 Q100 164 108 158" fill="none" stroke="{O}" stroke-width="3.4"/>'
    + glint(64, 86, .7),
    lg('fox', '#ffb057', '#f06a24')))

# ---------------- Retro ----------------
S['cassette'] = ('retro', 'Cassette', svg(
    f'<rect x="18" y="46" width="164" height="110" rx="14" fill="url(#cas)" stroke="{O}" stroke-width="{SW}"/>'
    f'<rect x="34" y="60" width="132" height="58" rx="8" fill="#fff6e8" stroke="{O}" stroke-width="4"/>'
    '<rect x="34" y="60" width="132" height="14" fill="#ffd54a"/><rect x="34" y="74" width="132" height="8" fill="#6fe3b5"/>'
    f'<rect x="60" y="86" width="80" height="26" rx="13" fill="#3a2d4a" stroke="{O}" stroke-width="3"/>'
    '<circle cx="76" cy="99" r="9" fill="#fff"/><circle cx="124" cy="99" r="9" fill="#fff"/>'
    f'<circle cx="76" cy="99" r="4" fill="{O}"/><circle cx="124" cy="99" r="4" fill="{O}"/>'
    f'<path d="M52 156 L62 128 H138 L148 156" fill="#ff8fb1" stroke="{O}" stroke-width="4"/>'
    f'<circle cx="80" cy="144" r="4" fill="{O}"/><circle cx="120" cy="144" r="4" fill="{O}"/>'
    + glint(36, 58, .55, rot=0),
    lg('cas', '#ff9ec0', '#ff5d8f')))

S['controller'] = ('retro', 'Game controller', svg(
    f'<path d="M54 64 H146 C176 64 190 110 186 140 C182 166 160 170 146 150 L132 132 H68 L54 150 C40 170 18 166 14 140 C10 110 24 64 54 64 Z" fill="url(#pad)" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M52 88 V124 M34 106 H70" stroke="#2a1e33" stroke-width="13"/><path d="M52 92 V120 M38 106 H66" stroke="#4d3d63" stroke-width="7"/>'
    f'<circle cx="138" cy="94" r="9" fill="#ffd54a" stroke="{O}" stroke-width="3.5"/><circle cx="158" cy="110" r="9" fill="#ff5d7a" stroke="{O}" stroke-width="3.5"/>'
    f'<circle cx="118" cy="110" r="9" fill="#4fb6ff" stroke="{O}" stroke-width="3.5"/><circle cx="138" cy="126" r="9" fill="#6fe3b5" stroke="{O}" stroke-width="3.5"/>'
    f'<rect x="86" y="84" width="12" height="6" rx="3" fill="{O}"/><rect x="102" y="84" width="12" height="6" rx="3" fill="{O}"/>'
    + glint(50, 74, .6, rot=-10),
    lg('pad', '#c9b2ff', '#8b63ff')))

S['camera'] = ('retro', 'Instant camera', svg(
    f'<rect x="22" y="44" width="156" height="126" rx="22" fill="url(#cam)" stroke="{O}" stroke-width="{SW}"/>'
    '<rect x="22" y="128" width="156" height="12" fill="#ff5d7a"/><rect x="22" y="140" width="156" height="10" fill="#ffb02e"/><rect x="22" y="150" width="156" height="8" fill="#ffe066"/>'
    f'<rect x="22" y="44" width="156" height="126" rx="22" fill="none" stroke="{O}" stroke-width="{SW}"/>'
    f'<circle cx="100" cy="100" r="40" fill="#3a2d4a" stroke="{O}" stroke-width="{SW}"/><circle cx="100" cy="100" r="26" fill="url(#lens)" stroke="{O}" stroke-width="3"/>'
    '<circle cx="90" cy="90" r="7" fill="#fff" opacity=".85"/>'
    f'<rect x="132" y="56" width="32" height="20" rx="5" fill="#fff6e8" stroke="{O}" stroke-width="3.5"/>'
    f'<circle cx="44" cy="66" r="8" fill="#ff5d7a" stroke="{O}" stroke-width="3.5"/>',
    lg('cam', '#fffaf2', '#e8e1f2') + rg('lens', '#8fd3ff', '#2a5fa8')))

S['headphones'] = ('retro', 'Headphones', svg(
    f'<path d="M34 124 C24 52 176 52 166 124" fill="none" stroke="{O}" stroke-width="{18+SW*2}"/>'
    '<path d="M34 124 C24 52 176 52 166 124" fill="none" stroke="#b69cff" stroke-width="18"/>'
    f'<rect x="16" y="104" width="44" height="72" rx="20" fill="url(#hp)" stroke="{O}" stroke-width="{SW}"/>'
    f'<rect x="140" y="104" width="44" height="72" rx="20" fill="url(#hp)" stroke="{O}" stroke-width="{SW}"/>'
    '<rect x="26" y="116" width="10" height="46" rx="5" fill="#fff" opacity=".6"/><rect x="150" y="116" width="10" height="46" rx="5" fill="#fff" opacity=".6"/>'
    + star4(100, 112, 16, '#ffd54a') + f'<path d="M84 150 Q100 140 116 150 M90 162 Q100 156 110 162" fill="none" stroke="#ff8fb1" stroke-width="4"/>',
    lg('hp', '#ff9ec0', '#ff5d8f')))

S['disc'] = ('retro', 'CD', svg(
    f'<circle cx="100" cy="100" r="80" fill="url(#cd)" stroke="{O}" stroke-width="{SW}"/>'
    '<path d="M100 20 A80 80 0 0 1 180 100 L100 100 Z" fill="#ffffff" opacity=".35"/>'
    '<path d="M100 180 A80 80 0 0 1 20 100 L100 100 Z" fill="#ffffff" opacity=".25"/>'
    '<circle cx="100" cy="100" r="58" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/><circle cx="100" cy="100" r="44" fill="none" stroke="#fff" stroke-width="2" opacity=".35"/>'
    f'<circle cx="100" cy="100" r="26" fill="#e8eef8" stroke="{O}" stroke-width="4"/><circle cx="100" cy="100" r="10" fill="none" stroke="{O}" stroke-width="4"/>'
    + glint(56, 54, .9),
    lg('cd', '#8fd3ff', '#ff9ec0', 0, 0, 1, 1).replace('<stop offset="1"', '<stop offset=".5" stop-color="#d6c6ff"/><stop offset="1"')))

S['lavalamp'] = ('retro', 'Lava lamp', svg(
    f'<path d="M70 178 L60 196 H140 L130 178 Z" fill="#8b63ff" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M80 30 H120 L146 168 Q148 180 136 180 H64 Q52 180 54 168 Z" fill="url(#lava)" stroke="{O}" stroke-width="{SW}"/>'
    '<ellipse cx="100" cy="150" rx="26" ry="16" fill="#ffd54a"/><circle cx="92" cy="104" r="14" fill="#ffd54a"/><circle cx="112" cy="72" r="9" fill="#ffd54a"/><circle cx="108" cy="126" r="6" fill="#ffd54a"/>'
    f'<rect x="74" y="14" width="52" height="22" rx="6" fill="#8b63ff" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M80 30 H120 L146 168 Q148 180 136 180 H64 Q52 180 54 168 Z" fill="none" stroke="{O}" stroke-width="{SW}"/>'
    + glint(74, 60, .55, rot=-75),
    lg('lava', '#ff8fb1', '#ff5d7a')))

# ---------------- Cosy ----------------
S['cocoa'] = ('cosy', 'Hot cocoa', svg(
    f'<path d="M150 92 C186 88 186 146 146 142" fill="none" stroke="{O}" stroke-width="{14+SW*2}"/><path d="M150 92 C186 88 186 146 146 142" fill="none" stroke="#ff8fb1" stroke-width="14"/>'
    f'<path d="M34 70 H160 L150 168 Q148 184 132 184 H62 Q46 184 44 168 Z" fill="url(#mug)" stroke="{O}" stroke-width="{SW}"/>'
    f'<ellipse cx="97" cy="72" rx="63" ry="14" fill="#8a4f2a" stroke="{O}" stroke-width="4"/>'
    + ''.join(f'<rect x="{x}" y="{y}" width="20" height="16" rx="5" fill="#fff" stroke="{O}" stroke-width="3" transform="rotate({r} {x+10} {y+8})"/>' for x, y, r in [(60, 58, -12), (88, 54, 8), (114, 60, -4)])
    + f'<path d="M74 40 C68 30 80 24 74 12 M100 42 C94 32 106 26 100 14 M126 40 C120 30 132 24 126 12" fill="none" stroke="#b9a6c9" stroke-width="4" opacity=".8"/>'
    + face(97, 128, .9) + glint(58, 102, .6, rot=-70),
    lg('mug', '#ff9ec0', '#ff5d8f')))

S['candle'] = ('cosy', 'Candle', svg(
    f'<path d="M100 24 C122 50 120 74 100 80 C80 74 78 50 100 24 Z" fill="url(#flame)" stroke="{O}" stroke-width="{SW}"/>'
    '<path d="M100 48 C110 60 108 70 100 72 C92 70 90 60 100 48 Z" fill="#fff6b0"/>'
    f'<path d="M100 80 V92" stroke="{O}" stroke-width="4"/>'
    f'<rect x="56" y="90" width="88" height="96" rx="12" fill="url(#wax)" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M56 104 C70 112 76 98 86 108 C92 120 100 104 108 110 C118 118 124 102 144 106 V100 H56 Z" fill="#fff4f8" stroke="{O}" stroke-width="3"/>'
    + face(100, 146, .85) + glint(70, 128, .5, rot=-80),
    lg('flame', '#ffd54a', '#ff7a2e') + lg('wax', '#c9b2ff', '#9a72ff')))

S['books'] = ('cosy', 'Books', svg(
    f'<rect x="26" y="146" width="148" height="34" rx="6" fill="#4fb6ff" stroke="{O}" stroke-width="{SW}"/><rect x="34" y="152" width="132" height="22" fill="#fff6e8"/><rect x="26" y="146" width="18" height="34" fill="#2f86cf"/>'
    f'<rect x="36" y="112" width="130" height="34" rx="6" fill="#6fe3b5" stroke="{O}" stroke-width="{SW}"/><rect x="44" y="118" width="114" height="22" fill="#fff6e8"/><rect x="148" y="112" width="18" height="34" fill="#2bbf86"/>'
    f'<rect x="30" y="78" width="140" height="34" rx="6" fill="#ff8fb1" stroke="{O}" stroke-width="{SW}"/><rect x="38" y="84" width="124" height="22" fill="#fff6e8"/><rect x="30" y="78" width="18" height="34" fill="#ff5d8f"/>'
    + f'<path d="M98 76 C86 54 60 54 66 70 C70 80 90 78 98 76 Z" fill="#ffd54a" stroke="{O}" stroke-width="4"/><path d="M102 76 C114 54 140 54 134 70 C130 80 110 78 102 76 Z" fill="#ffd54a" stroke="{O}" stroke-width="4"/>'
    + face(100, 126, .78, blush=False) + glint(60, 90, .4, rot=0)))

S['plant'] = ('cosy', 'House plant', svg(
    f'<path d="M100 120 C96 90 70 70 40 72 C40 100 66 120 100 120 Z" fill="url(#lf2)" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M100 120 C104 86 130 62 164 62 C164 96 136 120 100 120 Z" fill="url(#lf2)" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M100 120 C92 80 96 40 110 18 C126 44 118 92 100 120 Z" fill="url(#lf2)" stroke="{O}" stroke-width="{SW}"/>'
    '<path d="M100 118 C80 104 64 92 52 80 M100 118 C122 100 138 86 152 72 M100 118 C104 82 106 54 110 30" fill="none" stroke="#2f7d3a" stroke-width="3"/>'
    f'<path d="M50 118 H150 L138 186 Q136 194 126 194 H74 Q64 194 62 186 Z" fill="url(#pot2)" stroke="{O}" stroke-width="{SW}"/>'
    f'<rect x="44" y="112" width="112" height="20" rx="8" fill="#ffb3cc" stroke="{O}" stroke-width="{SW}"/>'
    + face(100, 158, .85),
    lg('lf2', '#8be08f', '#3f9e45') + lg('pot2', '#ffd0e0', '#ff8fb1')))

chips = ''.join(f'<path d="M{x} {y} l7 -3 l3 7 l-7 3 Z" fill="#6b3a1f" transform="rotate({r} {x} {y})"/>' for x, y, r in [(60, 70, 10), (130, 64, -20), (146, 112, 30), (54, 124, -10), (98, 52, 0), (120, 150, 15), (72, 150, 40)])
S['cookie'] = ('cosy', 'Cookie', svg(
    f'<path d="M100 22 C130 20 168 40 176 80 C186 118 166 160 128 174 C90 188 46 172 30 134 C14 98 30 52 64 34 C76 26 88 22 100 22 Z" fill="url(#ck)" stroke="{O}" stroke-width="{SW}"/>'
    + chips + face(100, 104, 1.0) + glint(62, 56, .7),
    rg('ck', '#f8d29a', '#d99a4e')))

S['toast'] = ('cosy', 'Toast', svg(
    f'<path d="M40 74 C20 70 18 30 52 24 C70 20 84 30 100 30 C116 30 130 20 148 24 C182 30 180 70 160 74 V172 Q160 184 148 184 H52 Q40 184 40 172 Z" fill="#e0954a" stroke="{O}" stroke-width="{SW}"/>'
    '<path d="M54 78 C38 72 38 44 60 40 C74 38 86 46 100 46 C114 46 126 38 140 40 C162 44 162 72 146 78 V166 Q146 172 140 172 H60 Q54 172 54 166 Z" fill="url(#bread)"/>'
    f'<path d="M78 70 C70 60 82 54 100 58 C118 54 130 60 122 70 C128 80 118 86 100 82 C82 86 72 80 78 70 Z" fill="#fff1a6" stroke="{O}" stroke-width="3.5"/>'
    + face(100, 124, 1.0, mood='open') + glint(66, 96, .5, rot=-80),
    lg('bread', '#fff3d6', '#ffd99a')))

# ---------------- Space ----------------
S['rocket'] = ('space', 'Rocket', svg(
    f'<path d="M84 150 C80 170 92 186 100 196 C108 186 120 170 116 150 Z" fill="url(#fire)" stroke="{O}" stroke-width="4"/>'
    f'<path d="M66 118 L40 150 L46 164 L76 146 Z M134 118 L160 150 L154 164 L124 146 Z" fill="#ff5d7a" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M100 14 C134 40 140 100 128 150 H72 C60 100 66 40 100 14 Z" fill="url(#rk)" stroke="{O}" stroke-width="{SW}"/>'
    f'<path d="M100 14 C114 25 124 40 130 56 H70 C76 40 86 25 100 14 Z" fill="#ff5d7a" stroke="{O}" stroke-width="{SW}"/>'
    f'<circle cx="100" cy="90" r="20" fill="url(#win)" stroke="{O}" stroke-width="{SW}"/><circle cx="94" cy="84" r="5" fill="#fff" opacity=".85"/>'
    f'<rect x="88" y="132" width="24" height="18" fill="#ff5d7a" stroke="{O}" stroke-width="4"/>'
    + star4(36, 50, 12, '#ffd54a') + star4(166, 80, 9, '#ffd54a', rot=20) + glint(82, 60, .45, rot=-70),
    lg('rk', '#ffffff', '#dfe6f2') + rg('win', '#a6e1ff', '#3b9ef5') + lg('fire', '#ffd54a', '#ff7a2e')))

S['ufo'] = ('space', 'UFO', svg(
    f'<path d="M74 124 L54 182 H146 L126 124 Z" fill="#fff6b0" opacity=".75"/>'
    f'<path d="M52 96 C52 24 148 24 148 96 Z" fill="url(#dome)" stroke="{O}" stroke-width="{SW}"/>'
    + f'<ellipse cx="100" cy="106" rx="86" ry="28" fill="url(#ufo)" stroke="{O}" stroke-width="{SW}"/>'
    + face(100, 62, .85)
    + ''.join(f'<circle cx="{x}" cy="{y}" r="6" fill="#ffd54a" stroke="{O}" stroke-width="3"/>' for x, y in [(42, 110), (72, 118), (100, 120), (128, 118), (158, 110)])
    + glint(72, 50, .45, rot=-40),
    lg('dome', '#c6f2df', '#6fe3b5') + lg('ufo', '#d6c6ff', '#8b63ff')))

S['alien'] = ('space', 'Alien', svg(
    f'<path d="M64 46 C56 30 44 26 40 20 M136 46 C144 30 156 26 160 20" fill="none" stroke="{O}" stroke-width="4"/>'
    f'<circle cx="38" cy="18" r="8" fill="#ff8fb1" stroke="{O}" stroke-width="3.5"/><circle cx="162" cy="18" r="8" fill="#ff8fb1" stroke="{O}" stroke-width="3.5"/>'
    f'<path d="M100 36 C152 36 178 74 172 108 C164 150 128 184 100 184 C72 184 36 150 28 108 C22 74 48 36 100 36 Z" fill="url(#al)" stroke="{O}" stroke-width="{SW}"/>'
    f'<ellipse cx="68" cy="106" rx="20" ry="26" transform="rotate(-20 68 106)" fill="{O}"/><ellipse cx="132" cy="106" rx="20" ry="26" transform="rotate(20 132 106)" fill="{O}"/>'
    '<circle cx="74" cy="96" r="6" fill="#fff"/><circle cx="138" cy="96" r="6" fill="#fff"/><circle cx="64" cy="116" r="3" fill="#fff"/><circle cx="128" cy="116" r="3" fill="#fff"/>'
    f'<path d="M88 150 Q100 160 112 150" fill="none" stroke="{O}" stroke-width="3.4"/>'
    '<ellipse cx="48" cy="140" rx="9" ry="5" fill="#ff7aa2" opacity=".55"/><ellipse cx="152" cy="140" rx="9" ry="5" fill="#ff7aa2" opacity=".55"/>'
    + glint(70, 60, .7),
    lg('al', '#b9f59a', '#5cc25a')))

S['comet'] = ('space', 'Shooting star', svg(
    f'<path d="M110 70 C80 92 50 124 16 170 C60 150 98 128 128 102 Z" fill="url(#trail)" stroke="{O}" stroke-width="4"/>'
    '<path d="M108 82 C86 102 62 128 36 158" fill="none" stroke="#fff" stroke-width="5" opacity=".7"/>'
    f'<path d="{star5(132, 70, 52, 24, -80)}" fill="url(#st5)" stroke="{O}" stroke-width="{SW}"/>'
    + face(132, 72, .8) + star4(40, 52, 12, '#ffffff') + star4(170, 160, 10, '#ffd54a', rot=15),
    lg('trail', '#ff9ec0', '#b69cff', 0, 0, 1, 1) + lg('st5', '#fff1a6', '#ffb02e')))

S['star'] = ('space', 'Happy star', svg(
    f'<path d="{star5(100, 108, 88, 42, -90)}" fill="url(#hs)" stroke="{O}" stroke-width="{SW}"/>'
    + face(100, 112, 1.05) + glint(76, 82, .6),
    lg('hs', '#fff1a6', '#ffc72e')))

S['earth'] = ('space', 'Earth', svg(
    f'<clipPath id="ec"><circle cx="100" cy="100" r="78"/></clipPath>'
    f'<circle cx="100" cy="100" r="78" fill="url(#sea)"/>'
    '<g clip-path="url(#ec)" fill="#6fe39a">'
    '<path d="M30 70 C50 40 86 36 96 56 C104 72 84 80 90 96 C94 108 70 116 56 104 C42 92 22 92 30 70 Z"/>'
    '<path d="M120 40 C150 40 176 60 178 84 C160 82 150 96 136 92 C122 88 128 70 112 64 C104 52 108 40 120 40 Z"/>'
    '<path d="M108 128 C130 118 160 126 164 148 C150 170 120 178 104 166 C94 156 96 136 108 128 Z"/></g>'
    f'<circle cx="100" cy="100" r="78" fill="url(#eshade)" stroke="{O}" stroke-width="{SW}"/>'
    + face(100, 104, 1.0) + glint(62, 56, .9),
    lg('sea', '#8fd3ff', '#3b9ef5') + rg('eshade', 'rgba(255,255,255,0)', 'rgba(42,30,51,.25)', cx=.38, cy=.32, r=.8)))


# ---------------- Faces (funny expressions) ----------------
def yface(g='yf'):
    return f'<circle cx="100" cy="104" r="80" fill="url(#{g})" stroke="{O}" stroke-width="{SW}"/>'
YF = rg('yf', '#fff3a0', '#ffc72e', cx=.38, cy=.3, r=.85)
def blush2(y=124, dx=50):
    return f'<ellipse cx="{100-dx}" cy="{y}" rx="11" ry="6" fill="#ff7aa2" opacity=".5"/><ellipse cx="{100+dx}" cy="{y}" rx="11" ry="6" fill="#ff7aa2" opacity=".5"/>'
def zee(x, y, k):
    return f'<path d="M{x} {y} h{12*k} l{-12*k} {12*k} h{12*k}" fill="none" stroke="{O}" stroke-width="{3.5*k+1}" stroke-linejoin="round"/>'

S['laugh'] = ('faces', 'Crying laughing', svg(
    yface()
    + f'<path d="M58 88 Q72 74 86 88 M114 88 Q128 74 142 88" fill="none" stroke="{O}" stroke-width="6"/>'
    + f'<path d="M54 112 Q100 112 146 112 Q140 168 100 168 Q60 168 54 112 Z" fill="#7a2a3a" stroke="{O}" stroke-width="{SW}"/>'
    + '<path d="M70 150 Q100 132 130 150 Q118 166 100 166 Q82 166 70 150 Z" fill="#ff7a8a"/>'
    + '<path d="M60 113 H140 L136 124 H64 Z" fill="#fff"/>'
    + f'<path d="M40 96 C24 108 18 132 30 140 C42 146 52 130 48 100 Z" fill="#8fd3ff" stroke="{O}" stroke-width="4"/>'
    + f'<path d="M160 96 C176 108 182 132 170 140 C158 146 148 130 152 100 Z" fill="#8fd3ff" stroke="{O}" stroke-width="4"/>'
    + glint(64, 58, .8), YF))

S['tongue'] = ('faces', 'Cheeky wink', svg(
    yface()
    + f'<circle cx="72" cy="88" r="9" fill="{O}"/><circle cx="75" cy="85" r="3" fill="#fff"/>'
    + f'<path d="M116 90 Q128 80 142 88" fill="none" stroke="{O}" stroke-width="6"/>'
    + f'<path d="M62 122 Q100 150 138 122" fill="none" stroke="{O}" stroke-width="5"/>'
    + f'<path d="M96 134 C96 160 104 172 116 172 C130 172 134 156 130 132 Z" fill="#ff7a8a" stroke="{O}" stroke-width="4"/>'
    + '<path d="M113 140 V160" stroke="#d6455e" stroke-width="3"/>'
    + blush2(118, 56) + glint(64, 58, .8), YF))

S['cool'] = ('faces', 'Too cool', svg(
    yface()
    + f'<path d="M30 80 H170 L164 90 Q160 120 132 120 Q108 120 106 92 H94 Q92 120 68 120 Q40 120 36 90 Z" fill="#2a1e33" stroke="{O}" stroke-width="3"/>'
    + '<path d="M48 90 L64 108 M54 88 L70 106 M120 90 L136 108 M126 88 L142 106" stroke="#fff" stroke-width="4" opacity=".55"/>'
    + f'<path d="M74 146 Q104 162 132 138" fill="none" stroke="{O}" stroke-width="6"/>'
    + glint(64, 50, .7), YF))

S['hearteyes'] = ('faces', 'Heart eyes', svg(
    yface()
    + f'<path d="{heart_path(70, 92, .42)}" fill="#ff3b6b" stroke="{O}" stroke-width="3.5"/>'
    + f'<path d="{heart_path(130, 92, .42)}" fill="#ff3b6b" stroke="{O}" stroke-width="3.5"/>'
    + f'<path d="M64 126 Q100 126 136 126 Q132 162 100 162 Q68 162 64 126 Z" fill="#7a2a3a" stroke="{O}" stroke-width="{SW}"/>'
    + '<path d="M80 150 Q100 140 120 150 Q112 160 100 160 Q88 160 80 150 Z" fill="#ff7a8a"/>'
    + glint(60, 60, .7) + f'<path d="{heart_path(170, 40, .3)}" fill="#ff8fb1" stroke="{O}" stroke-width="3"/>', YF))

S['shock'] = ('faces', 'Shocked', svg(
    yface()
    + f'<path d="M52 66 Q66 54 82 60 M118 60 Q134 54 148 66" fill="none" stroke="{O}" stroke-width="5"/>'
    + f'<circle cx="70" cy="94" r="17" fill="#fff" stroke="{O}" stroke-width="4"/><circle cx="130" cy="94" r="17" fill="#fff" stroke="{O}" stroke-width="4"/>'
    + f'<circle cx="70" cy="96" r="7" fill="{O}"/><circle cx="130" cy="96" r="7" fill="{O}"/>'
    + f'<ellipse cx="100" cy="146" rx="16" ry="20" fill="#7a2a3a" stroke="{O}" stroke-width="{SW}"/>'
    + f'<path d="M158 52 C166 64 170 74 160 80 C150 84 146 72 158 52 Z" fill="#8fd3ff" stroke="{O}" stroke-width="3.5"/>'
    + glint(56, 60, .6), YF))

S['sleepy'] = ('faces', 'Sleepy', svg(
    yface()
    + f'<path d="M56 96 Q70 106 84 96 M116 96 Q130 106 144 96" fill="none" stroke="{O}" stroke-width="6"/>'
    + f'<ellipse cx="100" cy="140" rx="12" ry="9" fill="#7a2a3a" stroke="{O}" stroke-width="4"/>'
    + f'<circle cx="122" cy="146" r="11" fill="#cfefff" stroke="{O}" stroke-width="3" opacity=".9"/><circle cx="118" cy="142" r="3" fill="#fff"/>'
    + zee(140, 30, 1.2) + zee(164, 12, .9) + blush2(122, 52) + glint(62, 62, .7), YF))

S['angry'] = ('faces', 'Grumpy', svg(
    '<g fill="#e9e3f2" stroke="#2a1e33" stroke-width="4">'
    '<circle cx="30" cy="40" r="12"/><circle cx="20" cy="22" r="8"/><circle cx="170" cy="40" r="12"/><circle cx="180" cy="22" r="8"/></g>'
    + f'<circle cx="100" cy="104" r="80" fill="url(#af)" stroke="{O}" stroke-width="{SW}"/>'
    + f'<path d="M50 74 L86 90 M150 74 L114 90" stroke="{O}" stroke-width="7"/>'
    + f'<circle cx="72" cy="104" r="8" fill="{O}"/><circle cx="128" cy="104" r="8" fill="{O}"/>'
    + f'<path d="M70 154 Q100 130 130 154" fill="none" stroke="{O}" stroke-width="6"/>'
    + glint(60, 62, .7), rg('af', '#ffb08a', '#ff5d4a', cx=.38, cy=.3, r=.85)))

S['nerd'] = ('faces', 'Nerd', svg(
    yface()
    + f'<circle cx="68" cy="96" r="24" fill="#fff" fill-opacity=".55" stroke="{O}" stroke-width="6"/><circle cx="132" cy="96" r="24" fill="#fff" fill-opacity=".55" stroke="{O}" stroke-width="6"/>'
    + f'<path d="M92 94 Q100 88 108 94 M44 92 L24 86 M156 92 L176 86" fill="none" stroke="{O}" stroke-width="6"/>'
    + f'<circle cx="70" cy="98" r="8" fill="{O}"/><circle cx="130" cy="98" r="8" fill="{O}"/>'
    + f'<path d="M66 136 Q100 160 134 136" fill="none" stroke="{O}" stroke-width="6"/>'
    + f'<rect x="88" y="142" width="11" height="13" rx="2" fill="#fff" stroke="{O}" stroke-width="3"/><rect x="101" y="142" width="11" height="13" rx="2" fill="#fff" stroke="{O}" stroke-width="3"/>'
    + glint(60, 54, .7), YF))

# ---------------- Snacks (with faces) ----------------
S['pizza'] = ('snacks', 'Pizza slice', svg(
    f'<path d="M100 188 L26 46 Q100 16 174 46 Z" fill="url(#cheese)" stroke="{O}" stroke-width="{SW}"/>'
    + f'<path d="M24 44 Q100 10 176 44 L170 60 Q100 30 30 60 Z" fill="#e0954a" stroke="{O}" stroke-width="{SW}"/>'
    + ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#e2384d" stroke="{O}" stroke-width="3"/>' for x, y, r in [(66, 78, 11), (134, 78, 11), (100, 150, 9)])
    + '<path d="M82 160 C84 172 92 172 92 162" fill="#ffd54a" stroke="#2a1e33" stroke-width="3"/>'
    + face(100, 106, 1.1), lg('cheese', '#ffe27a', '#ffb52e')))

S['taco'] = ('snacks', 'Taco', svg(
    ''.join(f'<circle cx="{x}" cy="{y}" r="16" fill="#6fd36b" stroke="{O}" stroke-width="4"/>' for x, y in [(40, 92), (66, 72), (100, 64), (134, 72), (160, 92)])
    + ''.join(f'<circle cx="{x}" cy="{y}" r="9" fill="#ff5d4a" stroke="{O}" stroke-width="3"/>' for x, y in [(56, 82), (118, 66), (150, 84)])
    + f'<path d="M18 160 A82 82 0 0 1 182 160 Z" fill="url(#shell)" stroke="{O}" stroke-width="{SW}"/>'
    + ''.join(f'<circle cx="{x}" cy="{y}" r="3" fill="#d99a3a"/>' for x, y in [(50, 140), (150, 138), (70, 112), (132, 110), (100, 102)])
    + face(100, 136, 1.15), lg('shell', '#ffe08a', '#f2b544')))

S['burger'] = ('snacks', 'Burger', svg(
    f'<path d="M26 92 C26 40 174 40 174 92 Z" fill="url(#bun)" stroke="{O}" stroke-width="{SW}"/>'
    + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="4" ry="2.5" fill="#fff6e0" transform="rotate({r} {x} {y})"/>' for x, y, r in [(70, 60, -20), (100, 52, 0), (130, 60, 20), (86, 74, 10), (116, 74, -10)])
    + f'<path d="M20 98 Q40 88 60 100 Q80 88 100 100 Q120 88 140 100 Q160 88 180 98 L176 108 H24 Z" fill="#6fd36b" stroke="{O}" stroke-width="4"/>'
    + f'<path d="M30 108 H170 L150 128 L136 112 Z" fill="#ffd54a" stroke="{O}" stroke-width="4"/>'
    + f'<rect x="24" y="108" width="152" height="30" rx="14" fill="#7a4325" stroke="{O}" stroke-width="{SW}"/>'
    + f'<path d="M30 140 H170 Q174 172 140 176 H60 Q26 172 30 140 Z" fill="url(#bun)" stroke="{O}" stroke-width="{SW}"/>'
    + face(100, 70, .95) + glint(48, 70, .5, rot=-40), lg('bun', '#ffcf7a', '#e9973f')))

S['hotdog'] = ('snacks', 'Hot dog', svg(
    f'<path d="M24 92 C10 92 10 66 30 64 H170 C190 66 190 92 176 92 Z" fill="#e0603e" stroke="{O}" stroke-width="{SW}"/>'
    + '<path d="M34 72 H166" stroke="#ff9b7a" stroke-width="5" opacity=".7"/>'
    + '<path d="M36 74 Q46 62 56 74 T76 74 T96 74 T116 74 T136 74 T156 74" fill="none" stroke="#ffd54a" stroke-width="6"/>'
    + f'<path d="M14 92 C14 82 186 82 186 92 C190 148 160 172 100 172 C40 172 10 148 14 92 Z" fill="url(#hbun)" stroke="{O}" stroke-width="{SW}"/>'
    + face(100, 128, 1.15) + glint(40, 112, .5, rot=-60), lg('hbun', '#ffd99a', '#eaa250')))

S['fries'] = ('snacks', 'Fries', svg(
    ''.join(f'<rect x="{x}" y="{y}" width="17" height="90" rx="4" fill="#ffd54a" stroke="{O}" stroke-width="4" transform="rotate({r} {x+8} {y+90})"/>' for x, y, r in [(52, 30, -12), (74, 18, -5), (96, 12, 0), (118, 20, 6), (138, 32, 13), (86, 36, -2), (108, 34, 3)])
    + f'<path d="M40 86 H160 L146 188 H54 Z" fill="url(#box)" stroke="{O}" stroke-width="{SW}"/>'
    + f'<path d="M40 86 Q70 108 100 86 Q130 108 160 86" fill="#ff7a8a" stroke="{O}" stroke-width="4"/>'
    + face(100, 140, 1.15) + glint(56, 118, .45, rot=-80), lg('box', '#ff5d6a', '#d6233f')))

S['sushi'] = ('snacks', 'Sushi', svg(
    f'<rect x="30" y="92" width="140" height="74" rx="30" fill="url(#rice)" stroke="{O}" stroke-width="{SW}"/>'
    + f'<path d="M24 98 C30 58 170 58 176 98 C176 116 24 116 24 98 Z" fill="url(#salmon)" stroke="{O}" stroke-width="{SW}"/>'
    + '<path d="M50 80 Q60 92 52 104 M80 72 Q92 86 84 104 M114 72 Q126 86 120 104 M146 80 Q156 92 150 104" fill="none" stroke="#fff" stroke-width="4" opacity=".7"/>'
    + f'<rect x="88" y="62" width="24" height="56" rx="3" fill="#2f3b3a" stroke="{O}" stroke-width="4"/>'
    + face(100, 140, 1.0),
    lg('rice', '#ffffff', '#ece7f2') + lg('salmon', '#ffb08a', '#ff7a5a')))

S['egg'] = ('snacks', 'Fried egg', svg(
    f'<path d="M96 20 C140 16 186 44 178 92 C190 132 156 180 108 176 C66 190 18 160 24 118 C8 78 40 26 96 20 Z" fill="url(#white)" stroke="{O}" stroke-width="{SW}"/>'
    + f'<circle cx="104" cy="100" r="44" fill="url(#yolk)" stroke="{O}" stroke-width="{SW}"/>'
    + face(104, 104, .9) + glint(84, 76, .6),
    lg('white', '#ffffff', '#f0ecf5') + rg('yolk', '#ffe27a', '#ffa21f')))

S['onigiri'] = ('snacks', 'Rice ball', svg(
    f'<path d="M100 16 C126 16 182 120 182 150 C182 182 160 186 100 186 C40 186 18 182 18 150 C18 120 74 16 100 16 Z" fill="url(#rice2)" stroke="{O}" stroke-width="{SW}"/>'
    + f'<path d="M58 132 H142 V186 H58 Z" fill="#2f3b3a" stroke="{O}" stroke-width="4"/>'
    + face(100, 100, 1.1) + glint(78, 58, .55),
    lg('rice2', '#ffffff', '#ece7f2')))

# ---------------- Silly ----------------
S['poo'] = ('silly', 'Happy poo', svg(
    f'<ellipse cx="100" cy="160" rx="80" ry="28" fill="url(#poo)" stroke="{O}" stroke-width="{SW}"/>'
    + f'<ellipse cx="100" cy="122" rx="62" ry="26" fill="url(#poo)" stroke="{O}" stroke-width="{SW}"/>'
    + f'<ellipse cx="100" cy="88" rx="44" ry="22" fill="url(#poo)" stroke="{O}" stroke-width="{SW}"/>'
    + f'<path d="M78 70 C84 44 108 36 116 18 C126 40 124 60 116 72" fill="url(#poo)" stroke="{O}" stroke-width="{SW}"/>'
    + face(100, 118, 1.05) + glint(72, 80, .5, rot=-20),
    lg('poo', '#b8835a', '#7a4a2a')))

S['ghost'] = ('silly', 'Ghost', svg(
    f'<path d="M100 18 C150 18 170 60 170 100 V172 Q156 160 142 176 Q128 160 114 178 Q100 162 86 178 Q72 160 58 176 Q44 160 30 172 V100 C30 60 50 18 100 18 Z" fill="url(#gh)" stroke="{O}" stroke-width="{SW}"/>'
    + f'<ellipse cx="74" cy="90" rx="9" ry="13" fill="{O}"/><ellipse cx="126" cy="90" rx="9" ry="13" fill="{O}"/><circle cx="77" cy="85" r="3.5" fill="#fff"/><circle cx="129" cy="85" r="3.5" fill="#fff"/>'
    + f'<path d="M84 118 Q100 132 116 118 Q114 146 100 146 Q86 146 84 118 Z" fill="#7a2a3a" stroke="{O}" stroke-width="4"/>'
    + '<path d="M92 132 Q100 126 108 132 Q106 144 100 144 Q94 144 92 132 Z" fill="#ff7a8a"/>'
    + blush2(116, 46) + glint(66, 48, .7),
    lg('gh', '#ffffff', '#e4dcf5')))

S['potato'] = ('silly', 'Couch potato', svg(
    f'<rect x="14" y="120" width="172" height="56" rx="16" fill="url(#sofa)" stroke="{O}" stroke-width="{SW}"/>'
    + f'<rect x="10" y="104" width="34" height="78" rx="14" fill="url(#sofa)" stroke="{O}" stroke-width="{SW}"/><rect x="156" y="104" width="34" height="78" rx="14" fill="url(#sofa)" stroke="{O}" stroke-width="{SW}"/>'
    + f'<path d="M52 182 V194 M148 182 V194" stroke="{O}" stroke-width="7"/>'
    + f'<path d="M100 28 C142 26 160 66 156 104 C152 140 128 150 100 150 C72 150 46 142 44 104 C42 64 62 30 100 28 Z" fill="url(#pot)" stroke="{O}" stroke-width="{SW}"/>'
    + ''.join(f'<circle cx="{x}" cy="{y}" r="3.5" fill="#b07a3e"/>' for x, y in [(70, 60), (130, 56), (140, 120), (64, 126)])
    + face(100, 90, 1.1, mood='sleep')
    + f'<rect x="120" y="116" width="16" height="34" rx="5" fill="#2a1e33" transform="rotate(-25 128 133)"/><circle cx="124" cy="122" r="3" fill="#ff5d7a"/>',
    lg('sofa', '#b69cff', '#7b55f0') + lg('pot', '#f2c98a', '#d39a55')))

S['tooth'] = ('silly', 'Happy tooth', svg(
    f'<path d="M100 40 C120 22 172 18 172 70 C172 112 156 130 150 170 C146 194 124 194 120 170 C116 148 110 136 100 136 C90 136 84 148 80 170 C76 194 54 194 50 170 C44 130 28 112 28 70 C28 18 80 22 100 40 Z" fill="url(#tooth)" stroke="{O}" stroke-width="{SW}"/>'
    + face(100, 82, 1.15) + star4(160, 30, 14, '#ffffff') + star4(30, 150, 10, '#8fd3ff', rot=20) + glint(56, 52, .7),
    lg('tooth', '#ffffff', '#e3e9f5')))

S['banana'] = ('silly', 'Banana', svg(
    f'<path d="M150 22 L162 18 L168 36 L158 40 Z" fill="#6b4a2a" stroke="{O}" stroke-width="4"/>'
    + f'<path d="M158 38 C176 90 156 168 76 182 C42 188 20 172 30 160 C90 160 130 120 142 40 Z" fill="url(#ban)" stroke="{O}" stroke-width="{SW}"/>'
    + '<path d="M148 60 C150 110 120 150 70 166" fill="none" stroke="#e0a91f" stroke-width="4" opacity=".7"/>'
    + face(138, 104, .8) + glint(148, 62, .45, rot=-70),
    lg('ban', '#fff38a', '#ffd23a')))

S['pickle'] = ('silly', 'Cool pickle', svg(
    f'<path d="M100 14 C140 14 154 50 152 100 C150 154 136 188 100 188 C64 188 50 154 48 100 C46 50 60 14 100 14 Z" fill="url(#pk)" stroke="{O}" stroke-width="{SW}"/>'
    + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="4" ry="6" fill="#3f8a3a" opacity=".6"/>' for x, y in [(70, 50), (130, 60), (64, 130), (138, 140), (100, 170), (90, 36)])
    + f'<path d="M44 82 H156 L152 90 Q150 112 128 112 Q106 112 104 92 H96 Q94 112 72 112 Q50 112 48 90 Z" fill="#2a1e33" stroke="{O}" stroke-width="3"/>'
    + '<path d="M58 90 L70 104 M118 90 L130 104" stroke="#fff" stroke-width="4" opacity=".55"/>'
    + f'<path d="M80 138 Q104 152 124 132" fill="none" stroke="{O}" stroke-width="5"/>'
    + glint(70, 36, .5, rot=-70),
    lg('pk', '#a8e07a', '#4fae4a')))

pack = [{'id': sid, 'cat': cat, 'name': name, 'svg': body} for sid, (cat, name, body) in S.items()]
with open(OUT, 'w') as f:
    f.write('/* Generated by scripts/make-stickers.py - edit that, not this. */\n')
    f.write('window.STICKER_PACK = ' + json.dumps(pack, separators=(',', ':')) + ';\n')
print(len(pack), 'stickers ->', os.path.normpath(OUT))
