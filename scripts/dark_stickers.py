"""The Dark sticker pack, drawn in old-school tattoo-flash style.
Bold black line, a small flat palette (tattoo red, mustard, teal, bone, black), stippled shading that fades
the way a tattooist's whip shading does, and short white highlight marks. Each shape is filled first,
its shading and inner lines are clipped inside it, and its outline goes on last so every line meets the edge cleanly.
Imported by make-stickers.py; DARK is a list of (id, name, svg)."""
import math, random, re

K = '#151215'; RED = '#c4262e'; RED_D = '#8c1820'; GOLD = '#e5a42a'; TEAL = '#2c8a78'; BONE = '#f1e6cb'
BLK = '#1d191d'; BLK_L = '#4b4251'; WH = '#fffaf0'; MET = '#cfcbd4'; PURP = '#5d3f7a'; WOOD = '#7a4a2e'; GLASS = '#dfe9e6'
LW = 7

_ids = [0]
def _uid(p):
    _ids[0] += 1
    return f'{p}{_ids[0]}'

def svg(body):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">'
            f'<g stroke-linejoin="round" stroke-linecap="round">{body}</g></svg>')

def line(d, w=4, col=K, op=1):
    o = f' opacity="{op}"' if op != 1 else ''
    return f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w}"{o}/>'

def hl(d, w=4.5):
    return line(d, w, WH)

def clip(d, inner):
    i = _uid('c')
    return f'<clipPath id="{i}"><path d="{d}"/></clipPath><g clip-path="url(#{i})">{inner}</g>'

def stipple(ax, ay, bx, by, seed=1, step=3.7, r=1.4, col=K, fade=1.25, band=0.6, within=None):
    """Dots that are thick at A and die away towards B, like whip shading."""
    rng = random.Random(seed)
    vx, vy = bx - ax, by - ay; L2 = vx*vx + vy*vy
    out = []
    row = 0
    y = -10.0
    while y < 210:
        x = -10 + (step/2 if row % 2 else 0)
        while x < 210:
            jx, jy = x + rng.uniform(-.35, .35), y + rng.uniform(-.35, .35)
            t = ((jx - ax)*vx + (jy - ay)*vy)/L2
            if -band < t < 1 and (within is None or (within[0] <= jx <= within[2] and within[1] <= jy <= within[3])):
                t = max(t, 0)
                p = min(1, (1 - t)/0.75)**(fade*1.6)
                if p > 0.06 and rng.random() < p:
                    rr = r*(0.5 + 0.5*(1 - t))
                    out.append(f'<circle cx="{jx:.1f}" cy="{jy:.1f}" r="{rr:.1f}"/>')
            x += step
        y += step*0.866; row += 1
    return f'<g fill="{col}">' + ''.join(out) + '</g>'

def shape(d, fill, inner='', w=LW):
    """Fill, then whatever sits inside (shading, details) clipped to it, then the outline on top."""
    if inner:
        nums = [float(v) for v in re.findall(r'-?\d*\.?\d+', d)]
        xs, ys = nums[0::2], nums[1::2]
        x0, x1, y0, y1 = min(xs) - 2, max(xs) + 2, min(ys) - 2, max(ys) + 2
        def keep(m):
            cx, cy = float(m.group(1)), float(m.group(2))
            return m.group(0) if x0 <= cx <= x1 and y0 <= cy <= y1 else ''
        inner = re.sub(r'<circle cx="([-\d.]+)" cy="([-\d.]+)" r="[\d.]+"/>', keep, inner)
    return (f'<path d="{d}" fill="{fill}"/>' + (clip(d, inner) if inner else '')
            + f'<path d="{d}" fill="none" stroke="{K}" stroke-width="{w}"/>')

def outline_only(d, w=LW):
    return f'<path d="{d}" fill="none" stroke="{K}" stroke-width="{w}"/>'

def star4(x, y, r, fill=BONE, w=4):
    q = r*.2
    d = (f'M{x} {y-r} Q{x+q} {y-q} {x+r} {y} Q{x+q} {y+q} {x} {y+r} '
         f'Q{x-q} {y+q} {x-r} {y} Q{x-q} {y-q} {x} {y-r}Z')
    return shape(d, fill, w=w)

def mirror_x(d):
    """Mirror a path made of absolute coordinates across x = 100."""
    import re
    toks = re.findall(r'[A-Za-z]|-?\d*\.?\d+', d)
    out, expect_x = [], True
    for t in toks:
        if t[0].isalpha():
            out.append(t); expect_x = True
            if t in ('V', 'v'): expect_x = False
            continue
        v = float(t)
        if expect_x: out.append(f'{200 - v:g}')
        else: out.append(f'{v:g}')
        expect_x = not expect_x
    return ' '.join(out)

D = {}

# ---- skull ----
cran = ('M100 20 C150 20 170 54 168 96 C167 116 160 128 150 134 L150 150 C150 154 147 156 143 156 '
        'L57 156 C53 156 50 154 50 150 L50 134 C40 128 33 116 32 96 C30 54 50 20 100 20 Z')
jaw = 'M64 154 L136 154 L136 174 C136 182 130 188 122 188 L78 188 C70 188 64 182 64 174 Z'
eye = 'M58 96 C58 78 72 70 85 73 C96 76 98 92 94 103 C90 114 76 118 67 114 C61 111 58 104 58 96 Z'
nose = 'M100 112 C94 121 89 129 92 133 C95 136 98 134 100 130 C102 134 105 136 108 133 C111 129 106 121 100 112 Z'
D['skull'] = ('Skull', svg(
    shape(jaw, BONE, stipple(132, 186, 100, 166, seed=2) + line('M82 150 V188 M100 150 V190 M118 150 V188', 4.5))
    + shape(cran, BONE,
            stipple(170, 120, 130, 96, seed=3) + stipple(38, 132, 62, 112, seed=4)
            + line('M68 140 V160 M84 142 V160 M100 142 V160 M116 142 V160 M132 140 V160', 4.5)
            + line('M128 18 L121 40 L131 48 L124 62', 4))
    + shape(eye, BLK, w=5) + shape(mirror_x(eye), BLK, w=5)
    + shape(nose, BLK, w=4)
    + hl('M64 44 Q76 32 92 28') + hl('M52 66 Q53 60 56 55', 4)))

# ---- rose ----
bloom = 'M40 86 C36 52 64 30 100 32 C136 30 164 52 160 86 C158 110 140 128 100 130 C60 128 42 110 40 86 Z'
cup = 'M62 64 C70 46 130 46 138 64 C128 80 72 80 62 64 Z'
lip = 'M44 84 C60 74 80 86 100 92 C120 86 140 74 156 84 C150 112 128 128 100 128 C72 128 50 112 44 84 Z'
leafL = 'M76 124 C52 116 28 126 16 148 C42 158 66 148 76 124 Z'
D['rose'] = ('Rose', svg(
    line('M100 124 C100 148 97 168 92 190', 14) + line('M100 124 C100 148 97 168 92 190', 6, TEAL)
    + shape(leafL, TEAL, stipple(20, 152, 56, 132, seed=5) + line('M72 128 C56 134 38 142 24 148', 3.5))
    + shape(mirror_x(leafL), TEAL, stipple(180, 152, 144, 132, seed=6) + line(mirror_x('M72 128 C56 134 38 142 24 148'), 3.5))
    + shape(bloom, RED, stipple(46, 58, 64, 74, seed=7, fade=1.6) + stipple(154, 58, 136, 74, seed=8, fade=1.6)
            + line('M62 64 C52 72 46 80 44 84 M138 64 C148 72 154 80 156 84', 5))
    + shape(cup, RED_D, stipple(100, 76, 100, 54, seed=9, col='#5a0e14')
            + line('M84 63 C86 53 114 53 116 63 C116 70 102 72 96 67 C92 63 97 59 103 61', 5), w=6)
    + shape(lip, RED, stipple(100, 128, 100, 100, seed=10) + line('M100 92 C99 102 97 111 94 120', 4), w=6)
    + hl('M70 42 Q84 36 96 36') + hl('M64 92 Q76 94 86 98', 4) + hl('M116 98 Q128 94 138 92', 4)))

# ---- dagger (drawn upright, then tilted) ----
blade = 'M100 8 L115 38 L114 114 L86 114 L85 38 Z'
guard = 'M50 120 C48 108 62 106 66 113 L134 113 C138 106 152 108 150 120 C152 132 138 134 134 127 L66 127 C62 134 48 132 50 120 Z'
grip = 'M90 126 H110 V164 H90 Z'
pommel = 'M100 162 C110 162 115 168 115 176 C115 184 108 190 100 190 C92 190 85 184 85 176 C85 168 90 162 100 162 Z'
D['dagger'] = ('Dagger', svg('<g transform="rotate(35 100 100)">'
    + shape(blade, '#ecebe6', stipple(116, 70, 100, 70, seed=11, fade=1) + line('M100 20 V112', 3.5), w=6)
    + shape(grip, BLK, line('M88 132 L112 140 M88 144 L112 152 M88 156 L112 164', 4, RED), w=6)
    + shape(guard, GOLD, stipple(100, 134, 100, 118, seed=12))
    + shape(pommel, GOLD, stipple(112, 188, 98, 172, seed=13), w=6)
    + hl('M92 42 V96', 4) + hl('M60 116 Q62 112 66 112', 3) + hl('M93 170 Q95 167 99 166', 3)
    + '</g>'))

# ---- bat ----
wing = ('M100 74 C88 64 72 64 64 74 C56 62 36 56 12 64 C24 72 28 84 24 98 C38 90 52 94 58 106 '
        'C66 96 78 98 84 108 C90 101 95 99 100 99 C105 99 110 101 116 108 C122 98 134 96 142 106 '
        'C148 94 162 90 176 98 C172 84 176 72 188 64 C164 56 144 62 136 74 C128 64 112 64 100 74 Z')
head = 'M100 64 C114 64 123 75 123 88 C123 102 113 111 100 111 C87 111 77 102 77 88 C77 75 86 64 100 64 Z'
ear = 'M84 72 L80 50 L95 64 Z'
D['bat'] = ('Bat', svg(
    '<g transform="translate(0 6) scale(1 1.12) translate(0 -10)">'
    + shape(wing, BLK, line('M64 76 C50 80 36 88 26 96 M64 76 C59 86 58 96 58 104 '
                            'M136 76 C150 80 164 88 174 96 M136 76 C141 86 142 96 142 104', 3, BLK_L))
    + shape(ear, BLK, w=5) + shape(mirror_x(ear), BLK, w=5)
    + shape(head, BLK, w=6)
    + '<path d="M88 83 L97 86 L89 91 Z M112 83 L103 86 L111 91 Z" fill="#e5352f"/>'
    + '<path d="M93 98 L96 105 L99 98 Z M101 98 L104 105 L107 98 Z" fill="#fffaf0" stroke="#151215" stroke-width="1.5"/>'
    + hl('M28 68 Q44 63 58 68', 3.5) + hl('M142 68 Q156 63 172 68', 3.5) + hl('M87 72 Q91 69 95 68', 3)
    + '</g>'))

# ---- black cat ----
cat = ('M60 186 C50 150 58 120 80 108 C70 96 66 80 70 64 L60 26 L87 45 C95 43 105 43 113 45 '
       'L140 26 L130 64 C134 80 130 96 120 108 C142 120 150 150 140 186 Z')
eyeL = 'M75 77 C79 69 92 69 94 78 C90 85 80 85 75 77 Z'
collar = 'M73 111 C88 119 112 119 127 111 L125 123 C110 129 90 129 75 123 Z'
D['blackcat'] = ('Black cat', svg(
    line('M144 182 C172 170 188 140 176 116 C168 100 150 106 156 122', 17)
    + line('M144 182 C172 170 188 140 176 116 C168 100 150 106 156 122', 7, BLK)
    + shape(cat, BLK, line('M88 92 L70 89 M88 96 L71 99 M112 92 L130 89 M112 96 L129 99', 2.2, '#9a8fa0'))
    + shape(collar, RED, w=5)
    + shape('M100 122 C107 122 110 127 110 133 C110 139 106 143 100 143 C94 143 90 139 90 133 C90 127 93 122 100 122 Z', GOLD, line('M92 133 H108', 2.5), w=4)
    + shape(eyeL, GOLD, w=4) + shape(mirror_x(eyeL), GOLD, w=4)
    + line('M85 71 V84 M115 71 V84', 3.5)
    + '<path d="M96 91 L104 91 L100 96 Z" fill="#e28aa0"/>'
    + hl('M66 34 L71 50', 3.5) + hl('M134 34 L129 50', 3.5) + hl('M63 152 Q61 136 67 124', 4)
    + hl('M178 122 Q180 129 178 136', 3.5)))

# ---- candle ----
wax = 'M70 86 C82 80 118 80 130 86 L130 182 C130 188 70 188 70 182 Z'
drip = ('M70 86 C82 80 118 80 130 86 C130 100 125 106 121 100 C117 114 111 120 107 108 C103 96 97 98 95 114 '
        'C93 128 85 128 85 114 C85 100 79 96 75 104 C72 110 70 104 70 96 Z')
flame = 'M100 14 C118 34 122 50 112 64 C107 72 93 72 88 64 C78 50 84 32 100 14 Z'
D['blackcandle'] = ('Candle', svg(
    line('M100 70 V82', 4)
    + shape(wax, BONE, stipple(132, 140, 110, 140, seed=14, fade=1))
    + shape(drip, RED, stipple(128, 96, 112, 96, seed=15, fade=1.2), w=5)
    + shape(flame, RED, '<path d="M100 32 C108 44 110 54 104 61 C101 64 97 64 95 61 C90 54 92 44 100 32 Z" fill="#e5a42a"/>', w=5)
    + hl('M80 140 V172', 4) + hl('M103 92 Q106 90 110 90', 3)
))

# ---- spider ----
legs = ['M86 104 C66 86 48 88 34 70', 'M84 114 C62 106 42 114 26 106', 'M86 124 C66 128 52 142 42 156', 'M90 132 C78 146 72 162 68 178']
abd = 'M100 98 C126 98 132 116 130 130 C128 148 114 158 100 158 C86 158 72 148 70 130 C68 116 74 98 100 98 Z'
ceph = 'M100 72 C112 72 117 80 117 88 C117 97 109 102 100 102 C91 102 83 97 83 88 C83 80 88 72 100 72 Z'
D['spider'] = ('Spider', svg(
    line('M100 2 V74', 5, K)
    + ''.join(line(d, 9) + line(mirror_x(d), 9) for d in legs)
    + shape(abd, BLK) + shape(ceph, BLK, w=6)
    + shape('M100 114 L110 127 L100 142 L90 127 Z', RED, w=3.5)
    + '<circle cx="94" cy="88" r="3.5" fill="#e5352f"/><circle cx="106" cy="88" r="3.5" fill="#e5352f"/>'
    + hl('M80 118 Q84 107 92 104', 4) + hl('M89 79 Q92 76 96 76', 3)))

# ---- cobweb ----
def _web(col, w1, w2):
    out = ''.join(f'<path d="M8 8 L{8+170*math.cos(a):.1f} {8+170*math.sin(a):.1f}" stroke="{col}" stroke-width="{w1}" fill="none"/>'
                  for a in [i*math.pi/10 for i in range(6)])
    for r in (44, 86, 128, 170):
        pts = [(8 + r*math.cos(i*math.pi/10), 8 + r*math.sin(i*math.pi/10)) for i in range(6)]
        d = f'M{pts[0][0]:.1f} {pts[0][1]:.1f}'
        for i in range(1, 6):
            m = (i - .5)*math.pi/10; rr = r*0.86
            d += f' Q{8+rr*math.cos(m):.1f} {8+rr*math.sin(m):.1f} {pts[i][0]:.1f} {pts[i][1]:.1f}'
        out += f'<path d="{d}" stroke="{col}" stroke-width="{w2}" fill="none"/>'
    return out
sbody = 'M134 126 C141 126 145 131 145 137 C145 144 140 148 134 148 C128 148 123 144 123 137 C123 131 127 126 134 126 Z'
def _webback():
    r = 170; pts = [(8 + r*math.cos(i*math.pi/10), 8 + r*math.sin(i*math.pi/10)) for i in range(6)]
    d = f'M8 8 L{pts[0][0]:.1f} {pts[0][1]:.1f}'
    for i in range(1, 6):
        m = (i - .5)*math.pi/10; rr = r*0.86
        d += f' Q{8+rr*math.cos(m):.1f} {8+rr*math.sin(m):.1f} {pts[i][0]:.1f} {pts[i][1]:.1f}'
    return d + ' Z'
D['web'] = ('Cobweb', svg(
    f'<path d="{_webback()}" fill="{BLK}"/>' + _web(K, 9, 8) + _web(BONE, 3.5, 3)
    + line('M134 92 V128', 4, K)
    + ''.join(line(f'M134 {134+o} L{134+s*13} {128+o} L{134+s*17} {138+o}', 3.5) for s in (-1, 1) for o in (-2, 3, 8))
    + shape(sbody, BLK, w=4) + '<path d="M131 134 L137 134 L134 140 Z" fill="#c4262e"/>'))

# ---- gothic cross ----
cross = 'M88 22 L100 6 L112 22 V56 H146 L162 68 L146 80 H112 V164 L100 192 L88 164 V80 H54 L38 68 L54 56 H88 Z'
D['gothcross'] = ('Gothic cross', svg(
    shape(cross, GOLD, stipple(108.5, 120, 97, 120, seed=16, band=0.02, within=(0, 84, 200, 200)) + stipple(150, 76.5, 150, 66, seed=17, band=0.02, within=(114, 0, 200, 200)) + stipple(60, 76.5, 60, 66, seed=31, band=0.02, within=(0, 0, 86, 200)))
    + shape('M100 53 L113 68 L100 83 L87 68 Z', RED, w=5) + hl('M97 61 L100 58', 3)
    + hl('M94 28 V46', 4) + hl('M94 92 V132', 4) + hl('M58 62 H78', 4)))

# ---- coffin ----
cof = 'M74 10 H126 L162 58 L138 190 H62 L38 58 Z'
crossb = 'M92 62 H108 V82 H126 V98 H108 V148 H92 V98 H74 V82 H92 Z'
D['coffin'] = ('Coffin', svg(
    shape(cof, BLK, line('M80 22 H120 L150 60 L128 178 H72 L50 60 Z', 3, BLK_L) + stipple(150, 120, 132, 120, seed=18, col=BLK_L, fade=1))
    + shape(crossb, BONE, stipple(105.5, 120, 96, 120, seed=19, band=0.02, within=(0, 100, 200, 200)) + stipple(126, 95.5, 126, 88, seed=32, band=0.02, within=(110, 0, 200, 200)), w=5)
    + hl('M70 18 L48 54', 4.5) + hl('M48 70 L58 122', 4) + hl('M96 68 V78', 3)))

# ---- pentagram ----
star = ' '.join(('M' if i == 0 else 'L') + f'{100+76*math.cos(-math.pi/2+i*4*math.pi/5):.2f} {100+76*math.sin(-math.pi/2+i*4*math.pi/5):.2f}' for i in range(5)) + ' Z'
D['pentagram'] = ('Pentagram', svg(
    f'<circle cx="100" cy="100" r="84" fill="{BLK}" stroke="{K}" stroke-width="21"/>'
    f'<circle cx="100" cy="100" r="84" fill="none" stroke="{BONE}" stroke-width="8"/>'
    + f'<path d="{star}" fill="none" stroke="{K}" stroke-width="16"/>'
    + f'<path d="{star}" fill="none" stroke="{RED}" stroke-width="6"/>'
    + hl('M40 56 Q52 38 72 26', 4)))

# ---- broken heart ----
H = ('M100 186 C70 160 22 130 22 82 C22 52 44 34 66 34 C82 34 94 44 100 56 C106 44 118 34 134 34 '
     'C156 34 178 52 178 82 C178 130 130 160 100 186 Z')
crack = 'L90 84 L108 104 L92 128 L104 150 L100 186'
def _half(side):
    cut = (f'M-20 -20 H100 L100 56 {crack} L100 220 H-20 Z' if side < 0
           else f'M220 -20 H100 L100 56 {crack} L100 220 H220 Z')
    piece = f'M100 56 {crack}'
    tilt = f'rotate({-7*-side if False else (-7 if side < 0 else 7)} 100 186) translate({-5 if side < 0 else 5} 0)'
    body = (f'<path d="{H}" fill="{RED}"/>' + clip(H, stipple(100, 186, 100, 140, seed=20 + side, fade=1.1)
            + stipple(28 if side < 0 else 172, 120, 60 if side < 0 else 140, 100, seed=22 + side, fade=1.4))
            + f'<path d="{H}" fill="none" stroke="{K}" stroke-width="{LW}"/>'
            + clip(H, f'<path d="{piece}" fill="none" stroke="{K}" stroke-width="{LW}"/>'))
    return f'<g transform="{tilt}">' + clip(cut, body) + '</g>'
D['brokenheart'] = ('Broken heart', svg(
    '<g transform="translate(100 100) scale(.84) translate(-100 -104)">' + _half(-1) + _half(1)
    + hl('M40 72 Q43 56 58 48', 5) + hl('M150 54 Q161 61 165 74', 4) + '</g>'))

# ---- chain ----
def _ring(x, y):
    return (f'<g transform="translate({x} {y}) rotate(-45)">'
            f'<rect x="-30" y="-17" width="60" height="34" rx="17" fill="none" stroke="{K}" stroke-width="17"/>'
            f'<rect x="-30" y="-17" width="60" height="34" rx="17" fill="none" stroke="{MET}" stroke-width="7"/>'
            f'<path d="M-16 -17 H12" stroke="{WH}" stroke-width="3"/></g>')
def _bar(x, y):
    return (f'<g transform="translate({x} {y}) rotate(-45)">'
            f'<rect x="-30" y="-8.5" width="60" height="17" rx="8.5" fill="{MET}" stroke="{K}" stroke-width="6"/>'
            f'<path d="M-19 0 H19" stroke="{K}" stroke-width="3.5"/><path d="M-19 -4.5 H2" stroke="{WH}" stroke-width="2.5"/></g>')
cp = [(38, 162), (66, 134), (94, 106), (122, 78), (150, 50)]
D['chain'] = ('Chain', svg(''.join(_ring(*cp[i]) for i in (0, 2, 4)) + ''.join(_bar(*cp[i]) for i in (1, 3))))

# ---- safety pin (drawn flat, then tilted) ----
pin_wire = 'M62 118 H146 C170 118 176 100 160 86 C150 80 140 82 132 82 H52'
cap = 'M30 72 H70 C74 72 76 75 76 79 V121 C76 125 74 128 70 128 H30 C20 128 14 120 14 110 V90 C14 80 20 72 30 72 Z'
D['safetypin'] = ('Safety pin', svg('<g transform="rotate(-35 100 100)">'
    + line(pin_wire, 15) + line(pin_wire, 6, MET)
    + f'<circle cx="160" cy="100" r="11" fill="none" stroke="{K}" stroke-width="13"/><circle cx="160" cy="100" r="11" fill="none" stroke="{MET}" stroke-width="4.5"/>'
    + shape(cap, MET, stipple(45, 128, 45, 108, seed=24) + line('M60 72 V128', 3, K, .5))
    + hl('M24 82 Q34 78 52 78', 4) + hl('M90 113 H136', 3) + '</g>'))

# ---- moon ----
mo = ('M120 18 C74 22 44 60 46 104 C48 150 88 184 134 180 C154 178 170 170 182 158 '
      'C134 166 94 134 92 94 C90 60 108 34 134 22 C130 20 124 18 120 18 Z')
D['crescent'] = ('Moon', svg(
    shape(mo, GOLD, stipple(150, 170, 104, 118, seed=25, fade=1.1) + stipple(96, 40, 96, 64, seed=26, fade=1.6))
    + hl('M76 52 Q66 70 64 92', 5) + hl('M68 112 Q70 120 74 128', 4)
    + star4(150, 70, 17) + star4(172, 112, 9) + star4(34, 36, 11)
    + '<circle cx="132" cy="36" r="4" fill="#151215"/><circle cx="36" cy="152" r="4" fill="#151215"/><circle cx="186" cy="80" r="3" fill="#151215"/>'))

# ---- raven, perched ----
rv = ('M60 150 C46 132 50 104 70 88 C82 78 98 74 110 72 C114 56 126 44 142 44 C156 44 166 52 170 62 '
      'L194 70 L168 76 C166 92 156 104 144 112 C150 128 146 146 132 158 L150 196 L126 186 L116 196 L108 168 '
      'C92 170 72 164 60 150 Z')
wing_r = 'M74 102 C96 98 122 108 136 126 C142 136 140 150 132 158 C112 160 88 150 74 134 C64 122 64 110 74 102 Z'
beak = 'M166 60 L196 70 L166 78 Z'
D['raven'] = ('Raven', svg(
    line('M14 172 C70 164 130 164 190 156', 15) + line('M14 172 C70 164 130 164 190 156', 7, WOOD)
    + shape(beak, '#2a2530', hl('M172 66 L184 69', 2.5), w=5)
    + shape(rv, BLK, line('M122 168 L126 186 M112 166 L118 190', 2.5, BLK_L))
    + shape(wing_r, BLK, line('M86 118 C100 122 114 132 124 146 M82 128 C94 134 106 144 114 154 M96 106 C110 110 122 118 130 130', 2.5, BLK_L), w=5)
    + line('M100 160 L98 172 M114 162 L114 172', 5)
    + '<circle cx="146" cy="58" r="6.5" fill="#e5a42a" stroke="#151215" stroke-width="3"/><circle cx="147" cy="58" r="2.6" fill="#151215"/>'
    + hl('M118 66 Q128 54 140 50', 4) + hl('M58 120 Q60 104 72 92', 4.5)))

# ---- poison bottle ----
bt = 'M88 38 H112 V66 C140 76 160 102 160 130 C160 166 132 188 100 188 C68 188 40 166 40 130 C40 102 60 76 88 66 Z'
liq = 'M30 128 C60 116 88 138 114 124 C132 115 150 120 170 128 V200 H30 Z'
label = 'M78 136 H122 V168 H78 Z'
D['potion'] = ('Poison', svg(
    shape(bt, GLASS, f'<path d="{liq}" fill="{PURP}" stroke="{K}" stroke-width="5"/>'
          + stipple(162, 160, 128, 150, seed=27, fade=1.1)
          + ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{WH}" stroke="{K}" stroke-width="2.5"/>' for x, y, r in [(62, 150, 5), (140, 136, 4), (122, 104, 3.5), (110, 90, 2.5)]))
    + shape('M80 16 H120 V40 H80 Z', '#9a6a44', line('M80 28 H120', 2.5, K, .45), w=6)
    + shape(label, BONE, w=4)
    + '<circle cx="100" cy="149" r="7.5" fill="#151215"/><rect x="95.5" y="153" width="9" height="6" rx="1" fill="#151215"/>'
    + '<circle cx="97" cy="148" r="2" fill="#f1e6cb"/><circle cx="103" cy="148" r="2" fill="#f1e6cb"/>'
    + line('M88 163 L112 157 M88 157 L112 163', 2.5)
    + hl('M56 106 Q60 93 71 85', 5) + hl('M93 46 V60', 3.5)))

# ---- emo ghost ----
gh = 'M100 22 C144 22 162 60 162 104 L162 178 L146 166 L132 182 L116 166 L100 182 L84 166 L68 182 L54 166 L38 178 L38 104 C38 60 56 22 100 22 Z'
fringe = ('M56 66 C62 34 100 16 138 30 C152 36 158 46 158 58 C142 48 120 50 112 70 '
          'C104 86 90 94 66 98 C74 86 74 74 56 66 Z')
D['ghostie'] = ('Emo ghost', svg(
    shape(gh, BONE, stipple(166, 130, 136, 130, seed=28, fade=1) + stipple(100, 182, 100, 156, seed=29, fade=1.2)
          + f'<path d="{fringe}" fill="{BLK}" stroke="{K}" stroke-width="5"/>' + hl('M92 34 Q108 29 126 31', 3.5))
    + '<ellipse cx="124" cy="98" rx="8" ry="11" fill="#151215"/>' + hl('M121 92 Q123 90 126 90', 2.5)
    + line('M100 132 Q108 125 116 132', 4.5)
    + shape('M128 114 C131 120 131 126 128 128 C125 126 125 120 128 114 Z', '#7fb9ff', w=3)
    + hl('M50 104 V142', 5)))

ORDER = ['crescent', 'blackcandle', 'bat', 'skull', 'rose', 'spider', 'web', 'gothcross', 'coffin', 'pentagram',
         'brokenheart', 'chain', 'safetypin', 'blackcat', 'raven', 'dagger', 'potion', 'ghostie']
DARK = [(i, D[i][0], D[i][1]) for i in ORDER]
