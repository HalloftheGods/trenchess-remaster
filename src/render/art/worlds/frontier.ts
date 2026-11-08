import { TILE_H, TILE_W } from "../../iso";
import { ellipse } from "../canvas";
import { CX, CY } from "./geometry";
import type { WorldRecipe } from "./recipe";
import { boulder, cactus, pine, reeds, skull } from "./shapes";
import { mesa } from "./shapesBuilt";
import { blades, dunes, litter, ripples, striae } from "./surfaces";
import { canopyTop, dunesTop, grassTop, peaksTop, waterTop } from "./tops";

const DRY_REEDS: [string, string] = ["#b8a060", "#8a7a40"];

/** A rib cage half-buried in the sand. */
const bones = (g: CanvasRenderingContext2D, x: number, y: number): void => {
  g.strokeStyle = "#efe6d2";
  g.lineWidth = 1.4;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.arc(x + i * 4, y, 4, Math.PI, Math.PI * 1.9);
    g.stroke();
  }
};

/** The old west: dry prairie, pine stands, muddy creeks, red mesas and bone-strewn sand under an amber dusk. */
export const FRONTIER: WorldRecipe = {
  tiles: {
    flat: { top: "#c8b060", side: "#8a6a3a", speck: "#dcc67a" },
    forest: { top: "#6b7f3a", side: "#6a4e2e", speck: "#86984a" },
    swamp: { top: "#7a6a45", side: "#5a4830", speck: "#9a8a5c" },
    mountain: { top: "#a85a3c", side: "#7a3a28", speck: "#c47a56" },
    desert: { top: "#e2bf82", side: "#b48852", speck: "#f0d6a2" },
  },
  tops: {
    flat: { light: "#d8c070", dark: "#a89048", detail: "#ecd890", shadow: "#7a6830" },
    forest: { light: "#7a8e48", dark: "#56683a", detail: "#3a4a24", shadow: "#2a3418" },
    swamp: { light: "#8a7a52", dark: "#5e5038", detail: "#c8b888", shadow: "#3a3020" },
    mountain: { light: "#b86a48", dark: "#8a4830", detail: "#d08a68", shadow: "#5a2a1c" },
    desert: { light: "#ecc890", dark: "#c8a060", detail: "#f8e4b8", shadow: "#9a7038" },
  },
  surface: {
    flat: blades("rgba(110,80,30,0.4)"),
    forest: litter(["#8a6a2a", "#5a4a20"]),
    swamp: ripples("rgba(230,210,170,0.35)", null, null),
    mountain: striae("rgba(70,25,15,0.45)"),
    desert: dunes("rgba(150,100,50,0.4)"),
  },
  topDetail: {
    flat: grassTop(),
    forest: canopyTop(["#4a6e2e", "#5a7a34", "#6a8a3c"]),
    swamp: waterTop({ ring: "rgba(240,220,180,0.4)", pad: null, flower: null, specks: DRY_REEDS }),
    mountain: peaksTop(),
    desert: dunesTop("rgba(255,240,200,0.35)", "rgba(110,70,30,0.3)"),
  },
  back: {
    forest: (g, r) => {
      pine(g, CX, CY - TILE_H * 0.3, 44 + r() * 10, "#3e5e2a", "#4a2e18");
      pine(g, CX - TILE_W * 0.3, CY - 2, 32 + r() * 8, "#4a6a30", "#4a2e18");
      pine(g, CX + TILE_W * 0.3, CY - 1, 38 + r() * 8, "#36562a", "#4a2e18");
    },
    mountain: (g, r) => {
      mesa(g, CX + 4, CY - TILE_H * 0.2, 24 + r() * 4, 26 + r() * 10);
      if (r() > 0.5) mesa(g, CX - TILE_W * 0.3, CY - 2, 10, 12 + r() * 6);
    },
    swamp: (g, r) => {
      reeds(g, CX, CY - TILE_H * 0.32, r, DRY_REEDS, "#8a6a3a");
      reeds(g, CX + TILE_W * 0.33, CY - 1, r, DRY_REEDS, null);
    },
    desert: (g, r) => {
      cactus(g, CX + (r() > 0.5 ? 1 : -1) * TILE_W * 0.26, CY - 3, 18 + r() * 8);
      if (r() > 0.5) cactus(g, CX, CY - TILE_H * 0.3, 10 + r() * 4);
    },
  },
  front: {
    forest: (g, r) => {
      boulder(g, CX + 8, CY + TILE_H * 0.3, 5 + r() * 2, 3, "#8a7a62");
    },
    mountain: (g, r) => {
      boulder(g, CX + 10, CY + TILE_H * 0.28, 5 + r() * 2, 3, "#a05a40");
    },
    swamp: (g, r) => {
      reeds(g, CX - TILE_W * 0.3, CY + 4, r, DRY_REEDS, null);
      ellipse(g, CX + 6, CY + TILE_H * 0.3, 7, 2, "rgba(60,40,20,0.35)");
    },
    desert: (g) => {
      skull(g, CX + 6, CY + TILE_H * 0.3);
      bones(g, CX - 14, CY + TILE_H * 0.26);
    },
  },
  sky: {
    stops: [
      [0, "#2a1a2e"],
      [0.35, "#5a2e3a"],
      [0.6, "#b0522e"],
      [0.8, "#e08a3a"],
      [1, "#f8d090"],
    ],
    sun: { x: 0.7, y: 0.84, glow: "#ffb060", core: "#fff0c0", spread: 0.4 },
    haze: "rgba(255,200,140,0.4)",
    stars: 30,
    starColor: "#fff0d0",
    peaks: ["rgba(150,80,60,0.5)", "rgba(110,55,45,0.75)", "rgba(70,35,30,0.95)", "#f0a060"],
    ground: [0x3a2418, 0x0a0604],
    glow: 0xf0a050,
    aurora: null,
  },
  plinth: {
    lit: "#8a6a44",
    dim: "#5a4228",
    sideLeft: "#3e2c1a",
    sideRight: "#54391f",
    rosette: "#6a4e2e",
    groove: "rgba(30,15,5,0.6)",
    ridge: "rgba(255,220,170,0.2)",
  },
};
