// Szene im Khôm anlegen und die Felder als Kacheln (Tiles) darstellen.
import { ID, ASSETS, DEFAULT_LAYOUT, newState, getState, setState, getLayout, STATE_VERSION } from "./logic.mjs";

const BG = `${ASSETS}/khom-grabung.webp`;
const TERRAIN_TEX = { sand: "sand", lehm: "lehm", geroell: "geroell", mauer: "mauer", hohl: "hohl" };

export function isDigScene(scene) { return !!scene?.getFlag(ID, "layout"); }

export function findDigScene() {
  if (isDigScene(canvas?.scene)) return canvas.scene;
  return game.scenes.find(s => isDigScene(s)) ?? null;
}

export async function createDigScene() {
  if (!game.user.isGM) return ui.notifications.warn("Nur die Spielleitung kann die Grabungsszene anlegen.");
  const state = newState();
  const data = {
    name: "Grabungsstätte im Khôm",
    width: 3200, height: 2800, padding: 0,
    background: { src: BG },
    backgroundColor: "#7a5a34",
    grid: { type: 1, size: DEFAULT_LAYOUT.cell, distance: 2, units: "Schritt", color: "#3a2412", alpha: 0.45, thickness: 2 },
    initial: { x: 1600, y: 1400, scale: 0.35 },
    tokenVision: false,
    fog: { exploration: false },
    flags: { [ID]: { layout: DEFAULT_LAYOUT, state: JSON.stringify(state) } }
  };
  // wie die Oase Bischa im Szenenordner „Drachenchronik“ ablegen
  let folder = game.folders.find(f => f.type === "Scene" && f.name === "Drachenchronik");
  if (!folder) folder = await Folder.create({ name: "Drachenchronik", type: "Scene", sorting: "a" });
  data.folder = folder.id;
  const scene = await Scene.create(data);
  // Ab V14 liegt der Hintergrund auf einer Ebene (Level). Falls die Übernahme nicht automatisch erfolgt ist, nachtragen.
  try {
    const lvl = scene.levels?.contents?.[0] ?? scene.firstLevel;
    if (lvl && !lvl.background?.src) await lvl.update({ "background.src": BG });
  } catch (e) { console.warn(`${ID} | Ebene konnte nicht angepasst werden`, e); }
  await syncTiles(scene, state);
  ui.notifications.info("Grabungsszene im Khôm angelegt.");
  return scene;
}

let SHIFT = { dx: 0, dy: 0 };
function tileData(key, src, x, y, w, h, sort) {
  x += SHIFT.dx; y += SHIFT.dy;
  return {
    // Ab V14 bezieht sich x/y auf einen Anker (Standard: Mitte). 0/0 = linke obere Ecke wie in V13.
    texture: { src }, x, y, width: w, height: h, anchorX: 0, anchorY: 0, sort, elevation: 0,
    locked: true, hidden: false, alpha: 1,
    flags: { [ID]: { k: key } }
  };
}

/** Bringt die Kacheln der Szene auf den Stand des Spielzustands. */
export async function syncTiles(scene, state = getState(scene)) {
  if (!game.user.isGM || !scene || !state || state.version !== STATE_VERSION) return;
  const L = getLayout(scene);
  const sh = scene.getFlag(ID, "tileShift") ?? {};
  SHIFT = { dx: Number(sh.dx) || 0, dy: Number(sh.dy) || 0 };
  const want = new Map();
  state.cells.forEach((c, i) => {
    const x = L.x + (i % L.n) * L.cell, y = L.y + Math.floor(i / L.n) * L.cell, s = L.cell;
    if (!c.area && !c.dug) {
      const k = `fels:${i}`;
      want.set(k, tileData(k, `${ASSETS}/tiles/fels${i % 3}.webp`, x, y, s, s, 1));
      return;
    }
    if (!c.dug) {
      const k = `deckel:${i}`;
      want.set(k, tileData(k, `${ASSETS}/tiles/unberuehrt.webp`, x, y, s, s, 1));
      return;
    }
    // Portal erst nach dem Durchbruch; vorher wie Flussbett
    const tex = c.kind === "portal" && state.run?.breakthrough ? "portal"
      : (c.kind === "fluss" || c.kind === "portal") ? "flussbett"
      : (TERRAIN_TEX[c.terrain] ?? "sand");
    let k = `grube:${i}:${tex}`;
    want.set(k, tileData(k, `${ASSETS}/tiles/${tex}.webp`, x, y, s, s, 2));
    if (c.kind === "fund" || (c.kind === "portal" && state.run?.breakthrough)) {
      k = `fund:${i}`; want.set(k, tileData(k, `${ASSETS}/tiles/schluessel.webp`, x, y, s, s, 3));
    }
    if (c.hint !== null && c.hint !== undefined) {
      const h = c.hint === "?" ? "x" : Math.min(8, Number(c.hint));
      const b = Math.round(s * 0.34);
      k = `spur:${i}:${h}`; want.set(k, tileData(k, `${ASSETS}/tiles/spur-${h}.webp`, x + s - b - 4, y + 4, b, b, 4));
    }
    let showEvents = false;
    try { showEvents = !!game.settings.get(ID, "ausgrabungPublicChat"); } catch (e) { /* Standard: privat */ }
    if (showEvents && (c.event === "good" || c.event === "bad")) {
      const b = Math.round(s * 0.28);
      const src = `${ASSETS}/tiles/ereignis-${c.event === "good" ? "gut" : "schlecht"}.webp`;
      k = `ereignis:${i}:${c.event}`; want.set(k, tileData(k, src, x + 4, y + s - b - 4, b, b, 4));
    }
  });
  const existing = scene.tiles.filter(t => t.getFlag(ID, "k"));
  const have = new Set(existing.map(t => t.getFlag(ID, "k")));
  const del = existing.filter(t => !want.has(t.getFlag(ID, "k"))).map(t => t.id);
  const add = [...want.entries()].filter(([k]) => !have.has(k)).map(([, d]) => d);
  // vorhandene Kacheln an die richtige Stelle rücken (z. B. aus 1.0 mit mittigem Anker)
  const fix = [];
  for (const t of existing) {
    const d = want.get(t.getFlag(ID, "k"));
    if (!d) continue;
    const u = { _id: t.id };
    for (const f of ["x", "y", "width", "height", "anchorX", "anchorY"]) {
      if (f in t._source && t._source[f] !== d[f]) u[f] = d[f];
    }
    if (Object.keys(u).length > 1) fix.push(u);
  }
  if (del.length) await scene.deleteEmbeddedDocuments("Tile", del);
  if (fix.length) await scene.updateEmbeddedDocuments("Tile", fix);
  if (add.length) await scene.createEmbeddedDocuments("Tile", add);
}

export async function rebuildScene(scene) {
  const state = getState(scene);
  if (!state) { await setState(scene, newState()); }
  await syncTiles(scene);
}

/** Weltkoordinate → Feldindex oder null */
export function cellAt(scene, point) {
  const L = getLayout(scene);
  const c = Math.floor((point.x - L.x) / L.cell), r = Math.floor((point.y - L.y) / L.cell);
  if (c < 0 || r < 0 || c >= L.n || r >= L.n) return null;
  return r * L.n + c;
}

export function cellCenter(scene, i) {
  const L = getLayout(scene);
  return { x: L.x + (i % L.n) * L.cell + L.cell / 2, y: L.y + Math.floor(i / L.n) * L.cell + L.cell / 2 };
}

/**
 * Misst, wo Foundry eine Feldkachel tatsächlich zeichnet, und gleicht Abweichungen aus.
 * Hintergrund: Ab V14 beziehen sich x/y einer Kachel auf einen Ursprung/Anker, dessen Lage
 * nicht dokumentiert ist. Statt zu raten, wird der Versatz am gezeichneten Bild gemessen.
 */
export async function calibrateTiles(scene) {
  if (!game.user.isGM || canvas?.scene?.id !== scene?.id) return;
  const L = getLayout(scene);
  const full = scene.tiles.find(t => /^(deckel|fels|grube|fund):/.test(t.getFlag(ID, "k") ?? "") && t.object?.mesh);
  if (!full) return;
  const i = Number(full.getFlag(ID, "k").split(":")[1]);
  let center;
  try {
    const r = full.object.mesh.getBounds();
    center = canvas.stage.worldTransform.applyInverse(new PIXI.Point(r.x + r.width / 2, r.y + r.height / 2));
  } catch (e) { console.warn(`${ID} | Kachel konnte nicht vermessen werden`, e); return; }
  const want = { x: L.x + (i % L.n) * L.cell + L.cell / 2, y: L.y + Math.floor(i / L.n) * L.cell + L.cell / 2 };
  const dx = Math.round(want.x - center.x), dy = Math.round(want.y - center.y);
  if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2) return;
  if (Math.abs(dx) > L.cell || Math.abs(dy) > L.cell) { console.warn(`${ID} | unplausibler Kachelversatz`, dx, dy); return; }
  const old = scene.getFlag(ID, "tileShift") ?? {};
  const shift = { dx: (Number(old.dx) || 0) + dx, dy: (Number(old.dy) || 0) + dy };
  console.log(`${ID} | Kachelversatz gemessen: ${dx}/${dy} px, neu ${shift.dx}/${shift.dy}`);
  await scene.setFlag(ID, "tileShift", shift);
  await syncTiles(scene);
  ui.notifications.info(`Ausgrabung: Kacheln um ${dx}/${dy} px ins Raster gerückt.`);
}
