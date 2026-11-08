import Phaser from "phaser";
import type { Terrain } from "../../engine/types";
import { TOP_TILE } from "../iso";
import { ellipse, paint, rand, shade } from "./canvas";

/** Square, straight-on tile textures for the classic top-down projection. */

const S = TOP_TILE;
export const TOP_VARIANTS = 3;

interface TopPalette {
  light: string;
  dark: string;
  detail: string;
  shadow: string;
}

const TOP: Record<Terrain, TopPalette> = {
  flat: { light: "#a4d36a", dark: "#6f9d44", detail: "#86b552", shadow: "#587f36" },
  forest: { light: "#5f9448", dark: "#3f6b30", detail: "#2f5a26", shadow: "#20401a" },
  swamp: { light: "#4f8a80", dark: "#365f5a", detail: "#9fd8c8", shadow: "#243f3c" },
  mountain: { light: "#aba093", dark: "#827769", detail: "#f3f4f7", shadow: "#4f463d" },
  desert: { light: "#f0d08c", dark: "#cfa85e", detail: "#f9e6b4", shadow: "#a8803e" },
};

type Rng = () => number;
type TopPainter = (g: CanvasRenderingContext2D, p: TopPalette, r: Rng) => void;

/** Soft warm light from the upper-left over the whole square. */
const lightWash = (g: CanvasRenderingContext2D, base: string): void => {
  const grad = g.createLinearGradient(0, 0, S, S);
  grad.addColorStop(0, shade(base, 0.07));
  grad.addColorStop(1, shade(base, -0.07));
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
};

const canopy = (g: CanvasRenderingContext2D, x: number, y: number, rad: number, hue: string): void => {
  ellipse(g, x + rad * 0.35, y + rad * 0.4, rad, rad * 0.9, "rgba(0,0,0,0.28)");
  ellipse(g, x, y, rad, rad, shade(hue, -0.06));
  ellipse(g, x - rad * 0.25, y - rad * 0.28, rad * 0.55, rad * 0.5, shade(hue, 0.1));
  ellipse(g, x - rad * 0.4, y - rad * 0.45, rad * 0.2, rad * 0.18, shade(hue, 0.22));
};

const peakTop = (g: CanvasRenderingContext2D, x: number, y: number, rad: number, p: TopPalette): void => {
  const facet = (dx: number, dy: number, color: string) => {
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + dx * rad, y + dy * rad);
    g.lineTo(x + dy * -rad, y + dx * rad);
    g.closePath();
    g.fillStyle = color;
    g.fill();
  };
  ellipse(g, x + rad * 0.3, y + rad * 0.35, rad * 1.05, rad * 0.9, "rgba(0,0,0,0.3)");
  facet(-1, -1, shade(p.light, 0.16));
  facet(1, -1, shade(p.light, 0.02));
  facet(1, 1, shade(p.dark, -0.18));
  facet(-1, 1, shade(p.dark, -0.06));
  g.beginPath();
  g.moveTo(x, y - rad * 0.42);
  g.lineTo(x + rad * 0.3, y - rad * 0.1);
  g.lineTo(x + rad * 0.08, y + rad * 0.02);
  g.lineTo(x - rad * 0.12, y + rad * 0.3);
  g.lineTo(x - rad * 0.34, y - rad * 0.05);
  g.closePath();
  g.fillStyle = p.detail;
  g.fill();
};

const PAINTERS: Record<Terrain, TopPainter> = {
  flat: (g, p, r) => {
    g.strokeStyle = shade(p.shadow, 0.02);
    g.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const x = 6 + r() * (S - 12);
      const y = 8 + r() * (S - 12);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 1.5, y - 4);
      g.moveTo(x, y);
      g.lineTo(x + 1.8, y - 3.5);
      g.stroke();
    }
    g.fillStyle = p.detail;
    for (let i = 0; i < 14; i++) {
      g.globalAlpha = 0.35 + r() * 0.4;
      g.fillRect(3 + r() * (S - 6), 3 + r() * (S - 6), 2, 1.5);
    }
    g.globalAlpha = 1;
  },
  forest: (g, _p, r) => {
    const spots: [number, number, number][] = [
      [20, 22, 13],
      [44, 18, 11],
      [40, 44, 13],
      [16, 46, 10],
    ];
    for (const [x, y, rad] of spots) {
      canopy(g, x + (r() - 0.5) * 6, y + (r() - 0.5) * 6, rad + r() * 3, r() > 0.5 ? "#3f7f3a" : "#4a8d3f");
    }
    canopy(g, 31 + (r() - 0.5) * 6, 32 + (r() - 0.5) * 6, 9 + r() * 3, "#58a046");
  },
  swamp: (g, p, r) => {
    const water = g.createLinearGradient(0, 0, S, S);
    water.addColorStop(0, shade(p.light, -0.02));
    water.addColorStop(1, shade(p.dark, -0.12));
    g.fillStyle = water;
    g.fillRect(4, 4, S - 8, S - 8);
    g.strokeStyle = "rgba(190,240,225,0.4)";
    g.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      const x = 10 + r() * (S - 20);
      const y = 10 + r() * (S - 20);
      const rad = 4 + r() * 8;
      g.beginPath();
      g.ellipse(x, y, rad, rad * 0.7, 0, 0, Math.PI * 2);
      g.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const x = 8 + r() * (S - 16);
      const y = 8 + r() * (S - 16);
      ellipse(g, x, y, 5, 4.5, "#5d9a48");
      g.fillStyle = shade(p.dark, -0.1);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 5, y - 1);
      g.lineTo(x + 5, y + 1.5);
      g.closePath();
      g.fill();
      if (i === 0) ellipse(g, x + 1, y - 1, 1.6, 1.4, "#f1a7c8");
    }
    g.fillStyle = "#7c9a3e";
    for (let i = 0; i < 6; i++) ellipse(g, 6 + r() * (S - 12), 6 + r() * (S - 12), 1.4, 1.4, i % 2 ? "#7c9a3e" : "#5f7d30");
  },
  mountain: (g, p, r) => {
    peakTop(g, 26 + r() * 6, 28 + r() * 6, 20 + r() * 4, p);
    peakTop(g, 46 + r() * 4, 46 + r() * 4, 10 + r() * 3, p);
    if (r() > 0.4) peakTop(g, 14 + r() * 4, 50 + r() * 3, 7 + r() * 2, p);
  },
  desert: (g, p, r) => {
    for (let i = 0; i < 5; i++) {
      const y = 6 + i * 12 + r() * 4;
      const crest = g.createLinearGradient(0, y - 6, 0, y + 6);
      crest.addColorStop(0, "rgba(255,245,210,0.35)");
      crest.addColorStop(0.5, "rgba(0,0,0,0)");
      crest.addColorStop(1, "rgba(120,80,30,0.3)");
      g.fillStyle = crest;
      g.beginPath();
      g.moveTo(-2, y - 6);
      g.quadraticCurveTo(S * 0.35, y - 11 + r() * 4, S * 0.6, y - 3);
      g.quadraticCurveTo(S * 0.85, y + 2, S + 2, y - 4);
      g.lineTo(S + 2, y + 6);
      g.quadraticCurveTo(S * 0.6, y + 6, -2, y + 7);
      g.closePath();
      g.fill();
    }
    g.fillStyle = p.shadow;
    for (let i = 0; i < 10; i++) {
      g.globalAlpha = 0.25 + r() * 0.3;
      g.fillRect(4 + r() * (S - 8), 4 + r() * (S - 8), 1.5, 1.5);
    }
    g.globalAlpha = 1;
  },
};

const drawTop = (t: Terrain, light: boolean, seed: number) => (g: CanvasRenderingContext2D) => {
  const p = TOP[t];
  const r = rand(seed);
  lightWash(g, light ? p.light : p.dark);
  PAINTERS[t](g, p, r);
  g.strokeStyle = "rgba(0,0,0,0.28)";
  g.lineWidth = 1;
  g.strokeRect(0.5, 0.5, S - 1, S - 1);
  g.strokeStyle = "rgba(255,255,255,0.18)";
  g.beginPath();
  g.moveTo(1.5, S - 1.5);
  g.lineTo(1.5, 1.5);
  g.lineTo(S - 1.5, 1.5);
  g.stroke();
  g.strokeStyle = "rgba(0,0,0,0.2)";
  g.beginPath();
  g.moveTo(S - 1.5, 1.5);
  g.lineTo(S - 1.5, S - 1.5);
  g.lineTo(1.5, S - 1.5);
  g.stroke();
};

export const tileTopKey = (t: Terrain, light: boolean, v: number): string => `tile-top-${t}-${light ? "l" : "d"}-${v}`;

export const paintTerrainTop = (scene: Phaser.Scene): void => {
  const kinds: Terrain[] = ["flat", "forest", "swamp", "mountain", "desert"];
  kinds.forEach((t, ti) => {
    for (let v = 0; v < TOP_VARIANTS; v++) {
      for (const light of [true, false]) {
        paint(scene, tileTopKey(t, light, v), S, S, drawTop(t, light, 503 + ti * 29 + v * 11 + (light ? 1 : 0)));
      }
    }
  });
};
