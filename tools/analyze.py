"""
Text-mode inspection of a screenshot.

I cannot look at pictures, so this maps the image into a coarse semantic grid
(what kind of thing is where) plus numeric colour statistics (is the gradient
right, is it blown out, is anything rendering at all).
"""

import sys
from PIL import Image


def cls_for(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    v = mx / 255.0
    s = 0.0 if mx == 0 else (mx - mn) / mx

    # hue in degrees
    if mx == mn:
        h = 0
    elif mx == r:
        h = (60 * ((g - b) / (mx - mn))) % 360
    elif mx == g:
        h = 60 * ((b - r) / (mx - mn)) + 120
    else:
        h = 60 * ((r - g) / (mx - mn)) + 240

    if v > 0.95 and s < 0.10:
        return '.'          # blown-out white / cloud
    if v > 0.84 and s < 0.24:
        return ':'          # pale cream / haze
    if s < 0.09:
        return 'W' if v > 0.62 else ('x' if v > 0.30 else 'k')

    if h < 16 or h >= 338:
        ch = 'R'
    elif h < 44:
        ch = 'o'            # orange / warm brown
    elif h < 68:
        ch = 'y'            # yellow
    elif h < 92:
        ch = 'l'            # yellow-green
    elif h < 165:
        ch = 'G'            # green
    elif h < 200:
        ch = 'c'            # cyan / teal
    elif h < 255:
        ch = 'B'            # blue
    elif h < 300:
        ch = 'p'            # purple
    else:
        ch = 'm'            # magenta / rose

    if v < 0.40:
        ch = ch.lower()
    return ch


def main(path, cols=56):
    img = Image.open(path).convert('RGB')
    W, H = img.size
    rows = max(1, round(cols * H / W / 2.1))

    print(f'{path}  {W}x{H}  grid {cols}x{rows}')

    # ---- semantic grid ----
    cell_w, cell_h = W / cols, H / rows
    for ry in range(rows):
        line = []
        for cx in range(cols):
            box = (int(cx * cell_w), int(ry * cell_h), int((cx + 1) * cell_w), int((ry + 1) * cell_h))
            tile = img.crop(box).resize((1, 1), Image.BILINEAR)
            r, g, b = tile.getpixel((0, 0))
            line.append(cls_for(r, g, b))
        print(''.join(line))

    # ---- statistics ----
    px = img.load()
    step = max(1, W // 200)
    data = [px[x, y] for y in range(0, H, step) for x in range(0, W, step)]
    n = len(data)
    mr = sum(p[0] for p in data) / n
    mg = sum(p[1] for p in data) / n
    mb = sum(p[2] for p in data) / n

    var = sum((p[0] - mr) ** 2 + (p[1] - mg) ** 2 + (p[2] - mb) ** 2 for p in data) / n
    print(f'\nmean rgb = ({mr:.0f}, {mg:.0f}, {mb:.0f})  #{int(mr):02x}{int(mg):02x}{int(mb):02x}')
    print(f'variance = {var ** 0.5:.1f}   (a flat/broken render is < 8)')

    # ---- vertical gradient by band ----
    print('\nvertical bands (top -> bottom):')
    bands = 8
    for i in range(bands):
        y0, y1 = int(H * i / bands), int(H * (i + 1) / bands)
        tot = [0, 0, 0]
        cnt = 0
        for y in range(y0, y1, max(1, (y1 - y0) // 30)):
            for x in range(0, W, max(1, W // 40)):
                p = px[x, y]
                tot[0] += p[0]
                tot[1] += p[1]
                tot[2] += p[2]
                cnt += 1
        r, g, b = (c / cnt for c in tot)
        print(f'  {i}: #{int(r):02x}{int(g):02x}{int(b):02x}  lum {(0.2126*r + 0.7152*g + 0.0722*b):.0f}')

    # ---- left column (menu overlap) ----
    lw = int(W * 0.30)
    tot = [0, 0, 0]
    cnt = 0
    for y in range(int(H * 0.15), int(H * 0.85), 6):
        for x in range(0, lw, 6):
            p = px[x, y]
            tot[0] += p[0]
            tot[1] += p[1]
            tot[2] += p[2]
            cnt += 1
    r, g, b = (c / cnt for c in tot)
    print(f'\nleft 30%  = #{int(r):02x}{int(g):02x}{int(b):02x}  (should be light/cream so the menu reads)')

    # region checks
    def region(fx0, fy0, fx1, fy1):
        t = [0, 0, 0]
        c = 0
        for y in range(int(H * fy0), int(H * fy1), 5):
            for x in range(int(W * fx0), int(W * fx1), 5):
                p = px[x, y]
                t[0] += p[0]
                t[1] += p[1]
                t[2] += p[2]
                c += 1
        return tuple(round(v / c) for v in t)

    print(f'\nsky (top strip)      = {region(0.40, 0.02, 0.95, 0.12)}')
    print(f'horizon (mid strip)  = {region(0.40, 0.40, 0.95, 0.50)}')
    print(f'island core (centre) = {region(0.35, 0.55, 0.85, 0.80)}')

    # ---- class histogram + per-class mean ----
    from collections import Counter

    counts = Counter()
    sums = {}
    for y in range(0, H, 3):
        for x in range(0, W, 3):
            r, g, b = px[x, y]
            k = cls_for(r, g, b)
            counts[k] += 1
            s = sums.setdefault(k, [0, 0, 0, 0])
            s[0] += r
            s[1] += g
            s[2] += b
            s[3] += 1

    total = sum(counts.values())
    print('\nclass breakdown:')
    for k, n in counts.most_common():
        s = sums[k]
        print(
            f'  {k}  {n*100/total:5.1f}%  mean #{int(s[0]/s[3]):02x}{int(s[1]/s[3]):02x}{int(s[2]/s[3]):02x}'
        )

    # average of the green pixels tells us whether the meadow reads as lit grass
    gs = sums.get('G') or sums.get('l')
    if gs and gs[3]:
        print(f'\nbright grass mean   = #{int(gs[0]/gs[3]):02x}{int(gs[1]/gs[3]):02x}{int(gs[2]/gs[3]):02x}')
    ls = sums.get('l')
    if ls and ls[3]:
        print(f'yellow-green mean   = #{int(ls[0]/ls[3]):02x}{int(ls[1]/ls[3]):02x}{int(ls[2]/ls[3]):02x}')


if __name__ == '__main__':
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 56)
