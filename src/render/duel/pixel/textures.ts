import Phaser from "phaser";
import type { Terrain, Unit } from "../../../engine/types";
import { FACTIONS, theme } from "../../art/unitArt";
import { FIELDS } from "./fields";
import { FONT, FONT_H, FONT_W } from "./font";
import { FX, FX_PALETTE, type FxId } from "./fx";
import { PixelPainter, SCREEN_H, TILE_W } from "./painter";
import { armyPalette, type Palette } from "./palette";
import { FRAME_IDS, drawGrid, type FrameId, type Grid } from "./sheet";
import { SHEETS } from "./sheets";

const NEAREST = Phaser.Textures.FilterMode.NEAREST;

const canvasTexture = (scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): string => {
  if (scene.textures.exists(key)) return key;
  const c = document.createElement("canvas");
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  draw(g);
  scene.textures.addCanvas(key, c);
  scene.textures.get(key).setFilter(NEAREST);
  return key;
};

export const frameKey = (unit: Unit, frame: FrameId): string => `px-${theme.palette}-${unit.owner}-${unit.type}-${frame}`;

/** Paints every frame of `unit`'s sheet in its army's colours (idempotent per palette). */
export const paintSheet = (scene: Phaser.Scene, unit: Unit): void => {
  const sheet = SHEETS[unit.type];
  const pal = armyPalette(FACTIONS[unit.owner], sheet.palette);
  for (const id of FRAME_IDS) canvasTexture(scene, frameKey(unit, id), sheet.w, sheet.h, (g) => drawGrid(g, sheet.frames[id], pal));
};

/** The frames of a pixel dissolve: the sprite eaten away in a dither pattern, `n` steps. */
export const paintDissolve = (scene: Phaser.Scene, unit: Unit, frame: FrameId, n: number): string[] => {
  const sheet = SHEETS[unit.type];
  const pal = armyPalette(FACTIONS[unit.owner], sheet.palette);
  const white: Palette = Object.fromEntries(Object.entries(pal).map(([k, v]) => [k, k === "z" ? v : "#ffffff"]));
  const grid = sheet.frames[frame];
  const order = (x: number, y: number): number => (((x * 7 + y * 13 + ((x * y) % 5) * 3) % 16) + 0.5) / 16;
  return Array.from({ length: n }, (_, i) => {
    const cut = (i + 1) / (n + 1);
    const eaten: Grid = grid.map((row, y) => row.replace(/./g, (ch, x: number) => (order(x, y) < cut ? "." : ch)));
    return canvasTexture(scene, `${frameKey(unit, frame)}-dis${i}`, sheet.w, sheet.h, (g) => drawGrid(g, eaten, i % 2 ? white : pal));
  });
};

export const fxKey = (id: FxId, i: number): string => `pxfx-${id}-${i}`;

export const paintFx = (scene: Phaser.Scene): void => {
  (Object.keys(FX) as FxId[]).forEach((id) => FX[id].frames.forEach((f, i) => canvasTexture(scene, fxKey(id, i), FX[id].w, FX[id].h, (g) => drawGrid(g, f, FX_PALETTE))));
  canvasTexture(scene, "px-dot", 1, 1, (g) => {
    g.fillStyle = "#fff";
    g.fillRect(0, 0, 1, 1);
  });
  canvasTexture(scene, "px-dot2", 2, 2, (g) => {
    g.fillStyle = "#fff";
    g.fillRect(0, 0, 2, 2);
  });
  canvasTexture(scene, "px-leaf", 3, 2, (g) => {
    g.fillStyle = "#fff";
    g.fillRect(0, 0, 2, 1);
    g.fillRect(1, 1, 2, 1);
  });
  canvasTexture(scene, "px-shadow", 24, 5, (g) => {
    const p = new PixelPainter(g, 24, 5);
    p.ellipse(12, 2, 11, 2, "rgba(8,4,16,0.45)");
  });
  canvasTexture(scene, "px-streak", 64, 48, (g) => {
    const p = new PixelPainter(g, 64, 48, 5);
    for (let i = 0; i < 16; i++) p.hline(Math.floor(p.rand() * 64), Math.floor(p.rand() * 48), 6 + Math.floor(p.rand() * 20), "rgba(255,255,255,0.7)");
  });
};

export const layerKey = (t: Terrain, i: number): string => `pxbg-${t}-${i}`;

export const paintField = (scene: Phaser.Scene, t: Terrain): void => {
  FIELDS[t].layers.forEach((layer, i) => canvasTexture(scene, layerKey(t, i), TILE_W, SCREEN_H, (g) => layer.paint(new PixelPainter(g, TILE_W, SCREEN_H, 7 + i * 13))));
};

/** Renders `text` in the bitmap font to a texture: `scale` 1 or 2, with a 1px drop shadow. */
export const textKey = (scene: Phaser.Scene, text: string, color: string, scale = 1, shadow = "#140c1c"): string => {
  const chars = [...text.toUpperCase()];
  const adv = FONT_W + 1;
  const w = (chars.length * adv - 1) * scale + scale;
  const h = FONT_H * scale + scale;
  const key = `pxt-${scale}-${color}-${shadow}-${text}`;
  return canvasTexture(scene, key, w, h, (g) => {
    const glyph = (ox: number, oy: number, c: string): void =>
      chars.forEach((ch, i) => {
        const grid = FONT[ch] ?? FONT["?"] ?? [];
        grid.forEach((row, y) => {
          for (let x = 0; x < row.length; x++) {
            if (row[x] !== "#") continue;
            g.fillStyle = c;
            g.fillRect(ox + (i * adv + x) * scale, oy + y * scale, scale, scale);
          }
        });
      });
    glyph(scale, scale, shadow);
    glyph(0, 0, color);
  });
};

export const textWidth = (text: string, scale = 1): number => ([...text].length * (FONT_W + 1) - 1) * scale + scale;

export type { Palette };
