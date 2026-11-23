// Klickbare Grabungsfelder auf der Szene (PIXI-Ebene über dem Raster).
// Ist die Feldwahl aus, reagiert die Ebene nicht auf Klicks und zeigt nur den gewählten Abschnitt.
import { getState, getLayout, cellName } from "./logic.mjs";

const LAPIS = 0x23407a, GOLD = 0xe7c14a, WHITE = 0xffffff;

export class DigOverlay {
  constructor(scene, onPick) {
    this.scene = scene;
    this.onPick = onPick;
    this.picking = false;
    this.root = new PIXI.Container();
    this.root.sortableChildren = true;
    this.root.zIndex = 50;
    this.cells = [];
    this.marker = new PIXI.Graphics();
    this.marker.zIndex = 10;
    this.label = new PIXI.Text("", new PIXI.TextStyle({
      fontFamily: "Signika, sans-serif", fontSize: 26, fill: "#ffffff", stroke: "#23407a", strokeThickness: 6, fontWeight: "bold"
    }));
    this.label.zIndex = 11;
    this.label.anchor?.set?.(0.5, 0);
    this.root.addChild(this.marker, this.label);
    canvas.interface.addChild(this.root);
    this.build();
    this.refresh();
  }

  build() {
    const L = getLayout(this.scene);
    for (let i = 0; i < L.n * L.n; i++) {
      const g = new PIXI.Graphics();
      g.position.set(L.x + (i % L.n) * L.cell, L.y + Math.floor(i / L.n) * L.cell);
      g.hitArea = new PIXI.Rectangle(0, 0, L.cell, L.cell);
      g.cursor = "pointer";
      g.on("pointerover", () => this._hover(i, true));
      g.on("pointerout", () => this._hover(i, false));
      g.on("pointerdown", ev => {
        if (!this.picking || !this.cells[i].open) return;
        ev.stopPropagation();
        this.onPick?.(i);
      });
      g.zIndex = 1;
      this.root.addChild(g);
      this.cells.push({ g, open: false });
    }
  }

  _hover(i, on) {
    const c = this.cells[i];
    c.g.clear();
    if (!on || !this.picking || !c.open) { if (this.hoverIdx === i) { this.label.text = ""; this.hoverIdx = null; } return; }
    const L = getLayout(this.scene), s = L.cell;
    c.g.beginFill(WHITE, 0.14).lineStyle(5, WHITE, 0.95).drawRect(3, 3, s - 6, s - 6).endFill();
    this.hoverIdx = i;
    this.label.text = `${cellName(i)} graben`;
    const x = L.x + (i % L.n) * s, y = L.y + Math.floor(i / L.n) * s;
    if (this.label.anchor) this.label.position.set(x + s / 2, y + s / 2 - 16); else this.label.position.set(x + 8, y + s / 2 - 16);
  }

  setPicking(on) {
    this.picking = on;
    this.refresh();
  }

  refresh() {
    const state = getState(this.scene);
    if (!state?.cells) return;
    const L = getLayout(this.scene);
    state.cells.forEach((c, i) => {
      const cell = this.cells[i];
      cell.open = c.area && !c.dug;
      cell.g.eventMode = this.picking && cell.open ? "static" : "none";
      cell.g.clear();
    });
    this.marker.clear();
    if (this.hoverIdx != null && !this.cells[this.hoverIdx]?.open) { this.label.text = ""; this.hoverIdx = null; }
  }

  destroy() {
    try { this.root.destroy({ children: true }); } catch (e) { /* bereits entfernt */ }
  }
}
