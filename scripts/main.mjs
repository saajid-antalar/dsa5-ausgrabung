// Ausgrabung (Drachenchronik I): Einstellungen, Socket, Hooks, Chatkarten, Szenensteuerung.
// Eigenständiges Modul; passt zum Modul dsa5-drachenchronik (gemeinsamer Szenenordner „Drachenchronik“).
import { ID, getState, setState, heroProfile, partyProfiles, cellName, gmDig, gmReroll, luckLabel, migrate, STATE_VERSION, RES } from "./logic.mjs";

export async function deleteTestMessages() {
  if (!game.user.isGM) return;
  const ids = game.messages.filter(m => m.getFlag(ID, "test")).map(m => m.id);
  if (ids.length) await ChatMessage.deleteDocuments(ids);
}
import { createDigScene, syncTiles, findDigScene } from "./scene.mjs";
import { AusgrabungApp } from "./app.mjs";

const SOCKET = `module.${ID}`;
let app = null;

export function openApp() {
  app ??= new AusgrabungApp();
  app.render({ force: true });
  return app;
}
function refreshApp() { if (app?.rendered) app.render(); }

// ---------- Anfragen an die Spielleitung ----------
export function gmOnline() {
  if (game.users.activeGM) return true;
  ui.notifications.warn("Es ist keine Spielleitung verbunden. Gegraben wird nur, wenn der SL online ist.");
  return false;
}
export async function request(action, payload) {
  payload.userId = game.user.id;
  if (game.users.activeGM?.isSelf) return handle(action, payload);
  if (!gmOnline()) return;
  game.socket.emit(SOCKET, { action: "ausgrabung", op: action, payload });
}

async function handle(action, p) {
  const scene = game.scenes.get(p.sceneId);
  if (!scene) return;
  const user = game.users.get(p.userId);
  try {
    if (action === "dig") {
      const res = await gmDig(scene, p);
      if (res) { await syncTiles(scene, res.state); await postCard(scene, res); }
    } else if (action === "reroll") {
      const actor = game.actors.get(p.actorId);
      if (!actor?.testUserPermission(user, "OWNER")) return;
      const res = await gmReroll(scene, p);
      if (res) { await syncTiles(scene, res.state); await postCard(scene, res); }
    } else if (action === "present") {
      const actor = game.actors.get(p.actorId);
      if (!actor?.testUserPermission(user, "OWNER")) return;
      const s = getState(scene);
      s.absent = (s.absent ?? []).filter(id => id !== p.actorId);
      if (!p.present) s.absent.push(p.actorId);
      if (!p.present && s.leader === p.actorId) s.leader = null;
      await setState(scene, s);
    } else if (action === "leader") {
      const s = getState(scene);
      s.leader = p.actorId || null;
      await setState(scene, s);
    }
  } catch (e) {
    console.error(`${ID} | ${action}`, e);
    ui.notifications.error(`Ausgrabung: Fehler bei „${action}“. Details in der Konsole (F12).`);
  }
}

// ---------- Würfeln am Client ----------
async function rollEvent(actor, flavor, test = false) {
  const p = heroProfile(actor);
  const formula = p.luck ? `1d20 ${p.luck > 0 ? "+" : "-"} ${Math.abs(p.luck)}` : "1d20";
  const roll = await new Roll(formula).evaluate();
  await roll.toMessage({
    flags: { [ID]: { test } },
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${test ? "<b class=\"ausg-testtag\">TEST</b> " : ""}${flavor}<br>Grabungsleitung: ${actor.name}${p.luck ? ` (${p.luck > 0 ? "Glück" : "Pech"} ${luckLabel(p)})` : ""}`
  });
  return roll.dice[0]?.total ?? roll.total;
}

export async function clientDig(scene, idx) {
  const state = getState(scene);
  const cell = state?.cells[idx];
  if (!cell?.area || cell.dug) return ui.notifications.warn("Dieses Feld kann nicht (mehr) gegraben werden.");
  const leader = state.leader ? game.actors.get(state.leader) : null;
  if (!leader || (state.absent ?? []).includes(leader.id)) return ui.notifications.warn("Bitte zuerst eine anwesende Grabungsleitung wählen.");
  if (!gmOnline()) return;
  const test = !!state.test?.active;
  // Im Testmodus mit festgelegtem W20 wird nicht gewürfelt, der SL-Client setzt den Testwert ein.
  const d20 = test && Number(state.test.forceD20) > 0 ? 0
    : await rollEvent(leader, `<b>Ausgrabung ${cellName(idx)}</b> · Ereigniswurf`, test);
  await request("dig", { sceneId: scene.id, idx, leaderId: leader.id, d20 });
}

export async function clientReroll(sceneId, digId, actorId) {
  const scene = game.scenes.get(sceneId);
  const state = getState(scene);
  const last = state?.last;
  if (!last || last.id !== digId) return ui.notifications.warn("Dieser Wurf ist nicht mehr der letzte der Grabung.");
  if (last.rerolled) return ui.notifications.warn("Für diesen Abschnitt wurde schon neu gewürfelt.");
  const actor = game.actors.get(actorId);
  if (!actor?.isOwner) return ui.notifications.warn("Nur wer den Helden führt, kann seinen Schicksalspunkt einsetzen.");
  const prof = partyProfiles(state).find(p => p.id === actorId);
  if (!prof || prof.schip < 1) return ui.notifications.warn(`${actor.name} hat keine Schicksalspunkte mehr.`);
  if (!gmOnline()) return;
  const leader = game.actors.get(last.leaderId) ?? actor;
  const d20 = await rollEvent(leader, `<b>Ausgrabung ${cellName(last.idx)}</b> · Neuwurf, ${actor.name} setzt einen Schicksalspunkt ein`, !!state.test?.active);
  await request("reroll", { sceneId, digId, actorId, d20 });
}

// ---------- Chatkarte ----------
export function resultHTML(state, last, { buttons = false, sceneId = "" } = {}) {
  if (!last) return "";
  const e = foundry.utils.escapeHTML ?? (s => String(s));
  const sign = v => (v > 0 ? "+" : "−") + Math.abs(v);
  const calc = `W20 ${last.d20} ${last.mods.map(m => `${sign(m.v)} (${e(m.label)})`).join(" ")} = <b>${last.tot}</b>`;
  const c = last.cost;
  let h = `<div class="ausg-card ausg-${last.ev.kind}">`;
  if (last.test) h += `<div class="ausg-testbar">Testmodus${last.forced ? ` · festgelegter W20` : ""} · zählt nicht</div>`;
  h += `<header><span class="ausg-tot">${last.tot}</span><div><h3>Abschnitt ${cellName(last.idx)}</h3><div class="ausg-sub">${e(c.terrain)}</div></div></header>`;
  const lab = Object.fromEntries(RES.map(r => [r.key, r.label]));
  const lacks = (c.lacks ?? []).map(l => `<b class="ausg-badtext">${lab[l.key]} ${l.have} %/${l.need} %</b>`).join(" · ");
  h += `<p class="ausg-cost">${c.days} ${c.days === 1 ? "Tag" : "Tage"} · ${c.wage} D Lohn${c.wheel ? " · Förderrad steht still" : ""}${lacks ? " · " + lacks : ""}</p>`;
  h += `<p class="ausg-calc">${calc}</p>`;
  if (last.rerolled) h += `<p class="ausg-calc">↻ ${e(last.rerolled)} hat einen Schicksalspunkt eingesetzt.</p>`;
  h += `<h4 class="ausg-evt">${e(last.ev.title)}</h4><p>${e(last.ev.text)}</p>`;
  if (last.ev.extra) h += `<p>${e(last.ev.extra)}</p>`;
  if (last.ev.victim) h += `<p class="ausg-badtext">Getroffen: ${e(last.ev.victim)}</p>`;
  if (last.rock) h += `<p><i>${e(last.rock)}</i></p>`;
  if (last.key) h += `<div class="ausg-key">✦ <b>Erster Fund:</b> ${e(last.key)}</div>`;
  if (last.insight) h += `<div class="ausg-key">💡 <b>Erkenntnis:</b> ${e(last.insight)}</div>`;
  if (buttons && !last.rerolled && last.ev.kind !== "good") {
    const can = partyProfiles(state).filter(p => p.present && p.schip > 0);
    if (can.length) {
      h += `<div class="ausg-reroll"><span>Schicksal herausfordern:</span>`;
      h += can.map(p => `<button type="button" data-ausg-reroll="${p.id}" data-dig="${last.id}" data-scene="${sceneId}">${e(p.name.split(" ")[0])} (SchiP ${p.schip})</button>`).join("");
      h += `</div>`;
    }
  }
  h += `</div>`;
  return h;
}

/** Karte für ein Ereignis aus dem Band: SL bekommt alles, Spieler (falls öffentlich) nur das Sichtbare. */
export async function postStoryCard(def, rec, eff, test) {
  const e = foundry.utils.escapeHTML ?? (s => String(s));
  const flags = { [ID]: { test: !!test } };
  const tb = test ? `<div class="ausg-testbar">Testmodus · zählt nicht</div>` : "";
  const gmContent = `<div class="ausg-card ausg-bad">${tb}<header><div><h3>${e(def.title)}</h3><div class="ausg-sub">${e(def.who)} · Drachenchronik I, S. ${def.page}</div></div></header>`
    + (def.public ? `<p>${e(def.public)}</p>` : "")
    + (def.gm ? `<p class="ausg-calc">Nur SL: ${e(def.gm)}</p>` : "")
    + (eff ? `<p class="ausg-cost">Wirkung: ${e(eff)}</p>` : "")
    + (rec.victim ? `<p class="ausg-badtext">Getroffen: ${e(rec.victim)}</p>` : "") + `</div>`;
  await ChatMessage.create({ content: gmContent, whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id), flags });
  if (def.public) {
    const pub = `<div class="ausg-card ausg-bad">${tb}<header><div><h3>${e(def.title)}</h3><div class="ausg-sub">Auf der Ausgrabung</div></div></header><p>${e(def.public)}</p>`
      + (eff ? `<p class="ausg-cost">${e(eff)}</p>` : "") + (rec.victim ? `<p class="ausg-badtext">Getroffen: ${e(rec.victim)}</p>` : "") + `</div>`;
    await ChatMessage.create({ content: pub, flags });
  }
}

export async function postBreakthroughCard(cell, test) {
  const tb = test ? `<div class="ausg-testbar">Testmodus · zählt nicht</div>` : "";
  await ChatMessage.create({
    flags: { [ID]: { test: !!test } },
    content: `<div class="ausg-card ausg-good">${tb}<header><span class="ausg-tot">✦</span><div><h3>Der Durchbruch</h3><div class="ausg-sub">Abschnitt ${cell}</div></div></header>`
      + `<p>Alles sah nach einem Fehlschlag aus. Doch in den ersten Tagen des Tsamondes stoßen die Arbeiter auf eine Gesteinsschicht: eine frühere, offen liegende Bergflanke, die unter Massen von Sand begraben lag.</p>`
      + `<p>Darin zeichnen sich die groben Formen eines Portals ab, umkränzt von Symbolen und Bildern. Hier liegt offenbar der Eingang zu dem gesuchten Versteck.</p></div>`
  });
}

async function postCard(scene, { state, last }) {
  const actor = game.actors.get(last.leaderId);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: resultHTML(state, last, { buttons: true, sceneId: scene.id }),
    flags: { [ID]: { digId: last.id, sceneId: scene.id, test: !!last.test } }
  });
}

// Makro wie beim Tagesereignis, damit Spieler das Fenster auch aus der Makroleiste öffnen können
async function ensureMacro() {
  const name = "⛏️ Ausgrabung";
  const command = `game.modules.get("${ID}")?.api?.ausgrabung?.open();`;
  const img = `modules/${ID}/assets/kelle.svg`;
  const observer = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
  const existing = game.macros.getName(name);
  if (existing) {
    if (existing.command !== command || existing.img !== img) await existing.update({ command, img, type: "script" });
    return;
  }
  await Macro.create({ name, type: "script", scope: "global", img, command, ownership: { default: observer } });
}

// ---------- Hooks ----------
Hooks.once("init", () => {
  const reg = (key, name, hint, type, def) => game.settings.register(ID, key, { name, hint, scope: "world", config: true, type, default: def });
  reg("ausgrabungLuckPerStep", "Bonus je Stufe Glück", "Wird zum Ereigniswurf addiert, wenn ein Held mit dem Vorteil Glück die Grabung leitet.", Number, 2);
  reg("ausgrabungBadLuckPerStep", "Abzug je Stufe Pech", "Wird vom Ereigniswurf abgezogen, wenn ein Held mit dem Nachteil Pech die Grabung leitet.", Number, 2);
  reg("ausgrabungNamesLuck", "Name des Vorteils Glück", "Kommagetrennt, falls euer Bogen andere Namen nutzt.", String, "Glück, Luck");
  reg("ausgrabungNamesBadLuck", "Name des Nachteils Pech", "Kommagetrennt.", String, "Pech, Bad Luck");
  reg("ausgrabungNamesMagnet", "Name des Nachteils Pechmagnet", "Ein Held damit wird bei Unglücken immer getroffen.", String, "Pechmagnet");
  reg("ausgrabungNamesLeader", "Name der SF Anführer", "Verhindert, dass Arbeiter mehr Lohn verlangen.", String, "Anführer");
  reg("ausgrabungNamesSense", "Spürsinn (Vorteile/SF)", "Leitet ein Held damit, erkennt er immer die Spuren zu Schlüsselfunden. Namensanfänge, kommagetrennt.", String, "Herausragender Sinn, Aufmerksamkeit, Analytiker");
});

Hooks.once("ready", async () => {
  game.socket.on(SOCKET, data => {
    if (data?.action !== "ausgrabung") return;
    if (game.users.activeGM?.isSelf) handle(data.op, data.payload);
  });
  const mod = game.modules.get(ID);
  const api = { open: openApp, createScene: createDigScene, findScene: findDigScene };
  mod.api = { ...api, ausgrabung: api };
  if (game.user.isGM) {
    await ensureMacro();
    // Grabungen aus Version 1.0 auf das Ressourcenmodell umstellen (Grabungsbereich bleibt erhalten)
    for (const sc of game.scenes.filter(x => x.getFlag(ID, "state"))) {
      const st = getState(sc);
      if (st && st.version !== STATE_VERSION) {
        const m = migrate(st);
        await setState(sc, m);
        await syncTiles(sc, m);
        ui.notifications.info(`Ausgrabung: „${sc.name}“ auf das Ressourcenmodell des Abenteuers umgestellt.`);
      }
      else if (st) await syncTiles(sc, st);   // rückt verschobene Kacheln zurecht
    }
  }
});

Hooks.on("getSceneControlButtons", controls => {
  const tokens = controls?.tokens ?? controls?.token;
  if (!tokens?.tools) return;
  tokens.tools.ausgrabung = {
    name: "ausgrabung",
    title: "Die Ausgrabung",
    icon: "fa-solid fa-trowel",
    order: Object.keys(tokens.tools).length,
    button: true,
    visible: true,
    onChange: () => openApp()
  };
});

Hooks.on("updateScene", (scene, diff) => {
  if (foundry.utils.hasProperty(diff, `flags.${ID}`)) refreshApp();
});
Hooks.on("updateActor", () => refreshApp());
Hooks.on("canvasReady", () => refreshApp());

Hooks.on("renderChatMessageHTML", (message, html) => {
  const el = html instanceof HTMLElement ? html : html?.[0];
  if (!el) return;
  el.querySelectorAll("button[data-ausg-reroll]").forEach(b => {
    b.addEventListener("click", ev => {
      ev.preventDefault();
      clientReroll(b.dataset.scene, b.dataset.dig, b.dataset.ausgReroll);
    });
  });
});
