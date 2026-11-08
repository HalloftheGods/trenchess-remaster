import { TILE_H, TILE_W } from "../../iso";
import { boulder, pine } from "./shapes";
import { pylon, tower } from "./shapesBuilt";
import { CX, CY } from "./geometry";
import type { WorldRecipe } from "./recipe";
import { cells, lanes, litter, pool, striae } from "./surfaces";
import { canopyTop } from "./tops";
import { crackedTop, gridTop, poolsTop, rooftopsTop } from "./topsMore";

const CYAN = "#39e6ff";
const MAGENTA = "#ff3bd1";
const TOXIC = "#53ff6a";

/** A hologram tree: translucent cyan pine with a glow. */
const holoTree = (g: CanvasRenderingContext2D, x: number, y: number, h: number): void => {
  g.save();
  g.globalAlpha = 0.8;
  g.shadowColor = CYAN;
  g.shadowBlur = 8;
  pine(g, x, y, h, "#1fb8d8", "#2b2f3a");
  g.restore();
  g.strokeStyle = "rgba(255,255,255,0.5)";
  g.lineWidth = 0.6;
  for (let i = 0; i < 4; i++) {
    const yy = y - h * (0.3 + i * 0.16);
    g.beginPath();
    g.moveTo(x - h * 0.3, yy);
    g.lineTo(x + h * 0.3, yy);
    g.stroke();
  }
};

/** Night city: asphalt grid, holographic groves, toxic pools, glass towers and sodium-lit concrete. */
export const NEON: WorldRecipe = {
  tiles: {
    flat: { top: "#23262e", side: "#15171d", speck: "#2f333d" },
    forest: { top: "#1c2430", side: "#121820", speck: "#2a3a4c" },
    swamp: { top: "#1b3028", side: "#10201a", speck: "#2c5a3c" },
    mountain: { top: "#2a3242", side: "#1a2030", speck: "#3c4a62" },
    desert: { top: "#4a4440", side: "#2e2a27", speck: "#5e5651" },
  },
  tops: {
    flat: { light: "#30353f", dark: "#1a1d24", detail: "#3a3f4c", shadow: "#101218" },
    forest: { light: "#1f2a3a", dark: "#141c28", detail: CYAN, shadow: "#0a1018" },
    swamp: { light: "#1f3a2e", dark: "#132820", detail: TOXIC, shadow: "#0a1810" },
    mountain: { light: "#2e3a4e", dark: "#1e2636", detail: "#9fe8ff", shadow: "#0e1420" },
    desert: { light: "#534c47", dark: "#3a3430", detail: "#ffb05a", shadow: "#201c18" },
  },
  surface: {
    flat: lanes("rgba(57,230,255,0.55)"),
    forest: litter([CYAN, MAGENTA], 5, 2, 1),
    swamp: pool(TOXIC, "#c8ffd0", "#0d1a12"),
    mountain: striae("rgba(140,200,255,0.35)", 6),
    desert: cells("rgba(255,170,60,0.35)"),
  },
  topDetail: {
    flat: gridTop("rgba(57,230,255,0.6)", "rgba(255,255,255,0.06)"),
    forest: canopyTop(["#1fb8d8", "#2fd4ff", MAGENTA]),
    swamp: poolsTop(TOXIC, "#c8ffd0", "#0d1a12"),
    mountain: rooftopsTop("#2c3446", "#9fe8ff"),
    desert: crackedTop("rgba(255,180,80,0.4)"),
  },
  back: {
    forest: (g, r) => {
      holoTree(g, CX, CY - TILE_H * 0.3, 40 + r() * 8);
      holoTree(g, CX + TILE_W * 0.3, CY - 1, 30 + r() * 6);
      pylon(g, CX - TILE_W * 0.3, CY - 2, 26 + r() * 6, MAGENTA);
    },
    mountain: (g, r) => {
      tower(g, CX + 4, CY - TILE_H * 0.2, 11, 46 + r() * 16, { wall: "#2c3446", lit: "#4a5a74", window: "#9fe8ff" }, r);
      if (r() > 0.4) tower(g, CX - TILE_W * 0.3, CY - 2, 7, 22 + r() * 10, { wall: "#262e3e", lit: "#3e4c62", window: MAGENTA }, r);
    },
    swamp: (g, r) => {
      pylon(g, CX + TILE_W * 0.3, CY - 2, 16 + r() * 4, "#ffd23b");
    },
    desert: (g, r) => {
      pylon(g, CX + (r() > 0.5 ? 1 : -1) * TILE_W * 0.26, CY - 3, 22 + r() * 6, "#ffb05a");
    },
  },
  front: {
    forest: (g) => {
      g.save();
      g.globalAlpha = 0.7;
      g.fillStyle = CYAN;
      g.fillRect(CX - 8, CY + TILE_H * 0.3, 16, 1.5);
      g.restore();
    },
    mountain: (g, r) => {
      tower(g, CX + 12, CY + TILE_H * 0.26, 5, 12 + r() * 6, { wall: "#262e3e", lit: "#3e4c62", window: "#9fe8ff" }, r);
    },
    desert: (g) => {
      boulder(g, CX + 6, CY + TILE_H * 0.3, 5, 2.5, "#5a524c");
    },
  },
  sky: {
    stops: [
      [0, "#03040a"],
      [0.4, "#0a0a22"],
      [0.7, "#2a0f3e"],
      [0.85, "#5a1a5e"],
      [1, "#7a2a6a"],
    ],
    sun: { x: 0.5, y: 1.02, glow: MAGENTA, core: "#ffd0f0", spread: 0.5 },
    haze: "rgba(57,230,255,0.3)",
    stars: 140,
    starColor: "#cfe8ff",
    peaks: ["rgba(30,20,60,0.6)", "rgba(20,12,45,0.85)", "rgba(10,6,25,1)", "#5a1a5e"],
    ground: [0x0a0a16, 0x020208],
    glow: 0xff3bd1,
    aurora: null,
  },
  plinth: {
    lit: "#3a3f4c",
    dim: "#1e212a",
    sideLeft: "#141720",
    sideRight: "#232733",
    rosette: "#2e3340",
    groove: "rgba(0,0,0,0.6)",
    ridge: "rgba(120,220,255,0.25)",
  },
};
