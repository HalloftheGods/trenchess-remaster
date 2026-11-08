import { WORLD_LABELS, WORLD_ORDER, world as activeWorld } from "../render/art/worlds/registry";
import type Phaser from "phaser";
import type { PlayerId, Terrain, UnitType } from "../engine/types";
import { TERRAIN_LORE, UNIT_LORE } from "../game/lore";
import { PALETTES, STYLE_ORDER, theme, type PaletteId } from "../render/art/unitArt";
import { duels, type DuelMode } from "../render/duel/duel";

const TYPES: UnitType[] = ["king", "queen", "rook", "bishop", "knight", "pawn"];
const TERRAINS: Terrain[] = ["flat", "forest", "swamp", "mountain", "desert"];
const MODES: DuelMode[] = ["full", "fast"];
/** Scopes every listener the panel adds; aborted if the panel is ever torn down. */
const life = new AbortController();

const CSS = `
#tc-dev{position:fixed;top:10px;left:10px;z-index:99999;width:250px;font:12px/1.4 Inter,system-ui,sans-serif;color:#e9e2cf;background:rgba(8,10,18,.92);border:1px solid #f2c94c;border-radius:6px;padding:8px 10px;box-shadow:0 6px 24px rgba(0,0,0,.6)}
#tc-dev.min .body{display:none}
#tc-dev h4{margin:0 0 6px;font:600 13px Cinzel,Georgia,serif;color:#f2c94c;display:flex;justify-content:space-between;cursor:pointer;user-select:none}
#tc-dev h5{margin:10px 0 4px;font:600 11px Inter,sans-serif;letter-spacing:2px;color:#9aa3b5;text-transform:uppercase}
#tc-dev label{display:flex;justify-content:space-between;align-items:center;gap:6px;margin:3px 0}
#tc-dev select{flex:0 0 140px;background:#141826;color:#e9e2cf;border:1px solid #3a3f52;border-radius:3px;padding:2px}
#tc-dev .row{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
#tc-dev button{flex:1 1 auto;background:#1c2236;color:#e9e2cf;border:1px solid #5a6072;border-radius:3px;padding:4px 6px;cursor:pointer;font:inherit}
#tc-dev button:hover{border-color:#f2c94c}
#tc-dev button.on{background:#f2c94c;color:#0b0f1a}
#tc-dev .note{color:#9aa3b5;font-size:11px;margin-top:6px}
`;

const select = <T extends string>(label: string, options: T[], names: (o: T) => string, value: T): [HTMLLabelElement, () => T] => {
  const l = document.createElement("label");
  l.textContent = label;
  const s = document.createElement("select");
  options.forEach((o) => s.add(new Option(names(o), o, o === value, o === value)));
  l.append(s);
  return [l, () => s.value as T];
};

const button = (text: string, onClick: (b: HTMLButtonElement) => void): HTMLButtonElement => {
  const b = document.createElement("button");
  b.textContent = text;
  b.addEventListener(
    "click",
    (e) => {
      e.stopPropagation();
      onClick(b);
    },
    { signal: life.signal },
  );
  return b;
};

/**
 * Dev-only test bench (dev server, `?dev`): stage any duel by hand (attacker, defender, side,
 * terrain, speed, colours), replay or loop it, run all six abilities in a row, and jump to the
 * splash, title, setup and tome scenes. Never shipped: main.ts only imports it in dev builds.
 */
export const mountDevPanel = (game: Phaser.Game): void => {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);
  const root = document.createElement("div");
  root.id = "tc-dev";
  ["pointerdown", "keydown", "click"].forEach((ev) => root.addEventListener(ev, (e) => e.stopPropagation(), { signal: life.signal }));
  const head = document.createElement("h4");
  head.innerHTML = "<span>Dev bench</span><span>–</span>";
  head.addEventListener("click", () => root.classList.toggle("min"), { signal: life.signal });
  const body = document.createElement("div");
  body.className = "body";
  root.append(head, body);

  const unitName = (t: UnitType): string => `${UNIT_LORE[t].title} (${UNIT_LORE[t].chess})`;
  const [aL, attacker] = select("Attacker", TYPES, unitName, "king");
  const [dL, defender] = select("Defender", TYPES, unitName, "pawn");
  const [sL, side] = select("Attacker side", ["0", "1"], (o) => (o === "0" ? "Left (player 1)" : "Right (player 2)"), "0");
  const [tL, terrain] = select("Terrain", TERRAINS, (t) => `${TERRAIN_LORE[t].subtitle}`, "flat");
  const [vL, move] = select("Attack", ["ability", "classic"], (m) => (m === "ability" ? "Ability (upgraded move)" : "Classic move"), "ability");
  const [wL, worldPick] = select("World", WORLD_ORDER, (w) => WORLD_LABELS[w], activeWorld.id);
  const [mL, mode] = select("Speed", MODES, (m) => (m === "full" ? "Full" : "Fast"), "full");
  const palettes = Object.keys(PALETTES) as PaletteId[];
  const [pL, palette] = select("Colours", palettes, (p) => `${PALETTES[p][0].name} · ${PALETTES[p][1].name}`, theme.palette);

  let looping = false;
  let isBusy = false;
  let id = 9000;
  const play = async (a: UnitType, d: UnitType): Promise<void> => {
    if (palette() !== theme.palette) game.events.emit("ui:theme", { style: theme.style ?? STYLE_ORDER[0], palette: palette() });
    const owner = Number(side()) as PlayerId;
    await duels.play({ attacker: { id: id++, type: a, owner }, defender: { id: id++, type: d, owner: (1 - owner) as PlayerId }, terrain: terrain(), attackerOwner: owner, mode: mode(), special: move() === "ability", world: worldPick() });
  };
  const run = async (fn: () => Promise<void>): Promise<void> => {
    if (isBusy) return;
    isBusy = true;
    try {
      do await fn();
      while (looping);
    } finally {
      isBusy = false;
    }
  };

  const duelRow = document.createElement("div");
  duelRow.className = "row";
  const loopBtn = button("Loop: off", (b) => {
    looping = !looping;
    b.textContent = `Loop: ${looping ? "on" : "off"}`;
    b.classList.toggle("on", looping);
  });
  duelRow.append(
    button("▶ Play duel", () => void run(() => play(attacker(), defender()))),
    loopBtn,
    button("All six attackers", () => void run(async () => {
      for (const t of TYPES) await play(t, defender());
    })),
  );

  const sceneRow = document.createElement("div");
  sceneRow.className = "row";
  const only = (key: string): void => {
    for (const k of ["splash", "title", "setup", "hello"]) if (k !== key && game.scene.isActive(k)) game.scene.stop(k);
  };
  sceneRow.append(
    button("Splash", () => {
      only("splash");
      game.scene.start("splash");
    }),
    button("Title", () => game.events.emit("ui:back")),
    button("Setup", () => game.events.emit("ui:open", "play")),
    button("Lay (Ω)", () => game.events.emit("ui:open", "lay")),
    button("Hello tome", () => game.events.emit("ui:open", "hello")),
  );

  const h1 = document.createElement("h5");
  h1.textContent = "Duel";
  const h2 = document.createElement("h5");
  h2.textContent = "Scenes";
  const note = document.createElement("div");
  note.className = "note";
  note.textContent = "Any key or click on the game skips a duel. Click the title bar to fold this panel.";
  body.append(h1, aL, dL, vL, sL, wL, tL, mL, pL, duelRow, h2, sceneRow, note);
  document.body.append(root);
};
