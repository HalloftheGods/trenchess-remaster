import { TILE_H, TILE_W } from "../../iso";
import { ellipse } from "../canvas";
import { CX, CY } from "./geometry";
import type { WorldRecipe } from "./recipe";
import { cactus, peak, pine, reeds, roundTree, skull } from "./shapes";
import { blades, cracks, dunes, litter, ripples } from "./surfaces";
import { canopyTop, dunesTop, grassTop, peaksTop, waterTop } from "./tops";

/** The original Trenchess diorama: temperate woods, reedy swamps, snow-capped peaks and dunes. */
export const CLASSIC: WorldRecipe = {
  tiles: {
    flat: { top: "#8cbc52", side: "#7a5a3a", speck: "#a5cc68" },
    forest: { top: "#4f7f36", side: "#6b4e32", speck: "#6e9c45" },
    swamp: { top: "#3f6e66", side: "#4d4a35", speck: "#5f8f7c" },
    mountain: { top: "#9a8f7e", side: "#6e655a", speck: "#b7ad9b" },
    desert: { top: "#e6c47c", side: "#b98a4c", speck: "#f3dca2" },
  },
  tops: {
    flat: { light: "#a4d36a", dark: "#6f9d44", detail: "#86b552", shadow: "#587f36" },
    forest: { light: "#5f9448", dark: "#3f6b30", detail: "#2f5a26", shadow: "#20401a" },
    swamp: { light: "#4f8a80", dark: "#365f5a", detail: "#9fd8c8", shadow: "#243f3c" },
    mountain: { light: "#aba093", dark: "#827769", detail: "#f3f4f7", shadow: "#4f463d" },
    desert: { light: "#f0d08c", dark: "#cfa85e", detail: "#f9e6b4", shadow: "#a8803e" },
  },
  surface: {
    flat: blades("rgba(40,70,20,0.35)"),
    forest: litter(["#c58a3a", "#8f6a2a"]),
    swamp: ripples("rgba(200,240,220,0.35)", "#5d9a48", "#f1a7c8"),
    mountain: cracks("rgba(60,50,40,0.45)"),
    desert: dunes("rgba(160,110,50,0.4)"),
  },
  topDetail: {
    flat: grassTop(),
    forest: canopyTop(["#3f7f3a", "#4a8d3f", "#58a046"]),
    swamp: waterTop({ ring: "rgba(190,240,225,0.4)", pad: "#5d9a48", flower: "#f1a7c8", specks: ["#7c9a3e", "#5f7d30"] }),
    mountain: peaksTop(),
    desert: dunesTop(),
  },
  back: {
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
  },
  front: {
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
  },
  sky: {
    stops: [
      [0, "#05070f"],
      [0.3, "#111a3a"],
      [0.5, "#2c2d5c"],
      [0.64, "#6a4c6c"],
      [0.78, "#c47a58"],
      [0.9, "#eab176"],
      [1, "#f6d4a0"],
    ],
    sun: { x: 0.27, y: 0.86, glow: "#ffd696", core: "#fffae6", spread: 0.42 },
    haze: "rgba(255,225,190,0.18)",
    stars: 90,
    starColor: "#ffffff",
    peaks: ["rgba(120,104,150,0.45)", "rgba(84,72,118,0.7)", "rgba(52,44,80,0.95)", "#f0be96"],
    ground: [0x2a2126, 0x05060a],
    glow: 0xf0b070,
    aurora: null,
  },
  plinth: {
    lit: "#8e8475",
    dim: "#5c5247",
    sideLeft: "#3f372f",
    sideRight: "#564c42",
    rosette: "#7c7264",
    groove: "rgba(20,14,8,0.55)",
    ridge: "rgba(255,240,215,0.22)",
  },
};
