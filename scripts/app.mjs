// Fenster „Die Ausgrabung“ (ApplicationV2)
import {
  ID, getState, setState, partyProfiles, costOf, cellName, generateCells, resetRun, newState, COLS, startTest, restoreTest,
  RES, OFFERS, STORY, resources, supplyMod, wheelBroken, offerCost, toggleOffer, triggerStory, revertStory, triggerBreakthrough,
  STATE_VERSION, pushLog
} from "./logic.mjs";
import { findDigScene, createDigScene, syncTiles, cellCenter, calibrateTiles } from "./scene.mjs";
import { request, resultHTML, deleteTestMessages, postStoryCard, postBreakthroughCard, setPicking, isPicking } from "./main.mjs";

const TERRAIN_COLORS = { sand: "#c9a86a", lehm: "#a0703f", geroell: "#7d6a55", mauer: "#5b4a6e", hohl: "#8a3a22" };
const KIND_LABEL = { fund: "✦", fluss: "≈", portal: "⌂" };
const KIND_NAME = { fund: "Fundstelle", fluss: "Flussbett", portal: "Portal" };

let AppClass = null;
export class AusgrabungApp {
  constructor() {
    AppClass ??= buildClass();
    return new AppClass();
  }
}

function level(v) { return v >= 75 ? "ok" : v >= 50 ? "mid" : v >= 25 ? "low" : "crit"; }

function buildClass() {
  const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

  return class extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: "dsa-ausgrabung-app",
      classes: ["dsa-ausgrabung"],
      window: { title: "Die Ausgrabung", icon: "fa-solid fa-trowel", resizable: true },
      position: { width: 1040, height: 860 },
      actions: {
        // nicht "tab" nennen: ApplicationV2 belegt diese Aktion selbst (Tab-Gruppen)
        ausgTab: function (ev, t) { this.tab = t.dataset.ausgTab; this.render(); },
        cell: function (ev, t) { this._onCell(Number(t.dataset.idx)); },
        pick: function () {
          if (canvas?.scene?.id !== this.scene?.id) return ui.notifications.warn("Bitte zuerst die Grabungsszene ansehen.");
          setPicking(true);
        },
        paint: function (ev, t) { this.paint = t.dataset.mode; this.render(); },
        createScene: async function () { await createDigScene(); this.render(); },
        viewScene: function () { this.scene?.view(); },
        regen: function () { this._gmEdit(s => {
          const keep = s.cells.map(c => ({ area: c.area, kind: c.kind }));
          s.settings.seed = Math.floor(Math.random() * 99999);
          s.cells = generateCells(s.settings.seed, s.terrain, keep);
          resetRun(s);
        }); },
        reset: function () { this._gmEdit(s => resetRun(s)); },
        sync: async function () { await syncTiles(this.scene); ui.notifications.info("Kacheln der Grabung neu aufgebaut."); },
        calibrate: async function () { await calibrateTiles(this.scene); this.render(); },
        newGame: function () { this._gmEdit(() => newState(), true); },
        offer: function (ev, t) {
          const id = t.dataset.offer;
          const cost = this.element.querySelector(`[data-offer-cost="${id}"]`)?.value;
          this._gmEdit(s => toggleOffer(s, id, cost));
        },
        customAdd: function () {
          const el = this.element, res = {};
          for (const { key } of RES) res[key] = Number(el.querySelector(`[data-custom="${key}"]`)?.value) || 0;
          const title = el.querySelector("[data-custom=title]")?.value?.trim() || "Kleinere Absprache";
          const cost = Number(el.querySelector("[data-custom=cost]")?.value) || 0;
          if (!Object.values(res).some(v => v)) return ui.notifications.warn("Bitte mindestens eine Ressource angeben.");
          this._gmEdit(s => { s.custom.push({ title, res, cost }); pushLog(s, `Beschafft: ${title}${cost ? ` (${cost} D)` : ""}`); });
        },
        customDel: function (ev, t) { const k = Number(t.dataset.k); this._gmEdit(s => { s.custom.splice(k, 1); }); },
        story: async function (ev, t) {
          const scene = this.scene; if (!scene) return;
          const s = getState(scene);
          const r = await triggerStory(s, t.dataset.story);
          if (!r) return;
          await setState(scene, s); await syncTiles(scene, s);
          await postStoryCard(r.def, r.rec, r.eff, s.test?.active);
        },
        storyRevert: function (ev, t) { this._gmEdit(s => { revertStory(s, t.dataset.story); }); },
        breakthrough: async function () {
          const scene = this.scene; if (!scene) return;
          const s = getState(scene);
          const p = triggerBreakthrough(s);
          if (p === false) return;
          await setState(scene, s); await syncTiles(scene, s);
          await postBreakthroughCard(p >= 0 ? cellName(p) : "?", s.test?.active);
          if (p >= 0 && canvas?.scene?.id === scene.id) canvas.ping?.(cellCenter(scene, p));
        },
        testStart: function () { this._gmEdit(s => startTest(s)); },
        testReset: async function () { await this._gmEdit(s => restoreTest(s, true), true); await deleteTestMessages(); ui.notifications.info("Test zurückgesetzt."); },
        testEnd: async function () { await this._gmEdit(s => restoreTest(s, false), true); await deleteTestMessages(); ui.notifications.info("Testmodus beendet, Stand vor dem Test wiederhergestellt."); }
      }
    };

    static PARTS = {
      main: { template: `modules/${ID}/templates/app.hbs`, scrollable: [".ausg-scroll"] }
    };

    tab = "spiel";
    paint = "area";

    get scene() { return findDigScene(); }

    async _prepareContext() {
      const scene = this.scene;
      const isGM = game.user.isGM;
      if (!scene) return { noScene: true, isGM };
      const state = getState(scene);
      if (!state) return { noScene: true, isGM };
      if (state.version !== STATE_VERSION) return { needsMigration: true, isGM };
      const gmTab = isGM && this.tab === "leitung";
      const heroes = partyProfiles(state);
      const present = heroes.filter(h => h.present);
      const res = resources(state);

      const board = [{ lab: true, text: "" }];
      COLS.forEach(c => board.push({ lab: true, text: c }));
      for (let r = 0; r < 10; r++) {
        board.push({ lab: true, text: String(r + 1) });
        for (let c = 0; c < 10; c++) {
          const i = r * 10 + c, cell = state.cells[i];
          const t = state.terrain.find(x => x.id === cell.terrain) ?? state.terrain[0];
          const o = { idx: i, name: cellName(i), cls: [], style: "", text: "", hint: "", ev: "",
            title: [cellName(i), cell.area ? t.name : "gesperrt", cell.kind ? KIND_NAME[cell.kind] : "", cell.dug ? "gegraben" : ""].filter(Boolean).join(" · ") };
          if (!cell.area) o.cls.push("out");
          if (cell.dug) {
            o.cls.push("dug");
            const river = cell.kind === "fluss" || cell.kind === "portal";
            o.style = `background:${river ? "#8f7a5a" : (TERRAIN_COLORS[t.id] ?? "#999")}`;
            o.text = gmTab ? "" : (cell.kind === "portal" && state.run.breakthrough ? "Portal" : river ? "Flussbett" : (t.short ?? t.name));
            o.hint = cell.hint == null ? "" : String(cell.hint);
            if (gmTab) { o.style = `background:${TERRAIN_COLORS[t.id] ?? "#999"}`; if (cell.kind) o.mark = KIND_LABEL[cell.kind]; }
            o.ev = cell.event === "good" ? "◆" : cell.event === "bad" ? "✕" : "";
            if (cell.kind === "fund" || (cell.kind === "portal" && state.run.breakthrough)) o.cls.push("key");
          } else if (gmTab && cell.area) {
            o.style = `background:${TERRAIN_COLORS[t.id] ?? "#999"}8c`;
            if (cell.kind) { o.cls.push("gmkind"); o.mark = KIND_LABEL[cell.kind]; }
          }
          o.cls = o.cls.join(" ");
          o.disabled = !gmTab && (!cell.area || cell.dug);
          board.push(o);
        }
      }

      const day = state.run.day, bt = Number(state.settings.breakthrough) || 120;
      const sm = supplyMod(res);
      const spentTotal = Math.round((state.run.spent + offerCost(state)) * 10) / 10;
      const ctx = {
        isGM, gmTab, tab: this.tab, sceneName: scene.name, onScene: canvas?.scene?.id === scene.id,
        res: RES.map(r => ({ ...r, v: res[r.key], lvl: level(res[r.key]) })),
        day, bt, dayPct: Math.min(100, Math.round(day / bt * 100)),
        spentTotal, budget: Number(state.settings.budget) || 0,
        budgetLeft: Math.round(((Number(state.settings.budget) || 0) - spentTotal) * 10) / 10,
        supplyWarn: sm ? `Wasser und Nahrung reichen nicht: −${Math.abs(sm)} auf jeden Ereigniswurf.` : "",
        wheel: wheelBroken(state) ? `Das Förderrad steht noch ${state.run.wheelUntil - day} Tage still: alle Abschnitte dauern länger.` : "",
        insight: state.run.insight,
        breakthrough: state.run.breakthrough,
        nextBonus: state.run.nextBonus,
        board,
        leaderOptions: present.map(h => ({ id: h.id, name: h.name, selected: h.id === state.leader && state.leaderFor === -1, note: h.luck > 0 ? "Glück" : h.luck < 0 ? "Pech" : "" })),
        picking: isPicking(),
        playersEnabled: !!game.settings.get(ID, "ausgrabungPlayersEnabled"),
        heroes, noHeroes: !heroes.length,
        last: state.last ? resultHTML(state, state.last) : "",
        finds: state.finds,
        log: state.log.filter(l => isGM || !l.gm),
        testActive: !!state.test?.active,
        forceOptions: Array.from({ length: 21 }, (_, v) => ({ v, label: v ? String(v) : "zufällig (online würfeln)", selected: Number(state.test?.forceD20 ?? 0) === v }))
      };

      if (isGM) {
        const lab = Object.fromEntries(RES.map(r => [r.key, r.label]));
        const fx = o => Object.entries(o ?? {}).filter(([, v]) => v).map(([k, v]) => `${lab[k]} ${v > 0 ? "+" : ""}${v} %`).join(", ");
        ctx.settings = state.settings;
        ctx.legend = state.terrain.map(t => ({ name: t.name, color: TERRAIN_COLORS[t.id] ?? "#999" }));
        const sh = scene.getFlag(ID, "tileShift") ?? {};
        ctx.shift = { dx: Number(sh.dx) || 0, dy: Number(sh.dy) || 0 };
        ctx.terrain = state.terrain.map((t, i) => ({ ...t, i }));
        ctx.funde = state.funde.map(k => ({ ...k, name: cellName(k.idx) })).sort((a, b) => a.idx - b.idx);
        // Helden = Spielercharaktere oder schon in der Gruppe; übrige Charakterbögen (Orte, Buchhaltung …) aufklappbar
        const chars = game.actors.filter(a => a.type === "character")
          .map(a => ({ id: a.id, name: a.name, inParty: state.party.includes(a.id), hero: a.hasPlayerOwner || state.party.includes(a.id) }))
          .sort((a, b) => a.name.localeCompare(b.name, "de"));
        ctx.actors = chars.filter(a => a.hero);
        ctx.otherActors = chars.filter(a => !a.hero);
        ctx.paint = [["area", "Grabungsbereich"], ["out", "Gesperrt (Fels)"], ["fund", "Fundstelle ✦"], ["fluss", "Flussbett ≈"], ["portal", "Portal ⌂"], ["terrain", "Gelände wechseln"]]
          .map(([mode, label]) => ({ mode, label, active: this.paint === mode }));
        ctx.offers = OFFERS.map(o => ({ ...o, fx: fx(o.res), taken: !!state.offers[o.id], cost: state.offers[o.id]?.cost ?? o.cost }));
        ctx.custom = (state.custom ?? []).map((c, k) => ({ ...c, k, fx: fx(c.res) }));
        ctx.resKeys = RES;
        const story = st => {
          const rec = state.story[st.id];
          const eff = [fx(st.fx), st.days ? `+${st.days} ${st.days === 1 ? "Tag" : "Tage"}` : "", st.wheel ? `Förderrad ${st.wheel} Tage still` : "", st.workers === "accident" ? "W3 Arbeiter tot, W6 verletzt" : st.workers === "harpy" ? "W6 Arbeiter verschleppt" : ""].filter(Boolean).join(", ");
          return { ...st, eff: st.needsSlaves && !state.offers.serham3 ? "ohne Wirkung (keine Sklaven)" : eff, done: !!rec, doneDay: rec?.day, reverted: rec?.reverted,
            canRevert: rec && !rec.reverted && (Object.keys(rec.fx ?? {}).length || rec.wheel) };
        };
        ctx.storyPargonus = STORY.filter(s => s.who === "Pargonus").map(story);
        ctx.storyRohul = STORY.filter(s => s.who === "Rohul").map(story);
        ctx.storyOptional = STORY.filter(s => s.who === "Zwischenfall").map(story);
        const openMust = STORY.filter(s => s.must && !state.story[s.id]);
        const nextP = openMust.find(s => s.who === "Pargonus");
        ctx.storyHint = nextP ? `Laut Band zuerst Pargonus' Ereignisse: als Nächstes „${nextP.title}“.`
          : openMust.length ? `Noch offen: ${openMust.map(s => s.title).join(", ")}.` : "Alle Pflichtereignisse sind geschehen.";
        ctx.btReady = !state.run.breakthrough && day >= bt;
        ctx.riverDug = state.cells.filter(c => (c.kind === "fluss" || c.kind === "portal") && c.dug).length;
      }
      return ctx;
    }

    _onRender() {
      const el = this.element;
      el.querySelector("[data-leader]")?.addEventListener("change", ev => request("leader", { sceneId: this.scene.id, actorId: ev.target.value }));
      el.querySelectorAll("[data-present]").forEach(cb => cb.addEventListener("change", ev =>
        request("present", { sceneId: this.scene.id, actorId: cb.dataset.present, present: ev.target.checked })));
      if (!game.user.isGM) return;
      el.querySelector("[data-players-enabled]")?.addEventListener("change", ev =>
        game.settings.set(ID, "ausgrabungPlayersEnabled", ev.currentTarget.checked));
      el.querySelectorAll("[data-setting]").forEach(inp => inp.addEventListener("change", () =>
        this._gmEdit(s => { s.settings[inp.dataset.setting] = Number(inp.value) || 0; })));
      el.querySelectorAll("[data-shift]").forEach(inp => inp.addEventListener("change", async () => {
        const scene = this.scene;
        const sh = { ...(scene.getFlag(ID, "tileShift") ?? { dx: 0, dy: 0 }), [inp.dataset.shift]: Number(inp.value) || 0 };
        await scene.setFlag(ID, "tileShift", sh);
        await syncTiles(scene);
      }));
      el.querySelectorAll("[data-terrain]").forEach(inp => inp.addEventListener("change", () =>
        this._gmEdit(s => {
          const t = s.terrain[Number(inp.dataset.terrain)], f = inp.dataset.field;
          t[f] = f === "name" || f === "short" ? inp.value : (Number(inp.value) || 0);
        })));
      el.querySelectorAll("[data-fund]").forEach(inp => inp.addEventListener("change", () =>
        this._gmEdit(s => { const k = s.funde.find(x => x.idx === Number(inp.dataset.fund)); if (k) k.text = inp.value; })));
      el.querySelectorAll("[data-party]").forEach(cb => cb.addEventListener("change", () =>
        this._gmEdit(s => {
          s.party = s.party.filter(id => id !== cb.dataset.party);
          if (cb.checked) s.party.push(cb.dataset.party);
        })));
      el.querySelector("[data-test-force]")?.addEventListener("change", ev =>
        this._gmEdit(s => { if (s.test) s.test.forceD20 = Number(ev.target.value) || 0; }));
    }

    async _gmEdit(fn, replace = false) {
      const scene = this.scene;
      if (!game.user.isGM || !scene) return;
      let s = getState(scene);
      const r = fn(s);
      if (replace && r) s = r;
      await setState(scene, s);
      await syncTiles(scene, s);
    }

    _onCell(i) {
      const scene = this.scene; if (!scene) return;
      if (game.user.isGM && this.tab === "leitung") {
        return this._gmEdit(s => {
          const c = s.cells[i];
          if (c.dug) return;
          const p = this.paint;
          if (p === "area") c.area = true;
          else if (p === "out") { c.area = false; c.kind = null; s.funde = s.funde.filter(k => k.idx !== i); }
          else if (p === "terrain") {
            const k = s.terrain.findIndex(t => t.id === c.terrain);
            c.terrain = s.terrain[(k + 1) % s.terrain.length].id;
          } else {
            // Fundstelle, Flussbett, Portal: umschalten; es gibt nur ein Portal
            c.area = true;
            const was = c.kind;
            if (was === "fund") s.funde = s.funde.filter(k => k.idx !== i);
            if (was === p) { c.kind = null; return; }
            if (p === "portal") s.cells.forEach(x => { if (x.kind === "portal") x.kind = null; });
            c.kind = p;
            if (p === "fund") s.funde.push({ idx: i, text: "Erster Fund (Text eintragen)" });
          }
        });
      }
      // Im Reiter „Grabung“ gibt es keinen Plan mehr; gegraben wird auf der Szene.
    }
  };
}
