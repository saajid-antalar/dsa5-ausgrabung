"""Werkzeuge für eine realistische Draufsicht: Höhenmodell, Relieflicht, Materialien, Schlagschatten."""
import math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter, zoom, map_coordinates

LIGHT = np.array([-1.0, -1.0, 1.25])          # Sonne von Nordwesten, ~42° hoch
LIGHT = LIGHT / np.linalg.norm(LIGHT)
SHADOW_DIR = (1.0, 1.0)                        # Schatten fallen nach Südosten


def fbm(h, w, scale, octaves=5, seed=0, gain=0.5):
    r = np.random.default_rng(abs(int(seed)))
    out = np.zeros((h, w)); amp = 1.0; tot = 0.0
    for o in range(octaves):
        s = max(1.5, scale / (2 ** o))
        gh, gw = int(h / s) + 3, int(w / s) + 3
        small = r.standard_normal((gh, gw))
        big = zoom(small, (h / (gh - 3) * 1.0, w / (gw - 3) * 1.0), order=3)[:h, :w]
        if big.shape != (h, w):
            big = np.pad(big, ((0, h - big.shape[0]), (0, w - big.shape[1])), mode="edge")
        out += big * amp; tot += amp; amp *= gain
    out /= tot
    return out / (np.abs(out).max() + 1e-9)


def ridged(h, w, scale, octaves=5, seed=0):
    out = np.zeros((h, w)); amp = 1.0; tot = 0
    for o in range(octaves):
        n = fbm(h, w, scale / (2 ** o), 1, seed + o)
        out += (1 - np.abs(n)) ** 2 * amp; tot += amp; amp *= 0.5
    return out / tot


def normals(hm, strength=1.0):
    gy, gx = np.gradient(hm * strength)
    n = np.dstack([-gx, -gy, np.ones_like(hm)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n


def shade(hm, albedo, strength=1.0, ambient=0.42, ao_r=12, ao_k=0.006, spec=0.0):
    """Relieflicht: Lambert + Umgebungslicht + Höhlenverdunkelung."""
    n = normals(hm, strength)
    lam = np.clip((n * LIGHT[None, None, :]).sum(2), 0, 1)
    flat = LIGHT[2]
    light = ambient + (1 - ambient) * lam / flat
    cav = hm - gaussian_filter(hm, ao_r)
    ao = np.clip(1 + cav * ao_k, 0.55, 1.12)
    rgb = albedo * (light * ao)[..., None]
    return rgb


def cast_shadow(hm, steps=40, step=1.5, k=1.0):
    """Einfacher Höhenschatten (Raymarching Richtung Sonne)."""
    h, w = hm.shape
    sh = np.zeros_like(hm)
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    dz = LIGHT[2] / math.hypot(LIGHT[0], LIGHT[1])
    for s in range(1, steps + 1):
        d = s * step
        hx = map_coordinates(hm, [yy - d * 0.7071, xx - d * 0.7071], order=1, mode="nearest")
        sh = np.maximum(sh, np.clip((hx - hm - d * dz * k) / 8, 0, 1))
    return gaussian_filter(sh, 1.2)


def lerp(a, b, t):
    return a * (1 - t[..., None]) + b * t[..., None]


def col(c):
    return np.array(c, float)[None, None, :]


def to_img(rgb):
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")


class Layer:
    """Objektebene in doppelter Auflösung mit Schattenmaske."""
    def __init__(self, size, S=2):
        self.S = S; self.size = size
        self.img = Image.new("RGBA", (size[0] * S, size[1] * S), (0, 0, 0, 0))
        self.sh = Image.new("L", (size[0] * S, size[1] * S), 0)    # Schattenwerfer
        self.d = ImageDraw.Draw(self.img); self.ds = ImageDraw.Draw(self.sh)

    def P(self, pts, off=(0, 0)):
        return [((x + off[0]) * self.S, (y + off[1]) * self.S) for x, y in pts]

    def shadow_poly(self, pts, height):
        o = (SHADOW_DIR[0] * height, SHADOW_DIR[1] * height)
        self.ds.polygon(self.P(pts, o), fill=255)
        self.ds.polygon(self.P(pts), fill=255)

    def shadow_ellipse(self, box, height):
        x0, y0, x1, y1 = box; o = height
        self.ds.ellipse([(x0 + o) * self.S, (y0 + o) * self.S, (x1 + o) * self.S, (y1 + o) * self.S], fill=255)

    def shadow_line(self, pts, w, height):
        o = (SHADOW_DIR[0] * height, SHADOW_DIR[1] * height)
        self.ds.line(self.P(pts, o), fill=255, width=max(1, int(w * self.S)))

    def compose(self, ground_rgb, shadow_strength=0.5, blur=4):
        W, H = self.size
        sh = self.sh.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(blur))
        s = np.array(sh, float) / 255.0
        g = ground_rgb * (1 - s[..., None] * shadow_strength)
        base = to_img(g).convert("RGBA")
        obj = self.img.resize((W, H), Image.LANCZOS)
        return Image.alpha_composite(base, obj)


def shaded_fill(size, mask_fn, base_rgb, hm_fn, strength=1.0, ambient=0.5):
    """Hilfsfunktion: Objektfläche mit eigenem Mini-Höhenmodell schattieren (z. B. Zeltbahnen)."""
    w, h = size
    hm = hm_fn(w, h)
    alb = np.ones((h, w, 3)) * np.array(base_rgb, float)
    return shade(hm, alb, strength, ambient=ambient, ao_r=3, ao_k=0.0)


def grain(rgb, amount=4, seed=0):
    r = np.random.default_rng(seed)
    return rgb + r.normal(0, amount, rgb.shape[:2])[..., None]
