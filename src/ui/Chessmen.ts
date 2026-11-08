import type { PlayerId, Terrain, UnitType } from "../engine/types";
import { TERRAIN_LORE, UNIT_LORE } from "../game/lore";
import { moveBoard } from "./movePreview";

const ORDER: UnitType[] = ["pawn", "knight", "bishop", "rook", "queen", "king"];
const TERRAINS: Terrain[] = ["flat", "forest", "swamp", "mountain", "desert"];
const BADGE: Record<Terrain, string> = { flat: "□", forest: "🌲", swamp: "≋", mountain: "▲", desert: "☀" };

export type IconSource = (type: UnitType, owner: PlayerId) => string;

export class Chessmen {
  private index = 0;
  private terrain: Terrain = "flat";

  constructor(private root: HTMLElement, private icon: IconSource) {}

  render(): void {
    const type = ORDER[this.index];
    const lore = UNIT_LORE[type];
    const icon = this.icon(type, 0);
    this.root.innerHTML = `
      <p class="prophecy">"From the trench, the Chessmen grow stronger."</p>
      <div class="cm-tabs">${ORDER.map((t, i) => `<button class="cm-tab ${i === this.index ? "active" : ""}" data-cm="${i}" style="--c:${UNIT_LORE[t].color}"><img src="${this.icon(t, 0)}" alt=""/><span>${UNIT_LORE[t].title}</span></button>`).join("")}</div>
      <div class="cm-detail" style="--c:${lore.color}">
        <div class="cm-head"><img src="${icon}" alt=""/><div><h3>${lore.title}</h3><small>The ${lore.chess}s · ${lore.role}</small><p>"${lore.motto}"</p></div></div>
        <div class="cm-equation">
          <figure data-part="classic"><figcaption>${lore.classicMove}</figcaption></figure>
          <span class="op">+</span>
          <figure data-part="upgrade"><figcaption>The ${lore.ability}</figcaption></figure>
          <span class="op">=</span>
          <figure data-part="both"><figcaption>${lore.title}</figcaption></figure>
        </div>
        <div class="cm-terrain">${TERRAINS.map((t) => `<button class="badge ${t === "flat" ? "t-flat" : `t-${t}`} ${t === this.terrain ? "active" : ""}" data-terrain="${t}" title="${TERRAIN_LORE[t].name}">${BADGE[t]}</button>`).join("")}
          <span class="cm-terrain-note">${this.terrainNote()}</span></div>
        <p class="cm-moves">${lore.moves}</p>
        <div class="cm-legend"><span class="move"></span>Classic move <span class="upgrade"></span>Upgrade <span class="attack"></span>Capture only <span class="blocked"></span>Blocked by terrain</div>
        <div class="row"><button class="btn" data-cm-step="-1">‹ Previous</button><button class="btn" data-cm-step="1">Next ›</button></div>
      </div>`;
    this.root.querySelectorAll<HTMLElement>("figure").forEach((fig) => fig.prepend(moveBoard(type, fig.dataset.part as "classic", this.terrain, icon)));
    this.bind();
  }

  private terrainNote(): string {
    if (this.terrain === "flat") return "Tap a terrain to see how it changes the moves.";
    const t = TERRAIN_LORE[this.terrain];
    return `${t.name} · ${t.subtitle}: ${t.text}`;
  }

  private bind(): void {
    this.root.querySelectorAll<HTMLElement>("[data-cm]").forEach((b) => (b.onclick = () => this.go(Number(b.dataset.cm))));
    this.root.querySelectorAll<HTMLElement>("[data-cm-step]").forEach((b) => (b.onclick = () => this.go((this.index + Number(b.dataset.cmStep) + ORDER.length) % ORDER.length)));
    this.root.querySelectorAll<HTMLElement>("[data-terrain]").forEach((b) => (b.onclick = () => {
      this.terrain = b.dataset.terrain as Terrain;
      this.render();
    }));
  }

  private go(i: number): void {
    this.index = i;
    this.render();
  }
}
