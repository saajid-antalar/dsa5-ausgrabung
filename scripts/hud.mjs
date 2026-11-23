// Kleines Übersichtsfenster für die Spieler: Versorgung, Abschnitt, Leitung, Funde.
import { ID, getState, RES, resources, supplyMod, wheelBroken, offerCost, cellName, partyProfiles, STATE_VERSION } from "./logic.mjs";
import { findDigScene } from "./scene.mjs";
import { resultHTML, setPicking, isPicking, chatPublic } from "./main.mjs";

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
        viewScene: function () { findDigScene()?.view(); }
      }
    };
    static PARTS = { main: { template: `modules/${ID}/templates/hud.hbs`, scrollable: [".ausg-hud-scroll"] } };

    async _prepareContext() {
      const scene = findDigScene();
      const state = getState(scene);
      if (!scene || !state || state.version !== STATE_VERSION) return { none: true };
      const res = resources(state);
      const lead = state.leader && state.leaderFor === -1 ? partyProfiles(state).find(p => p.id === state.leader && p.present) : null;
      const sm = supplyMod(res);
      return {
        onScene: canvas?.scene?.id === scene.id,
        picking: isPicking(),
        testActive: !!state.test?.active,
        res: RES.map(r => ({ ...r, v: res[r.key], lvl: level(res[r.key]) })),
        day: state.run.day,
        spent: Math.round((state.run.spent + offerCost(state)) * 10) / 10,
        warn: [sm ? `Wasser und Nahrung knapp: −${Math.abs(sm)} auf jeden Wurf.` : "",
               wheelBroken(state) ? `Förderrad steht noch ${state.run.wheelUntil - state.run.day} Tage still.` : ""].filter(Boolean),
        insight: state.run.insight, breakthrough: state.run.breakthrough,
        lead: lead ? { name: lead.name, luck: lead.luck > 0 ? `Glück, +${lead.luck}` : lead.luck < 0 ? `Pech, ${lead.luck}` : "" } : null,
        // Ergebnisse sieht nur die Spielleitung, solange die Karten privat sind
        last: chatPublic() && state.last ? resultHTML(state, state.last) : "",
        finds: state.finds,
        log: state.log.filter(l => !l.gm).slice(0, 8).map(l => chatPublic() ? l : { ...l, text: String(l.text).split(" · ")[0] })
      };
    }
  };
}
