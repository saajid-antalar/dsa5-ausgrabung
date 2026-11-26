// Ausgrabung (Drachenchronik I): Einstellungen, Socket, Hooks, Chatkarten, Szenensteuerung.
// Eigenständiges Modul; passt zum Modul dsa5-drachenchronik (gemeinsamer Szenenordner „Drachenchronik“).
import { ID, getState, setState, heroProfile, partyProfiles, cellName, gmDig, gmReroll, gmProbeRequest, gmProbeStatus, gmProbeResult, gmProbeRevise, luckLabel, migrate, STATE_VERSION, RES } from "./logic.mjs";

export async function deleteTestMessages() {
  if (!game.user.isGM) return;
  const ids = game.messages.filter(m => m.getFlag(ID, "test")).map(m => m.id);
  if (ids.length) await ChatMessage.deleteDocuments(ids);
}
import { createDigScene, syncTiles, findDigScene, isDigScene, calibrateTiles, upgradeScene } from "./scene.mjs";
import { AusgrabungApp } from "./app.mjs";
import { AusgrabungHud } from "./hud.mjs";
import { DigOverlay } from "./overlay.mjs";

const SOCKET = `module.${ID}`;
let app = null, hud = null, overlay = null, picking = false;

/** Dürfen Spieler die Ausgrabung sehen und benutzen? Die Spielleitung immer. */
export function playersEnabled() {
  return game.user.isGM || !!game.settings.get(ID, "ausgrabungPlayersEnabled");
}
function openFor(user) {
  return user?.isGM || !!game.settings.get(ID, "ausgrabungPlayersEnabled");
}

/** Spielleitung: großes Fenster. Spieler: kleine Übersicht. */
export function openApp() {
  if (game.user.isGM) { app ??= new AusgrabungApp(); app.render({ force: true }); return app; }
  if (!playersEnabled()) return ui.notifications.info("Die Ausgrabung ist noch nicht freigegeben.");
  return openHud();
}

/** Freigabe geändert: Leiste, Szene, Fenster und Makro auf allen Clients anpassen. */
async function onPlayersEnabledChange(on) {
  if (!game.user.isGM && !on) {
    if (picking) setPicking(false);
    if (hud?.rendered) hud.close();
  }
  try { ui.controls?.render({ reset: true }); } catch (e) { ui.controls?.render(); }
  overlay?.refresh();
  if (!game.user.isGM && on && isDigScene(canvas?.scene)) { setPicking(true); openHud(); }
  if (game.user.isGM && game.users.activeGM?.isSelf) await ensureMacro();
  if (app?.rendered) app.render();
}
export function openHud() {
  hud ??= new AusgrabungHud();
  hud.render({ force: true });
  return hud;
}
function refreshApp() {
  if (app?.rendered) app.render();
  if (hud?.rendered) hud.render();
  overlay?.refresh();
}

// ---------- Feldwahl auf der Szene ----------
export function isPicking() { return picking; }
export function setPicking(on) {
  if (on && !playersEnabled()) on = false;
  if (on && !isDigScene(canvas?.scene)) { ui.notifications.warn("Die Feldwahl geht nur auf der Grabungsszene."); on = false; }
  picking = !!on;
  overlay?.setPicking(picking);
  try {
    const tool = ui.controls?.controls?.drachenchronik?.tools?.ausgrabungFeld;
    if (tool && tool.active !== picking) { tool.active = picking; ui.controls.render(); }
  } catch (e) { /* Werkzeugleiste ist nur Anzeige */ }
  if (hud?.rendered) hud.render();
  if (app?.rendered) app.render();
}
function pickCell(i) {
  digAt(canvas.scene, i);
}

let digBusy = false;
/** Klick auf ein Feld der Szene: Rückfrage, Leitung auslosen (oder von der SL festgelegt), Ereigniswurf, aufdecken. */
export async function digAt(scene, i) {
  if (digBusy) return;
  const state = getState(scene);
  const cell = state?.cells?.[i];
  if (!cell?.area || cell.dug) return;
  if (!gmOnline()) return;
  const present = partyProfiles(state).filter(p => p.present);
  if (!present.length) return ui.notifications.warn("Keine Helden vor Ort. Die Spielleitung legt fest, wer mitarbeitet.");
  const preset = state.leader && (state.leaderFor === -1 || state.leaderFor === i) ? present.find(p => p.id === state.leader) : null;
  digBusy = true;
  try {
    if (!(await confirmDig(cellName(i), preset))) return;
    // Leitung auslosen und würfeln übernimmt der Rechner der Spielleitung; die Spieler sehen das Ergebnis auf der Szene.
    await request("dig", { sceneId: scene.id, idx: i });
  } finally { digBusy = false; }
}

async function confirmDig(name, preset) {
  const text = preset ? `Leitung: <b>${preset.name}</b> (von der Spielleitung bestimmt).` : "Die Grabungsleitung wird unter den Helden vor Ort ausgelost.";
  const content = `<p>Abschnitt <b>${name}</b> öffnen?</p><p>${text} Was darunter liegt und wie lange es dauert, zeigt sich erst beim Graben.</p>`;
  const D = foundry.applications?.api?.DialogV2;
  if (D?.confirm) {
    try {
      return !!(await D.confirm({ window: { title: `Abschnitt ${name} graben` }, content,
        yes: { label: "Graben", icon: "fa-solid fa-trowel" }, no: { label: "Abbrechen" }, rejectClose: false }));
    } catch (e) { return false; }
  }
  return window.confirm(`Abschnitt ${name} graben?`);
}
function buildOverlay() {
  overlay?.destroy(); overlay = null;
  if (!isDigScene(canvas?.scene)) { picking = false; return; }
  picking = playersEnabled();   // auf der Grabungsszene sind die Felder sofort klickbar, sobald freigegeben
  try {
    overlay = new DigOverlay(canvas.scene, pickCell);
    overlay.setPicking(picking);
  } catch (e) { console.error(`${ID} | Feld-Ebene konnte nicht erstellt werden`, e); }
}

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

let queue = Promise.resolve();
function handle(action, p) {
  queue = queue.then(() => handleNow(action, p)).catch(e => console.error(`${ID} | ${action}`, e));
  return queue;
}
async function handleNow(action, p) {
  const scene = game.scenes.get(p.sceneId);
  if (!scene) return;
  const user = game.users.get(p.userId);
  // Gesperrt: Spieler dürfen nichts auslösen (außer Rückmeldungen zu einer angeforderten Probe)
  if (!openFor(user) && !["probeRevise", "probeResult", "probeStatus"].includes(action)) return;
  try {
    if (action === "dig") {
      const s = getState(scene);
      const cell = s?.cells?.[p.idx];
      if (!cell?.area || cell.dug) return;
      const present = partyProfiles(s).filter(h => h.present);
      if (!present.length) return ui.notifications.warn("Ausgrabung: Keine Helden vor Ort, bitte im Reiter Grabung festlegen.");
      let leaderId = s.leader && (s.leaderFor === -1 || s.leaderFor === p.idx) && present.some(h => h.id === s.leader) ? s.leader : null;
      let draw = null;
      if (!leaderId) {
        const pick = await drawLeader(present.map(h => game.actors.get(h.id)).filter(Boolean));
        leaderId = pick.actor?.id; draw = pick.draw;
      }
      if (!leaderId) return;
      const forced = s.test?.active && Number(s.test.forceD20) > 0;
      const d20 = forced ? 0 : await rollEvent();
      const res = await gmDig(scene, { ...p, leaderId, d20, draw });
      if (res?.settled) await updateCard(scene, res.state, res.settled);
      if (res) { await syncTiles(scene, res.state); await postCard(scene, res); }
    } else if (action === "probeRequest") {
      if (!user?.isGM) return;
      const res = await gmProbeRequest(scene, p);
      if (!res) return ui.notifications.warn("Diese Probe ist schon entschieden oder der Abschnitt nicht mehr der letzte.");
      await updateCard(scene, res.state, res.last);
      runProbe(scene, p);   // nicht abwarten: der Spieler würfelt in Ruhe, die Warteschlange läuft weiter
    } else if (action === "probeStatus") {
      if (!user?.isGM) return;
      const res = await gmProbeStatus(scene, p);
      if (res) await updateCard(scene, res.state, res.last);
    } else if (action === "probeRevise") {
      const pr = getState(scene)?.last?.ev?.pending?.result;
      const who = pr?.actorId && game.actors.get(pr.actorId);
      if (!user?.isGM && !who?.testUserPermission(user, "OWNER")) return;
      const res = await gmProbeRevise(scene, p);
      if (res) {
        await syncTiles(scene, res.state); await updateCard(scene, res.state, res.last);
        const r = res.last.ev.pending.result;
        ui.notifications.info(`Ausgrabung: Probe von ${r.name} nach Neuwurf ${r.success ? "gelungen, die Arbeiter bleiben" : "misslungen, die Arbeiter gehen"}.`);
      }
    } else if (action === "probeResult") {
      if (!user?.isGM) return;
      const res = await gmProbeResult(scene, p);
      if (res) { await syncTiles(scene, res.state); await updateCard(scene, res.state, res.last); }
    } else if (action === "reroll") {
      const actor = game.actors.get(p.actorId);
      if (!actor?.testUserPermission(user, "OWNER")) return;
      const res = await gmReroll(scene, p);
      if (res) { await syncTiles(scene, res.state); await postCard(scene, res); }
    } else if (action === "select") {
      const s = getState(scene);
      const c = p.idx == null ? null : s.cells[p.idx];
      if (p.idx != null && (!c || !c.area || c.dug)) return;
      if (s.selected === p.idx) return;
      s.selected = p.idx ?? null;
      s.leader = null; s.leaderFor = null;   // neue Stelle, neue Leitung
      await setState(scene, s);
    } else if (action === "draw") {
      const s = getState(scene);
      if (s.selected == null || s.selected !== p.idx) return;
      if (s.leaderFor === p.idx && s.leader && !user?.isGM) return;   // schon ausgelost
      const hero = partyProfiles(s).find(h => h.id === p.actorId && h.present);
      if (!hero) return;
      s.leader = hero.id; s.leaderFor = p.idx;
      await setState(scene, s);
    } else if (action === "present") {
      if (!user?.isGM) return;
      const s = getState(scene);
      s.absent = (s.absent ?? []).filter(id => id !== p.actorId);
      if (!p.present) s.absent.push(p.actorId);
      if (!p.present && s.leader === p.actorId) s.leader = null;
      await setState(scene, s);
    } else if (action === "leader") {
      if (!user?.isGM) return;
      const s = getState(scene);
      s.leader = p.actorId || null;
      s.leaderFor = p.actorId ? -1 : null;   // gilt für den nächsten gegrabenen Abschnitt
      await setState(scene, s);
    }
  } catch (e) {
    console.error(`${ID} | ${action}`, e);
    ui.notifications.error(`Ausgrabung: Fehler bei „${action}“. Details in der Konsole (F12).`);
  }
}

// ---------- Würfeln am Client ----------
/** Würfel sichtbar machen: Dice So Nice, falls aktiv, sonst Würfelklang. Die Ergebnisse stehen auf der Ergebniskarte. */
export function chatPublic() { try { return !!game.settings.get(ID, "ausgrabungPublicChat"); } catch (e) { return false; } }
function gmWhisper() { return ChatMessage.getWhisperRecipients("GM").map(u => u.id); }
function chatTarget() { return chatPublic() ? {} : { whisper: gmWhisper() }; }

/** Grabungsleitung auslosen: DSA5-Zufallsgenerator des Gruppenbogens (Porträt-Karussell), sonst eigener Wurf. */
async function drawLeader(actors) {
  const RV = game.dsa5?.apps?.RandomVictim;
  let showToAll = false;
  try { showToAll = !!game.settings.get(ID, "ausgrabungShowLeader"); } catch (e) { /* Standard: nur SL */ }
  if (RV?.pickAndShow) {
    try {
      const actor = await RV.pickAndShow(actors, { withMisfortune: false, showToAll });
      if (actor) return { actor, draw: { n: actors.length, sys: true } };
    } catch (e) { console.warn(`${ID} | DSA5-Zufallsgenerator nicht nutzbar, eigener Wurf`, e); }
  }
  const roll = await new Roll(`1d${actors.length}`).evaluate();
  await showDice(roll);
  const actor = actors[roll.total - 1];
  ui.notifications.info(`Ausgrabung: Das Los fällt auf ${actor?.name}.`);
  return { actor, draw: { n: actors.length, r: roll.total } };
}

async function showDice(roll) {
  try {
    if (game.dice3d?.showForRoll) { await game.dice3d.showForRoll(roll, game.user, chatPublic()); return; }
    const AH = foundry.audio?.AudioHelper ?? globalThis.AudioHelper;
    AH?.play({ src: CONFIG.sounds.dice, volume: 0.8, autoplay: true, loop: false }, true);
  } catch (e) { /* nur Darstellung */ }
}

async function rollEvent() {
  const roll = await new Roll("1d20").evaluate();
  await showDice(roll);
  return roll.total;
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
  const d20 = await rollEvent();
  await request("reroll", { sceneId, digId, actorId, d20 });
}

// ---------- Talentprobe aus der Chatkarte ----------
const PROBE_QUERY = `${ID}.probe`;
export function probeTalents() {
  return String(game.settings.get(ID, "ausgrabungProbeTalents") ?? "").split(",").map(t => t.trim()).filter(Boolean);
}
/** Wer würfelt für den Helden? Wie bei DSA5: der Spieler mit dem Helden als Charakter, sonst ein aktiver Besitzer, sonst die SL selbst. */
function probeUser(actor) {
  const players = game.users.filter(u => u.active && !u.isGM);
  return players.find(u => u.character?.id === actor.id) ?? players.find(u => actor.testUserPermission(u, "OWNER")) ?? game.user;
}
/** Läuft beim würfelnden Client: öffnet den normalen DSA5-Probendialog und meldet das Ergebnis zurück. */
async function clientProbe({ actorId, skill, mod, sceneId, digId }) {
  const actor = game.actors.get(actorId);
  if (!actor) return { status: "error", reason: "Held nicht gefunden" };
  const item = actor.items.find(i => i.type === "skill" && i.name === skill);
  if (!item) return { status: "error", reason: `${actor.name} hat kein Talent „${skill}“` };
  ui.notifications.info(`Ausgrabung: Die Spielleitung verlangt eine Probe auf ${skill} von ${actor.name}.`);
  // postFunction: DSA5 ruft sie auf, wenn die Probenkarte nachträglich geändert wird (Schicksalspunkt, SL-Korrektur)
  const postFunction = { functionName: `game.modules.get('${ID}').api.probeRevised`, sceneId, digId, actorId };
  const setup = await actor.setupSkill(item, { modifier: Number(mod) || 0, subtitle: " (Ausgrabung)", postFunction }, undefined);
  if (!setup) return { status: "cancelled" };
  const res = await actor.basicTest(setup);
  if (!res) return { status: "cancelled" };
  return { status: "ok", successLevel: Number(res.result?.successLevel) || 0, qs: Number(res.result?.qualityStep) || 0 };
}
async function runProbe(scene, { digId, actorId, skill, mod }) {
  const actor = game.actors.get(actorId);
  if (!actor) return;
  const u = probeUser(actor);
  let out;
  try {
    const q = { actorId, skill, mod, sceneId: scene.id, digId };
    if (u.isSelf) out = await clientProbe(q);
    else {
      ui.notifications.info(`Probe auf ${skill} an ${u.name} (${actor.name}) geschickt.`);
      out = await u.query(PROBE_QUERY, q, { timeout: 5 * 60 * 1000 });
    }
  } catch (e) {
    console.warn(`${ID} | Probe`, e);
    out = { status: "expired" };
  }
  if (out?.status === "ok") {
    return handle("probeResult", { sceneId: scene.id, userId: game.user.id, digId, actorId, skill, mod, success: out.successLevel > 0, qs: out.qs });
  }
  const why = out?.status === "error" ? (out.reason ?? "Fehler") : out?.status === "cancelled" ? "abgebrochen" : "keine Antwort";
  ui.notifications.warn(`Ausgrabung: Probe von ${actor.name}: ${why}.`);
  return handle("probeStatus", { sceneId: scene.id, userId: game.user.id, digId, status: why });
}
/** Von DSA5 nach einem Neuwurf der Probenkarte aufgerufen (beim würfelnden Client). */
async function probeRevised(postFunction, { result } = {}) {
  if (!postFunction?.sceneId || !result) return;
  await request("probeRevise", { sceneId: postFunction.sceneId, digId: postFunction.digId,
    success: (Number(result.successLevel) || 0) > 0, qs: Number(result.qualityStep) || 0 });
}
/** Die zuletzt gepostete Karte dieses Abschnitts mit dem aktuellen Stand neu schreiben. */
async function updateCard(scene, state, last) {
  const msg = game.messages.contents.filter(m => m.flags?.[ID]?.digId === last.id).at(-1);
  if (!msg) return;
  await msg.update({ content: resultHTML(state, last, { buttons: true, sceneId: scene.id }) });
}
function probeAction(btn, op) {
  const box = btn.closest(".ausg-probe");
  const scene = game.scenes.get(box?.dataset.scene);
  if (!scene || !game.user.isGM) return;
  const p = { sceneId: scene.id, digId: box.dataset.dig };
  if (op === "probeRequest") {
    p.actorId = btn.dataset.actor;
    p.skill = box.querySelector("[data-ausg-probe-skill]")?.value;
    p.mod = Number(box.querySelector("[data-ausg-probe-mod]")?.value) || 0;
    if (!p.skill) return ui.notifications.warn("Bitte ein Talent wählen.");
  } else {
    p.success = btn.dataset.ausgProbeSet === "ok";
    p.manual = true;
    const req = box.dataset.actor;
    if (req) { p.actorId = req; p.skill = box.dataset.skill; p.mod = Number(box.dataset.mod) || 0; }
  }
  request(op, p);
}

// ---------- Chatkarte ----------
export function resultHTML(state, last, { buttons = false, sceneId = "" } = {}) {
  if (!last) return "";
  const e = foundry.utils.escapeHTML ?? (s => String(s));
  const sign = v => (v > 0 ? "+" : "−") + Math.abs(v);
  const calc = `<span class="ausg-die">W20: ${last.d20}</span> ${last.mods.map(m => `${sign(m.v)} (${e(m.label)})`).join(" ")} = <b>${last.tot}</b>`;
  const c = last.cost;
  let h = `<div class="ausg-card ausg-${last.ev.kind}">`;
  if (last.test) h += `<div class="ausg-testbar">Testmodus${last.forced ? ` · festgelegter W20` : ""} · zählt nicht</div>`;
  h += `<header><span class="ausg-tot">${last.tot}</span><div><h3>Abschnitt ${cellName(last.idx)}</h3><div class="ausg-sub">${e(c.terrain)}</div></div></header>`;
  const lead = game.actors.get(last.leaderId)?.name ?? "?";
  const how = !last.draw ? "von der Spielleitung bestimmt"
    : last.draw.r ? `ausgelost <span class="ausg-die">W${last.draw.n}: ${last.draw.r}</span>` : `ausgelost unter ${last.draw.n} Helden`;
  h += `<p class="ausg-lead-line">Leitung: <b>${e(lead)}</b> · ${how}</p>`;
  const lab = Object.fromEntries(RES.map(r => [r.key, r.label]));
  const lacks = (c.lacks ?? []).map(l => `<b class="ausg-badtext">${lab[l.key]} ${l.have} %/${l.need} %</b>`).join(" · ");
  h += `<p class="ausg-cost">${c.days} ${c.days === 1 ? "Tag" : "Tage"} · ${c.wage} D Lohn${c.wheel ? " · Förderrad steht still" : ""}${lacks ? " · " + lacks : ""}</p>`;
  h += `<p class="ausg-calc">${calc}</p>`;
  if (last.rerolled) h += `<p class="ausg-calc">↻ ${e(last.rerolled)} hat einen Schicksalspunkt eingesetzt.</p>`;
  h += `<h4 class="ausg-evt">${e(last.ev.title)}</h4><p>${e(last.ev.text)}</p>`;
  if (last.ev.extra) h += `<p>${e(last.ev.extra)}</p>`;
  if (last.ev.victim) h += `<p class="ausg-badtext">Unter den Arbeitern: ${e(last.ev.victim)}</p>`;
  if (last.ev.magnet) h += `<p class="ausg-badtext"><i>${e(last.ev.magnet)}</i></p>`;
  if (last.rock) h += `<p><i>${e(last.rock)}</i></p>`;
  if (last.key) h += `<div class="ausg-key">✦ <b>Erster Fund:</b> ${e(last.key)}</div>`;
  if (last.insight) h += `<div class="ausg-key">💡 <b>Erkenntnis:</b> ${e(last.insight)}</div>`;
  const pend = last.ev.pending;
  if (pend?.result && !pend.result.auto && pend.result.name) {
    const r = pend.result;
    const txt = r.manual ? "von der Spielleitung entschieden" : `${e(r.skill)}${r.mod ? ` ${sign(r.mod)}` : ""}: ${r.success ? `gelungen, QS ${r.qs}` : "misslungen"}${r.revised ? " (nach Neuwurf)" : ""}`;
    h += `<p class="ausg-calc">🎲 Probe ${e(r.name)} · ${txt}</p>`;
  }
  if (pend?.open && buttons) {
    const req = pend.requested;
    const heroes = partyProfiles(state).filter(p => p.present).sort((a, b) => (b.leader ? 1 : 0) - (a.leader ? 1 : 0));
    const talents = probeTalents();
    const sel = req?.skill ?? talents[0] ?? "";
    const opts = [...new Set([sel, ...talents])].filter(Boolean).map(t => `<option${t === sel ? " selected" : ""}>${e(t)}</option>`).join("");
    h += `<div class="ausg-probe ausg-gmonly" data-scene="${sceneId}" data-dig="${last.id}"${req ? ` data-actor="${req.actorId}" data-skill="${e(req.skill)}" data-mod="${req.mod}"` : ""}>`;
    if (req) {
      const who = game.actors.get(req.actorId)?.name ?? "?";
      h += `<p class="ausg-probe-wait">Probe auf <b>${e(req.skill)}</b>${req.mod ? ` ${sign(req.mod)}` : ""} bei <b>${e(who)}</b>: ${e(req.status === "wartet" ? "wartet auf den Wurf …" : req.status)}</p>`;
    }
    h += `<div class="ausg-probe-row"><span>Probe anfordern:</span><select data-ausg-probe-skill>${opts}</select><label>Mod <input type="number" data-ausg-probe-mod value="${req?.mod ?? 0}" step="1"></label></div>`;
    h += `<div class="ausg-probe-btns">` + heroes.map(p => `<button type="button" data-ausg-probe="${p.id}" data-actor="${p.id}"${p.leader ? ` class="ausg-probe-lead" title="Anführer"` : ""}>${p.leader ? "★ " : ""}${e(p.name.split(" ")[0])}</button>`).join("") + `</div>`;
    h += `<div class="ausg-probe-btns ausg-probe-set"><button type="button" data-ausg-probe-set="ok">✓ gehalten</button><button type="button" data-ausg-probe-set="fail">✗ Arbeiter gehen</button></div>`;
    h += `</div>`;
  }
  if (buttons && !last.rerolled && last.ev.kind !== "good") {
    const can = partyProfiles(state).filter(p => p.present && p.schip > 0);
    if (can.length) {
      h += `<div class="ausg-reroll"><span>Ereignis neu würfeln (SchiP):</span>`;
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
    + (rec.victim ? `<p class="ausg-badtext">Unter den Arbeitern: ${e(rec.victim)}</p>` : "") + `</div>`;
  await ChatMessage.create({ content: gmContent, whisper: gmWhisper(), flags });
  if (def.public && chatPublic()) {
    const pub = `<div class="ausg-card ausg-bad">${tb}<header><div><h3>${e(def.title)}</h3><div class="ausg-sub">Auf der Ausgrabung</div></div></header><p>${e(def.public)}</p>`
      + (eff ? `<p class="ausg-cost">${e(eff)}</p>` : "") + (rec.victim ? `<p class="ausg-badtext">Unter den Arbeitern: ${e(rec.victim)}</p>` : "") + `</div>`;
    await ChatMessage.create({ content: pub, flags });
  }
}

export async function postBreakthroughCard(cell, test) {
  const tb = test ? `<div class="ausg-testbar">Testmodus · zählt nicht</div>` : "";
  await ChatMessage.create({
    ...chatTarget(),
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
    ...chatTarget(),
    flags: { [ID]: { digId: last.id, sceneId: scene.id, test: !!last.test } }
  });
}

// Makro wie beim Tagesereignis, damit Spieler das Fenster auch aus der Makroleiste öffnen können
async function ensureMacro() {
  const name = "⛏️ Ausgrabung";
  const command = `game.modules.get("${ID}")?.api?.ausgrabung?.open();`;
  const img = `modules/${ID}/assets/kelle.svg`;
  // Spieler sehen das Makro erst, wenn die Ausgrabung freigegeben ist
  const L = CONST.DOCUMENT_OWNERSHIP_LEVELS;
  const level = game.settings.get(ID, "ausgrabungPlayersEnabled") ? L.OBSERVER : L.NONE;
  const existing = game.macros.getName(name);
  if (existing) {
    const upd = {};
    if (existing.command !== command || existing.img !== img) Object.assign(upd, { command, img, type: "script" });
    if (existing.ownership?.default !== level) upd["ownership.default"] = level;
    if (Object.keys(upd).length) await existing.update(upd);
    return;
  }
  await Macro.create({ name, type: "script", scope: "global", img, command, ownership: { default: level } });
}

// ---------- Hooks ----------
Hooks.once("init", () => {
  CONFIG.Canvas.layers.drachenchronik ??= { layerClass: DrachenchronikLayer, group: "interface" };
  const reg = (key, name, hint, type, def) => game.settings.register(ID, key, { name, hint, scope: "world", config: true, type, default: def });
  game.settings.register(ID, "ausgrabungPlayersEnabled", {
    name: "Ausgrabung für Spieler freigeben",
    hint: "Aus: Spieler sehen weder die Werkzeuge in der Leiste noch das Makro, und Felder auf der Szene lassen sich nicht anklicken. Die Spielleitung sieht alles immer.",
    scope: "world", config: true, type: Boolean, default: false,
    onChange: v => onPlayersEnabledChange(v)
  });
  reg("ausgrabungPublicChat", "Ergebniskarten auch den Spielern zeigen", "Aus: Ergebnisse, Ereignisse und Würfe sieht nur die Spielleitung, die Spieler sehen das aufgedeckte Feld auf der Szene.", Boolean, false);
  reg("ausgrabungShowLeader", "Ausgelosten Grabungsleiter allen zeigen", "Zeigt das Porträt-Karussell des DSA5-Zufallsgenerators auch den Spielern.", Boolean, false);
  reg("ausgrabungLuckPerStep", "Bonus je Stufe Glück", "Wird zum Ereigniswurf addiert, wenn ein Held mit dem Vorteil Glück die Grabung leitet.", Number, 2);
  reg("ausgrabungBadLuckPerStep", "Abzug je Stufe Pech", "Wird vom Ereigniswurf abgezogen, wenn ein Held mit dem Nachteil Pech die Grabung leitet.", Number, 2);
  reg("ausgrabungNamesLuck", "Name des Vorteils Glück", "Kommagetrennt, falls euer Bogen andere Namen nutzt.", String, "Glück, Luck");
  reg("ausgrabungNamesBadLuck", "Name des Nachteils Pech", "Kommagetrennt.", String, "Pech, Bad Luck");
  reg("ausgrabungNamesMagnet", "Name des Nachteils Pechmagnet", "Leitet ein Held damit einen Abschnitt, fallen Unglücke doppelt so schwer aus (Tote, Ausfälle, Verluste).", String, "Pechmagnet");
  reg("ausgrabungNamesLeader", "Name der SF Anführer", "Helden damit stehen bei Unruhe als Erste auf der Chatkarte, wenn die Spielleitung eine Probe anfordert (★).", String, "Anführer");
  reg("ausgrabungProbeTalents", "Talente für die Probe bei Unruhe", "Kommagetrennt, das erste ist vorausgewählt. Die Spielleitung fordert die Probe aus der Chatkarte an; nur wenn sie gelingt, bleiben die Arbeiter.", String, "Bekehren & Überzeugen, Einschüchtern, Überreden, Willenskraft");
  CONFIG.queries ??= {};
  CONFIG.queries[PROBE_QUERY] = data => clientProbe(data);
  reg("ausgrabungNamesSense", "Spürsinn (Vorteile/SF)", "Leitet ein Held damit, erkennt er immer die Spuren zu Schlüsselfunden. Namensanfänge, kommagetrennt.", String, "Herausragender Sinn, Aufmerksamkeit, Analytiker");
});

Hooks.once("ready", async () => {
  game.socket.on(SOCKET, data => {
    if (data?.action !== "ausgrabung") return;
    if (game.users.activeGM?.isSelf) handle(data.op, data.payload);
  });
  const mod = game.modules.get(ID);
  const api = { open: openApp, createScene: createDigScene, findScene: findDigScene };
  mod.api = { ...api, ausgrabung: api, probeRevised };
  if (game.user.isGM) {
    await ensureMacro();
    // Grabungen aus Version 1.0 auf das Ressourcenmodell umstellen (Grabungsbereich bleibt erhalten)
    for (const sc of game.scenes.filter(x => x.getFlag(ID, "state"))) {
      try { await upgradeScene(sc); } catch (e) { console.error(`${ID} | Szenenumstellung`, e); }
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

/** Eigene, leere Ebene für die Hauptkategorie „Drachenchronik“ in der linken Leiste (Muster wie das DSA5-Menü). */
class DrachenchronikLayer extends foundry.canvas.layers.InteractionLayer {
  static get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, { name: "drachenchronik", canDragCreate: false, zIndex: 667 });
  }
}

Hooks.on("getSceneControlButtons", controls => {
  if (!controls || !playersEnabled()) return;   // gesperrt: Spieler bekommen die Kategorie gar nicht
  // Gemeinsame Kategorie; andere Drachenchronik-Module können ihre Werkzeuge hier dazulegen
  const cat = controls.drachenchronik ??= {
    name: "drachenchronik",
    title: "Drachenchronik",
    icon: "ausg-drachenkopf",
    order: Object.keys(controls).length,
    layer: "drachenchronik",
    visible: true,
    activeTool: "drachenchronikSelect",
    tools: {
      // neutrales Werkzeug ohne Aktion: Foundry löst das aktive Werkzeug beim Betreten/Verlassen der Kategorie aus
      drachenchronikSelect: { name: "drachenchronikSelect", title: "Auswählen", icon: "fa-solid fa-expand", order: 0, button: true, visible: true }
    }
  };
  const n = Object.keys(cat.tools).length;
  cat.tools.ausgrabung = {
    name: "ausgrabung",
    title: game.user.isGM ? "Die Ausgrabung (Spielleitung)" : "Übersicht der Ausgrabung",
    icon: "fa-solid fa-trowel",
    order: n,
    button: true,
    visible: true,
    onChange: () => openApp()
  };
  cat.tools.ausgrabungFeld = {
    name: "ausgrabungFeld",
    title: "Grabungsfelder anklickbar (ausschalten, um Tokens auf dem Feld zu bewegen)",
    icon: "fa-solid fa-trowel-bricks",
    order: n + 1,
    toggle: true,
    active: picking,
    visible: true,
    onChange: (event, active) => setPicking(active)
  };
});

Hooks.on("updateScene", (scene, diff) => {
  if (foundry.utils.hasProperty(diff, `flags.${ID}`)) refreshApp();
});
Hooks.on("updateActor", () => refreshApp());
// Umschalten privat/öffentlich: Ereignismarken auf der Szene anpassen
Hooks.on("updateSetting", setting => {
  if (setting.key === `${ID}.ausgrabungPublicChat` && game.user.isGM) {
    const sc = findDigScene(); if (sc) syncTiles(sc);
    refreshApp();
  }
});
Hooks.on("canvasReady", () => {
  buildOverlay();
  refreshApp();
  if (game.user.isGM && isDigScene(canvas.scene)) {
    const sc = canvas.scene;
    // erst Kacheln anlegen, dann nachmessen, wenn sie gezeichnet sind
    syncTiles(sc).then(() => new Promise(r => setTimeout(r, 800))).then(() => calibrateTiles(sc))
      .catch(e => console.warn(`${ID} | Kachelabgleich`, e));
  }
  // Spieler bekommen auf der Grabungsszene automatisch die Übersicht
  if (!game.user.isGM && playersEnabled() && isDigScene(canvas.scene)) openHud();
});
Hooks.on("canvasTearDown", () => { overlay?.destroy(); overlay = null; });

Hooks.on("renderChatMessageHTML", (message, html) => {
  const el = html instanceof HTMLElement ? html : html?.[0];
  if (!el) return;
  if (!game.user.isGM) el.querySelectorAll(".ausg-gmonly").forEach(n => n.remove());
  el.querySelectorAll("button[data-ausg-probe]").forEach(b => b.addEventListener("click", ev => { ev.preventDefault(); probeAction(b, "probeRequest"); }));
  el.querySelectorAll("button[data-ausg-probe-set]").forEach(b => b.addEventListener("click", ev => { ev.preventDefault(); probeAction(b, "probeResult"); }));
  el.querySelectorAll("button[data-ausg-reroll]").forEach(b => {
    b.addEventListener("click", ev => {
      ev.preventDefault();
      clientReroll(b.dataset.scene, b.dataset.dig, b.dataset.ausgReroll);
    });
  });
});
