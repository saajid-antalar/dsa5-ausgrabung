"""Grabungsstätte am Nordrand des Djurkaram, Federzeichnung auf Pergament (Drachenchronik I, S. 46/47)."""
import math, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.ndimage import gaussian_filter
from ink import parchment, to_img, Pen, noise, torn_edge_mask, INK, SEPIA

OUT = sys.argv[1]
W, H = 3200, 2800
FX, FY, CELL, N = 600, 400, 200, 10
FONT = "/tmp/fell.ttf"
rng = random.Random(1034)

base = parchment(W, H, seed=11)
# helleres, festgetretenes Grabungsfeld
yy, xx = np.mgrid[0:H, 0:W]
fm = np.zeros((H, W)); fm[FY - 30:FY + N * CELL + 30, FX - 30:FX + N * CELL + 30] = 1
fm = gaussian_filter(fm, 30)
base = base * (1 - fm[..., None] * 0.25) + np.array([240, 230, 206], float) * fm[..., None] * 0.25

# Sepia-Lavierung für die Berge im Süden (Djurkaram) und Südosten
ridge = lambda x: 2520 - 160 * math.exp(-((x - 2950) / 420) ** 2) - 60 * math.sin(x / 210) - 40 * math.sin(x / 77)
rid = np.array([ridge(x) for x in range(W)])
mt = (yy >= rid[None, :]).astype(float)
mt = gaussian_filter(mt, 18)
wash = noise(H, W, 120, 3, 21)
base = base * (1 - mt[..., None] * (0.32 + wash[..., None] * 0.28)) + np.array(SEPIA, float) * mt[..., None] * (0.32 + wash[..., None] * 0.28)
img = to_img(base)

pen = Pen((W, H), scale=2, seed=5)
pen.k = 1.9
occupied = [(FX - 60, FY - 140, FX + N * CELL + 60, FY + N * CELL + 60)]
def occ(x0, y0, x1, y1): occupied.append((x0, y0, x1, y1))
def free(x, y, pad=0):
    if y > ridge(x) - 30: return False
    return not any(a - pad <= x <= c + pad and b - pad <= y <= d + pad for a, b, c, d in occupied)

def lab(xy, txt, f, alpha=215):
    pen.text(xy, txt, f, alpha=alpha)
    w = len(txt) * (f.size / 2) * 0.32 + 20; h = f.size / 2 * 0.7 + 10
    occ(xy[0] - w, xy[1] - h, xy[0] + w, xy[1] + h)

font = ImageFont.truetype(FONT, 96 * 2)
fsmall = ImageFont.truetype(FONT, 40 * 2)
fmid = ImageFont.truetype(FONT, 58 * 2)

# ---------- Berge: Kammlinie, Hachuren, Felsen ----------
for layer, (off, amp) in enumerate([(0, 1.0), (90, 0.8), (190, 0.6)]):
    pts = [(x, ridge(x) + off + 25 * math.sin(x / 53 + layer)) for x in range(-20, W + 40, 40)]
    pen.line(pts, 2.4 - layer * 0.4, alpha=220 - layer * 30)
    for x in range(0, W, 7):
        y = ridge(x) + off + 25 * math.sin(x / 53 + layer)
        L = rng.uniform(30, 110) * amp
        slant = rng.uniform(-0.25, 0.25)
        pen.line([(x, y + 3), (x + L * slant, y + L)], 1.0, alpha=150, jitter=0.6, double=False)
for _ in range(3200):   # Gesteinsstruktur wie auf der Oasenkarte
    x = rng.uniform(0, W); y = rng.uniform(ridge(x) + 10, H - 10)
    a = math.radians(rng.uniform(55, 125)); L = rng.uniform(6, 18)
    pen.line([(x, y), (x + math.cos(a) * L, y + math.sin(a) * L)], 0.7, alpha=rng.randint(110, 190), jitter=0.4, double=False)
for _ in range(140):
    x = rng.uniform(0, W); y = rng.uniform(ridge(x) + 20, H - 30)
    pen.stone(x, y, rng.uniform(10, 30), alpha=220)
lab((2950, 2700), "Djurkaram", fmid)

# ---------- Windrose ----------
def compass(cx, cy, r):
    pen.circle(cx, cy, r, 2.2); pen.circle(cx, cy, r * 0.82, 1.2)
    for k in range(16):
        a = 2 * math.pi * k / 16
        pen.line([(cx + math.cos(a) * r * 0.82, cy + math.sin(a) * r * 0.82), (cx + math.cos(a) * r, cy + math.sin(a) * r)], 1.0, double=False)
    for k in range(8):
        a = -math.pi / 2 + 2 * math.pi * k / 8
        L = r * (0.95 if k % 2 == 0 else 0.6); wdt = r * 0.16
        tip = (cx + math.cos(a) * L, cy + math.sin(a) * L)
        l = (cx + math.cos(a + math.pi / 2) * wdt, cy + math.sin(a + math.pi / 2) * wdt)
        rr = (cx + math.cos(a - math.pi / 2) * wdt, cy + math.sin(a - math.pi / 2) * wdt)
        pen.poly([(cx, cy), l, tip], 1.6, fill=(236, 224, 196, 255))
        pen.poly([(cx, cy), rr, tip], 1.6, fill=(236, 224, 196, 255))
        pen.hatch([(cx, cy), rr, tip], angle=a * 180 / math.pi + 60, spacing=3.2, w=0.7)
    pen.text((cx, cy - r - 30), "N", fsmall)
compass(230, 260, 120); occ(90, 110, 370, 400)

# ---------- Weg zur Oase Birscha (Westen) ----------
path = [(-20, 1190), (200, 1170), (430, 1210), (520, 1260)]
for off in (-14, 14):
    pts = [(x, y + off) for x, y in path]
    for a, b in zip(pts, pts[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1]); n = int(L / 22)
        for k in range(0, n, 2):
            t0, t1 = k / n, min(1, (k + 1) / n)
            pen.line([(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0), (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1)], 1.2, double=False, alpha=190)
lab((200, 1262), "nach Birscha", fsmall)
occ(0, 1100, 470, 1260)

# ---------- Wasserloch der Beni Achawi (Westen) ----------
def pond(cx, cy, rx, ry):
    pts = [(cx + math.cos(t) * rx * (1 + 0.12 * math.sin(3 * t + 1)), cy + math.sin(t) * ry * (1 + 0.1 * math.cos(2 * t))) for t in np.linspace(0, 2 * math.pi, 60)]
    pen.poly(pts, 2.2, fill=(196, 178, 140, 255))
    inner = [(cx + (x - cx) * 0.8, cy + (y - cy) * 0.8) for x, y in pts]
    pen.hatch(inner, angle=0, spacing=9, w=0.8, alpha=110)
    for k in range(3):
        f = 1.08 + k * 0.08
        ring = [(cx + (x - cx) * f, cy + (y - cy) * f) for x, y in pts]
        pen.line(ring[::2] + [ring[0]], 0.8, alpha=110 - k * 25, double=False)
pond(250, 1540, 150, 95)
for (x, y) in [(110, 1390), (380, 1400), (420, 1620), (90, 1650), (240, 1680), (330, 1700)]:
    for _ in range(3): pen.shrub(x + rng.uniform(-18, 18), y + rng.uniform(-14, 14), 13)
lab((250, 1790), "Wasserloch", fsmall)
occ(40, 1340, 470, 1820)

# ---------- Zelte ----------
def tent(cx, cy, w, h, stripes=0, poles=2, label=None):
    x0, y0, x1, y1 = cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2
    pen.poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], 2.2, fill=(232, 218, 188, 255))
    pen.hatch([(x0, cy), (x1, cy), (x1, y1), (x0, y1)], angle=-30, spacing=6, w=0.8, alpha=130)   # Schattenseite
    pen.line([(x0, cy), (x1, cy)], 2.0)
    for k in range(stripes):
        x = x0 + w * (k + 1) / (stripes + 1)
        pen.line([(x, y0), (x, y1)], 1.0, alpha=170, double=False)
    for k in range(poles):
        pen.dot(x0 + w * (k + 1) / (poles + 1), cy, 3.2)
    for px, py, qx, qy in [(x0, y0, x0 - 30, y0 - 22), (x1, y0, x1 + 30, y0 - 22), (x0, y1, x0 - 30, y1 + 22), (x1, y1, x1 + 30, y1 + 22)]:
        pen.line([(px, py), (qx, qy)], 0.8, alpha=150, double=False); pen.dot(qx, qy, 2.5)
    if label: lab((cx, y1 + 44), label, fsmall)
    occ(x0 - 40, y0 - 40, x1 + 40, y1 + 70)

tent(2930, 470, 330, 200, stripes=7, poles=3, label="Hilbert")
tent(2920, 790, 270, 160, stripes=5, poles=2, label="Expedition")
tent(2920, 1060, 220, 140, stripes=3, poles=2, label="Helden")
tent(3050, 1330, 170, 120, stripes=0, poles=1, label="Werkzeug")

# Kochzelt (rund) mit Feuerstelle
def round_tent(cx, cy, r, label):
    pen.circle(cx, cy, r, 2.2, fill=(232, 218, 188, 255))
    for k in range(10):
        a = 2 * math.pi * k / 10
        pen.line([(cx, cy), (cx + math.cos(a) * r, cy + math.sin(a) * r)], 0.9, alpha=150, double=False)
    pen.hatch([(cx, cy)] + [(cx + math.cos(a) * r, cy + math.sin(a) * r) for a in np.linspace(0.1, 1.9, 8)], angle=60, spacing=6, w=0.8, alpha=120)
    pen.dot(cx, cy, 4)
    lab((cx, cy + r + 44), label, fsmall)
    occ(cx - r - 30, cy - r - 30, cx + r + 30, cy + r + 70)
round_tent(2800, 1330, 85, "Küche")
for k in range(9):
    a = 2 * math.pi * k / 9
    pen.stone(2670 + math.cos(a) * 34, 1330 + math.sin(a) * 34, 8)
pen.hatch([(2655, 1315), (2685, 1315), (2685, 1345), (2655, 1345)], angle=45, spacing=3, cross=True)

# Holzwerkstatt: offener Unterstand mit Bohlen und Stämmen
def workshop(cx, cy):
    x0, y0, x1, y1 = cx - 170, cy - 90, cx + 170, cy + 90
    for x in (x0, x1):
        for y in (y0, y1): pen.dot(x, y, 4.5)
    pen.line([(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)], 1.0, alpha=140, double=False)
    for k in range(6):
        y = y0 + 22 + k * 24
        pen.poly([(x0 + 20, y), (x0 + 230, y), (x0 + 230, y + 16), (x0 + 20, y + 16)], 1.2, fill=(220, 196, 150, 255))
        pen.circle(x0 + 230, y + 8, 8, 1.0)
    for k in range(3):
        pen.poly([(x0 + 255, y0 + 25 + k * 40), (x1 - 10, y0 + 25 + k * 40), (x1 - 10, y0 + 45 + k * 40), (x0 + 255, y0 + 45 + k * 40)], 1.0, fill=(226, 206, 166, 255))
    lab((cx, y1 + 44), "Holzwerkstatt", fsmall)
    occ(x0 - 30, y0 - 30, x1 + 30, y1 + 70)
workshop(2920, 1620)

# Arbeiterzelte (je rund 10 Leute)
spots = [(2790 + c * 230, 1900 + r * 150) for r in range(3) for c in range(2)] + \
        [(130 + c * 220, 520 + r * 150) for r in range(4) for c in range(2)] + [(130, 1120 + 0)]
spots = spots[:-1]
for i, (x, y) in enumerate(spots):
    tent(x, y, 170, 100, stripes=0, poles=2, label=None)
lab((2905, 2340), "Arbeiter", fsmall)
lab((240, 1045), "Arbeiter", fsmall)

# Pferche mit Sonnenplanen (Westen, beim Wasser)
def pen_fold(x0, y0, x1, y1, label):
    for x in np.arange(x0, x1 + 1, 40):
        pen.dot(x, y0, 3.2); pen.dot(x, y1, 3.2)
    for y in np.arange(y0, y1 + 1, 40):
        pen.dot(x0, y, 3.2); pen.dot(x1, y, 3.2)
    pen.line([(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)], 1.2, alpha=190)
    sx0, sy0, sx1, sy1 = x0 + 30, y0 + 25, x1 - 30, y0 + (y1 - y0) * 0.45
    pen.poly([(sx0, sy0), (sx1, sy0), (sx1, sy1), (sx0, sy1)], 1.4, fill=(228, 212, 178, 255))
    pen.hatch([(sx0, sy0), (sx1, sy0), (sx1, sy1), (sx0, sy1)], angle=20, spacing=7, w=0.8, alpha=120)
    for _ in range(9):   # Kamele und Esel als kleine Ovale mit Hals
        ax, ay = rng.uniform(x0 + 30, x1 - 40), rng.uniform(sy1 + 20, y1 - 25)
        a = rng.uniform(0, 2 * math.pi)
        pen.poly([(ax + math.cos(t) * 16, ay + math.sin(t) * 9) for t in np.linspace(0, 2 * math.pi, 12)], 1.0, fill=(220, 200, 164, 255))
        pen.line([(ax + 14, ay), (ax + 26 * math.cos(a), ay + 26 * math.sin(a))], 1.2, double=False)
    pen.text(((x0 + x1) / 2, y1 + 40), label, fsmall, alpha=215)
    occ(x0 - 20, y0 - 20, x1 + 20, y1 + 60)
pen_fold(60, 1900, 450, 2330, "Pferche")

# Förderrad (Yussuf Sahib und Alrik) über dem Feld, zwischen F und G
def wheel(cx, cy):
    L, Wd = 230, 52
    pen.poly([(cx - L / 2, cy - Wd / 2), (cx + L / 2, cy - Wd / 2), (cx + L / 2, cy + Wd / 2), (cx - L / 2, cy + Wd / 2)], 2.0, fill=(224, 200, 158, 255))
    for k in range(1, 12):
        x = cx - L / 2 + k * L / 12
        pen.line([(x, cy - Wd / 2), (x, cy + Wd / 2)], 1.0, double=False, alpha=180)
    pen.line([(cx, cy - 92), (cx, cy + 92)], 4.0)
    for sy in (-1, 1):
        y = cy + sy * 86
        pen.poly([(cx - 58, y - 9), (cx + 58, y - 9), (cx + 40, y + 9), (cx - 40, y + 9)], 1.4, fill=(214, 186, 140, 255))
    pen.line([(cx, cy + 92), (cx, cy + 300)], 3.0)
    pen.line([(cx, cy + 300), (cx, cy + 350)], 1.0, double=False)
    pen.circle(cx, cy + 362, 15, 1.2, fill=(220, 196, 150, 255))
    lab((cx + 170, cy), "Förderrad", fsmall)
    occ(cx - 140, cy - 110, cx + 260, cy + 120)
wheel(FX + 1200, FY - 250)

# ---------- Grabungsfeld: Schnur, Pflöcke, Beschriftung ----------
x0, y0, x1, y1 = FX, FY, FX + N * CELL, FY + N * CELL
pen.line([(x0 - 16, y0 - 16), (x1 + 16, y0 - 16), (x1 + 16, y1 + 16), (x0 - 16, y1 + 16), (x0 - 16, y0 - 16)], 1.6, alpha=200)
for i in range(N + 1):
    for (ax, ay) in [(x0 + i * CELL, y0 - 16), (x0 + i * CELL, y1 + 16), (x0 - 16, y0 + i * CELL), (x1 + 16, y0 + i * CELL)]:
        pen.circle(ax, ay, 6, 1.4, fill=(150, 110, 70, 255))
for i, ch in enumerate("ABCDEFGHIJ"):
    pen.text((x0 + i * CELL + CELL / 2, y0 - 85), ch, font)
for i in range(N):
    pen.text((x0 - 95, y0 + i * CELL + CELL / 2), str(i + 1), font)
# Feldfläche sparsam punktiert
pen.stipple([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], density=0.0009, r=(0.6, 1.2), alpha=120)

# ---------- Buschwerk und Steine im freien Gelände ----------
for _ in range(2200):
    x, y = rng.uniform(20, W - 20), rng.uniform(20, H - 20)
    if free(x, y, 18): pen.shrub(x, y, rng.uniform(5, 11), alpha=rng.randint(160, 230))
for _ in range(220):
    x, y = rng.uniform(20, W - 20), rng.uniform(20, H - 20)
    if free(x, y, 25): pen.stone(x, y, rng.uniform(5, 13), alpha=190)
for _ in range(16000):
    x, y = rng.uniform(0, W), rng.uniform(0, H)
    if free(x, y, 5): pen.dot(x, y, rng.uniform(0.5, 1.2), alpha=rng.randint(110, 200))

# Tintenkleckse
for _ in range(7):
    x, y = rng.uniform(100, W - 100), rng.uniform(100, H - 100)
    if free(x, y, 40):
        for k in range(rng.randint(2, 5)):
            pen.dot(x + rng.uniform(-14, 14), y + rng.uniform(-14, 14), rng.uniform(1.5, 4.5), alpha=180)

lines = pen.result()
img = Image.alpha_composite(img, lines)

# gerissener Rand und abgedunkelte Kanten
mask, edge, nn = torn_edge_mask(W, H, margin=34, seed=9)
dark = np.clip(1 - edge / 260, 0, 1) ** 1.5 * (0.7 + noise(H, W, 90, 3, 31) * 0.6)
arr = np.array(img).astype(float)
arr[..., :3] = arr[..., :3] * (1 - dark[..., None] * 0.6) + np.array((92, 62, 34), float) * dark[..., None] * 0.6
img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
bg = Image.new("RGBA", (W, H), (58, 42, 28, 255))
img = Image.composite(img, bg, mask)
img.convert("RGB").save(f"{OUT}/khom-grabung.webp", "WEBP", quality=88, method=6)
img.convert("RGB").resize((1066, 933)).save("/tmp/ink_preview.png")
print("fertig")
