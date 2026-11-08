import Phaser from "phaser";
import type { Terrain } from "../../engine/types";
import { ELEVATION, HEADROOM, SLAB, TILE_H, TILE_W } from "../iso";
import { diamondPath, ellipse, paint, rand, shade } from "./canvas";

export const TILE_TEX_H = HEADROOM + TILE_H + SLAB + 4;
export const TILE_ORIGIN_Y = (HEADROOM + TILE_H / 2) / TILE_TEX_H;
export const VARIANTS = 3;

interface Palette {
  top: string;
  side: string;
  speck: string;
}

const PALETTES: Record<Terrain, Palette> = {
  flat: { top: "#8cbc52", side: "#7a5a3a", speck: "#a5cc68" },
  forest: { top: "#4f7f36", side: "#6b4e32", speck: "#6e9c45" },
  swamp: { top: "#3f6e66", side: "#4d4a35", speck: "#5f8f7c" },
  mountain: { top: "#9a8f7e", side: "#6e655a", speck: "#b7ad9b" },
  desert: { top: "#e6c47c", side: "#b98a4c", speck: "#f3dca2" },
};

const CX = TILE_W / 2;
const CY = HEADROOM + TILE_H / 2;

const drawSides = (g: CanvasRenderingContext2D, top: number, p: Palette): void => {
  const bottom = CY + SLAB;
  g.beginPath();
  g.moveTo(CX - TILE_W / 2, top);
  g.lineTo(CX, top + TILE_H / 2);
  g.lineTo(CX, bottom + TILE_H / 2);
  g.lineTo(CX - TILE_W / 2, bottom);
  g.closePath();
  g.fillStyle = shade(p.side, -0.08);
  g.fill();
  g.beginPath();
  g.moveTo(CX + TILE_W / 2, top);
  g.lineTo(CX, top + TILE_H / 2);
  g.lineTo(CX, bottom + TILE_H / 2);
  g.lineTo(CX + TILE_W / 2, bottom);
  g.closePath();
  g.fillStyle = shade(p.side, 0.04);
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.18)";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(CX, top + TILE_H / 2);
  g.lineTo(CX, bottom + TILE_H / 2);
  g.stroke();
};

const speckle = (g: CanvasRenderingContext2D, cy: number, color: string, count: number, r: () => number): void => {
  g.save();
  diamondPath(g, CX, cy, TILE_W - 2, TILE_H - 1);
  g.clip();
  g.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = CX + (r() - 0.5) * TILE_W;
    const y = cy + (r() - 0.5) * TILE_H;
    g.globalAlpha = 0.25 + r() * 0.5;
    g.fillRect(x, y, 1 + r() * 2, 1 + r() * 1.5);
  }
  g.restore();
};

const SURFACE: Record<Terrain, (g: CanvasRenderingContext2D, cy: number, r: () => number) => void> = {
  flat: (g, cy, r) => {
    g.strokeStyle = "rgba(40,70,20,0.35)";
    for (let i = 0; i < 6; i++) {
      const x = CX + (r() - 0.5) * TILE_W * 0.6;
      const y = cy + (r() - 0.5) * TILE_H * 0.5;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 2, y - 4);
      g.moveTo(x, y);
      g.lineTo(x + 2, y - 4);
      g.stroke();
    }
  },
  forest: (g, cy, r) => {
    for (let i = 0; i < 7; i++) {
      ellipse(g, CX + (r() - 0.5) * TILE_W * 0.6, cy + (r() - 0.5) * TILE_H * 0.5, 3, 1.5, i % 2 ? "#c58a3a" : "#8f6a2a");
    }
  },
  swamp: (g, cy, r) => {
    g.strokeStyle = "rgba(200,240,220,0.35)";
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.ellipse(CX + (r() - 0.5) * 30, cy + (r() - 0.5) * 12, 8 + r() * 6, 3 + r() * 2, 0, 0, Math.PI * 2);
      g.stroke();
    }
    for (let i = 0; i < 2; i++) {
      const x = CX + (r() - 0.5) * 40;
      const y = cy + (r() - 0.5) * 16;
      ellipse(g, x, y, 5, 2.5, "#5d9a48");
      ellipse(g, x + 1, y - 0.5, 1.5, 0.8, "#f1a7c8");
    }
  },
  mountain: (g, cy, r) => {
    g.strokeStyle = "rgba(60,50,40,0.45)";
    g.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      let x = CX + (r() - 0.5) * TILE_W * 0.6;
      let y = cy + (r() - 0.5) * TILE_H * 0.5;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 3; k++) {
        x += (r() - 0.5) * 10;
        y += r() * 4;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  },
  desert: (g, cy, r) => {
    g.strokeStyle = "rgba(160,110,50,0.4)";
    g.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      const y = cy - TILE_H * 0.3 + i * 7 + r() * 3;
      g.beginPath();
      g.moveTo(CX - 26 + r() * 6, y);
      g.quadraticCurveTo(CX, y - 5, CX + 26 - r() * 6, y + 2);
      g.stroke();
    }
  },
};

const drawTile = (terrain: Terrain, light: boolean, seed: number) => (g: CanvasRenderingContext2D) => {
  const p = PALETTES[terrain];
  const elev = ELEVATION[terrain];
  const top = CY - elev;
  const r = rand(seed);
  drawSides(g, top, p);
  diamondPath(g, CX, top, TILE_W, TILE_H);
  const grad = g.createLinearGradient(CX - TILE_W / 2, top, CX + TILE_W / 2, top);
  const base = shade(p.top, light ? 0.06 : -0.13);
  grad.addColorStop(0, base);
  grad.addColorStop(1, base);
  g.fillStyle = grad;
  g.fill();
  speckle(g, top, p.speck, 40, r);
  SURFACE[terrain](g, top, r);
  diamondPath(g, CX, top, TILE_W, TILE_H);
  g.strokeStyle = "rgba(255,255,255,0.10)";
  g.stroke();
};

export const tileKey = (t: Terrain, light: boolean, v: number): string => `tile-${t}-${light ? "l" : "d"}-${v}`;

export const paintTerrain = (scene: Phaser.Scene): void => {
  const kinds: Terrain[] = ["flat", "forest", "swamp", "mountain", "desert"];
  kinds.forEach((t, ti) => {
    for (let v = 0; v < VARIANTS; v++) {
      for (const light of [true, false]) {
        paint(scene, tileKey(t, light, v), TILE_W, TILE_TEX_H, drawTile(t, light, 97 + ti * 31 + v * 7 + (light ? 1 : 0)));
      }
    }
  });
};
