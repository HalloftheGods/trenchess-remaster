import Phaser from "phaser";
import type { Terrain } from "../../engine/types";
import { paint, rand } from "../art/canvas";

/** Logical size of one parallax layer; the stage scales it up with nearest sampling. */
export const BG_W = 128;
export const BG_H = 48;
/** Logical row the chessmen stand on. */
export const GROUND_Y = 42;

export type Layer = 0 | 1 | 2;
export const LAYERS: Layer[] = [0, 1, 2];
/** Scroll speed of each layer relative to the ground. */
export const PARALLAX: Record<Layer, number> = { 0: 0.15, 1: 0.45, 2: 1 };

type G = CanvasRenderingContext2D;
type Shape = "hills" | "trees" | "reeds" | "peaks" | "dunes";

interface Look {
  sky: [string, string, string];
  sun: string;
  far: string;
  shape: Shape;
  ground: [string, string];
  tuft: string;
}

const LOOKS: Record<Terrain, Look> = {
  flat: { sky: ["#4f8fe0", "#7fb8f0", "#c8e4ff"], sun: "#fff4b0", far: "#3c7a46", shape: "hills", ground: ["#5ca850", "#3e7c3a"], tuft: "#8ad46a" },
  forest: { sky: ["#1d3a3a", "#2f6a5a", "#7fc498"], sun: "#e8f8d0", far: "#17382a", shape: "trees", ground: ["#2f6b38", "#1f4a28"], tuft: "#5aa860" },
  swamp: { sky: ["#3a4a38", "#6a7a58", "#a8ae80"], sun: "#d8d8a0", far: "#263426", shape: "reeds", ground: ["#4a4a2a", "#2e3a3a"], tuft: "#7a9a50" },
  mountain: { sky: ["#2a3660", "#5a6c9a", "#b8c4e0"], sun: "#ffffff", far: "#4a5070", shape: "peaks", ground: ["#767884", "#4e505c"], tuft: "#b0b4c0" },
  desert: { sky: ["#e07a40", "#f0b060", "#ffe4a8"], sun: "#fff8d0", far: "#b8803a", shape: "dunes", ground: ["#e2bc74", "#b89050"], tuft: "#f0d898" },
};

export const bgKey = (t: Terrain, layer: Layer): string => `duel-bg-${t}-${layer}`;

const px = (g: G, x: number, y: number, w: number, h: number, color: string): void => {
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
};

const sky = (g: G, look: Look, rnd: () => number): void => {
  px(g, 0, 0, BG_W, 16, look.sky[0]);
  px(g, 0, 16, BG_W, 14, look.sky[1]);
  px(g, 0, 30, BG_W, BG_H - 30, look.sky[2]);
  for (let i = 0; i < 14; i++) px(g, Math.floor(rnd() * BG_W), Math.floor(rnd() * 14), 1, 1, look.sky[2]);
  px(g, 96, 7, 8, 8, look.sun);
  px(g, 98, 5, 4, 12, look.sun);
  px(g, 94, 9, 12, 4, look.sun);
};

const column = (g: G, x: number, top: number, w: number, color: string): void => px(g, x, top, w, GROUND_Y - top, color);

const far = (g: G, look: Look, rnd: () => number): void => {
  const base = 30;
  if (look.shape === "hills" || look.shape === "dunes") {
    for (let x = 0; x < BG_W; x++) column(g, x, base - Math.round(5 * Math.sin(x / 11) + 3 * Math.sin(x / 5 + 2)), 1, look.far);
  }
  if (look.shape === "peaks") {
    for (let x = 0; x < BG_W; x++) {
      const top = base - Math.round(14 * Math.abs(Math.sin(x / 9)) + 4 * Math.abs(Math.sin(x / 4)));
      column(g, x, top, 1, look.far);
      if (top < 20) px(g, x, top, 1, 2, "#e8eef8");
    }
  }
  if (look.shape === "trees") {
    for (let x = 2; x < BG_W; x += 7) {
      const h = 14 + Math.floor(rnd() * 8);
      for (let r = 0; r < h; r++) px(g, x - Math.floor((r * 3) / h), base + 8 - h + r, 1 + Math.floor((r * 6) / h), 1, look.far);
    }
  }
  if (look.shape === "reeds") {
    px(g, 0, base + 4, BG_W, GROUND_Y - base - 4, look.far);
    for (let x = 1; x < BG_W; x += 3) column(g, x, base + 4 - Math.floor(rnd() * 9), 1, look.far);
  }
};

const ground = (g: G, look: Look, rnd: () => number): void => {
  px(g, 0, GROUND_Y - 2, BG_W, BG_H - GROUND_Y + 2, look.ground[0]);
  px(g, 0, GROUND_Y + 1, BG_W, BG_H - GROUND_Y - 1, look.ground[1]);
  for (let i = 0; i < 40; i++) px(g, Math.floor(rnd() * BG_W), GROUND_Y + Math.floor(rnd() * 5), 2, 1, look.ground[0]);
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(rnd() * BG_W);
    px(g, x, GROUND_Y - 3 - Math.floor(rnd() * 2), 1, 2, look.tuft);
  }
};

const PAINTERS: Record<Layer, (g: G, look: Look, rnd: () => number) => void> = { 0: sky, 1: far, 2: ground };

/** Paints the three parallax layers of `t` once; the textures sample with nearest neighbour. */
export const paintDuelBackdrop = (scene: Phaser.Scene, t: Terrain): void => {
  LAYERS.forEach((layer) => {
    const key = bgKey(t, layer);
    paint(scene, key, BG_W, BG_H, (g) => PAINTERS[layer](g, LOOKS[t], rand(97 + layer * 31)));
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  });
};
