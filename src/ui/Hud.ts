import type { Cell, GameState, Outcome, PlayerId, Terrain, TurnEvent, Unit, UnitType } from "../engine/types";
import type { Match, MatchOptions, DeployTool } from "../game/Match";
import { TERRAIN_LORE, UNIT_LORE } from "../game/lore";
import { TERRAIN_QUOTA, deployRows, homeRows } from "../engine/rules";
import { FACTIONS } from "../render/art/unitArt";

const $ = <T extends HTMLElement>(sel: string, root: ParentNode = document): T => root.querySelector(sel) as T;

const FILES = "abcdefghijkl";
const coord = ([r, c]: readonly [number, number]): string => `${FILES[c]}${12 - r}`;

export type IconFor = (type: UnitType, owner: PlayerId) => string;

const REASONS: Record<Outcome["reason"], string> = {
  "king-captured": "The enemy Warlord has fallen in battle.",
  checkmate: "Checkmate. The enemy Warlord has nowhere left to run.",
  desert: "The Warlord was left to wither in the desert.",
  stalemate: "Neither army can make a legal move. The war ends in a draw.",
  resign: "A commander has withdrawn from the field.",
};

const TOOLS: { tool: DeployTool; label: string }[] = [
  { tool: "units", label: "Arrange units" },
  { tool: "forest", label: "Forest" },
  { tool: "swamp", label: "Swamp" },
  { tool: "mountain", label: "Mountains" },
  { tool: "desert", label: "Desert" },
];

export class Hud {
  private root = $("#hud");
  private bannerTimer = 0;

  constructor(private icon: IconFor) {
    $<HTMLImageElement>(".p0 .crest", this.root).src = icon("king", 0);
    $<HTMLImageElement>(".p1 .crest", this.root).src = icon("king", 1);
  }

  show(visible: boolean): void {
    this.root.classList.toggle("hidden", !visible);
  }

  bindDeploy(match: Match, onChange: () => void): void {
    const tools = $(".deploy .tools", this.root);
    tools.innerHTML = "";
    for (const { tool, label } of TOOLS) {
      const b = document.createElement("button");
      b.className = "btn tool";
      b.dataset.tool = tool;
      const color = tool === "units" ? "#f2c94c" : TERRAIN_LORE[tool].color;
      b.innerHTML = `<span class="swatch" style="background:${color}"></span>${label}`;
      b.onclick = () => {
        match.setTool(tool);
        onChange();
      };
      tools.appendChild(b);
    }
  }

  showDeploy(on: boolean): void {
    $(".deploy", this.root).classList.toggle("hidden", !on);
    $(".actions [data-act=end-turn]", this.root).classList.toggle("hidden", on);
    this.root.classList.toggle("deploying", on);
  }

  updateDeploy(match: Match): void {
    const p = match.deployer;
    $(".deploy-title", this.root).textContent = `${FACTIONS[p].name} deployment`;
    const [lo, hi] = match.tool === "units" ? deployRows(p) : homeRows(p);
    const rows = `rows ${12 - hi} to ${12 - lo}`;
    const hint =
      match.tool === "units"
        ? `Click a unit, then a tile in your deployment zone (${rows}) to move or swap it.`
        : `Click tiles in your half (${rows}) to place or remove ${TERRAIN_LORE[match.tool].name.toLowerCase()}. ${match.terrainLeft()} of ${TERRAIN_QUOTA} tiles left.`;
    $(".deploy-hint", this.root).textContent = hint;
    this.root.querySelectorAll<HTMLButtonElement>(".tool").forEach((b) => b.classList.toggle("active", b.dataset.tool === match.tool));
    this.root.querySelector(".turn-line")!.textContent = "Deployment phase";
    $(".pips", this.root).innerHTML = "";
    this.counts(match.board);
  }

  private counts(board: Cell[][]): void {
    const n: [number, number] = [0, 0];
    board.forEach((row) => row.forEach((u) => u && n[u.owner]++));
    $(".p0 .count", this.root).textContent = `${n[0]} units`;
    $(".p1 .count", this.root).textContent = `${n[1]} units`;
  }

  updateBattle(s: GameState, options: MatchOptions, humanTurn: boolean): void {
    this.counts(s.board);
    const name = FACTIONS[s.current].name;
    $(".turn-line", this.root).innerHTML = `Turn ${s.turn} · <b style="color:${FACTIONS[s.current].css}">${name}</b>`;
    const total = s.turn === 1 ? 1 : options.ordersPerTurn;
    const used = total - s.ordersLeft;
    $(".pips", this.root).innerHTML = Array.from({ length: total }, (_, i) => `<span class="pip ${i < used ? "spent" : ""}"></span>`).join("") + `<small>orders</small>`;
    $<HTMLButtonElement>("[data-act=end-turn]", this.root).disabled = !humanTurn;
    this.root.classList.toggle("p0-turn", s.current === 0);
    this.root.classList.toggle("p1-turn", s.current === 1);
    for (const p of [0, 1] as PlayerId[]) {
      const trophies = $(`.p${p} .trophies`, this.root);
      trophies.innerHTML = s.fallen[p === 0 ? 1 : 0].map((u) => `<img src="${this.icon(u.type, u.owner)}" title="${UNIT_LORE[u.type].title}"/>`).join("");
    }
  }

  inspect(unit: Unit | null, terrain: Terrain): void {
    const card = $(".unit-card", this.root);
    card.classList.toggle("hidden", !unit);
    if (unit) {
      const lore = UNIT_LORE[unit.type];
      $<HTMLImageElement>(".portrait", card).src = this.icon(unit.type, unit.owner);
      $(".u-name", card).textContent = lore.title;
      $(".u-role", card).innerHTML = `<span style="color:${FACTIONS[unit.owner].css}">${FACTIONS[unit.owner].name}</span> · ${lore.role}`;
      $(".u-moves", card).textContent = lore.moves;
    }
    const t = TERRAIN_LORE[terrain];
    $<HTMLElement>(".terrain-card .swatch", this.root).style.background = t.color;
    $(".t-name", this.root).textContent = t.name;
    $(".t-text", this.root).textContent = t.text;
  }

  log(e: TurnEvent, before: Cell[][]): void {
    const li = document.createElement("li");
    const who = FACTIONS[e.player];
    if (e.kind === "perish") {
      li.innerHTML = `<i style="color:${FACTIONS[e.victims[0].owner].css}">${UNIT_LORE[e.victims[0].type].title}</i> perished in the desert`;
    } else if (e.order) {
      const o = e.order;
      const mover = before[o.from[0]][o.from[1]]!;
      const caught = o.captures.map((p) => before[p[0]][p[1]]).filter(Boolean) as Unit[];
      const verb = caught.length ? `takes ${caught.map((u) => UNIT_LORE[u.type].title).join(" & ")} at` : "to";
      li.innerHTML = `<i style="color:${who.css}">${UNIT_LORE[mover.type].title}</i> ${coord(o.from)} ${verb} ${coord(o.to)}${o.promotes ? " ⭑" : ""}`;
    }
    const list = $(".log ol", this.root);
    list.prepend(li);
    while (list.children.length > 9) list.lastElementChild!.remove();
  }

  clearLog(): void {
    $(".log ol", this.root).innerHTML = "";
  }

  thinking(on: boolean): void {
    $(".thinking", this.root).classList.toggle("hidden", !on);
  }

  banner(title: string, sub: string): void {
    const b = $("#banner");
    $("h2", b).textContent = title;
    $("p", b).textContent = sub;
    b.classList.remove("hidden", "go");
    void b.offsetWidth;
    b.classList.add("go");
    clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => b.classList.add("hidden"), 2200);
  }

  gameOver(outcome: Outcome, options: MatchOptions, s: GameState): void {
    const over = $("#over");
    const title = outcome.winner === null ? "Stalemate" : `${FACTIONS[outcome.winner].name} victorious`;
    const solo = options.opponent === "ai";
    const flavor = solo && outcome.winner === 0 ? "Glorious victory, Commander!" : solo && outcome.winner === 1 ? "Your army has been routed." : "";
    $(".over-title", over).textContent = title;
    $(".over-text", over).textContent = `${REASONS[outcome.reason]} ${flavor} (${s.turn} turns)`;
    over.classList.remove("hidden");
  }
}
