// Kleines Übersichtsfenster für die Spieler: Versorgung, Abschnitt, Leitung, Funde.
import { ID, getState, RES, resources, supplyMod, wheelBroken, offerCost, cellName, partyProfiles, STATE_VERSION } from "./logic.mjs";
import { findDigScene } from "./scene.mjs";
import { clientDig, clientDrawLeader, resultHTML, setPicking, isPicking } from "./main.mjs";

let HudClass = null;
export class AusgrabungHud {
  constructor() {
    HudClass ??= buildHud();
    return new HudClass();
  }
}

function level(v) { return v >= 75 ? "ok" : v >= 50 ? "mid" : v >= 25 ? "low" : "crit"; }

function buildHud() {
  const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
  return class extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: "dsa-ausgrabung-hud",
      classes: ["dsa-ausgrabung", "ausg-hudwin"],
      window: { title: "Ausgrabung", icon: "fa-solid fa-trowel", resizable: true },
      position: { width: 340, height: "auto", top: 70, left: Math.max(20, window.innerWidth - 340 - 330) },
      actions: {
        pick: function () { setPicking(!isPicking()); this.render(); },
        draw: function () { const s = findDigScene(); if (s) clientDrawLeader(s); },
        dig: function () { const s = findDigScene(); if (s) clientDig(s); },
        viewScene: function () { findDigScene()?.view(); }
      }
    };
    static PARTS = { main: { template: `modules/${ID}/templates/hud.hbs`, scrollable: [".ausg-hud-scroll"] } };

    async _prepareContext() {
      const scene = findDigScene();
      const state = getState(scene);
      if (!scene || !state || state.version !== STATE_VERSION) return { none: true };
      const res = resources(state);
      const sel = state.selected;
      const cell = sel != null ? state.cells[sel] : null;
      const leaderOk = cell && state.leader && state.leaderFor === sel;
      const lead = leaderOk ? partyProfiles(state).find(p => p.id === state.leader) : null;
      const sm = supplyMod(res);
      const bt = Number(state.settings.breakthrough) || 120;
      return {
        onScene: canvas?.scene?.id === scene.id,
        picking: isPicking(),
        testActive: !!state.test?.active,
        res: RES.map(r => ({ ...r, v: res[r.key], lvl: level(res[r.key]) })),
        day: state.run.day, bt, dayPct: Math.min(100, Math.round(state.run.day / bt * 100)),
        spent: Math.round((state.run.spent + offerCost(state)) * 10) / 10,
        warn: [sm ? `Wasser und Nahrung knapp: −${Math.abs(sm)} auf jeden Wurf.` : "",
               wheelBroken(state) ? `Förderrad steht noch ${state.run.wheelUntil - state.run.day} Tage still.` : ""].filter(Boolean),
        insight: state.run.insight, breakthrough: state.run.breakthrough,
        selName: cell && !cell.dug ? cellName(sel) : null,
        lead: lead ? { name: lead.name, luck: lead.luck > 0 ? `Glück, +${lead.luck}` : lead.luck < 0 ? `Pech, ${lead.luck}` : "" } : null,
        canDig: !!(cell && !cell.dug && leaderOk),
        last: state.last ? resultHTML(state, state.last) : "",
        finds: state.finds,
        log: state.log.filter(l => !l.gm).slice(0, 8)
      };
    }
  };
}
