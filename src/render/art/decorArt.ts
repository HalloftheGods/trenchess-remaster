import Phaser from "phaser";
import { HEADROOM, TILE_H, TILE_W } from "../iso";
import { TILE_TEX_H, VARIANTS } from "./terrainArt";
import { ellipse, paint, rand, shade } from "./canvas";

const CX = TILE_W / 2;
const CY = HEADROOM + TILE_H / 2;

const pine = (g: CanvasRenderingContext2D, x: number, y: number, h: number, hue: string): void => {
  ellipse(g, x + 4, y + 2, h * 0.28, h * 0.1, "rgba(0,0,0,0.25)");
  g.fillStyle = "#5a3b22";
  g.fillRect(x - 1.5, y - h * 0.25, 3, h * 0.25);
  for (let i = 0; i < 3; i++) {
    const w = h * (0.34 - i * 0.07);
    const top = y - h * (0.25 + i * 0.22) - h * 0.32;
    const base = y - h * (0.18 + i * 0.22);
    const grad = g.createLinearGradient(x - w, 0, x + w, 0);
    grad.addColorStop(0, shade(hue, 0.08));
    grad.addColorStop(1, shade(hue, -0.12));
    g.beginPath();
    g.moveTo(x, top);
    g.lineTo(x + w, base);
    g.lineTo(x - w, base);
    g.closePath();
    g.fillStyle = grad;
    g.fill();
  }
};

const roundTree = (g: CanvasRenderingContext2D, x: number, y: number, h: number, hue: string): void => {
  ellipse(g, x + 4, y + 2, h * 0.3, h * 0.1, "rgba(0,0,0,0.25)");
  g.fillStyle = "#5e3f24";
  g.fillRect(x - 2, y - h * 0.4, 4, h * 0.4);
  ellipse(g, x, y - h * 0.62, h * 0.3, h * 0.3, shade(hue, -0.08));
  ellipse(g, x - h * 0.08, y - h * 0.7, h * 0.22, h * 0.22, hue);
  ellipse(g, x - h * 0.12, y - h * 0.78, h * 0.1, h * 0.08, shade(hue, 0.15));
};

const peak = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void => {
  g.beginPath();
  g.moveTo(x - w, y);
  g.lineTo(x - w * 0.15, y - h);
  g.lineTo(x + w, y);
  g.closePath();
  g.fillStyle = "#8b8174";
  g.fill();
  g.beginPath();
  g.moveTo(x - w * 0.15, y - h);
  g.lineTo(x + w, y);
  g.lineTo(x + w * 0.1, y);
  g.closePath();
  g.fillStyle = "#6c6358";
  g.fill();
  g.beginPath();
  g.moveTo(x - w * 0.15, y - h);
  g.lineTo(x - w * 0.42, y - h * 0.68);
  g.lineTo(x - w * 0.2, y - h * 0.74);
  g.lineTo(x - w * 0.02, y - h * 0.62);
  g.lineTo(x + w * 0.22, y - h * 0.7);
  g.closePath();
  g.fillStyle = "#f4f6fa";
  g.fill();
};

const reeds = (g: CanvasRenderingContext2D, x: number, y: number, r: () => number): void => {
  g.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) {
    const dx = (r() - 0.5) * 8;
    const h = 10 + r() * 10;
    g.strokeStyle = i % 2 ? "#7c9a3e" : "#5f7d30";
    g.beginPath();
    g.moveTo(x + dx, y);
    g.quadraticCurveTo(x + dx + 2, y - h / 2, x + dx + (r() - 0.5) * 6, y - h);
    g.stroke();
    if (i % 2 === 0) ellipse(g, x + dx + 1, y - h + 2, 1.6, 3.5, "#6b4423");
  }
};

const cactus = (g: CanvasRenderingContext2D, x: number, y: number, h: number): void => {
  ellipse(g, x + 3, y + 1, 7, 2.5, "rgba(0,0,0,0.25)");
  g.fillStyle = "#4f8a3c";
  g.strokeStyle = "#3a6b2c";
  g.lineWidth = 1;
  const arm = (ax: number, ay: number, dir: number) => {
    g.beginPath();
    g.roundRect(ax, ay - 8, 4 * dir, 3, 1.5);
    g.roundRect(ax + 3 * dir - (dir < 0 ? 4 : 0), ay - 14, 4, 9, 2);
    g.fill();
  };
  g.beginPath();
  g.roundRect(x - 3, y - h, 6, h, 3);
  g.fill();
  g.stroke();
  arm(x + 3, y - h * 0.35, 1);
  arm(x - 3, y - h * 0.55, -1);
};

const skull = (g: CanvasRenderingContext2D, x: number, y: number): void => {
  ellipse(g, x, y, 4, 3, "#efe6d2");
  g.fillStyle = "#3b2a1a";
  g.fillRect(x - 2, y - 1, 1.3, 1.3);
  g.fillRect(x + 0.8, y - 1, 1.3, 1.3);
};

type DecorPainter = (g: CanvasRenderingContext2D, r: () => number) => void;

const BACK: Record<string, DecorPainter> = {
  forest: (g, r) => {
    const hue = r() > 0.5 ? "#2f6b34" : "#3a7a3a";
    pine(g, CX, CY - TILE_H * 0.3, 44 + r() * 10, hue);
    roundTree(g, CX - TILE_W * 0.3, CY - 2, 34 + r() * 8, "#4b8a3a");
    pine(g, CX + TILE_W * 0.3, CY - 1, 38 + r() * 8, "#3d7f3f");
  },
  mountain: (g, r) => {
    peak(g, CX + 6, CY - TILE_H * 0.22, 22 + r() * 4, 30 + r() * 10);
    if (r() > 0.4) peak(g, CX - TILE_W * 0.28, CY - 3, 12, 18 + r() * 6);
  },
  swamp: (g, r) => {
    reeds(g, CX, CY - TILE_H * 0.32, r);
    reeds(g, CX + TILE_W * 0.33, CY - 1, r);
  },
  desert: (g, r) => {
    cactus(g, CX + (r() > 0.5 ? 1 : -1) * TILE_W * 0.26, CY - 3, 18 + r() * 8);
  },
};

const FRONT: Record<string, DecorPainter> = {
  forest: (g, r) => {
    ellipse(g, CX - 6, CY + TILE_H * 0.36, 8, 4, "#3d7a33");
    ellipse(g, CX + 8, CY + TILE_H * 0.3, 6 + r() * 2, 3.5, "#4a8a3a");
  },
  mountain: (g, r) => {
    ellipse(g, CX + 10, CY + TILE_H * 0.28, 5 + r() * 2, 3, "#7d7468");
  },
  swamp: (g, r) => {
    reeds(g, CX - TILE_W * 0.3, CY + 4, r);
  },
  desert: (g) => {
    skull(g, CX + 6, CY + TILE_H * 0.3);
  },
};

export const decorKey = (side: "back" | "front", t: string, v: number): string => `decor-${side}-${t}-${v}`;

export const paintDecor = (scene: Phaser.Scene): void => {
  for (const [side, table] of [["back", BACK], ["front", FRONT]] as const) {
    Object.entries(table).forEach(([t, fn], ti) => {
      for (let v = 0; v < VARIANTS; v++) {
        paint(scene, decorKey(side, t, v), TILE_W, TILE_TEX_H, (g) => fn(g, rand(311 + ti * 13 + v * 5)));
      }
    });
  }
};
