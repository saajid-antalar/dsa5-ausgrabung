# Grafiken erzeugen

Szene und Feldkacheln werden prozedural als realistische Draufsicht gerendert (Höhenmodell mit Sonnenlicht von Nordwesten, Materialien, Schlagschatten). Es werden keine Fremdgrafiken verwendet.

```bash
pip install pillow numpy scipy fonttools
# Schrift IM Fell English SC (SIL Open Font License) als TTF nach /tmp/fell.ttf legen, z. B. aus @fontsource/im-fell-english-sc
mkdir -p out/tiles
python3 gen_real_scene.py out    # Hintergrund grabungsstaette.webp (4400 × 3600, Raster 50 px = 1 Schritt)
python3 gen_real_tiles.py out    # Kacheln in out/tiles
```

Lagerplan (Zelte, Feuerstellen, Wege, Wasserloch, Pferch) steht oben in `gen_real_scene.py` (`CORE`, `CLUSTERS`, `TRACKS` …). Danach `out/grabungsstaette.webp` nach `assets/` und `out/tiles/*.webp` nach `assets/tiles/` kopieren.
