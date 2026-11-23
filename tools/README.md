# Grafiken erzeugen

Die Szene und alle Feldkacheln werden prozedural im Federzeichnungs-Stil erzeugt (keine Fremdgrafiken).

```bash
pip install pillow numpy scipy fonttools
# Schrift IM Fell English SC (SIL Open Font License) als TTF nach /tmp/fell.ttf legen, z. B. aus @fontsource/im-fell-english-sc
mkdir -p out/tiles
python3 gen_ink_scene.py out    # Hintergrund khom-grabung.webp
python3 gen_ink_tiles.py out    # Kacheln in out/tiles
```

Danach `out/khom-grabung.webp` nach `assets/` und `out/tiles/*.webp` nach `assets/tiles/` kopieren.
