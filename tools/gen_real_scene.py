"""Grabungsstätte am Nordrand des Djurkaram – realistische Draufsicht (Drachenchronik I, S. 46/47)."""
import math, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.ndimage import gaussian_filter, zoom
from real import fbm, ridged, shade, cast_shadow, lerp, col, to_img, Layer, grain, LIGHT

OUT = sys.argv[1]
PREVIEW = len(sys.argv) > 2
W, H = 4400, 3600
FX, FY, CELL, N = 1200, 800, 200, 10
rng = random.Random(1034); nrng = np.random.default_rng(1034)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

# ---------------- Lagerplan ----------------
CORE = [  # (x, y, Art, Breite, Höhe, Drehung)
    (3760, 640, "hilbert", 340, 210, 7), (4060, 1010, "exped", 270, 165, -14), (3560, 1080, "helden", 220, 140, 22),
    (3850, 1380, "kueche", 82, 0, 0), (4120, 1460, "werkzeug", 170, 120, 9), (3640, 1820, "werkstatt", 300, 150, -8)]
CLUSTERS = [(680, 520, 5), (1720, 330, 3), (2980, 330, 3), (3860, 2440, 6), (300, 1280, 3)]
WATER = (560, 1960)
PEN = [(260, 2380), (720, 2330), (790, 2700), (430, 2840), (200, 2680)]
TRACKS = [[(-20, 1700), (300, 1650), (700, 1720), (1150, 1820)],
          [(3460, 1150), (3330, 1260), (3220, 1330)], [(3720, 1500), (3420, 1600), (3220, 1700)],
          [(3700, 2380), (3450, 2330), (3220, 2290)], [(980, 700), (1100, 790), (1180, 860)],
          [(1800, 430), (2100, 520), (2330, 560)], [(2900, 430), (2650, 520), (2470, 560)],
          [(430, 1250), (800, 1450), (1150, 1560)], [(560, 2080), (480, 2330)]]

# ---------------- Gelände ----------------
def ridge_y(x): return 3090 - 230 * math.exp(-((x - 3950) / 620) ** 2) - 60 * math.sin(x / 260) - 40 * math.sin(x / 90 + 1)
ry = np.array([ridge_y(x) for x in range(W)], np.float32)
mnt = np.clip((yy - ry[None, :]) / 380, 0, 1).astype(np.float32)           # 0 Ebene … 1 Gebirge
mnt = gaussian_filter(mnt, 8)
mnt_h = mnt ** 1.3

hm = fbm(H, W, 900, 4, 1).astype(np.float32) * 28 + fbm(H, W, 160, 4, 2).astype(np.float32) * 7
warp = fbm(H, W, 300, 3, 3).astype(np.float32) * 40
ripple = np.sin((xx * 0.55 + yy * 0.83 + warp) / 7.5).astype(np.float32)
sandy = np.clip(fbm(H, W, 700, 3, 4) * 1.6 + 0.2, 0, 1).astype(np.float32)          # wo Flugsand liegt
hm += ripple * 0.9 * sandy
# Berge: Grate und Schluchten
rid = ridged(H, W, 300, 6, 5).astype(np.float32)
rid2 = ridged(H, W, 90, 4, 15).astype(np.float32)
mt_relief = rid * 1.0 + rid2 * 0.35 + fbm(H, W, 40, 3, 16).astype(np.float32) * 0.05
hm += mnt_h * (mt_relief * 520 + 80)
# Grabungsfeld eingeebnet und festgetreten
fmask = np.zeros((H, W), np.float32); fmask[FY - 40:FY + N * CELL + 40, FX - 40:FX + N * CELL + 40] = 1
fmask = gaussian_filter(fmask, 22)
hm = hm * (1 - fmask) + (gaussian_filter(hm, 30) - 4) * fmask
# Wege (festgetreten)
paths = Image.new("L", (W, H), 0); dp = ImageDraw.Draw(paths)
for k, pts in enumerate(TRACKS):
    dp.line(pts, fill=255, width=44 if k == 0 else 30, joint="curve")
for (cx, cy, n) in CLUSTERS:
    dp.ellipse([cx - 150, cy - 120, cx + 150, cy + 120], fill=200)
dp.ellipse([3500, 1250, 4150, 1700], fill=170)
pm = gaussian_filter(np.array(paths, np.float32) / 255, 10)
hm -= pm * 3
# Wasserloch
wx, wy = WATER
bowl = np.exp(-(((xx - wx) / 220) ** 2 + ((yy - wy) / 140) ** 2) * 2.2).astype(np.float32)
hm -= bowl * 46
# Kies und Steine als kleine Höcker
imp = np.zeros((H, W), np.float32)
for _ in range(45000):
    x, y = nrng.integers(0, W), nrng.integers(0, H)
    imp[y, x] += nrng.uniform(0.6, 1.6)
stony = np.clip(1 - sandy * 1.2 + mnt * 0.8, 0, 1) * (1 - fmask * 0.95)
imp *= (0.4 + np.clip(fbm(H, W, 120, 3, 41), 0, 1) * 1.6).astype(np.float32)   # Kies in Flecken statt gleichmäßig
hm += (gaussian_filter(imp, 1.4) * 22 + gaussian_filter(imp, 3.0) * 14) * stony

# ---------------- Farben ----------------
sand_c = col((218, 184, 132)); dust_c = col((196, 166, 124)); stone_c = col((170, 150, 126))
rock_c = col((150, 124, 98)); rock2_c = col((118, 96, 78)); field_c = col((206, 176, 132)); path_c = col((214, 190, 150))
v1 = fbm(H, W, 400, 4, 9).astype(np.float32); v2 = fbm(H, W, 40, 3, 10).astype(np.float32)
alb = lerp(dust_c, sand_c, np.clip(sandy, 0, 1))
alb = lerp(alb, stone_c, np.clip(stony * 0.45 + gaussian_filter(imp, 1.6) * 3, 0, 1))
strata = (np.sin((yy * 0.09 + v1 * 18)) * 0.5 + 0.5).astype(np.float32)
rock_alb = lerp(rock_c, rock2_c, np.clip(strata * 0.6 + v2 * 0.4, 0, 1))
scree = np.clip(1 - mt_relief * 1.4, 0, 1)                    # Geröll und Sand in den Tälern
rock_alb = lerp(rock_alb, col((176, 150, 118)), scree * 0.6)
alb = lerp(alb, rock_alb, np.clip(mnt * 1.4, 0, 1))
alb = lerp(alb, field_c, fmask * 0.85)
alb = lerp(alb, path_c, pm * 0.6)
varn = np.clip(fbm(H, W, 260, 4, 17) * 1.8 - 0.4, 0, 1).astype(np.float32)
alb = lerp(alb, col((168, 128, 92)), varn * 0.35 * (1 - fmask) * (1 - mnt))
streak = np.clip(np.sin((xx * 0.5 + yy * 0.85 + warp * 3) / 90) * 0.5 + fbm(H, W, 200, 3, 18) * 0.8, 0, 1).astype(np.float32)
alb = lerp(alb, col((232, 204, 158)), streak * 0.18 * (1 - fmask) * (1 - mnt))
alb *= (0.93 + v1[..., None] * 0.06 + v2[..., None] * 0.04)
# feuchter Rand und Wasser
wet = np.clip(bowl * 2.4 - 0.25, 0, 1)
alb = lerp(alb, col((150, 126, 96)), wet * 0.7)

rgb = shade(hm, alb, strength=1.0, ambient=0.46, ao_r=10, ao_k=0.012)
# Bergschatten (grob gerechnet, dann hochskaliert)
small = zoom(hm, 0.25, order=1)
sh = cast_shadow(small, steps=90, step=2.0)
sh = zoom(sh, (H / sh.shape[0], W / sh.shape[1]), order=1)[:H, :W]
rgb *= (1 - sh[..., None] * 0.55)
# Wasser
water = np.clip((bowl - 0.30) * 10, 0, 1)
wcol = lerp(col((104, 124, 104)), col((40, 66, 66)), np.clip((bowl - 0.30) * 2.2, 0, 1))
rgb = lerp(rgb, wcol + (fbm(H, W, 30, 2, 12)[..., None] * 6), water)
# Spiegelung
rgb += (np.clip(1 - np.abs((xx - wx + 60) / 70) - np.abs((yy - wy + 30) / 30), 0, 1) * water * 28)[..., None]
del imp, ripple, warp

# ---------------- Objekte ----------------
L = Layer((W, H), S=2)
S = L.S
occupied = [(FX - 70, FY - 150, FX + N * CELL + 70, FY + N * CELL + 70)]
def occ(x0, y0, x1, y1): occupied.append((x0, y0, x1, y1))
def free(x, y, pad=0):
    if y > ridge_y(x) + 40: return False
    if (x - wx) ** 2 / 270 ** 2 + (y - wy) ** 2 / 190 ** 2 < 1: return False
    return not any(a - pad <= x <= c + pad and b - pad <= y <= d + pad for a, b, c, d in occupied)

def paste(arr_rgb, alpha, x, y):
    """Fertig schattiertes Objekt (in 1x) an Position x,y (oben links) einsetzen."""
    im = Image.fromarray(np.clip(arr_rgb, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    im.putalpha(Image.fromarray(np.clip(alpha * 255, 0, 255).astype(np.uint8), "L"))
    im = im.resize((im.width * S, im.height * S), Image.LANCZOS)
    L.img.alpha_composite(im, (int(x * S), int(y * S)))

def place(rgb_arr, alpha, cx, cy, ang, sh_h):
    im = Image.fromarray(np.clip(rgb_arr, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    im.putalpha(Image.fromarray(np.clip(alpha * 255, 0, 255).astype(np.uint8), "L"))
    im = im.rotate(-ang, expand=True, resample=Image.BICUBIC)
    big = im.resize((im.width * S, im.height * S), Image.LANCZOS)
    ox, oy = int((cx - im.width / 2) * S), int((cy - im.height / 2) * S)
    L.sh.paste(255, (ox + int(sh_h * S), oy + int(sh_h * S)), big.getchannel("A"))
    L.img.alpha_composite(big, (ox, oy))

def rotp(cx, cy, x, y, ang):
    a = math.radians(ang); return (cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a))

def obj_shade(hm_o, alb_o, ambient=0.5, strength=1.0):
    return shade(hm_o, alb_o, strength, ambient=ambient, ao_r=3, ao_k=0.02)

def tent(cx, cy, w, h, fabric, stripe=None, poles=2, rot=0.0, height=26, seed=0):
    """Zelt von oben: Firstlinie mit Stangen, durchhängende Bahnen, Falten, Abspannungen, Schlagschatten."""
    r = np.random.default_rng(abs(int(seed)))
    tw, th = int(w + 4), int(h + 4)
    y, x = np.mgrid[0:th, 0:tw].astype(np.float32)
    u = (x - tw / 2) / (w / 2); v = (y - th / 2) / (h / 2)
    inside = (np.abs(u) <= 1) & (np.abs(v) <= 1)
    ridge = np.clip(1 - np.abs(v), 0, 1) ** 0.85
    pole_pos = np.linspace(-1, 1, poles + 2)[1:-1]
    sag = np.min([np.abs(u - p) for p in pole_pos], axis=0) if poles else np.abs(u)
    edge_droop = np.clip(1 - np.abs(u), 0, 1) ** 0.15
    hgt = ridge * height * (1 - 0.3 * sag ** 1.4) * edge_droop + np.sin(u * 24 + r.uniform(0, 6)) * 0.9 * ridge + fbm(th, tw, 18, 3, seed) * 1.4
    alb = np.ones((th, tw, 3), np.float32) * np.array(fabric, np.float32)
    if stripe is not None:
        band = (np.sin(u * math.pi * 7) > 0.55)
        alb[band] = np.array(stripe, np.float32)
    alb *= (0.92 + fbm(th, tw, 5, 2, seed + 1)[..., None] * 0.1) * (0.96 + np.sin(v * 60)[..., None] * 0.02)
    out = obj_shade(hgt * 1.6, alb, ambient=0.42)
    a = gaussian_filter(inside.astype(np.float32), 0.8)
    place(out, a, cx, cy, rot, height * 0.8)
    for p in pole_pos:
        px, py = rotp(cx, cy, p * w / 2, 0, rot)
        L.d.ellipse([(px - 4) * S, (py - 4) * S, (px + 4) * S, (py + 4) * S], fill=(70, 52, 34, 255))
    for sx, sy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:
        x0, y0 = rotp(cx, cy, sx * w / 2, sy * h / 2, rot); x1, y1 = rotp(cx, cy, sx * (w / 2 + 30), sy * (h / 2 + 24), rot)
        L.d.line([(x0 * S, y0 * S), (x1 * S, y1 * S)], fill=(214, 196, 160, 230), width=2)
        L.shadow_line([(x0, y0), (x1, y1)], 2, 6)
        L.d.ellipse([(x1 - 3) * S, (y1 - 3) * S, (x1 + 3) * S, (y1 + 3) * S], fill=(92, 66, 42, 255))
    rr = math.hypot(w, h) / 2 + 30
    occ(cx - rr, cy - rr, cx + rr, cy + rr)

def round_tent(cx, cy, rad, fabric, seed=0):
    t = int(rad * 2 + 10)
    y, x = np.mgrid[0:t, 0:t].astype(np.float32) - t / 2
    d = np.sqrt(x ** 2 + y ** 2) / rad
    a = np.arctan2(y, x)
    hgt = np.clip(1 - d, 0, 1) * 40 + np.sin(a * 12) * 1.5 * np.clip(d, 0, 1) * (d < 1)
    alb = np.ones((t, t, 3), np.float32) * np.array(fabric, np.float32) * (0.95 + fbm(t, t, 5, 2, seed)[..., None] * 0.06)
    out = obj_shade(hgt * 1.4, alb, ambient=0.42)
    paste(out, gaussian_filter((d <= 1).astype(np.float32), 0.8), cx - t / 2, cy - t / 2)
    L.d.ellipse([(cx - 5) * S, (cy - 5) * S, (cx + 5) * S, (cy + 5) * S], fill=(70, 52, 34, 255))
    L.shadow_ellipse((cx - rad, cy - rad, cx + rad, cy + rad), 22)
    occ(cx - rad - 30, cy - rad - 30, cx + rad + 30, cy + rad + 30)

def boulder(cx, cy, rad, tint=(160, 140, 116), seed=0, cast=True):
    t = int(rad * 2.6 + 6)
    y, x = np.mgrid[0:t, 0:t].astype(np.float32) - t / 2
    r = np.random.default_rng(abs(int(seed)))
    ang = np.arctan2(y, x); d = np.sqrt(x ** 2 + y ** 2)
    edge = rad * (1 + 0.10 * np.sin(ang * r.integers(2, 4) + r.uniform(0, 6)) + 0.05 * np.sin(ang * 5 + r.uniform(0, 6)) + fbm(t, t, max(3, rad / 2), 2, seed + 7) * 0.12)
    inside = d < edge
    hgt = np.clip(1 - d / edge, 0, 1) ** 0.6 * rad * 0.9 + fbm(t, t, max(3, rad / 3), 3, seed) * rad * 0.12
    alb = np.ones((t, t, 3), np.float32) * np.array(tint, np.float32) * (0.9 + fbm(t, t, 4, 2, seed + 1)[..., None] * 0.14)
    out = obj_shade(hgt * 1.3, alb, ambient=0.4)
    paste(out, gaussian_filter(inside.astype(np.float32), 0.7), cx - t / 2, cy - t / 2)
    if cast: L.shadow_ellipse((cx - rad * 0.9, cy - rad * 0.9, cx + rad * 0.9, cy + rad * 0.9), rad * 0.5)

def shrub(cx, cy, rad, seed=0, green=(96, 104, 58)):
    t = int(rad * 2.8 + 6)
    y, x = np.mgrid[0:t, 0:t].astype(np.float32) - t / 2
    r = np.random.default_rng(abs(int(seed)))
    hgt = np.zeros((t, t), np.float32)
    for _ in range(r.integers(4, 8)):
        ox, oy, rr = r.uniform(-rad * .5, rad * .5), r.uniform(-rad * .5, rad * .5), rad * r.uniform(.45, .8)
        hgt = np.maximum(hgt, np.clip(1 - ((x - ox) ** 2 + (y - oy) ** 2) / rr ** 2, 0, 1) ** 0.5 * rr)
    leaves = fbm(t, t, 2.2, 2, seed) * rad * 0.18
    inside = hgt > 0.5
    alb = np.ones((t, t, 3), np.float32) * np.array(green, np.float32) * (0.75 + fbm(t, t, 3, 2, seed + 2)[..., None] * 0.35)
    out = obj_shade((hgt + leaves) * 1.6, alb, ambient=0.35)
    paste(out, gaussian_filter(inside.astype(np.float32), 0.6), cx - t / 2, cy - t / 2)
    L.shadow_ellipse((cx - rad * .8, cy - rad * .8, cx + rad * .8, cy + rad * .8), rad * 0.55)

def palm(cx, cy, rad, seed=0):
    r = random.Random(seed)
    L.shadow_ellipse((cx - rad * .7, cy - rad * .7, cx + rad * .7, cy + rad * .7), 40)
    for k in range(11):
        a = 2 * math.pi * k / 11 + r.uniform(-.15, .15); Lr = rad * r.uniform(.8, 1.05)
        for seg in range(14):   # Fiederblatt als Folge kleiner Blättchen
            t = seg / 14; px, py = cx + math.cos(a) * Lr * t, cy + math.sin(a) * Lr * t
            for side in (-1, 1):
                aa = a + side * 1.1; l = rad * 0.22 * (1 - t * 0.6)
                lit = 0.5 + 0.5 * math.cos(aa - math.radians(225))
                g = int(54 + 42 * lit + r.uniform(-8, 8)); col_ = (g + 4, g + 14, int(g * 0.5), 255)
                L.d.line([(px * S, py * S), ((px + math.cos(aa) * l) * S, (py + math.sin(aa) * l) * S)], fill=col_, width=3 * S)
        L.d.line([(cx * S, cy * S), ((cx + math.cos(a) * Lr) * S, (cy + math.sin(a) * Lr) * S)], fill=(84, 92, 46, 255), width=2 * S)
    L.d.ellipse([(cx - 8) * S, (cy - 8) * S, (cx + 8) * S, (cy + 8) * S], fill=(96, 74, 46, 255))

def crate(cx, cy, s, seed=0):
    t = int(s + 4)
    y, x = np.mgrid[0:t, 0:t].astype(np.float32)
    hgt = np.ones((t, t), np.float32) * 10; hgt[[0, 1, -1, -2], :] = 0; hgt[:, [0, 1, -1, -2]] = 0
    alb = np.ones((t, t, 3), np.float32) * np.array((150, 108, 66), np.float32)
    for k in range(1, 4): alb[int(t * k / 4), :] *= 0.6
    alb *= (0.9 + fbm(t, t, 3, 2, seed)[..., None] * 0.15)
    out = obj_shade(gaussian_filter(hgt, 1) * 2, alb, ambient=0.5)
    paste(out, np.ones((t, t), np.float32), cx - t / 2, cy - t / 2)
    L.shadow_poly([(cx - s / 2, cy - s / 2), (cx + s / 2, cy - s / 2), (cx + s / 2, cy + s / 2), (cx - s / 2, cy + s / 2)], 10)

def jar(cx, cy, rad, tint=(176, 100, 62), seed=0):
    t = int(rad * 2 + 4)
    y, x = np.mgrid[0:t, 0:t].astype(np.float32) - t / 2
    d = np.sqrt(x ** 2 + y ** 2) / rad
    hgt = np.sqrt(np.clip(1 - d ** 2, 0, 1)) * rad
    alb = np.ones((t, t, 3), np.float32) * np.array(tint, np.float32)
    alb[d < 0.35] *= 0.35
    out = obj_shade(hgt * 1.2, alb, ambient=0.45)
    paste(out, gaussian_filter((d < 1).astype(np.float32), 0.6), cx - t / 2, cy - t / 2)
    L.shadow_ellipse((cx - rad, cy - rad, cx + rad, cy + rad), rad * 0.7)

def log(x0, y0, length, rad, ang=0.0, seed=0):
    """Baumstamm/Balken von oben (Zylinder)."""
    t = int(length + 4); h = int(rad * 2 + 4)
    y, x = np.mgrid[0:h, 0:t].astype(np.float32)
    v = (y - h / 2) / rad
    hgt = np.sqrt(np.clip(1 - v ** 2, 0, 1)) * rad
    alb = np.ones((h, t, 3), np.float32) * np.array((152, 110, 68), np.float32) * (0.85 + fbm(h, t, 3, 2, seed)[..., None] * 0.2)
    out = obj_shade(hgt * 1.3, alb, ambient=0.45)
    im = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    im.putalpha(Image.fromarray(((np.abs(v) < 1) * 255).astype(np.uint8), "L"))
    im = im.rotate(-ang, expand=True, resample=Image.BICUBIC)
    im = im.resize((im.width * S, im.height * S), Image.LANCZOS)
    L.img.alpha_composite(im, (int((x0 - im.width / S / 2) * S), int((y0 - im.height / S / 2) * S)))
    a = math.radians(ang); dx, dy = math.cos(a) * length / 2, math.sin(a) * length / 2
    L.shadow_line([(x0 - dx, y0 - dy), (x0 + dx, y0 + dy)], rad * 2, rad)

def stake(x, y, s=7):
    L.d.rectangle([(x - s / 2) * S, (y - s / 2) * S, (x + s / 2) * S, (y + s / 2) * S], fill=(112, 80, 48, 255))
    L.d.rectangle([(x - s / 2) * S, (y - s / 2) * S, (x) * S, (y) * S], fill=(150, 112, 70, 255))
    L.shadow_line([(x, y), (x + 14, y + 14)], s * 0.8, 0)

def rope(pts):
    L.d.line([(x * S, y * S) for x, y in pts], fill=(206, 186, 146, 240), width=3 * S // 2)
    L.shadow_line(pts, 2, 5)

def camel(cx, cy, ang, seed=0, tint=(176, 140, 98)):
    t = 140
    y, x = np.mgrid[0:t, 0:t].astype(np.float32) - t / 2
    body = np.clip(1 - (x / 44) ** 2 - (y / 18) ** 2, 0, 1)
    hump = np.clip(1 - ((x + 3) / 16) ** 2 - (y / 12) ** 2, 0, 1)
    hgt = np.sqrt(body) * 18 + np.sqrt(hump) * 14
    neck = (x > 38) & (x < 62) & (np.abs(y) < 5.5)
    head = ((x - 66) / 9) ** 2 + (y / 6) ** 2 < 1
    hgt[neck] = 8; hgt[head] = 9
    alb = np.ones((t, t, 3), np.float32) * np.array(tint, np.float32) * (0.92 + fbm(t, t, 4, 2, seed)[..., None] * 0.1)
    out = obj_shade(gaussian_filter(hgt, 0.8) * 1.4, alb, ambient=0.45)
    a = ((body > 0) | neck | head).astype(np.float32)
    im = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    im.putalpha(Image.fromarray((gaussian_filter(a, 0.6) * 255).astype(np.uint8), "L"))
    im = im.rotate(-ang, resample=Image.BICUBIC)
    sh = im.getchannel("A").resize((t * S, t * S))
    L.sh.paste(255, (int((cx - t / 2 + 14) * S), int((cy - t / 2 + 14) * S)), sh)
    L.img.alpha_composite(im.resize((t * S, t * S), Image.LANCZOS), (int((cx - t / 2) * S), int((cy - t / 2) * S)))

def cloth(x0, y0, x1, y1, fabric, sag=6, seed=0, poles=True, rot=0.0):
    tw, th = int(x1 - x0), int(y1 - y0); cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    y, x = np.mgrid[0:th, 0:tw].astype(np.float32)
    u = x / tw; v = y / th
    hgt = 20 - sag * (np.sin(u * math.pi) * np.sin(v * math.pi)) + fbm(th, tw, 12, 2, seed) * 0.8
    alb = np.ones((th, tw, 3), np.float32) * np.array(fabric, np.float32) * (0.94 + fbm(th, tw, 5, 2, seed + 1)[..., None] * 0.08)
    out = obj_shade(hgt * 1.5, alb, ambient=0.55)
    place(out, np.ones((th, tw), np.float32) * 0.97, cx, cy, rot, 22)
    if poles:
        for sx, sy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:
            px, py = rotp(cx, cy, sx * tw / 2, sy * th / 2, rot)
            L.d.ellipse([(px - 4) * S, (py - 4) * S, (px + 4) * S, (py + 4) * S], fill=(80, 58, 36, 255))
    rr = math.hypot(tw, th) / 2 + 20
    occ(cx - rr, cy - rr, cx + rr, cy + rr)

def firepit(cx, cy):
    for k in range(10):
        a = 2 * math.pi * k / 10
        boulder(cx + math.cos(a) * 30, cy + math.sin(a) * 30, 8, (128, 118, 108), seed=900 + k)
    L.d.ellipse([(cx - 22) * S, (cy - 22) * S, (cx + 22) * S, (cy + 22) * S], fill=(70, 64, 60, 255))
    glow = Image.new("RGBA", (120 * S, 120 * S), (0, 0, 0, 0)); dg = ImageDraw.Draw(glow)
    dg.ellipse([40 * S, 40 * S, 80 * S, 80 * S], fill=(255, 140, 40, 200)); glow = glow.filter(ImageFilter.GaussianBlur(10 * S))
    L.img.alpha_composite(glow, (int((cx - 60) * S), int((cy - 60) * S)))
    for _ in range(5):
        a = rng.uniform(0, 6.28); log(cx + math.cos(a) * 6, cy + math.sin(a) * 6, 34, 3.5, math.degrees(a), seed=rng.randint(0, 999))
    occ(cx - 50, cy - 50, cx + 50, cy + 50)

def wheel(cx, cy):
    """Förderrad (Laufrad) von oben mit Gestell und Ausleger ins Feld."""
    for dx in (-70, 70):
        log(cx + dx, cy, 190, 6, 90, seed=31 + dx)
    log(cx, cy, 170, 5, 0, seed=33)
    t_w, t_h = 236, 60
    y, x = np.mgrid[0:t_h, 0:t_w].astype(np.float32)
    v = (y - t_h / 2) / (t_h / 2)
    hgt = np.sqrt(np.clip(1 - v ** 2, 0, 1)) * 30
    alb = np.ones((t_h, t_w, 3), np.float32) * np.array((146, 104, 64), np.float32) * (0.85 + fbm(t_h, t_w, 3, 2, 40)[..., None] * 0.2)
    for k in range(0, t_w, 18): alb[:, k:k + 2] *= 0.55
    out = obj_shade(hgt * 1.3, alb, ambient=0.45)
    paste(out, np.ones((t_h, t_w), np.float32), cx - t_w / 2, cy - t_h / 2)
    L.shadow_poly([(cx - t_w / 2, cy - t_h / 2), (cx + t_w / 2, cy - t_h / 2), (cx + t_w / 2, cy + t_h / 2), (cx - t_w / 2, cy + t_h / 2)], 26)
    log(cx, cy + 210, 250, 7, 90, seed=35)                 # Ausleger zum Feld
    rope([(cx, cy + 330), (cx, cy + 368)])
    jar(cx, cy + 380, 14, (170, 140, 92), seed=36)        # Korb
    occ(cx - 150, cy - 110, cx + 150, cy + 130)

# --- Lager (S. 46): organisch verteilt, Gruppen um Feuerstellen ---
GOAT = (66, 52, 42); GOAT2 = (92, 74, 58); GOAT3 = (78, 62, 50); CANVAS = (226, 214, 190); CANVAS2 = (196, 172, 136)
placed = []   # (x, y, r) bereits gesetzter Zelte, um Überlappungen zu vermeiden
def room(x, y, r):
    if not all((x - a) ** 2 + (y - b) ** 2 > (r + c) ** 2 for a, b, c in placed): return False
    if y + r * 0.7 > ridge_y(x) - 20 or (x - wx) ** 2 / 300 ** 2 + (y - wy) ** 2 / 230 ** 2 < 1: return False
    return not any(a0 - r * 0.8 <= x <= c0 + r * 0.8 and b0 - r * 0.8 <= y <= d0 + r * 0.8 for a0, b0, c0, d0 in STATIC)

# Expeditionskern
for (x, y, kind, w, h, rot) in CORE:
    if kind == "hilbert": tent(x, y, w, h, GOAT, GOAT2, poles=3, rot=rot, height=30, seed=1)
    elif kind == "exped": tent(x, y, w, h, CANVAS, CANVAS2, poles=2, rot=rot, height=26, seed=2)
    elif kind == "helden": tent(x, y, w, h, CANVAS, (176, 70, 52), poles=2, rot=rot, height=24, seed=3)
    elif kind == "werkzeug": tent(x, y, w, h, CANVAS2, None, poles=1, rot=rot, height=20, seed=4)
    elif kind == "kueche": round_tent(x, y, w, CANVAS, seed=5)
    elif kind == "werkstatt":
        cloth(x - w / 2, y - h / 2, x + w / 2, y + h / 2, CANVAS2, seed=7, rot=rot)
    placed.append((x, y, math.hypot(w, h or w) / 2 + 20))
firepit(3690, 1440)
# Holz bei der Werkstatt, Kisten und Krüge verstreut
for k in range(6): log(3640 + rng.uniform(-6, 6), 1960 + k * 17, 260 - (k % 2) * 34, 8, -8 + rng.uniform(-3, 3), seed=50 + k)
occ(3470, 1900, 3820, 2080)
for k in range(7):
    crate(4060 + rng.uniform(-90, 90), 1590 + rng.uniform(-30, 60), rng.uniform(30, 40), seed=k)
for k in range(8):
    jar(3560 + rng.uniform(-60, 60), 1560 + rng.uniform(-30, 40), rng.uniform(11, 16), seed=20 + k)
for k in range(4):
    jar(3420 + rng.uniform(-40, 40), 820 + rng.uniform(-40, 40), rng.uniform(12, 15), (184, 150, 100), seed=40 + k)
# kleine Pavillons (Sonnensegel) zwischen den Zelten
for (x, y, w, h, rot) in [(3400, 1440, 170, 120, 14), (4170, 760, 150, 110, -20), (3330, 2050, 160, 110, 31)]:
    cloth(x - w / 2, y - h / 2, x + w / 2, y + h / 2, CANVAS if rot > 0 else CANVAS2, sag=8, seed=int(x), rot=rot)
    placed.append((x, y, math.hypot(w, h) / 2 + 10))

# feste Sperrflächen: Grabungsfeld samt Beschriftung, Förderrad, Pferch, Lagerkern
STATIC = [(FX - 160, FY - 170, FX + N * CELL + 60, FY + N * CELL + 60), (2250, 380, 2560, 700), (150, 2280, 840, 2880), (3380, 420, 4300, 2120), (170, 1600, 980, 2290)]
# Arbeiterzelte: Gruppen um eine Feuerstelle, Eingang zum Feuer, leicht unregelmäßig
for ci, (fx, fy, n) in enumerate(CLUSTERS):
    firepit(fx, fy)
    placed.append((fx, fy, 70))
    base_ang = rng.uniform(0, 360); k = 0; tries = 0
    while k < n and tries < 900:
        tries += 1
        a = math.radians(base_ang + k * 360 / n + rng.uniform(-28, 28) + (tries // 30) * 41)
        dist = rng.uniform(250, 300) + n * 18
        x, y = fx + math.cos(a) * dist, fy + math.sin(a) * dist
        w, h = rng.uniform(270, 320), rng.uniform(160, 195)          # ~6 × 4 Schritt für rund 10 Arbeiter
        r_ = w / 2 + 6
        if not (r_ * 0.75 < x < W - r_ * 0.75 and r_ * 0.75 < y < H - 60) or not room(x, y, r_): continue
        rot = math.degrees(a) + 90 + rng.uniform(-14, 14)
        tent(x, y, w, h, [GOAT, GOAT2, GOAT3][(ci + k) % 3], None, poles=3, rot=rot, height=rng.uniform(24, 30), seed=100 + ci * 10 + k)
        placed.append((x, y, r_)); k += 1
    for _ in range(3):   # Krüge und Bündel bei jeder Gruppe
        a = rng.uniform(0, 6.28); jar(fx + math.cos(a) * 95, fy + math.sin(a) * 95, rng.uniform(10, 14), seed=rng.randint(0, 999))

# Pferch mit Sonnenplane beim Wasserloch (unregelmäßiger Zaun)
ring = PEN + [PEN[0]]
for a, b in zip(ring, ring[1:]):
    n = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) / 50))
    for k in range(n): stake(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, 9)
    rope([a, b])
cloth(300, 2420, 560, 2560, CANVAS2, seed=9, rot=-6)
for k in range(7):
    camel(rng.uniform(300, 680), rng.uniform(2560, 2760), rng.uniform(0, 360), seed=k, tint=(176, 140, 98) if k % 3 else (150, 140, 132))
occ(180, 2300, 820, 2870)
# Wasserloch: Palmen
for (x, y, r_) in [(300, 1800, 120), (830, 1820, 112), (850, 2130, 118), (290, 2150, 108), (560, 1700, 96)]:
    palm(x, y, r_, seed=int(x + y))
occ(170, 1580, 980, 2290)
# Förderrad zwischen F und G
wheel(FX + 1200, FY - 250)
# Vermessung: Pflöcke und Schnur um das Feld
x0, y0, x1, y1 = FX, FY, FX + N * CELL, FY + N * CELL
rope([(x0 - 14, y0 - 14), (x1 + 14, y0 - 14), (x1 + 14, y1 + 14), (x0 - 14, y1 + 14), (x0 - 14, y0 - 14)])
for i in range(N + 1):
    for (ax, ay) in [(x0 + i * CELL, y0 - 14), (x0 + i * CELL, y1 + 14), (x0 - 14, y0 + i * CELL), (x1 + 14, y0 + i * CELL)]:
        stake(ax, ay, 10)
# Abraum am Feldrand, Körbe, Werkzeug
for (x, y) in [(FX + 2080, FY + 300), (FX - 120, FY + 1300), (FX + 800, FY + 2110), (FX + 1500, FY - 90)]:
    for k in range(14): boulder(x + rng.uniform(-40, 40), y + rng.uniform(-30, 30), rng.uniform(5, 11), (184, 160, 126), seed=rng.randint(0, 9999))
    occ(x - 50, y - 40, x + 50, y + 40)
# Felsbrocken, Büsche im Gelände
for _ in range(170):
    x, y = rng.uniform(30, W - 30), rng.uniform(30, H - 30)
    if free(x, y, 25):
        g = rng.randint(148, 172); boulder(x, y, rng.uniform(6, 20), (g, int(g * 0.87), int(g * 0.72)), seed=rng.randint(0, 99999))
for _ in range(35):
    x = rng.uniform(30, W - 30); y = rng.uniform(ridge_y(x) + 10, ridge_y(x) + 140)
    if any(a - 30 <= x <= c + 30 and b - 30 <= y <= d + 30 for a, b, c, d in occupied): continue
    if x < 1450 and y > H - 340: continue
    g = rng.randint(132, 150); boulder(x, y, rng.uniform(14, 40), (g, int(g * 0.86), int(g * 0.72)), seed=rng.randint(0, 99999))
for _ in range(650):
    x, y = rng.uniform(30, W - 30), rng.uniform(30, H - 30)
    if free(x, y, 20): shrub(x, y, rng.uniform(7, 24), seed=rng.randint(0, 99999), green=(rng.randint(84, 112), rng.randint(96, 112), rng.randint(50, 66)))

img = L.compose(rgb, shadow_strength=0.5, blur=5)

# Beschriftung des Feldes (dezent, wie mit Kalk auf Brettern)
dl = ImageDraw.Draw(img)
try:
    f = ImageFont.truetype("/tmp/fell.ttf", 92)
except Exception:
    f = ImageFont.load_default()
for i, ch in enumerate("ABCDEFGHIJ"):
    dl.text((x0 + i * CELL + CELL / 2, y0 - 82), ch, font=f, fill=(46, 34, 24, 210), anchor="mm", stroke_width=3, stroke_fill=(232, 214, 178, 150))
for i in range(N):
    dl.text((x0 - 90, y0 + i * CELL + CELL / 2), str(i + 1), font=f, fill=(46, 34, 24, 210), anchor="mm", stroke_width=3, stroke_fill=(232, 214, 178, 150))

# Maßstabsleiste (50 px = 1 Schritt) und Nordpfeil auf einer Tafel unten links
PX = 50
fl = ImageFont.truetype("/tmp/fell.ttf", 40); fs = ImageFont.truetype("/tmp/fell.ttf", 30)
lx, ly = 90, H - 250
plate = Image.new("RGBA", img.size, (0, 0, 0, 0)); dpl = ImageDraw.Draw(plate)
dpl.rounded_rectangle((lx - 40, ly - 70, lx + 20 * PX + 230, ly + 120), radius=14, fill=(30, 24, 18, 165))
img = Image.alpha_composite(img, plate); dl = ImageDraw.Draw(img)
dl.text((lx, ly - 52), "Maßstab", font=fl, fill=(238, 224, 196, 255))
for k in range(4):
    x_a, x_b = lx + k * 5 * PX, lx + (k + 1) * 5 * PX
    dl.rectangle((x_a, ly, x_b, ly + 18), fill=(236, 222, 192, 255) if k % 2 == 0 else (60, 46, 34, 255), outline=(236, 222, 192, 255), width=2)
for k in range(5):
    x_t = lx + k * 5 * PX
    dl.line((x_t, ly - 6, x_t, ly + 24), fill=(236, 222, 192, 255), width=2)
    dl.text((x_t, ly + 30), str(k * 5), font=fs, fill=(236, 222, 192, 255), anchor="ma")
dl.text((lx + 20 * PX + 18, ly + 9), "Schritt", font=fs, fill=(236, 222, 192, 255), anchor="lm")
dl.text((lx, ly + 72), "1 Grabungsfeld = 4 × 4 Schritt", font=fs, fill=(214, 198, 168, 255))
nx, ny = lx + 20 * PX + 170, ly + 20   # Nordpfeil
dl.polygon([(nx, ny - 62), (nx + 20, ny + 18), (nx, ny + 4), (nx - 20, ny + 18)], fill=(236, 222, 192, 255))
dl.polygon([(nx, ny - 62), (nx, ny + 4), (nx - 20, ny + 18)], fill=(170, 150, 120, 255))
dl.text((nx, ny + 26), "N", font=fl, fill=(236, 222, 192, 255), anchor="ma")

arr = np.array(img.convert("RGB")).astype(np.float32)
arr = grain(arr, 3, 5)
vig = np.clip(1 - (((xx / W - 0.5) ** 2 + (yy / H - 0.5) ** 2) ** 0.5 - 0.45) * 0.9, 0.78, 1)
arr *= vig[..., None]
out = to_img(arr)
out.save(f"{OUT}/grabungsstaette.webp", "WEBP", quality=86, method=6)
out.resize((1320, 1080), Image.LANCZOS).save("/tmp/real_preview.jpg", quality=88)
print("fertig")
