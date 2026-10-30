"""Generates assets/og.png â€” the 1200x630 social preview card."""

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os, math, random

W, H = 1200, 630
img = Image.new("RGB", (W, H), "#8fc4e6")
d = ImageDraw.Draw(img)

# ---------- sky gradient (golden hour, same palette as the site) ----------
stops = [
    (0.00, (47, 111, 176)),    # #2f6fb0
    (0.34, (123, 182, 222)),   # #7bb6de
    (0.62, (255, 215, 156)),   # #ffd79c
    (1.00, (255, 194, 122)),   # #ffc27a
]
for y in range(H):
    t = y / (H - 1)
    for i in range(len(stops) - 1):
        a, ca = stops[i]
        b, cb = stops[i + 1]
        if a <= t <= b:
            k = (t - a) / (b - a)
            k = k * k * (3 - 2 * k)
            col = tuple(int(ca[j] + (cb[j] - ca[j]) * k) for j in range(3))
            d.line([(0, y), (W, y)], fill=col)
            break

# ---------- sun glow ----------
glow = Image.new("RGB", (W, H), (0, 0, 0))
gd = ImageDraw.Draw(glow)
sx, sy = int(W * 0.78), int(H * 0.30)
for r in range(340, 0, -6):
    a = int(90 * (1 - r / 340) ** 2.2)
    gd.ellipse([sx - r, sy - r * 0.9, sx + r, sy + r * 0.9], fill=(a, int(a * 0.72), int(a * 0.36)))
glow = glow.filter(ImageFilter.GaussianBlur(34))
img = Image.blend(img, Image.blend(img, Image.new("RGB", (W, H), "#fff1c8"), 0.55), 0.0)
img = Image.composite(Image.new("RGB", (W, H), "#fff4d2"), img, glow.convert("L").point(lambda v: min(255, int(v * 2.1))))
d = ImageDraw.Draw(img)

# ---------- clouds ----------
random.seed(7)
cloud_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
cd = ImageDraw.Draw(cloud_layer)
for (cx, cy, s, alpha) in [
    (150, 110, 1.15, 205), (420, 78, 0.8, 150), (980, 96, 0.95, 170),
    (300, 200, 0.6, 120), (760, 168, 0.7, 130), (1120, 190, 0.55, 110),
]:
    for i in range(9):
        ox = cx + (random.random() - 0.5) * 190 * s
        oy = cy + (random.random() - 0.5) * 48 * s
        r = (34 + random.random() * 34) * s
        cd.ellipse([ox - r, oy - r * 0.66, ox + r, oy + r * 0.66],
                   fill=(255, 250, 240, alpha))
cloud_layer = cloud_layer.filter(ImageFilter.GaussianBlur(13))
img = Image.alpha_composite(img.convert("RGBA"), cloud_layer).convert("RGB")
d = ImageDraw.Draw(img)

# ---------- the island ----------
cx, cy = int(W * 0.60), int(H * 0.575)
iw, ih = 300, 78

# cloud sea under the island
sea = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(sea)
for i in range(26):
    x = cx - 420 + random.random() * 840
    y = cy + 190 + random.random() * 150
    r = 46 + random.random() * 78
    sd.ellipse([x - r, y - r * 0.42, x + r, y + r * 0.42], fill=(255, 246, 226, 150))
sea = sea.filter(ImageFilter.GaussianBlur(20))
img = Image.alpha_composite(img.convert("RGBA"), sea).convert("RGB")
d = ImageDraw.Draw(img)

# rock underside
underside = [
    (cx - iw, cy + 6), (cx + iw, cy + 6),
    (cx + iw * 0.52, cy + 108), (cx + iw * 0.16, cy + 168),
    (cx - iw * 0.34, cy + 120),
]
d.polygon(underside, fill=(150, 118, 82))
d.polygon([(cx - iw, cy + 6), (cx + iw, cy + 6), (cx + iw * 0.66, cy + 62), (cx - iw * 0.72, cy + 58)],
          fill=(176, 142, 102))
d.polygon([(cx - iw * 0.72, cy + 58), (cx + iw * 0.66, cy + 62), (cx + iw * 0.3, cy + 112), (cx - iw * 0.4, cy + 104)],
          fill=(122, 96, 68))

# grass top
d.ellipse([cx - iw, cy - ih, cx + iw, cy + ih], fill=(140, 194, 88))
d.ellipse([cx - iw, cy - ih - 6, cx + iw, cy + ih - 10], fill=(163, 211, 106))
d.ellipse([cx - iw * 0.62, cy - ih * 0.86, cx + iw * 0.36, cy + ih * 0.1], fill=(180, 222, 124))

# trees
for (tx, ty, tr) in [
    (cx - 168, cy - 16, 30), (cx - 118, cy - 34, 22), (cx + 120, cy - 30, 26),
    (cx + 176, cy - 8, 20), (cx + 40, cy - 46, 18), (cx - 40, cy - 52, 16),
    (cx + 210, cy - 24, 15), (cx - 220, cy - 4, 16),
]:
    d.line([(tx, ty + tr * 0.7), (tx, ty + tr * 1.5)], fill=(122, 85, 64), width=4)
    d.ellipse([tx - tr, ty - tr * 0.92, tx + tr, ty + tr * 0.92], fill=(111, 165, 76))
    d.ellipse([tx - tr * 0.7, ty - tr * 1.05, tx + tr * 0.55, ty + tr * 0.3], fill=(139, 191, 92))

# little cottage
hx, hy = cx - 62, cy - 30
d.rectangle([hx - 30, hy - 26, hx + 30, hy + 2], fill=(246, 236, 216))
d.polygon([(hx - 40, hy - 24), (hx + 40, hy - 24), (hx, hy - 66)], fill=(192, 106, 78))
d.rectangle([hx - 7, hy - 16, hx + 7, hy + 2], fill=(138, 90, 59))
d.rectangle([hx + 14, hy - 18, hx + 26, hy - 8], fill=(255, 227, 171))

# windmill
wx, wy = cx + 152, cy - 22
d.polygon([(wx - 16, wy + 2), (wx + 16, wy + 2), (wx + 10, wy - 74), (wx - 10, wy - 74)], fill=(240, 228, 204))
d.polygon([(wx - 18, wy - 72), (wx + 18, wy - 72), (wx, wy - 100)], fill=(181, 100, 74))
for a in range(4):
    ang = a * math.pi / 2 + 0.5
    ex = wx + math.cos(ang) * 34
    ey = wy - 74 + math.sin(ang) * 34
    d.line([(wx, wy - 74), (ex, ey)], fill=(122, 85, 64), width=4)

# ---------- text ----------
def load_font(names, size):
    for n in names:
        p = os.path.join("C:\\Windows\\Fonts", n)
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

f_name = load_font(["segoeuib.ttf", "arialbd.ttf", "calibrib.ttf", "verdanab.ttf"], 74)
f_sub = load_font(["segoeui.ttf", "arial.ttf", "calibri.ttf", "verdana.ttf"], 30)
f_tag = load_font(["segoeuib.ttf", "arialbd.ttf", "segoeui.ttf"], 24)

tx = 74
d.text((tx + 3, 101), "Karl Rapada", font=f_name, fill=(64, 50, 31))
d.text((tx, 98), "Karl Rapada", font=f_name, fill=(255, 252, 242))

d.text((tx + 2, 196), "Software Developer  Â·  Marikina City, Philippines", font=f_sub, fill=(255, 249, 232))

badge = "Laravel  Â·  React  Â·  Python  Â·  Computer vision"
bw = d.textlength(badge, font=f_tag)
d.rounded_rectangle([tx, 246, tx + bw + 44, 296], radius=25, fill=(255, 250, 240))
d.text((tx + 22, 258), badge, font=f_tag, fill=(140, 96, 30))

d.text((tx + 2, 486), "portfolio for the projects I actually shipped â†’", font=f_tag, fill=(255, 250, 238))

img.save("assets/og.png", optimize=True)
print("assets/og.png", img.size)
