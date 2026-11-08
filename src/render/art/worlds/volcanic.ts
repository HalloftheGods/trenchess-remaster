import { TILE_H, TILE_W } from "../../iso";
import { CX, CY } from "./geometry";
import type { WorldRecipe } from "./recipe";
import { boulder } from "./shapes";
import { deadTrunk, spire } from "./shapesBuilt";
import { cells, cracks, litter, pool, striae } from "./surfaces";
import { peaksTop } from "./tops";
import { crackedTop, embersTop, pebblesTop, poolsTop } from "./topsMore";

const EMBER = "#ff7a2a";
const LAVA = "#ff6a1a";

/** Scorched land: black basalt, charred groves, lava pools, obsidian spires and ash flats under red smoke. */
export const VOLCANIC: WorldRecipe = {
  tiles: {
    flat: { top: "#2c2a2c", side: "#1a1818", speck: "#3a3638" },
    forest: { top: "#2a2220", side: "#181412", speck: "#3a2e2a" },
    swamp: { top: "#3a1a10", side: "#201008", speck: "#5a2a12" },
    mountain: { top: "#1e1a22", side: "#100e14", speck: "#2e2a34" },
    desert: { top: "#6a6462", side: "#3e3a38", speck: "#848080" },
  },
  tops: {
    flat: { light: "#343234", dark: "#242224", detail: "#444044", shadow: "#141214" },
    forest: { light: "#322826", dark: "#221a18", detail: EMBER, shadow: "#120c0a" },
    swamp: { light: "#442016", dark: "#2c140c", detail: "#ffd070", shadow: "#1a0c08" },
    mountain: { light: "#2a2430", dark: "#1a1620", detail: "#ff8a3a", shadow: "#0c0a10" },
    desert: { light: "#746e6c", dark: "#524c4a", detail: "#8a8482", shadow: "#302c2a" },
  },
  surface: {
    flat: cells("rgba(255,110,40,0.25)"),
    forest: litter([EMBER, "#3a2a24"], 6, 2, 1),
    swamp: pool(LAVA, "#ffd070", "#1a0c08"),
    mountain: cracks("rgba(255,120,40,0.6)", 3, 1.2),
    desert: striae("rgba(255,255,255,0.12)"),
  },
  topDetail: {
    flat: crackedTop("rgba(255,110,40,0.3)"),
    forest: embersTop(EMBER),
    swamp: poolsTop(LAVA, "#ffd070", "#1a0c08"),
    mountain: peaksTop(),
    desert: pebblesTop(["#4a4644", "#7a7674"]),
  },
  back: {
    forest: (g, r) => {
      deadTrunk(g, CX, CY - TILE_H * 0.3, 38 + r() * 10, EMBER);
      deadTrunk(g, CX - TILE_W * 0.3, CY - 2, 26 + r() * 8, EMBER);
      deadTrunk(g, CX + TILE_W * 0.3, CY - 1, 30 + r() * 8, EMBER);
    },
    mountain: (g, r) => {
      spire(g, CX + 6, CY - TILE_H * 0.22, 18 + r() * 4, 36 + r() * 12, EMBER);
      if (r() > 0.4) spire(g, CX - TILE_W * 0.28, CY - 3, 10, 20 + r() * 6, EMBER);
    },
    swamp: (g, r) => {
      if (r() > 0.5) spire(g, CX + TILE_W * 0.33, CY - 1, 6, 10 + r() * 4, EMBER);
    },
    desert: (g, r) => {
      boulder(g, CX + (r() > 0.5 ? 1 : -1) * TILE_W * 0.26, CY - 3, 9 + r() * 3, 5, "#4a4644");
    },
  },
  front: {
    forest: (g, r) => {
      deadTrunk(g, CX + 8, CY + TILE_H * 0.3, 10 + r() * 4, EMBER);
    },
    mountain: (g, r) => {
      boulder(g, CX + 10, CY + TILE_H * 0.28, 5 + r() * 2, 3, "#2a2430");
    },
    desert: (g) => {
      boulder(g, CX + 6, CY + TILE_H * 0.3, 4, 2.5, "#3e3a38");
    },
  },
  sky: {
    stops: [
      [0, "#080304"],
      [0.35, "#2a0a08"],
      [0.6, "#5a1410"],
      [0.8, "#a0301a"],
      [1, "#e06030"],
    ],
    sun: { x: 0.5, y: 0.95, glow: "#ff5a20", core: "#ffd0a0", spread: 0.45 },
    haze: "rgba(255,90,40,0.4)",
    stars: 20,
    starColor: "#ffc0a0",
    peaks: ["rgba(90,30,20,0.55)", "rgba(60,18,12,0.8)", "rgba(30,8,6,1)", "#c04020"],
    ground: [0x2a0c08, 0x050202],
    glow: 0xff5a20,
    aurora: null,
  },
  plinth: {
    lit: "#4a4446",
    dim: "#2a2628",
    sideLeft: "#18141a",
    sideRight: "#242024",
    rosette: "#3a3436",
    groove: "rgba(0,0,0,0.6)",
    ridge: "rgba(255,120,60,0.22)",
  },
};
