"""Feldkacheln als realistische Draufsicht (400 px Textur für 200 px Feld), gleiche Lichtrechnung wie die Szene."""
import math, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.ndimage import gaussian_filter
from real import fbm, ridged, shade, cast_shadow, lerp, col, to_img, grain

OUT = sys.argv[1]
T = 400
FIELD = (206, 176, 132)
yy, xx = np.mgrid[0:T, 0:T].astype(np.float32)
edge = np.minimum.reduce([xx, yy, T - 1 - xx, T - 1 - yy])


def stamp_bumps(n, rmin, rmax, h, seed, region=(40, 360)):
    r = np.random.default_rng(seed)
    out = np.zeros((T, T), np.float32)
    for _ in range(n):
        cx, cy, rad = r.uniform(*region), r.uniform(*region), r.uniform(rmin, rmax)
        d = ((xx - cx) ** 2 + (yy - cy) ** 2) / rad ** 2
        bump = np.clip(1 - d, 0, 1) ** 0.6 * rad * h * r.uniform(0.7, 1.2)
        out = np.maximum(out, bump)
    return out


from scipy.ndimage import distance_transform_edt

def stamp_rocks(n, rmin, rmax, h, seed, region=(40, 360)):
    """Kantige Steine: unregelmäßiges Vieleck, abgeschrägte Kanten, flache Oberseite mit Struktur."""
    r = np.random.default_rng(seed)
    out = np.zeros((T, T), np.float32); tint = np.zeros((T, T), np.float32)
    for _ in range(n):
        cx, cy, rad = r.uniform(*region), r.uniform(*region), r.uniform(rmin, rmax)
        k = r.integers(5, 9); ang = np.sort(r.uniform(0, 2 * np.pi, k))
        pts = [(cx + math.cos(a) * rad * r.uniform(0.65, 1.15), cy + math.sin(a) * rad * r.uniform(0.65, 1.15)) for a in ang]
        m = Image.new("L", (T, T), 0); ImageDraw.Draw(m).polygon(pts, fill=1)
        mask = np.array(m).astype(bool)
        if not mask.any(): continue
        dist = distance_transform_edt(mask)
        top = rad * h * r.uniform(0.6, 1.0)
        hgt = np.minimum(dist * r.uniform(0.9, 1.6), top) + (dist > 0) * fbm(T, T, max(2, rad / 3), 2, int(r.integers(0, 9999))) * rad * 0.08
        sel = hgt > out
        out = np.where(sel, hgt, out); tint = np.where(sel & mask, r.uniform(-0.12, 0.12), tint)
    return out, tint


def voronoi_cracks(n, seed):
    r = np.random.default_rng(seed)
    pts = r.uniform(0, T, (n, 2)).astype(np.float32)
    d1 = np.full((T, T), 1e9, np.float32); d2 = np.full((T, T), 1e9, np.float32)
    for px, py in pts:
        d = np.sqrt((xx - px) ** 2 + (yy - py) ** 2)
        d2 = np.where(d < d1, d1, np.minimum(d2, d)); d1 = np.minimum(d1, d)
    return np.clip(1 - (d2 - d1) / 2.2, 0, 1)


def pit_profile(depth, m=12, wall=30):
    """Grube: außen festgetretener Boden, Wände, Sohle in -depth."""
    t = np.clip((edge - m) / wall, 0, 1)
    t = t * t * (3 - 2 * t)
    return -depth * t, t


def finish(hm, alb, name, alpha_edge=True, shadow_steps=40, ambient=0.44, extra=None):
    rgb = shade(hm, alb, 1.0, ambient=ambient, ao_r=8, ao_k=0.012)
    sh = cast_shadow(hm, steps=shadow_steps, step=1.5)
    rgb *= (1 - sh[..., None] * 0.55)
    rgb = grain(rgb, 2.5, hash(name) % 999)
    im = to_img(rgb).convert("RGBA")
    if extra: extra(im)
    if alpha_edge:
        a = np.clip(edge / 6, 0, 1)
        im.putalpha(Image.fromarray((a * 255).astype(np.uint8), "L"))
    im.save(f"{OUT}/tiles/{name}.webp", "WEBP", quality=90, method=6)
    return im


def soil_walls(t, base):
    """Bodenschichten in den Grubenwänden."""
    layers = (np.sin(t * 9 + fbm(T, T, 40, 2, 3) * 2) * 0.5 + 0.5)
    wall = np.clip((1 - t) * t * 4, 0, 1)
    strata = lerp(col((186, 150, 108)), col((150, 116, 82)), layers)
    return lerp(base, strata, wall * 0.8)


def ground_ring(alb, t):
    return lerp(col(FIELD) * (0.95 + fbm(T, T, 20, 2, 1)[..., None] * 0.06), alb, np.clip(t * 4, 0, 1))


# ---------- unberührt: durchsichtig, nur Pflöcke und Schnur ----------
S = 2
im = Image.new("RGBA", (T * S, T * S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
sh = Image.new("L", (T * S, T * S), 0); ds = ImageDraw.Draw(sh)
for (a, b) in [((14, 14), (T - 14, 14)), ((T - 14, 14), (T - 14, T - 14)), ((T - 14, T - 14), (14, T - 14)), ((14, T - 14), (14, 14))]:
    ds.line([((a[0] + 6) * S, (a[1] + 6) * S), ((b[0] + 6) * S, (b[1] + 6) * S)], fill=150, width=3 * S)
    d.line([(a[0] * S, a[1] * S), (b[0] * S, b[1] * S)], fill=(214, 194, 152, 235), width=3 * S)
for cx, cy in [(14, 14), (T - 14, 14), (14, T - 14), (T - 14, T - 14)]:
    ds.rectangle([(cx - 5 + 12) * S, (cy - 5 + 12) * S, (cx + 5 + 12) * S, (cy + 5 + 12) * S], fill=200)
    d.rectangle([(cx - 7) * S, (cy - 7) * S, (cx + 7) * S, (cy + 7) * S], fill=(112, 80, 48, 255))
    d.rectangle([(cx - 7) * S, (cy - 7) * S, (cx) * S, (cy) * S], fill=(152, 114, 72, 255))
shadow = Image.new("RGBA", im.size, (40, 28, 18, 0)); shadow.putalpha(sh.filter(ImageFilter.GaussianBlur(3 * S)).point(lambda v: int(v * 0.45)))
out = Image.alpha_composite(shadow, im).resize((T, T), Image.LANCZOS)
out.save(f"{OUT}/tiles/unberuehrt.webp", "WEBP", quality=90, method=6)

# ---------- Flugsand ----------
hm, t = pit_profile(46)
rip = np.sin((xx * 0.5 + yy * 0.8 + fbm(T, T, 60, 2, 4) * 30) / 6) * 0.8
hm += rip * t + fbm(T, T, 30, 3, 5) * 3 * t
alb = ground_ring(soil_walls(t, col((214, 182, 132)) * (0.95 + fbm(T, T, 15, 2, 6)[..., None] * 0.07)), t)
finish(hm, alb, "sand")

# ---------- Festgebackener Lehm (Trockenrisse) ----------
hm, t = pit_profile(50)
crack = voronoi_cracks(70, 7) * t
hm += -crack * 4 + fbm(T, T, 25, 3, 8) * 2 * t
clay = col((174, 114, 74)) * (0.92 + fbm(T, T, 20, 3, 9)[..., None] * 0.12)
alb = ground_ring(soil_walls(t, lerp(clay, col((112, 72, 48)), np.clip(crack * 1.4, 0, 1))), t)
finish(hm, alb, "lehm")

# ---------- Geröll ----------
hm, t = pit_profile(46)
big, tb = stamp_rocks(38, 9, 24, 0.55, 10); small_, ts = stamp_rocks(110, 3, 7, 0.6, 11)
stones = np.maximum(big, small_); tnt = np.where(big >= small_, tb, ts)
hm += stones * t
grav = lerp(col((176, 158, 134)), col((150, 136, 120)), np.clip(stones / 10, 0, 1)) * (1 + tnt[..., None]) * (0.92 + fbm(T, T, 6, 2, 12)[..., None] * 0.12)
alb = ground_ring(soil_walls(t, grav), t)
finish(hm, alb, "geroell")

# ---------- Mauerreste ----------
hm, t = pit_profile(56)
blocks = np.zeros((T, T), np.float32); balb = np.zeros((T, T), np.float32); r = random.Random(13)
for row in range(3):
    y0 = 140 + row * 42; x = 60 + (row % 2) * 32
    while x < 330:
        w = min(r.uniform(54, 72), 342 - x)
        m = (xx >= x + 2) & (xx < x + w - 3) & (yy >= y0 + 2) & (yy < y0 + 38)
        blocks[m] = 26 - row * 4 + r.uniform(-2, 2); balb[m] = r.uniform(-0.08, 0.08)
        x += w
for _ in range(7):   # lose Steine
    x, y = r.uniform(70, 300), r.uniform(272, 330)
    m = (xx >= x) & (xx < x + 30) & (yy >= y) & (yy < y + 20); blocks[m] = 9; balb[m] = r.uniform(-0.1, 0.05)
blocks = gaussian_filter(blocks, 1.0)
hm += blocks * t
stone = col((204, 164, 112)) * (1 + balb[..., None]) * (0.92 + fbm(T, T, 6, 2, 14)[..., None] * 0.12)
floor = col((200, 170, 126)) * (0.95 + fbm(T, T, 15, 2, 15)[..., None] * 0.08)
alb = ground_ring(soil_walls(t, lerp(floor, stone, np.clip(blocks / 8, 0, 1))), t)
finish(hm, alb, "mauer")

# ---------- Hohlraum mit Stützbalken ----------
hm, t = pit_profile(60)
ang = np.arctan2(yy - 205, xx - 200); dd = np.sqrt((xx - 200) ** 2 + (yy - 205) ** 2)
hole_r = 98 * (1 + 0.1 * np.sin(3 * ang) + 0.05 * np.sin(7 * ang + 1))
hole = np.clip((hole_r - dd) / 22, 0, 1)
hm += -hole * 260
beams = np.zeros((T, T), np.float32)
def beam(a, b, w=9):
    global beams
    ax, ay = a; bx, by = b; vx, vy = bx - ax, by - ay; L2 = vx * vx + vy * vy
    tt = np.clip(((xx - ax) * vx + (yy - ay) * vy) / L2, 0, 1)
    dist = np.sqrt((xx - ax - tt * vx) ** 2 + (yy - ay - tt * vy) ** 2)
    prof = np.sqrt(np.clip(1 - (dist / w) ** 2, 0, 1)) * w
    beams = np.maximum(beams, prof + 6)
for a, b in [((66, 122), (334, 142)), ((76, 286), (330, 266)), ((122, 66), (142, 334)), ((282, 70), (262, 334))]:
    beam(a, b)
hm = np.where(beams > 6, np.maximum(hm, beams - 4), hm)
dark = lerp(col((150, 120, 90)), col((34, 26, 20)), hole)
wood = col((150, 106, 64)) * (0.85 + fbm(T, T, 3, 2, 16)[..., None] * 0.2)
alb = ground_ring(soil_walls(t, lerp(dark, wood, (beams > 6).astype(np.float32))), t)
finish(hm, alb, "hohl", shadow_steps=60, ambient=0.38)

# ---------- Flussbett: unauffällig, fast wie Sand, nur leichte Schichtung ----------
hm, t = pit_profile(48)
bands = np.sin((yy + np.sin(xx / 46) * 14 + np.sin(xx / 17) * 3) / 11) * 0.5 + 0.5
peb = stamp_bumps(16, 3, 6, 0.6, 17)
hm += (bands * 0.8 + peb + fbm(T, T, 30, 3, 19) * 2) * t
sed = col((210, 178, 130)) * (0.95 + fbm(T, T, 15, 2, 18)[..., None] * 0.07)
sed = lerp(sed, col((194, 164, 122)), bands * 0.35)
sed = lerp(sed, col((176, 160, 140)), np.clip(peb / 4, 0, 1) * 0.6)
alb = ground_ring(soil_walls(t, sed), t)
finish(hm, alb, "flussbett")

# ---------- Portal (nach dem Durchbruch): Felswand mit Torbogen ----------
rock = ridged(T, T, 120, 5, 19) * 30 + fbm(T, T, 12, 3, 20) * 4
arch_d = np.where(yy > 180, np.abs(xx - 200) - 70, np.sqrt((xx - 200) ** 2 + (yy - 180) ** 2) - 70)
inside = (arch_d < 0) & (yy < 350)
frame = (arch_d >= 0) & (arch_d < 16) & (yy < 356)
hm = rock + frame * 10 - inside * 60
glyph = np.zeros((T, T), np.float32); r = random.Random(21)
for k in range(9):
    a = math.pi - math.pi * (k + 0.5) / 9; gx, gy = 200 + math.cos(a) * 94, 180 - math.sin(a) * 94
    glyph += ((np.abs(xx - gx) < 4) & (np.abs(yy - gy) < 4)).astype(np.float32)
hm -= gaussian_filter(glyph, 0.8) * 4
alb = col((150, 134, 118)) * (0.88 + fbm(T, T, 8, 3, 22)[..., None] * 0.18)
alb = lerp(alb, col((60, 48, 40)), inside.astype(np.float32))
alb = lerp(alb, col((182, 150, 96)), gaussian_filter(glyph, 1.0) * 0.9)
finish(hm, alb, "portal", shadow_steps=60, ambient=0.4)

# ---------- Fels (gesperrte Felder) ----------
for v in range(3):
    big, tb = stamp_rocks(11, 20, 52, 0.5, 30 + v, (40, 360)); sm, ts = stamp_rocks(60, 3, 10, 0.6, 40 + v, (20, 380))
    rh = np.maximum(big, sm) + fbm(T, T, 40, 3, 50 + v) * 4
    tnt = np.where(big >= sm, tb, ts)
    g = lerp(col((200, 172, 132)), col((166, 142, 114)), np.clip(rh / 20, 0, 1)) * (1 + tnt[..., None]) * (0.92 + fbm(T, T, 6, 2, 60 + v)[..., None] * 0.12)
    rgb = shade(rh, g, 1.0, ambient=0.44, ao_r=8, ao_k=0.012)
    rgb *= (1 - cast_shadow(rh, 40, 1.5)[..., None] * 0.5)
    im = to_img(grain(rgb, 2.5, v)).convert("RGBA")
    n = fbm(T, T, 50, 2, 70 + v)
    a = np.clip((edge - 8 - (n + 1) * 14) / 16, 0, 1)
    im.putalpha(Image.fromarray((a * 255).astype(np.uint8), "L"))
    im.save(f"{OUT}/tiles/fels{v}.webp", "WEBP", quality=90, method=6)

# ---------- Fundstelle: rote Markierungsschnur und Wimpel ----------
im = Image.new("RGBA", (T * S, T * S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
sh = Image.new("L", (T * S, T * S), 0); ds = ImageDraw.Draw(sh)
RED = (176, 40, 30, 255)
for (a, b) in [((14, 14), (T - 14, 14)), ((T - 14, 14), (T - 14, T - 14)), ((T - 14, T - 14), (14, T - 14)), ((14, T - 14), (14, 14))]:
    ds.line([((a[0] + 6) * S, (a[1] + 6) * S), ((b[0] + 6) * S, (b[1] + 6) * S)], fill=160, width=5 * S)
    d.line([(a[0] * S, a[1] * S), (b[0] * S, b[1] * S)], fill=RED, width=5 * S)
for cx, cy in [(14, 14), (T - 14, 14), (14, T - 14), (T - 14, T - 14)]:
    flag = [(cx, cy), (cx + 34, cy + 10), (cx, cy + 20)]
    ds.polygon([((x + 14) * S, (y + 14) * S) for x, y in flag], fill=170)
    d.polygon([(x * S, y * S) for x, y in flag], fill=(198, 52, 36, 255))
    d.polygon([(x * S, y * S) for x, y in [(cx, cy), (cx + 34, cy + 10), (cx, cy + 10)]], fill=(220, 82, 58, 255))
    d.rectangle([(cx - 5) * S, (cy - 5) * S, (cx + 5) * S, (cy + 5) * S], fill=(112, 80, 48, 255))
shadow = Image.new("RGBA", im.size, (40, 28, 18, 0)); shadow.putalpha(sh.filter(ImageFilter.GaussianBlur(3 * S)).point(lambda v: int(v * 0.45)))
Image.alpha_composite(shadow, im).resize((T, T), Image.LANCZOS).save(f"{OUT}/tiles/schluessel.webp", "WEBP", quality=90, method=6)

# ---------- Marken: Holzscheiben mit Zahl, Wimpel für Ereignisse ----------
B = 120
f = ImageFont.truetype("/tmp/fell.ttf", 76)
def wood_disc(text):
    y, x = np.mgrid[0:B, 0:B].astype(np.float32) - B / 2
    dd = np.sqrt(x ** 2 + y ** 2) / 50
    hm = np.sqrt(np.clip(1 - dd ** 2, 0, 1)) * 10 + np.where(dd < 0.82, 2, 0)
    rings = np.sin(np.sqrt((x + 30) ** 2 + (y + 20) ** 2) / 2.2) * 0.5 + 0.5
    alb = lerp(col((196, 156, 104)), col((164, 122, 78)), rings * 0.6)[:B, :B]
    rgb = shade(hm.astype(np.float32), alb, 1.0, ambient=0.55, ao_r=3, ao_k=0.0)
    im = to_img(rgb).convert("RGBA")
    im.putalpha(Image.fromarray((np.clip((1 - dd) * 40, 0, 1) * 255).astype(np.uint8), "L"))
    shadow = Image.new("RGBA", (B, B), (0, 0, 0, 0)); ImageDraw.Draw(shadow).ellipse((14, 16, B - 4, B - 2), fill=(30, 20, 10, 140))
    out = Image.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(4)), im)
    if text: ImageDraw.Draw(out).text((B / 2, B / 2 + 2), text, font=f, fill=(44, 30, 18, 240), anchor="mm")
    return out
for k in list(range(9)) + ["x"]:
    wood_disc("?" if k == "x" else str(k)).save(f"{OUT}/tiles/spur-{k}.webp", "WEBP", quality=92)
def pennant(color, light):
    im = Image.new("RGBA", (B, B), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    pts = [(30, 26), (100, 50), (30, 74)]
    sh = Image.new("RGBA", (B, B), (0, 0, 0, 0)); ImageDraw.Draw(sh).polygon([(x + 10, y + 10) for x, y in pts], fill=(30, 20, 10, 130))
    im = Image.alpha_composite(sh.filter(ImageFilter.GaussianBlur(3)), im); d = ImageDraw.Draw(im)
    d.polygon(pts, fill=color); d.polygon([(30, 26), (100, 50), (30, 50)], fill=light)
    d.rectangle((24, 20, 34, 96), fill=(112, 80, 48, 255)); d.rectangle((24, 20, 29, 96), fill=(150, 112, 70, 255))
    return im
pennant((40, 70, 150, 255), (70, 104, 186, 255)).save(f"{OUT}/tiles/ereignis-gut.webp", "WEBP", quality=92)
pennant((176, 40, 30, 255), (214, 74, 56, 255)).save(f"{OUT}/tiles/ereignis-schlecht.webp", "WEBP", quality=92)
print("fertig")
