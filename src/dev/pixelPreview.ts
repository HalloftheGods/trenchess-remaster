import type { Terrain, UnitType } from "../engine/types";
import { PALETTES } from "../render/art/unitArt";
import { FIELDS } from "../render/duel/pixel/fields";
import { fieldFor } from "../render/duel/pixel/fields/worlds";
import { WORLD_ORDER, type WorldId } from "../render/art/worlds/registry";

let previewWorld: WorldId = "classic";
const fieldOf = (t: Terrain) => fieldFor(previewWorld, t);
import { FONT, FONT_H, FONT_W } from "../render/duel/pixel/font";
import { FX, FX_PALETTE, type FxId } from "../render/duel/pixel/fx";
import { PixelPainter, SCREEN_H, TILE_W, FLOOR_Y } from "../render/duel/pixel/painter";
import { armyPalette } from "../render/duel/pixel/palette";
import { FRAME_IDS, drawGrid, type SpriteSheet } from "../render/duel/pixel/sheet";
import { SHEETS } from "../render/duel/pixel/sheets";

/**
 * Dev-only pixel art viewer (`?pixels=...` on the dev server): every sprite sheet frame, every
 * battlefield layer and every effect, scaled up with crisp pixels. `?pixels=sprite:king`,
 * `?pixels=bg:forest`, `?pixels=fx`, or `?pixels=all`.
 */
const canvas = (w: number, h: number, scale: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.style.width = `${w * scale}px`;
  c.style.height = `${h * scale}px`;
  c.style.imageRendering = "pixelated";
  return [c, c.getContext("2d")!];
};

const block = (title: string): HTMLElement => {
  const d = document.createElement("section");
  d.innerHTML = `<h3>${title}</h3>`;
  return d;
};

const cell = (label: string, el: HTMLElement): HTMLElement => {
  const f = document.createElement("figure");
  f.append(el);
  const cap = document.createElement("figcaption");
  cap.textContent = label;
  f.append(cap);
  return f;
};

const paintField = (t: Terrain, g: CanvasRenderingContext2D, w: number, onlyLayer?: number, withFront = true): void => {
  fieldOf(t).layers.forEach((layer, i) => {
    if (onlyLayer !== undefined && onlyLayer !== i) return;
    if (!withFront && layer.front) return;
    const [lc, lg] = canvas(TILE_W, SCREEN_H, 1);
    layer.paint(new PixelPainter(lg, TILE_W, SCREEN_H, 7 + i * 13));
    for (let x = 0; x < w; x += TILE_W) g.drawImage(lc, x, 0);
  });
};

const spriteSection = (type: UnitType): HTMLElement => {
  const sheet: SpriteSheet = SHEETS[type];
  const s = block(`${type} — ${sheet.w}x${sheet.h}, foot ${sheet.foot.join(",")}`);
  const grid = document.createElement("div");
  grid.className = "grid";
  for (const owner of [0, 1] as const) {
    const pal = armyPalette(PALETTES.royal[owner], sheet.palette);
    for (const id of FRAME_IDS) {
      const [c, g] = canvas(sheet.w, sheet.h, 5);
      g.fillStyle = "#6e7b8c";
      g.fillRect(0, 0, sheet.w, sheet.h);
      g.fillStyle = "#56606e";
      g.fillRect(0, sheet.foot[1] + 1, sheet.w, sheet.h);
      drawGrid(g, sheet.frames[id], pal);
      g.fillStyle = "#ff00ff";
      g.fillRect(sheet.foot[0], sheet.foot[1] + 1, 1, 1);
      const tip = sheet.tips?.[id];
      if (tip) {
        g.fillStyle = "#00ffff";
        g.fillRect(tip[0], tip[1], 1, 1);
      }
      grid.append(cell(`${owner ? "red" : "blue"} ${id}`, c));
    }
  }
  s.append(grid);
  const [c, g] = canvas(TILE_W, SCREEN_H, 3);
  paintField("flat", g, TILE_W, undefined, false);
  const other = SHEETS.pawn;
  drawGrid(g, sheet.frames.idle0, armyPalette(PALETTES.royal[0], sheet.palette), 110 - sheet.foot[0], FLOOR_Y - sheet.foot[1]);
  const flipped = other.frames.idle0.map((r) => r.split("").reverse().join(""));
  drawGrid(g, flipped, armyPalette(PALETTES.royal[1], other.palette), 210 - (other.w - 1 - other.foot[0]), FLOOR_Y - other.foot[1]);
  s.append(cell("in context at 1:1 scale x3 (vs. pawn)", c));
  return s;
};

const fieldSection = (t: Terrain): HTMLElement => {
  const s = block(`battlefield ${previewWorld} / ${t} — ${fieldOf(t).layers.length} layers, ambient ${fieldOf(t).ambient}`);
  const [c, g] = canvas(TILE_W * 2, SCREEN_H, 2);
  paintField(t, g, TILE_W * 2, undefined, false);
  const king = SHEETS.king;
  drawGrid(g, king.frames.idle0, armyPalette(PALETTES.royal[0], king.palette), 200 - king.foot[0], FLOOR_Y - king.foot[1]);
  const knight = SHEETS.knight;
  drawGrid(g, knight.frames.idle0.map((r) => r.split("").reverse().join("")), armyPalette(PALETTES.royal[1], knight.palette), 440 - (knight.w - 1 - knight.foot[0]), FLOOR_Y - knight.foot[1]);
  paintField(t, g, TILE_W * 2, fieldOf(t).layers.findIndex((l) => l.front));
  s.append(cell("two tiles side by side (seam at x=320), fighters on the floor line, foreground on top", c));
  const row = document.createElement("div");
  row.className = "grid";
  fieldOf(t).layers.forEach((l, i) => {
    const [lc, lg] = canvas(TILE_W, SCREEN_H, 1.5);
    lc.classList.add("checker");
    paintField(t, lg, TILE_W, i);
    row.append(cell(`layer ${i} parallax ${l.parallax}${l.front ? " (front)" : ""}`, lc));
  });
  s.append(row);
  return s;
};

const fxSection = (): HTMLElement => {
  const s = block("effects and font");
  const row = document.createElement("div");
  row.className = "grid";
  (Object.keys(FX) as FxId[]).forEach((id) => {
    FX[id].frames.forEach((f, i) => {
      for (const tint of ["#ffffff", "#ffd860"]) {
        const [c, g] = canvas(FX[id].w, FX[id].h, 4);
        c.classList.add("dark");
        const pal = { ...FX_PALETTE };
        if (tint !== "#ffffff") Object.assign(pal, { W: tint, L: "#d8a838", D: "#8a6420" });
        drawGrid(g, f, pal);
        row.append(cell(`${id} ${i}${tint === "#ffffff" ? "" : " tinted"}`, c));
      }
    });
  });
  s.append(row);
  const text = "SOMERSAULT ASSAULT · 8 LEGGED GALLOP · FOUR-CORNERS FORTNIGHT · LEAP OF FAITH · TRIPLE-BAR JUMP · DOUBLE-BACK FLIP · CAPTURED! THE EQUINOX KING HAS FALLEN 0123456789 HP ?";
  const [c, g] = canvas(text.length * (FONT_W + 1) + 4, FONT_H + 4, 3);
  g.fillStyle = "#0b0f1a";
  g.fillRect(0, 0, c.width, c.height);
  [...text].forEach((ch, i) => drawGrid(g, FONT[ch] ?? FONT["?"] ?? [], { "#": "#f2c94c" }, 2 + i * (FONT_W + 1), 2));
  s.append(cell("bitmap font", c));
  return s;
};

export const mountPixelPreview = (what: string): void => {
  const root = document.createElement("div");
  root.id = "pixel-preview";
  const style = document.createElement("style");
  style.textContent = `#pixel-preview{position:fixed;inset:0;z-index:100000;overflow:auto;background:#20242e;color:#e9e2cf;font:12px Inter,sans-serif;padding:12px}
#pixel-preview h3{margin:18px 0 6px;color:#f2c94c;font:600 15px Cinzel,serif}
#pixel-preview .grid{display:flex;flex-wrap:wrap;gap:8px}
#pixel-preview figure{margin:0}
#pixel-preview figcaption{color:#9aa3b5;font-size:11px}
#pixel-preview canvas.checker{background:repeating-conic-gradient(#3a3f4c 0 25%,#2c303a 0 50%) 0 0/12px 12px}
#pixel-preview canvas.dark{background:#0b0f1a}`;
  document.head.append(style);
  const [kind, name] = what.split(":");
  const types = Object.keys(SHEETS) as UnitType[];
  const fields = Object.keys(FIELDS) as Terrain[];
  if (kind === "sprite") root.append(spriteSection(name as UnitType));
  else if (kind === "bg") {
    // bg:<terrain> (Classic), bg:<world>/<terrain>, or bg:<world> for all five terrains of a world
    const [a, b] = name.split("/");
    const isWorld = (WORLD_ORDER as string[]).includes(a);
    previewWorld = isWorld ? (a as WorldId) : "classic";
    if (isWorld && !b) fields.forEach((t) => root.append(fieldSection(t)));
    else root.append(fieldSection((b ?? a) as Terrain));
  }
  else if (kind === "fx") root.append(fxSection());
  else {
    types.forEach((t) => root.append(spriteSection(t)));
    fields.forEach((t) => root.append(fieldSection(t)));
    root.append(fxSection());
  }
  document.body.append(root);
};
