import { TILE_H, TILE_W } from "../../iso";
import { ellipse } from "../canvas";
import { CX, CY } from "./geometry";
import type { WorldRecipe } from "./recipe";
import { boulder, peak, pine, reeds } from "./shapes";
import { cracks, litter, striae } from "./surfaces";
import { canopyTop, peaksTop } from "./tops";
import { iceTop, pebblesTop } from "./topsMore";

const SNOW = "#f4f8fc";
const DEAD_REEDS: [string, string] = ["#c8c0a0", "#a09878"];
const ICE_PEAK = { lit: "#c8d8e8", dim: "#8aa0b8", cap: SNOW };

/** Snowbound: snow fields, snowy firs, frozen lakes, icy peaks and wind-scoured gravel under an aurora. */
export const TUNDRA: WorldRecipe = {
  tiles: {
    flat: { top: "#e8eef4", side: "#8a98a8", speck: "#ffffff" },
    forest: { top: "#c8d8dc", side: "#6a7a84", speck: "#e0ecf0" },
    swamp: { top: "#a8d0e0", side: "#5a7a90", speck: "#d0ecf8" },
    mountain: { top: "#b8c8d8", side: "#6a7c90", speck: "#e8f2fc" },
    desert: { top: "#8a9096", side: "#565c62", speck: "#a4aab0" },
  },
  tops: {
    flat: { light: "#f4f8fc", dark: "#c8d4e0", detail: "#ffffff", shadow: "#98a8b8" },
    forest: { light: "#d8e4e8", dark: "#aab8c0", detail: "#3a5a4a", shadow: "#6a7a80" },
    swamp: { light: "#bce0f0", dark: "#86b4cc", detail: "#ffffff", shadow: "#4a7a90" },
    mountain: { light: "#c4d4e4", dark: "#8ea2b8", detail: "#ffffff", shadow: "#56687c" },
    desert: { light: "#969ca2", dark: "#6a7076", detail: "#b8bec4", shadow: "#40464c" },
  },
  surface: {
    flat: striae("rgba(140,170,200,0.3)"),
    forest: litter(["#ffffff", "#b0c4d0"], 6, 3, 1.5),
    swamp: cracks("rgba(255,255,255,0.6)", 3, 1.2),
    mountain: cracks("rgba(60,80,110,0.4)"),
    desert: litter(["#6a7076", "#a8aeb4"], 8, 2, 1.2),
  },
  topDetail: {
    flat: pebblesTop(["#ffffff", "#d8e4ec"], 8),
    forest: canopyTop(["#3a5a4a", "#2e4e40", "#466a58"], "#eef4f8"),
    swamp: iceTop("rgba(255,255,255,0.7)", "rgba(255,255,255,0.35)"),
    mountain: peaksTop(),
    desert: pebblesTop(["#6a7076", "#a8aeb4"]),
  },
  back: {
    forest: (g, r) => {
      pine(g, CX, CY - TILE_H * 0.3, 44 + r() * 10, "#2e4e40", "#3a2a1c", SNOW);
      pine(g, CX - TILE_W * 0.3, CY - 2, 30 + r() * 8, "#3a5a4a", "#3a2a1c", SNOW);
      pine(g, CX + TILE_W * 0.3, CY - 1, 36 + r() * 8, "#2a4a3c", "#3a2a1c", SNOW);
    },
    mountain: (g, r) => {
      peak(g, CX + 6, CY - TILE_H * 0.22, 22 + r() * 4, 32 + r() * 10, ICE_PEAK);
      if (r() > 0.4) peak(g, CX - TILE_W * 0.28, CY - 3, 12, 18 + r() * 6, ICE_PEAK);
    },
    swamp: (g, r) => {
      reeds(g, CX + TILE_W * 0.33, CY - 1, r, DEAD_REEDS, null);
    },
    desert: (g, r) => {
      boulder(g, CX + (r() > 0.5 ? 1 : -1) * TILE_W * 0.26, CY - 3, 9 + r() * 3, 5, "#7a8088");
    },
  },
  front: {
    forest: (g, r) => {
      ellipse(g, CX - 6, CY + TILE_H * 0.36, 8, 3.5, SNOW);
      ellipse(g, CX + 8, CY + TILE_H * 0.3, 6 + r() * 2, 3, "#e0eaf0");
    },
    mountain: (g, r) => {
      boulder(g, CX + 10, CY + TILE_H * 0.28, 5 + r() * 2, 3, "#9aacbc");
    },
    swamp: (g) => {
      ellipse(g, CX - 10, CY + TILE_H * 0.3, 9, 2.5, "rgba(255,255,255,0.5)");
    },
    desert: (g) => {
      boulder(g, CX + 6, CY + TILE_H * 0.3, 4, 2.5, "#6a7076");
    },
  },
  sky: {
    stops: [
      [0, "#0a1428"],
      [0.3, "#143050"],
      [0.6, "#3a6a90"],
      [0.85, "#9ac4e0"],
      [1, "#e0f0f8"],
    ],
    sun: { x: 0.75, y: 0.9, glow: "#ffffff", core: "#ffffff", spread: 0.3 },
    haze: "rgba(220,240,255,0.45)",
    stars: 110,
    starColor: "#e0f0ff",
    peaks: ["rgba(150,180,210,0.5)", "rgba(100,130,170,0.75)", "rgba(60,80,120,0.95)", "#d0e8f8"],
    ground: [0x6a7e92, 0x0a1018],
    glow: 0xa0e0ff,
    aurora: "#5affb0",
  },
  plinth: {
    lit: "#8a9aa8",
    dim: "#56636f",
    sideLeft: "#3a4450",
    sideRight: "#4e5a66",
    rosette: "#7a8a98",
    groove: "rgba(10,20,30,0.55)",
    ridge: "rgba(230,245,255,0.3)",
  },
};
