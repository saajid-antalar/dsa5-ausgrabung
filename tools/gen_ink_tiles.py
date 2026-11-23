"""Feldkacheln im Federzeichnungs-Stil (400 px Textur für 200 px Feld)."""
import math, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from ink import parchment, to_img, Pen, noise, INK, SEPIA

OUT = sys.argv[1]
T = 400
K = 3.4            # Strichstärke passend zum Hintergrund (Textur wird halb so groß angezeigt)
FONT = "/tmp/fell.ttf"
RED = (128, 38, 20)
BLUE = (38, 58, 108)


def base(seed, tint=None, amount=0.0, light=(241, 231, 207), dark=(222, 204, 168)):
    arr = parchment(T, T, seed=seed, light=light, dark=dark, blotches=False)
    if tint is not None:
        n = noise(T, T, 90, 3, seed + 3)
        a = amount * (0.75 + n * 0.5)
        arr = arr * (1 - a[..., None]) + np.array(tint, float) * a[..., None]
    return to_img(arr)


def pen(seed):
    p = Pen((T, T), scale=2, seed=seed); p.k = K; return p


def pit(p, depth=34, shade=True):
    """Grube: Kante mit Hachuren nach innen (wie das Seeufer der Oasenkarte), Schattenseite oben/links."""
    o, i = 8, 8 + depth
    p.line([(o, o), (T - o, o), (T - o, T - o), (o, T - o), (o, o)], 1.3, alpha=235)
    p.line([(i, i), (T - i, i), (T - i, T - i), (i, T - i), (i, i)], 0.9, alpha=200)
    rng = p.rng
    for t in range(o + 4, T - o - 4, 9):
        for side in range(4):
            L = depth * rng.uniform(0.55, 0.95)
            if side == 0: a, b = (t, o + 2), (t + rng.uniform(-2, 2), o + 2 + L)
            elif side == 1: a, b = (o + 2, t), (o + 2 + L, t + rng.uniform(-2, 2))
            elif side == 2: a, b = (t, T - o - 2), (t + rng.uniform(-2, 2), T - o - 2 - L * 0.6)
            else: a, b = (T - o - 2, t), (T - o - 2 - L * 0.6, t + rng.uniform(-2, 2))
            p.line([a, b], 0.55, alpha=175 if side < 2 else 120, jitter=0.4, double=False)
    if shade:
        p.hatch([(o, o), (T - o, o), (T - i, i), (i, i)], angle=-45, spacing=4.5, w=0.45, alpha=120)
        p.hatch([(o, o), (i, i), (i, T - i), (o, T - o)], angle=-45, spacing=4.5, w=0.45, alpha=120)


def save(img, name):
    img.save(f"{OUT}/tiles/{name}.webp", "WEBP", quality=90, method=6)


def finish(img, p):
    return Image.alpha_composite(img, p.result())


# ---------- unberührt: abgestecktes Feld ----------
img = base(1); p = pen(1)
for t in range(14, T - 14, 22):   # gestrichelte Schnur
    for a, b in [((t, 12), (t + 12, 12)), ((t, T - 12), (t + 12, T - 12)), ((12, t), (12, t + 12)), ((T - 12, t), (T - 12, t + 12))]:
        p.line([a, b], 0.6, alpha=200, double=False)
for cx, cy in [(14, 14), (T - 14, 14), (14, T - 14), (T - 14, T - 14)]:
    p.circle(cx, cy, 7, 0.8, fill=(140, 100, 62, 255))
p.stipple([(30, 30), (T - 30, 30), (T - 30, T - 30), (30, T - 30)], density=0.0012, r=(0.5, 0.9), alpha=150)
for _ in range(3): p.shrub(p.rng.uniform(60, 340), p.rng.uniform(60, 340), 9, alpha=170)
save(finish(img, p), "unberuehrt")

# ---------- Flugsand ----------
img = base(2, (214, 188, 140), 0.25); p = pen(2); pit(p)
p.stipple([(48, 48), (T - 48, 48), (T - 48, T - 48), (48, T - 48)], density=0.006, r=(0.5, 1.0), alpha=170)
for _ in range(10):   # Spatenstiche
    x, y = p.rng.uniform(80, 320), p.rng.uniform(80, 320)
    p.line([(x - 16, y + 3), (x, y - 3), (x + 16, y + 3)], 0.6, alpha=170, double=False)
for _ in range(4): p.stone(p.rng.uniform(80, 320), p.rng.uniform(80, 320), 6)
save(finish(img, p), "sand")

# ---------- Festgebackener Lehm ----------
img = base(3, (176, 118, 76), 0.42); p = pen(3); pit(p)
rng = p.rng
for _ in range(16):   # Trockenrisse
    x, y = rng.uniform(60, 340), rng.uniform(60, 340); pts = [(x, y)]
    for _ in range(rng.randint(3, 6)):
        x = min(345, max(55, x + rng.uniform(-30, 30))); y = min(345, max(55, y + rng.uniform(-30, 30))); pts.append((x, y))
    p.line(pts, 0.7, alpha=210)
p.stipple([(48, 48), (T - 48, 48), (T - 48, T - 48), (48, T - 48)], density=0.002, r=(0.5, 0.9), alpha=140)
save(finish(img, p), "lehm")

# ---------- Geröll ----------
img = base(4, (190, 170, 140), 0.3); p = pen(4); pit(p)
for _ in range(26): p.stone(p.rng.uniform(65, 335), p.rng.uniform(65, 335), p.rng.uniform(9, 22))
for _ in range(40): p.stone(p.rng.uniform(60, 340), p.rng.uniform(60, 340), p.rng.uniform(3, 6))
save(finish(img, p), "geroell")

# ---------- Mauerreste ----------
img = base(5, (196, 170, 128), 0.22); p = pen(5); pit(p)
rng = p.rng
for row in range(3):
    y = 150 + row * 38; x = 56 + (row % 2) * 30
    while x < 330:
        w = min(rng.uniform(50, 68), 344 - x)
        q = [(x, y), (x + w - 5, y), (x + w - 5, y + 32), (x, y + 32)]
        p.poly(q, 0.9, fill=(226, 204, 164, 255))
        p.hatch([(x, y + 20), (x + w - 5, y + 20), (x + w - 5, y + 32), (x, y + 32)], angle=-45, spacing=4, w=0.4, alpha=150)
        x += w
for _ in range(6):
    x, y = rng.uniform(70, 300), rng.uniform(280, 330)
    p.poly([(x, y), (x + 28, y + 2), (x + 26, y + 20), (x - 2, y + 18)], 0.8, fill=(226, 204, 164, 255))
save(finish(img, p), "mauer")

# ---------- Hohlraum ----------
img = base(6, (150, 120, 88), 0.3); p = pen(6); pit(p, depth=46)
hole = [(200 + math.cos(t) * 100 * (1 + 0.1 * math.sin(3 * t)), 205 + math.sin(t) * 92 * (1 + 0.08 * math.cos(2 * t))) for t in np.linspace(0, 2 * math.pi, 40)]
p.poly(hole, 1.2, fill=(92, 70, 50, 255))
p.hatch(hole, angle=45, spacing=3.2, w=0.6, alpha=230, cross=True)
for (a, b) in [((70, 120), (330, 140)), ((80, 285), (325, 265)), ((120, 70), (140, 330)), ((280, 75), (262, 330))]:
    dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy); nx, ny = -dy / L * 9, dx / L * 9
    beam = [(a[0] + nx, a[1] + ny), (b[0] + nx, b[1] + ny), (b[0] - nx, b[1] - ny), (a[0] - nx, a[1] - ny)]
    p.poly(beam, 1.1, fill=(214, 184, 140, 255))
    p.line([(a[0] + nx * 0.3, a[1] + ny * 0.3), (b[0] + nx * 0.3, b[1] + ny * 0.3)], 0.4, alpha=150, double=False)
    for pt in (a, b): p.dot(pt[0], pt[1], 2.2)
save(finish(img, p), "hohl")

# ---------- Flussbett ----------
img = base(7, (176, 160, 130), 0.3); p = pen(7); pit(p)
for k in range(9):
    y0 = 78 + k * 30
    pts = [(x, y0 + 10 * math.sin(x / 38 + k) + 5 * math.sin(x / 13)) for x in range(52, 350, 8)]
    p.line(pts, 0.7, alpha=200, double=False)
for _ in range(34):
    x, y, r = p.rng.uniform(65, 335), p.rng.uniform(65, 335), p.rng.uniform(4, 9)
    p.circle(x, y, r, 0.6, fill=(222, 210, 186, 255))
save(finish(img, p), "flussbett")

# ---------- Portal (nach dem Durchbruch) ----------
img = base(8, (150, 136, 120), 0.45); p = pen(8)
rng = p.rng
for _ in range(1100):   # Felsstruktur
    x, y = rng.uniform(10, 390), rng.uniform(10, 390); a = math.radians(rng.uniform(60, 120)); L = rng.uniform(5, 14)
    p.line([(x, y), (x + math.cos(a) * L, y + math.sin(a) * L)], 0.35, alpha=rng.randint(90, 160), jitter=0.3, double=False)
arch = [(130, 340), (130, 180)] + [(200 + math.cos(t) * 70, 180 - math.sin(t) * 70) for t in np.linspace(math.pi, 0, 24)] + [(270, 180), (270, 340)]
p.poly(arch, 1.6, fill=(80, 64, 52, 255))
p.hatch(arch, angle=45, spacing=3.5, w=0.5, alpha=220, cross=True)
outer = [(112, 346), (112, 180)] + [(200 + math.cos(t) * 88, 180 - math.sin(t) * 88) for t in np.linspace(math.pi, 0, 26)] + [(288, 180), (288, 346)]
p.line(outer, 1.0, col=RED, alpha=230)
for k in range(9):
    t = math.pi - math.pi * (k + 0.5) / 9; x, y = 200 + math.cos(t) * 98, 180 - math.sin(t) * 98
    g = k % 3
    if g == 0: p.circle(x, y, 5, 0.5, col=RED)
    elif g == 1: p.poly([(x, y - 6), (x + 5, y + 4), (x - 5, y + 4)], 0.5, col=RED)
    else: p.line([(x - 5, y), (x + 5, y)], 0.5, col=RED, double=False); p.line([(x, y - 5), (x, y + 5)], 0.5, col=RED, double=False)
for k in range(4):
    for x in (96, 304):
        y = 200 + k * 34; p.poly([(x - 5, y - 5), (x + 5, y - 5), (x + 5, y + 5), (x - 5, y + 5)], 0.5, col=RED)
save(finish(img, p), "portal")

# ---------- Fels (gesperrte Felder): Felsbank mit Schraffur, Ränder auslaufend ----------
for v in range(3):
    img = base(20 + v, (170, 150, 120), 0.35); p = pen(20 + v); rng = p.rng
    for _ in range(500):
        x, y = rng.uniform(20, 380), rng.uniform(20, 380); a = math.radians(rng.uniform(55, 125)); L = rng.uniform(5, 13)
        p.line([(x, y), (x + math.cos(a) * L, y + math.sin(a) * L)], 0.35, alpha=rng.randint(90, 160), jitter=0.3, double=False)
    for _ in range(8): p.stone(rng.uniform(70, 330), rng.uniform(70, 330), rng.uniform(16, 34))
    for _ in range(14): p.stone(rng.uniform(40, 360), rng.uniform(40, 360), rng.uniform(5, 10))
    im = finish(img, p)
    yy, xx = np.mgrid[0:T, 0:T]
    edge = np.minimum.reduce([xx, yy, T - 1 - xx, T - 1 - yy]).astype(float)
    n = noise(T, T, 50, 2, 30 + v)
    a = np.clip((edge - 6 - n * 26) / 16, 0, 1)
    im.putalpha(Image.fromarray((np.array(im.getchannel("A")) * a).astype(np.uint8), "L"))
    save(im, f"fels{v}")

# ---------- Rahmen für Fundstellen ----------
im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); p = Pen((T, T), scale=2, seed=40); p.k = K
for o, wdt in [(12, 1.1), (22, 0.6)]:
    p.line([(o, o), (T - o, o), (T - o, T - o), (o, T - o), (o, o)], wdt, col=RED, alpha=235)
for cx, cy in [(17, 17), (T - 17, 17), (17, T - 17), (T - 17, T - 17)]:
    p.poly([(cx, cy - 16), (cx + 6, cy), (cx, cy + 16), (cx - 6, cy)], 0.5, fill=RED + (255,), col=RED)
    p.poly([(cx - 16, cy), (cx, cy - 6), (cx + 16, cy), (cx, cy + 6)], 0.5, fill=RED + (255,), col=RED)
save(p.result(), "schluessel")

# ---------- Marken ----------
B = 120
fb = ImageFont.truetype(FONT, 80 * 2)
def badge(text, col=INK, fill=(240, 228, 200, 255)):
    p = Pen((B, B), scale=2, seed=hash(text) % 99); p.k = 2.2
    S = p.S
    p.d.ellipse((10 * S, 10 * S, (B - 10) * S, (B - 10) * S), fill=fill, outline=col + (240,), width=int(2.6 * S))
    p.d.ellipse((17 * S, 17 * S, (B - 17) * S, (B - 17) * S), outline=col + (170,), width=int(1.1 * S))
    if text: p.text((B / 2, B / 2 + 3), text, fb, col=col, alpha=240)
    return p.result()
for k in list(range(9)) + ["x"]:
    badge("?" if k == "x" else str(k)).save(f"{OUT}/tiles/spur-{k}.webp", "WEBP", quality=92)
# gutes Ereignis: schraffierte Raute (blaue Tinte), Unglück: rotes Kreuz
p = Pen((B, B), scale=2, seed=50); p.k = 2.2
p.d.ellipse((20, 20, 220, 220), fill=(240, 228, 200, 255), outline=BLUE + (240,), width=5)
dia = [(60, 22), (92, 60), (60, 98), (28, 60)]
p.poly(dia, 1.0, col=BLUE); p.hatch(dia, angle=45, spacing=4, w=0.5, col=BLUE, alpha=220, cross=True)
p.result().save(f"{OUT}/tiles/ereignis-gut.webp", "WEBP", quality=92)
p = Pen((B, B), scale=2, seed=51); p.k = 2.2
p.d.ellipse((20, 20, 220, 220), fill=(240, 228, 200, 255), outline=RED + (240,), width=5)
p.line([(34, 34), (86, 86)], 2.6, col=RED); p.line([(86, 34), (34, 86)], 2.6, col=RED)
p.result().save(f"{OUT}/tiles/ereignis-schlecht.webp", "WEBP", quality=92)

# Kontaktbogen
names = ["unberuehrt", "sand", "lehm", "geroell", "mauer", "hohl", "flussbett", "portal", "fels0"]
sheet = Image.new("RGBA", (len(names) * 210, 210 + 130), (226, 210, 178, 255))
for i, k in enumerate(names):
    sheet.alpha_composite(Image.open(f"{OUT}/tiles/{k}.webp").convert("RGBA").resize((200, 200)), (i * 210 + 5, 5))
sheet.alpha_composite(Image.open(f"{OUT}/tiles/schluessel.webp").convert("RGBA").resize((200, 200)), (3 * 210 + 5, 5))
for i, k in enumerate(["spur-2", "spur-x", "ereignis-gut", "ereignis-schlecht"]):
    sheet.alpha_composite(Image.open(f"{OUT}/tiles/{k}.webp").convert("RGBA"), (i * 130 + 10, 215))
sheet.save("/tmp/ink_tiles.png")
print("fertig")
