"""Werkzeuge für den Federzeichnungs-Stil: Pergament, Tuschelinien, Schraffur, Punktierung."""
import math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
from scipy.ndimage import gaussian_filter, zoom

INK = (52, 36, 22)
SEPIA = (118, 82, 48)


def noise(h, w, scale, octaves=4, seed=0):
    r = np.random.default_rng(seed)
    out = np.zeros((h, w)); amp = 1.0; tot = 0
    for o in range(octaves):
        s = max(2, int(scale / (2 ** o)))
        small = r.random((h // s + 2, w // s + 2))
        out += zoom(small, s, order=3)[:h, :w] * amp
        tot += amp; amp *= 0.5
    out /= tot
    return (out - out.min()) / (out.max() - out.min() + 1e-9)


def parchment(w, h, seed=1, light=(236, 224, 196), dark=(206, 182, 140), blotches=True):
    """Pergamentgrund mit Wolken, Fasern und sepiafarbenen Flecken (RGB-Array float)."""
    n1 = noise(h, w, max(60, min(w, h) // 3), 4, seed)
    n2 = noise(h, w, 12, 2, seed + 1)
    base = np.array(light, float)[None, None, :] * (1 - n1[..., None] * 0.35) + np.array(dark, float)[None, None, :] * (n1[..., None] * 0.35)
    base *= (0.97 + n2[..., None] * 0.05)
    if blotches:
        rng = np.random.default_rng(seed + 5)
        m = np.zeros((h, w))
        for _ in range(int(w * h / 350000) + 3):
            cx, cy = rng.uniform(0, w), rng.uniform(0, h)
            r = rng.uniform(min(w, h) * 0.04, min(w, h) * 0.14)
            yy, xx = np.ogrid[0:h, 0:w]
            m += np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * r * r))) * rng.uniform(0.3, 1.0)
        m = np.clip(m * (0.6 + noise(h, w, 40, 3, seed + 6) * 0.8), 0, 1.2)
        base = base * (1 - m[..., None] * 0.16) + np.array(SEPIA, float) * (m[..., None] * 0.16)
    return base


def to_img(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB").convert("RGBA")


class Pen:
    """Zeichnet auf einer 2x-Ebene mit leichtem Zittern, wie mit der Feder."""
    def __init__(self, size, scale=2, seed=7):
        self.S = scale
        self.img = Image.new("RGBA", (size[0] * scale, size[1] * scale), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)
        self.rng = random.Random(seed)
        self.k = 1.0   # Strichstärke-Faktor

    def P(self, pts):
        return [(x * self.S, y * self.S) for x, y in pts]

    def _wobble(self, pts, jitter, step=8):
        out = []
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            L = math.hypot(x1 - x0, y1 - y0); n = max(1, int(L / step))
            for k in range(n):
                t = k / n
                out.append((x0 + (x1 - x0) * t + self.rng.uniform(-jitter, jitter), y0 + (y1 - y0) * t + self.rng.uniform(-jitter, jitter)))
        out.append(pts[-1])
        return out

    def line(self, pts, w=2.0, col=INK, alpha=230, jitter=0.8, double=True):
        p = self._wobble(pts, jitter)
        w *= self.k
        self.d.line(self.P(p), fill=col + (alpha,), width=max(1, int(w * self.S)), joint="curve")
        if double:
            q = [(x + self.rng.uniform(-0.8, 0.8), y + self.rng.uniform(-0.8, 0.8)) for x, y in p]
            self.d.line(self.P(q), fill=col + (int(alpha * 0.4),), width=max(1, int(w * 0.6 * self.S)))

    def poly(self, pts, w=2.0, fill=None, col=INK, alpha=230, jitter=0.8):
        if fill is not None:
            self.d.polygon(self.P(pts), fill=fill)
        self.line(list(pts) + [pts[0]], w, col, alpha, jitter)

    def circle(self, cx, cy, r, w=2.0, fill=None, col=INK, alpha=230):
        n = max(12, int(r * 1.2))
        pts = [(cx + math.cos(2 * math.pi * k / n) * r * self.rng.uniform(0.97, 1.03),
                cy + math.sin(2 * math.pi * k / n) * r * self.rng.uniform(0.97, 1.03)) for k in range(n)]
        self.poly(pts, w, fill, col, alpha, jitter=0.4)

    def dot(self, x, y, r=1.2, col=INK, alpha=200):
        r *= self.k ** 0.5
        self.d.ellipse(self.P([(x - r, y - r), (x + r, y + r)]), fill=col + (alpha,))

    def hatch(self, pts, angle=45, spacing=7, w=1.0, col=INK, alpha=170, cross=False):
        """Schraffur innerhalb eines Polygons."""
        S = self.S
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        x0, y0, x1, y1 = min(xs) - 2, min(ys) - 2, max(xs) + 2, max(ys) + 2
        W, H = int((x1 - x0) * S) + 4, int((y1 - y0) * S) + 4
        if W <= 4 or H <= 4: return
        mask = Image.new("L", (W, H), 0)
        ImageDraw.Draw(mask).polygon([((x - x0) * S, (y - y0) * S) for x, y in pts], fill=255)
        lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
        for ang in ([angle, angle + 90] if cross else [angle]):
            a = math.radians(ang); dx, dy = math.cos(a), math.sin(a)
            diag = math.hypot(W, H)
            k = -diag
            while k < diag:
                cx, cy = W / 2 + -dy * k, H / 2 + dx * k
                j = self.rng.uniform(-0.8, 0.8) * S
                ld.line([(cx - dx * diag + j, cy - dy * diag), (cx + dx * diag + j, cy + dy * diag)], fill=col + (alpha,), width=max(1, int(w * self.k * S)))
                k += spacing * S * self.rng.uniform(0.85, 1.15)
        lay.putalpha(ImageChops.multiply(lay.getchannel("A"), mask))
        self.img.alpha_composite(lay, (int(x0 * S), int(y0 * S)))

    def stipple(self, pts, density=0.004, r=(0.7, 1.4), col=INK, alpha=170):
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
        mask = Image.new("L", (int(x1 - x0) + 2, int(y1 - y0) + 2), 0)
        ImageDraw.Draw(mask).polygon([(x - x0, y - y0) for x, y in pts], fill=1)
        m = np.array(mask)
        n = int((x1 - x0) * (y1 - y0) * density)
        for _ in range(n):
            x, y = self.rng.uniform(x0, x1), self.rng.uniform(y0, y1)
            if m[int(y - y0), int(x - x0)]:
                self.dot(x, y, self.rng.uniform(*r), col, alpha)

    def shrub(self, x, y, s=9, alpha=200):
        """Buschwerk als kleines Tuschesternchen (wie auf der Oasenkarte)."""
        for k in range(self.rng.randint(5, 8)):
            a = self.rng.uniform(0, 2 * math.pi); L = s * self.rng.uniform(0.6, 1.1)
            self.line([(x, y), (x + math.cos(a) * L, y + math.sin(a) * L)], 1.2, alpha=alpha, jitter=0.3, double=False)
        self.dot(x, y, 1.6, alpha=alpha)

    def stone(self, cx, cy, r, alpha=220):
        n = 7
        pts = [(cx + math.cos(2 * math.pi * k / n + self.rng.uniform(-.3, .3)) * r * self.rng.uniform(.7, 1.15),
                cy + math.sin(2 * math.pi * k / n + self.rng.uniform(-.3, .3)) * r * self.rng.uniform(.7, 1.15)) for k in range(n)]
        self.poly(pts, 1.4, fill=(208, 188, 150, 255), alpha=alpha, jitter=0.3)
        # Schattenseite rechts unten schraffieren
        half = [p for p in pts if (p[0] - cx) + (p[1] - cy) > -r * 0.2]
        if len(half) >= 3:
            self.hatch(half + [(cx, cy)], angle=-45, spacing=max(2.5, r / 3.5), w=0.8, alpha=150)

    def text(self, xy, s, font, col=INK, alpha=225, anchor="mm"):
        self.d.text((xy[0] * self.S, xy[1] * self.S), s, font=font, fill=col + (alpha,), anchor=anchor)

    def result(self):
        return self.img.resize((self.img.width // self.S, self.img.height // self.S), Image.LANCZOS)


def torn_edge_mask(w, h, margin=40, seed=3):
    """Unregelmäßig gerissener Rand (L-Maske)."""
    n = noise(h, w, 60, 3, seed)
    yy, xx = np.mgrid[0:h, 0:w]
    edge = np.minimum.reduce([xx, yy, w - 1 - xx, h - 1 - yy]).astype(float)
    m = np.clip((edge - margin * (0.4 + n)) / 6, 0, 1)
    return Image.fromarray((m * 255).astype(np.uint8), "L"), edge, n
