// Spiellogik nach Drachenchronik I, S. 34–36 (Ressourcen) und S. 47–50 (Verlauf der Ausgrabung).
// Zahlen, die der Band nicht nennt (Wirkungen von Ereignissen, Grabungsdauer je Gelände), sind Vorschläge
// und im Reiter Spielleitung änderbar bzw. aufhebbar.
export const ID = "dsa5-ausgrabung";
export const ASSETS = `modules/${ID}/assets`;
export const COLS = "ABCDEFGHIJ".split("");
export const STATE_VERSION = 2;

export const DEFAULT_LAYOUT = { x: 600, y: 400, cell: 200, n: 10 };

export const RES = [
  { key: "wasser", label: "Wasser" },
  { key: "nahrung", label: "Nahrung" },
  { key: "arbeiter", label: "Arbeiter" },
  { key: "holz", label: "Holz" },
  { key: "werkzeug", label: "Werkzeug" },
  { key: "tiere", label: "Tiere" }
];
const ZERO = () => ({ wasser: 0, nahrung: 0, arbeiter: 0, holz: 0, werkzeug: 0, tiere: 0 });

// Angebote aus dem Band (S. 34–36). group: höchstens ein Angebot derselben Gruppe.
export const OFFERS = [
  { id: "alim", group: "alim", source: "Scheich Alim al'Mosja (S. 34)", title: "Unterstützung durch Scheich Alim",
    res: { wasser: 30, nahrung: 30, arbeiter: 40, holz: 5, werkzeug: 0, tiere: 30 }, cost: 0,
    note: "Lohn der Arbeiter: 8 Zechinen täglich, für vier Monate 192 D (als Tageslohn verbucht)." },
  { id: "schuf1", group: "schuf", source: "Beni Schuf (S. 35)", title: "Beni Schuf ziehen fort",
    res: { wasser: 50 }, cost: 60, note: "30 Marawedi an Hairan Faisal; die Beni Schuf sind danach schlecht auf die Helden zu sprechen." },
  { id: "schuf2", group: "schuf", source: "Beni Schuf (S. 35)", title: "Beni Schuf bleiben am Rand",
    res: { wasser: 25, nahrung: 30 }, cost: 60, note: "40 D + 20 D; die Beni Schuf ziehen später doch fort." },
  { id: "schuf3", group: "schuf", source: "Beni Schuf (S. 35)", title: "Beni Schuf arbeiten mit",
    res: { wasser: 25, nahrung: 25, arbeiter: 15 }, cost: 86, note: "50 D einmalig und insgesamt 36 D Arbeitslohn." },
  { id: "achawi", group: "achawi", source: "Beni Achawi, Hairan Djermila (S. 35)", title: "Durchzug und Wasserstelle der Beni Achawi",
    res: { wasser: 25, holz: 5, tiere: 10 }, cost: 25, note: "Ehemänner beim Chorbash finden; sonst 25 Marawedi, bei redlichem Bemühen 10." },
  { id: "ruyad", group: "ruyad", source: "Ruyad der Schmied (S. 35)", title: "Werkzeug von Ruyad",
    res: { werkzeug: 100 }, cost: 160, note: "Reagiert empfindlich, behutsam verhandeln." },
  { id: "serham1", group: "serham1", source: "Serham ben Furka (S. 35)", title: "Händler aus Terekh",
    res: { nahrung: 30, holz: 5, werkzeug: 50, tiere: 10 }, cost: 200, note: "Kontakt über Serham beim Chorbash." },
  { id: "serham2", group: "serham2", source: "Serham ben Furka (S. 35)", title: "Arbeitskamele und Esel",
    res: { tiere: 50 }, cost: 500, note: "" },
  { id: "serham3", group: "serham3", source: "Serham ben Furka (S. 36)", title: "100 Arbeitssklaven (geliehen)",
    res: { arbeiter: 50 }, cost: 120, note: "Moralische Frage für die Helden.", slaves: true },
  { id: "holz", group: "holz", source: "Große Holz-Karawane (S. 36)", title: "Zedernholz aus den Hohen Eternen",
    res: { holz: 100 }, cost: 75, note: "Novadis müssen überzeugt und die ersten Lieferungen überwacht werden." }
];

// Ereignisse aus dem Band (S. 48–50). fx: Ressourcenänderung in Prozentpunkten (Vorschlag).
export const STORY = [
  { id: "werkzeug", who: "Pargonus", must: true, early: true, title: "Werkzeug verschwindet", page: 49,
    fx: { werkzeug: -30 }, public: "Werkzeug, Wasserschläuche und Decken sind gestohlen worden. Unter den Arbeitern gibt es Streit.",
    gm: "Pargonus' Leute haben das Diebesgut am Bergrand vergraben. Finden die Helden es, die Wirkung aufheben." },
  { id: "spion", who: "Pargonus", must: true, early: true, title: "Spion im Kartenzelt", page: 49,
    public: null, gm: "Pargonus durchsucht nachts Hilberts Karten. Proben für Wachen gemäß S. 27." },
  { id: "spur", who: "Pargonus", must: true, early: false, title: "Ausgräber auf eigener Spur", page: 49,
    public: null, gm: "Pargonus' Leute graben nachts an Stellen aus Hilberts Aufzeichnungen und verwischen ihre Spuren." },
  { id: "schreck", who: "Rohul", must: true, title: "Schreckgeschichten am Abend", page: 48,
    fx: { arbeiter: -15 }, public: "Nach Schauergeschichten am Abend laufen abergläubische Novadis davon.",
    gm: "Rohul hat den Haimamud bestellt." },
  { id: "abwerbung", who: "Rohul", must: true, title: "Arbeiter werden abgeworben", page: 48,
    fx: { arbeiter: -15 }, public: "Ein Händler wirbt Arbeiter ab, sie brechen ihre Zelte ab.", gm: "Im Auftrag Rohuls." },
  { id: "sippen", who: "Rohul", must: true, title: "Streit zweier Sippen", page: 48,
    fx: { arbeiter: -5 }, days: 2, public: "Arbeiter zweier Sippen prügeln sich und bedrohen einander mit Waffen.", gm: "Von Rohul angestachelt." },
  { id: "sklaven", who: "Rohul", must: false, title: "Zangen für die Sklaven", page: 48,
    fx: { arbeiter: -50 }, needsSlaves: true, public: "Sklaven haben ihre Ketten durchgekniffen und sind geflohen.",
    gm: "Rohul hat beim Schmied Ruyad schwere Zangen gekauft. Nur sinnvoll, wenn Serhams Sklaven arbeiten." },
  { id: "sabotage", who: "Rohul", must: true, title: "Sabotage am Förderrad", page: 48,
    wheel: 6, public: "Das Förderrad klemmt, ein Teil ist gebrochen. Mangels Ersatzteilen steht es mehrere Tage still.",
    gm: "Ein bestochener junger Arbeiter. Holzbearbeitung oder Mechanik erkennen die Sabotage." },
  { id: "feuer", who: "Rohul", must: true, title: "Feuer im Werkzeugzelt", page: 48,
    fx: { holz: -40, werkzeug: -50 }, days: 2, public: "Nachts brennt der mit Öl getränkte Holzstapel am Werkzeugzelt. Werkzeug und Bauholz sind verloren.",
    gm: "Ein Gefolgsmann Rohuls hat Wachen und Gebräuche zuvor ausgespäht." },
  { id: "wasserloch", who: "Zwischenfall", must: false, title: "Ein Wasserloch trocknet aus", page: 50,
    fx: { wasser: -25 }, public: "Eines der Wasserlöcher ist ausgetrocknet." },
  { id: "unfall", who: "Zwischenfall", must: false, title: "Unfall auf der Baustelle", page: 50,
    days: 1, victim: true, public: "Ein schwerer Unfall auf der Baustelle." },
  { id: "benischuf", who: "Zwischenfall", must: false, title: "Ärger mit den Beni Schuf", page: 50,
    public: "Einige Beni Schuf bereiten Ärger." },
  { id: "prediger", who: "Zwischenfall", must: false, title: "Hetzprediger aus Keft", page: 50,
    fx: { arbeiter: -10 }, public: "Ein Hetzprediger aus Keft wettert gegen die ungläubigen Ausgräber." },
  { id: "harpyien", who: "Zwischenfall", must: false, title: "Harpyien entführen Arbeiter", page: 50,
    fx: { arbeiter: -5 }, victim: true, public: "Harpyien stoßen herab und verschleppen Arbeiter." }
];

// Erste Funde (S. 49): Vorbelegung der Fundstellen
const ERSTE_FUNDE = [
  "Grundmauern einer verschütteten Siedlung",
  "Überreste einer Statue",
  "Stufen, die im Nichts enden",
  "Unidentifizierbare mumifizierte Überreste",
  "Alter Wachturm von Rohuls Orden mit einer Drachenstatue. Spätestens jetzt verrät Hilbert das wahre Ziel der Grabung."
];

export const DEFAULT_TERRAIN = [
  { id: "sand",    name: "Flugsand",                  short: "Sand",     w: 30, days: 2, holz: 0,  werkzeug: 0,  tiere: 25, mod: 0 },
  { id: "lehm",    name: "Festgebackener Lehm",       short: "Lehm",     w: 20, days: 3, holz: 0,  werkzeug: 50, tiere: 0,  mod: 0 },
  { id: "geroell", name: "Geröll",                    short: "Geröll",   w: 20, days: 3, holz: 25, werkzeug: 50, tiere: 50, mod: -1 },
  { id: "mauer",   name: "Mauerreste",                short: "Mauer",    w: 15, days: 4, holz: 25, werkzeug: 50, tiere: 0,  mod: 2 },
  { id: "hohl",    name: "Hohlraum (Einsturzgefahr)", short: "Hohlraum", w: 15, days: 3, holz: 75, werkzeug: 25, tiere: 0,  mod: -2 }
];

// Vorbelegung: Grabungsbereich, altes Flussbett, Portal, Fundstellen
const DEFAULT_AREA = [
  "0001111000",
  "0011111100",
  "0111111110",
  "1111111110",
  "1111111111",
  "0111111111",
  "0111111110",
  "0011111100",
  "0001111000",
  "0000110000"];
const RIVER = [[2, 2], [3, 3], [4, 3], [4, 4], [5, 5], [5, 6], [6, 6]];   // [Zeile, Spalte]
const PORTAL = [7, 6];
const FUND_CELLS = [[1, 4], [3, 7], [5, 2], [8, 4], [2, 6]];

export function cellName(i, n = 10) { return COLS[i % n] + (Math.floor(i / n) + 1); }
export function clone(o) { return foundry.utils.deepClone(o); }
const idx = ([r, c]) => r * 10 + c;

function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function generateCells(seed, terrain, keep) {
  const rnd = mulberry(seed);
  const tot = terrain.reduce((a, t) => a + Number(t.w || 0), 0) || 1;
  const cells = [];
  for (let i = 0; i < 100; i++) {
    let r = rnd() * tot, tid = terrain[0].id;
    for (const t of terrain) { if (r < t.w) { tid = t.id; break; } r -= t.w; }
    const k = keep?.[i];
    cells.push({
      area: k ? k.area : DEFAULT_AREA[Math.floor(i / 10)][i % 10] === "1",
      kind: k ? k.kind : null,
      terrain: tid, dug: false, hint: null, event: null
    });
  }
  if (!keep) {
    RIVER.forEach(p => { cells[idx(p)].kind = "fluss"; cells[idx(p)].area = true; });
    cells[idx(PORTAL)].kind = "portal"; cells[idx(PORTAL)].area = true;
    FUND_CELLS.forEach(p => { cells[idx(p)].kind = "fund"; cells[idx(p)].area = true; });
  }
  return cells;
}

export function defaultParty() {
  return game.actors.filter(a => a.type === "character" && a.hasPlayerOwner).map(a => a.id);
}

export function newState() {
  const seed = Math.floor(Math.random() * 99999);
  const terrain = clone(DEFAULT_TERRAIN);
  const s = {
    version: STATE_VERSION,
    settings: { breakthrough: 120, wage: 1.6, budget: 0, insightAfter: 3, seed },
    terrain,
    cells: generateCells(seed, terrain),
    funde: FUND_CELLS.map((p, k) => ({ idx: idx(p), text: ERSTE_FUNDE[k] })),
    offers: { alim: { cost: 0 } },
    custom: [],
    party: defaultParty(), absent: [], leader: null, leaderFor: null, selected: null,
    log: [], finds: [], last: null, run: {}, story: {}
  };
  resetRun(s);
  return s;
}

/** Grabungsfortschritt zurücksetzen; Beschaffung (Angebote) bleibt. */
export function resetRun(s) {
  s.run = { day: 0, spent: 0, adj: ZERO(), nextBonus: 0, wheelUntil: 0, insight: false, insightBonus: 0, breakthrough: false };
  s.log = []; s.finds = []; s.last = null; s.story = {};
  s.selected = null; s.leader = null; s.leaderFor = null;
  s.cells.forEach(c => { c.dug = false; c.hint = null; c.event = null; });
}

export function migrate(old) {
  if (old?.version === STATE_VERSION) return old;
  const s = newState();
  if (old?.cells?.length === 100) s.cells.forEach((c, i) => { c.area = old.cells[i].area || !!c.kind; });
  if (old?.party?.length) s.party = old.party;
  return s;
}

// ---------- Zustand lesen/schreiben (als JSON-Text, damit Flags nicht zusammengeführt werden) ----------
export function getState(scene) {
  const raw = scene?.getFlag(ID, "state");
  if (!raw) return null;
  try { return typeof raw === "string" ? JSON.parse(raw) : clone(raw); } catch (e) { console.error(ID, e); return null; }
}
export async function setState(scene, state) {
  await scene.update({ [`flags.${ID}.state`]: JSON.stringify(state) });
}
export function getLayout(scene) {
  return foundry.utils.mergeObject(clone(DEFAULT_LAYOUT), scene?.getFlag(ID, "layout") ?? {}, { inplace: false });
}

// ---------- Versorgung ----------
export function supplied(state) {
  const sum = ZERO();
  for (const [id, o] of Object.entries(state.offers ?? {})) {
    const def = OFFERS.find(x => x.id === id);
    if (!def) continue;
    for (const [k, v] of Object.entries(def.res)) sum[k] += v;
  }
  for (const c of state.custom ?? []) for (const k of Object.keys(sum)) sum[k] += Number(c.res?.[k] ?? 0);
  return sum;
}
export function resources(state) {
  const sup = supplied(state), adj = state.run.adj ?? ZERO(), out = {};
  for (const { key } of RES) out[key] = Math.max(0, Math.min(100, sup[key] + (adj[key] ?? 0)));
  return out;
}
export function supplyMod(res) {
  const v = Math.min(res.wasser, res.nahrung);
  if (v >= 75) return 0;
  if (v >= 50) return -1;
  if (v >= 25) return -2;
  return -4;
}
export function wheelBroken(state) { return state.run.wheelUntil > state.run.day; }
export function offerCost(state) {
  let c = 0;
  for (const o of Object.values(state.offers ?? {})) c += Number(o.cost ?? 0);
  for (const x of state.custom ?? []) c += Number(x.cost ?? 0);
  return c;
}

// ---------- Heldenwerte aus dem DSA5-Bogen ----------
function names(key) {
  return String(game.settings.get(ID, key) ?? "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
}
function stepOf(item) { return Number(item.system?.step?.value ?? 1) || 1; }
const ROMAN = ["", "I", "II", "III", "IV"];

export function heroProfile(actor) {
  const p = { id: actor.id, name: actor.name, img: actor.img, luck: 0, sense: false, magnet: false, leader: false, tags: [] };
  const glueck = names("ausgrabungNamesLuck"), pech = names("ausgrabungNamesBadLuck"), magnet = names("ausgrabungNamesMagnet");
  const anf = names("ausgrabungNamesLeader"), sense = names("ausgrabungNamesSense");
  const perLuck = Number(game.settings.get(ID, "ausgrabungLuckPerStep")) || 0;
  const perPech = Number(game.settings.get(ID, "ausgrabungBadLuckPerStep")) || 0;
  for (const it of actor.items) {
    const n = it.name.trim().toLowerCase();
    if (it.type === "advantage" && glueck.includes(n)) {
      const st = stepOf(it); p.luck += perLuck * st; p.tags.push({ text: `${it.name} ${ROMAN[st] ?? st}`, cls: "good" });
    } else if (it.type === "disadvantage" && pech.includes(n)) {
      const st = stepOf(it); p.luck -= perPech * st; p.tags.push({ text: `${it.name} ${ROMAN[st] ?? st}`, cls: "bad" });
    } else if (it.type === "disadvantage" && magnet.includes(n)) {
      p.magnet = true; p.tags.push({ text: it.name, cls: "bad" });
    } else if (it.type === "specialability" && anf.includes(n)) {
      p.leader = true; p.tags.push({ text: it.name, cls: "neu" });
    } else if (["advantage", "specialability"].includes(it.type) && sense.some(s => n.startsWith(s))) {
      p.sense = true; p.tags.push({ text: it.name, cls: "neu" });
    }
  }
  const fp = actor.system?.status?.fatePoints ?? {};
  p.schip = Number(fp.value ?? 0);
  p.schipMax = Number(fp.max ?? Math.max(p.schip, Number(fp.current ?? 0) + Number(fp.modifier ?? 0)));
  return p;
}

export function partyProfiles(state) {
  return (state.party ?? []).map(id => game.actors.get(id)).filter(Boolean).map(a => {
    const p = heroProfile(a);
    p.present = !(state.absent ?? []).includes(a.id);
    p.isLeader = state.leader === a.id;
    p.canEdit = a.isOwner;
    if (state.test?.active) p.schip = Math.max(0, p.schip - (state.test.schipUsed?.[a.id] ?? 0));
    return p;
  });
}

export function luckLabel(p) {
  if (!p || !p.luck) return "";
  return `${p.luck > 0 ? "+" : "−"}${Math.abs(p.luck)}`;
}

// ---------- Kosten eines Abschnitts ----------
export function costOf(state, i) {
  const c = state.cells[i];
  const t = state.terrain.find(x => x.id === c.terrain) ?? state.terrain[0];
  const res = resources(state);
  const lacks = [];
  for (const k of ["holz", "werkzeug", "tiere"]) {
    const need = Number(t[k] ?? 0);
    if (need > 0 && res[k] < need) lacks.push({ key: k, need, have: res[k] });
  }
  let factor = 100 / Math.max(10, res.arbeiter);
  if (wheelBroken(state)) factor *= 1.5;
  let days = Math.ceil(Number(t.days) * factor) + lacks.length;
  if (state.run.insight) days -= 1;
  days -= state.run.nextBonus || 0;
  days = Math.max(1, days);
  const wage = Math.round(days * Number(state.settings.wage) * 10) / 10;
  return { t, days, wage, lacks, res };
}

function neighbors(i, n = 10) {
  const r = Math.floor(i / n), c = i % n, o = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < n && cc >= 0 && cc < n) o.push(rr * n + cc);
  }
  return o;
}
const isRiver = c => c.kind === "fluss" || c.kind === "portal";

function directionHint(state, from) {
  const open = state.cells.map((c, i) => isRiver(c) && !c.dug && i !== from ? i : -1).filter(i => i >= 0);
  if (!open.length) return "Der Verlauf des alten Flussbetts ist vollständig freigelegt.";
  const r = Math.floor(from / 10), c = from % 10;
  let best = open[0], bd = 1e9;
  for (const i of open) { const d = Math.abs(Math.floor(i / 10) - r) + Math.abs(i % 10 - c); if (d < bd) { bd = d; best = i; } }
  const br = Math.floor(best / 10), bc = best % 10;
  let dir = (br < r ? "Nord" : br > r ? "Süd" : "");
  dir += bc < c ? (dir ? "west" : "West") : bc > c ? (dir ? "ost" : "Ost") : "";
  return `Ausgewaschene Schichten deuten nach ${dir || "unten"}, etwa ${bd} Felder entfernt.`;
}

async function dice(formula) { return (await new Roll(formula).evaluate()).total; }
const RES_LABEL = Object.fromEntries(RES.map(r => [r.key, r.label]));
function fxText(fx) {
  return Object.entries(fx ?? {}).filter(([, v]) => v).map(([k, v]) => `${RES_LABEL[k]} ${v > 0 ? "+" : "−"}${Math.abs(v)} %`).join(", ");
}
function applyFx(state, fx) { for (const [k, v] of Object.entries(fx ?? {})) state.run.adj[k] = (state.run.adj[k] ?? 0) + v; }

// Ereignistabelle eines Abschnitts nach Gesamtwurf (W20 + Modifikatoren)
const EVENTS = [
  { max: 2, kind: "bad", title: "Unfall in der Grube", text: "Eine Grubenwand gibt nach. Ein Tag geht verloren.", victim: "1W6+2 SP", victimRoll: "1d6+2",
    fx: async (s) => { s.run.day += 1; } },
  { max: 4, kind: "bad", title: "Unruhe unter den Arbeitern", text: "Gerüchte über Flüche machen die Runde, einige Arbeiter gehen.", leaderStops: true,
    fx: async (s, ctx, r) => { applyFx(s, { arbeiter: -5 }); r.extra = "Arbeiter −5 %."; } },
  { max: 6, kind: "bad", title: "Sandsturm", text: "Der Wind treibt den Sand zurück in die Gruben. Ein zusätzlicher Tag geht verloren.",
    fx: async (s) => { s.run.day += 1; } },
  { max: 8, kind: "bad", title: "Werkzeug bricht", text: "Hacken und Schaufeln halten dem harten Boden nicht stand.",
    fx: async (s, ctx, r) => { applyFx(s, { werkzeug: -10 }); r.extra = "Werkzeug −10 %."; } },
  { max: 12, kind: "neu", title: "Schichten dokumentiert", text: "Tiefe und Bodenschichten werden vermessen und aufgezeichnet, sonst nichts Auffälliges." },
  { max: 14, kind: "good", title: "Alte Balken", text: "Eine verschüttete Stützkonstruktion liefert brauchbares Holz.",
    fx: async (s, ctx, r) => { applyFx(s, { holz: 5 }); r.extra = "Holz +5 %."; } },
  { max: 16, kind: "good", title: "Kleinfund", text: "Scherben, eine Münze oder ein Stück Schmuck kommen zum Vorschein.",
    fx: async (s, ctx, r) => { const v = await dice("1d6"); r.extra = `Wert etwa ${v} D (W6).`; r.find = `Kleinfund (${v} D)`; } },
  { max: 18, kind: "good", title: "Spuren im Boden", text: "Die Schichten erzählen von fließendem Wasser.",
    fx: async (s, ctx, r) => { r.extra = directionHint(s, ctx.idx); } },
  { max: 20, kind: "good", title: "Feste Schicht", text: "Der Boden trägt gut. Der nächste Abschnitt dauert 1 Tag weniger.",
    fx: async (s) => { s.run.nextBonus = 1; } },
  { max: 999, kind: "good", title: "Glücksfund", text: "Ein bedeutender Kleinfund und deutliche Spuren des alten Flussbetts.",
    fx: async (s, ctx, r) => { const v = await dice("2d6"); s.run.insightBonus = (s.run.insightBonus ?? 0) + 1; r.find = `Wertvoller Kleinfund (${v} D)`;
      r.extra = `Wert etwa ${v} D (2W6). ${directionHint(s, ctx.idx)}`; } }
];

async function resolveEvent(state, last, profiles) {
  const ev = EVENTS.find(e => last.tot <= e.max);
  const r = { kind: ev.kind, title: ev.title, text: ev.text, extra: "", victim: "", find: null };
  const present = profiles.filter(p => p.present);
  const ctx = { idx: last.idx };
  if (ev.leaderStops && present.some(p => p.leader)) {
    const a = present.find(p => p.leader);
    r.kind = "neu";
    r.extra = `${a.name} hält die Arbeiter als Anführer bei der Stange. Niemand geht.`;
  } else if (ev.fx) await ev.fx(state, ctx, r);
  if (ev.victim) r.victim = await pickVictim(present, ev.victim, ev.victimRoll);
  if (r.find) state.finds.push({ cell: cellName(last.idx), text: r.find });
  return r;
}

async function pickVictim(present, text, roll) {
  const mag = present.find(p => p.magnet);
  const v = mag ?? present[Math.floor(Math.random() * present.length)];
  let txt = text;
  if (roll) txt += `: ${await dice(roll)} SP`;
  return v ? `${v.name}${mag ? " (Pechmagnet)" : ""}: ${txt}` : txt;
}

function checkInsight(state) {
  if (state.run.insight) return null;
  const dug = state.cells.filter(c => isRiver(c) && c.dug).length + (state.run.insightBonus ?? 0);
  if (dug < Number(state.settings.insightAfter || 3)) return null;
  state.run.insight = true;
  const text = "Die bisherigen Grabungen waren nicht tief genug. Ab jetzt werden die Probelöcher wesentlich tiefer und entlang des ausgewaschenen Flussbetts gegraben: jeder Abschnitt dauert 1 Tag weniger.";
  pushLog(state, `Erkenntnis: ${text}`);
  return text;
}

// ---------- Aktionen der Spielleitung (laufen nur beim aktiven SL) ----------
export async function gmDig(scene, { idx: i, leaderId, d20: rolled, userId, draw }) {
  const state = getState(scene);
  if (!state || state.version !== STATE_VERSION) return;
  const cell = state.cells[i];
  if (!cell || !cell.area || cell.dug) return;
  const test = !!state.test?.active;
  const forced = test && Number(state.test.forceD20) > 0;
  let d20 = forced ? Number(state.test.forceD20) : Number(rolled);
  if (!(d20 >= 1)) d20 = await dice("1d20");
  const profiles = partyProfiles(state);
  const lead = profiles.find(p => p.id === leaderId && p.present) ?? null;
  if (!lead) return;
  const cost = costOf(state, i);
  state.run.day += cost.days;
  state.run.spent = Math.round((state.run.spent + cost.wage) * 10) / 10;
  state.run.nextBonus = 0;

  const mods = [];
  if (lead?.luck) mods.push({ v: lead.luck, label: `${lead.name.split(" ")[0]}, ${lead.luck > 0 ? "Glück" : "Pech"}` });
  if (cost.t.mod) mods.push({ v: Number(cost.t.mod), label: cost.t.name });
  for (const l of cost.lacks) mods.push({ v: -2, label: `${RES_LABEL[l.key]} ${l.have} % statt ${l.need} %` });
  const sm = supplyMod(cost.res);
  if (sm) mods.push({ v: sm, label: "Wasser/Nahrung knapp" });
  if (state.run.insight && isRiver(cell)) mods.push({ v: 2, label: "Erkenntnis, Flussbett" });

  let key = null;
  if (cell.kind === "fund") {
    key = state.funde.find(k => k.idx === i)?.text ?? "Erster Fund";
    state.finds.push({ cell: cellName(i), text: key, key: true });
  }
  let rock = null;
  if (cell.kind === "portal" && !state.run.breakthrough) rock = "In großer Tiefe stoßen die Arbeiter auf eine feste Gesteinsschicht. Noch gibt sie nichts preis.";

  const last = {
    id: foundry.utils.randomID(), idx: i, leaderId, d20, mods,
    tot: d20 + mods.reduce((a, m) => a + m.v, 0),
    cost: { days: cost.days, wage: cost.wage, terrain: cost.t.name, lacks: cost.lacks, wheel: wheelBroken(state) },
    key, rock, rerolled: null, userId, test, forced, insight: null,
    draw: draw && Number(draw.n) > 0 && Number(draw.r) > 0 ? { n: Number(draw.n), r: Number(draw.r) } : null,
    snap: null
  };
  last.snap = { run: clone(state.run), finds: clone(state.finds) };
  last.ev = await resolveEvent(state, last, profiles);
  const cnt = neighbors(i).filter(k => isRiver(state.cells[k]) && !state.cells[k].dug).length;
  cell.hint = (lead?.sense || (await dice("1d6")) >= 4) ? cnt : "?";
  cell.dug = true; cell.event = last.ev.kind;
  last.insight = checkInsight(state);
  state.last = last;
  state.selected = null; state.leader = null; state.leaderFor = null;
  pushLog(state, `${cellName(i)} (${cost.t.name}, ${cost.days} Tg.) · ${last.ev.title}${key ? " · ✦ " + key.split(".")[0] : ""}`);
  await setState(scene, state);
  return { state, last, lead };
}

export async function gmReroll(scene, { digId, actorId, d20 }) {
  const state = getState(scene);
  const last = state?.last;
  if (!last || last.id !== digId || last.rerolled || last.ev.kind === "good") return;
  const actor = game.actors.get(actorId);
  if (!actor) return;
  const prof = partyProfiles(state).find(p => p.id === actorId);
  if (!prof || prof.schip < 1) return;
  if (state.test?.active) {
    state.test.schipUsed[actorId] = (state.test.schipUsed[actorId] ?? 0) + 1;
  } else {
    const fp = Number(actor.system?.status?.fatePoints?.value ?? 0);
    await actor.update({ "system.status.fatePoints.value": fp - 1 });
  }
  const insightBefore = state.run.insight;
  state.run = clone(last.snap.run);
  state.finds = clone(last.snap.finds);
  last.d20 = d20;
  last.tot = d20 + last.mods.reduce((a, m) => a + m.v, 0);
  last.rerolled = actor.name;
  last.forced = false;
  last.ev = await resolveEvent(state, last, partyProfiles(state));
  state.cells[last.idx].event = last.ev.kind;
  if (insightBefore && !state.run.insight) state.run.insight = true;
  last.insight = last.insight ?? checkInsight(state);
  pushLog(state, `Neuwurf (${actor.name}, Schicksalspunkt) · ${cellName(last.idx)} · ${last.ev.title}`);
  await setState(scene, state);
  return { state, last, lead: partyProfiles(state).find(p => p.id === last.leaderId) };
}

/** Ereignis aus dem Band auslösen (nur SL). Liefert Daten für die Chatkarte. */
export async function triggerStory(state, id) {
  const def = STORY.find(s => s.id === id);
  if (!def || state.story[id]) return null;
  const present = partyProfiles(state).filter(p => p.present);
  const rec = { day: state.run.day, fx: clone(def.fx ?? {}), days: def.days ?? 0, wheel: 0, victim: "" };
  if (def.needsSlaves && !state.offers?.serham3) rec.fx = {};
  applyFx(state, rec.fx);
  if (rec.days) state.run.day += rec.days;
  if (def.wheel) { rec.wheel = def.wheel; state.run.wheelUntil = Math.max(state.run.wheelUntil, state.run.day + def.wheel); }
  if (def.victim) rec.victim = await pickVictim(present, "verletzt", "1d6+2");
  state.story[id] = rec;
  const eff = [fxText(rec.fx), rec.days ? `+${rec.days} Tage` : "", rec.wheel ? `Förderrad ${rec.wheel} Tage außer Betrieb` : ""].filter(Boolean).join(", ");
  pushLog(state, `${def.title}${def.public ? "" : " (nur SL)"}${eff ? ` · ${eff}` : ""}`, !def.public);
  return { def, rec, eff };
}

/** Wirkung eines ausgelösten Ereignisses aufheben (z. B. Werkzeug wiedergefunden). Das Ereignis bleibt als geschehen markiert. */
export function revertStory(state, id) {
  const rec = state.story[id];
  if (!rec || rec.reverted) return false;
  applyFx(state, Object.fromEntries(Object.entries(rec.fx ?? {}).map(([k, v]) => [k, -v])));
  if (rec.wheel) state.run.wheelUntil = state.run.day;
  rec.reverted = true;
  const def = STORY.find(s => s.id === id);
  pushLog(state, `Wirkung aufgehoben: ${def?.title ?? id}`);
  return true;
}

export function triggerBreakthrough(state) {
  if (state.run.breakthrough) return false;
  state.run.breakthrough = true;
  const p = state.cells.findIndex(c => c.kind === "portal");
  if (p >= 0) { state.cells[p].dug = true; state.cells[p].event = "good"; state.cells[p].hint = null; }
  state.finds.push({ cell: p >= 0 ? cellName(p) : "?", text: "Durchbruch: freigelegte Bergflanke mit den Umrissen eines Portals", key: true });
  pushLog(state, "Der Durchbruch! Unter dem Sand liegt eine frühere Bergflanke mit den Umrissen eines Portals.");
  return p;
}

export function toggleOffer(state, id, cost) {
  const def = OFFERS.find(o => o.id === id);
  if (!def) return;
  if (state.offers[id]) { delete state.offers[id]; pushLog(state, `Beschaffung zurückgenommen: ${def.title}`, true); return; }
  for (const k of Object.keys(state.offers)) {
    if (OFFERS.find(o => o.id === k)?.group === def.group) delete state.offers[k];
  }
  state.offers[id] = { cost: Number(cost ?? def.cost) || 0 };
  pushLog(state, `Beschafft: ${def.title} (${fxText(def.res)}${state.offers[id].cost ? `, ${state.offers[id].cost} D` : ""})`);
}

export function pushLog(state, text, gmOnly = false) {
  state.log.unshift({ day: state.run.day, text, gm: gmOnly || undefined });
  state.log = state.log.slice(0, 300);
}

// ---------- Testmodus ----------
function withoutTest(state) { const c = clone(state); delete c.test; return c; }

export function startTest(state) {
  state.test = { active: true, snapshot: withoutTest(state), schipUsed: {}, forceD20: 0 };
  pushLog(state, "Testmodus gestartet. Schicksalspunkte in den Bögen bleiben unangetastet.");
  return state;
}
export function restoreTest(state, keepActive) {
  if (!state.test?.snapshot) return state;
  const snap = clone(state.test.snapshot);
  if (keepActive) {
    snap.test = { active: true, snapshot: clone(state.test.snapshot), schipUsed: {}, forceD20: state.test.forceD20 ?? 0 };
    pushLog(snap, "Test zurückgesetzt.");
  }
  return snap;
}
