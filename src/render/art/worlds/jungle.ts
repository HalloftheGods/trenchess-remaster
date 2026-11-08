import { TILE_H, TILE_W } from "../../iso";
import { ellipse } from "../canvas";
import { CX, CY } from "./geometry";
import type { WorldRecipe } from "./recipe";
import { boulder, reeds, roundTree } from "./shapes";
import { steps } from "./shapesBuilt";
import { blades, cells, litter, ripples } from "./surfaces";
import { canopyTop, grassTop, waterTop } from "./tops";
import { crackedTop, stepsTop } from "./topsMore";

const TALL_REEDS: [string, string] = ["#5a9a3a", "#3a7a2a"];

/** Hanging vines from a crown. */
const vines = (g: CanvasRenderingContext2D, x: number, y: number, h: number): void => {
  g.strokeStyle = "#2a6a28";
  g.lineWidth = 1.2;
  for (let i = -1; i <= 1; i++) {
    g.beginPath();
    g.moveTo(x + i * h * 0.18, y - h * 0.6);
    g.quadraticCurveTo(x + i * h * 0.22, y - h * 0.3, x + i * h * 0.16, y - h * 0.08);
    g.stroke();
  }
};

/** A fan of fern fronds. */
const fern = (g: CanvasRenderingContext2D, x: number, y: number, hue: string): void => {
  g.strokeStyle = hue;
  g.lineWidth = 1.6;
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.15 + i * 0.175);
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x - Math.cos(a) * 6, y - Math.sin(a) * 9, x - Math.cos(a) * 11, y - Math.sin(a) * 9);
    g.stroke();
  }
};

/** Steaming jungle: lush grass, dense vine-hung canopy, lily-choked water, mossy temple steps and dry clay beds. */
export const JUNGLE: WorldRecipe = {
  tiles: {
    flat: { top: "#5aa83a", side: "#5a4a2a", speck: "#7ac850" },
    forest: { top: "#2a6a28", side: "#4a3a22", speck: "#3a8a38" },
    swamp: { top: "#3a6a3a", side: "#3a3a22", speck: "#5a9a4a" },
    mountain: { top: "#7a8a6a", side: "#4a5a42", speck: "#9aaa86" },
    desert: { top: "#c09060", side: "#8a6040", speck: "#d4ac7c" },
  },
  tops: {
    flat: { light: "#6ab848", dark: "#468a30", detail: "#8ad060", shadow: "#2e6a20" },
    forest: { light: "#3a7a34", dark: "#245a22", detail: "#1a4418", shadow: "#0e2c0e" },
    swamp: { light: "#4a7a44", dark: "#2e5a30", detail: "#a0d090", shadow: "#1a3a1c" },
    mountain: { light: "#86967a", dark: "#5e6e54", detail: "#4a8a3a", shadow: "#3a4a34" },
    desert: { light: "#cc9e6c", dark: "#a67a4c", detail: "#e0bc90", shadow: "#6a4a2c" },
  },
  surface: {
    flat: blades("rgba(20,80,20,0.4)", 8),
    forest: litter(["#1e4e1c", "#3a7a30"], 8, 3, 1.5),
    swamp: ripples("rgba(180,230,160,0.35)", "#4a9a3a", "#ffffff"),
    mountain: cells("rgba(30,50,30,0.45)"),
    desert: cells("rgba(120,70,40,0.45)"),
  },
  topDetail: {
    flat: grassTop(),
    forest: canopyTop(["#1e6a2a", "#2a7a30", "#3a9a3c"]),
    swamp: waterTop({ ring: "rgba(180,230,160,0.4)", pad: "#4a9a3a", flower: "#ffffff", specks: ["#7a9a3e", "#4a7a30"] }),
    mountain: stepsTop("#6a7a5e", "#4a8a3a"),
    desert: crackedTop("rgba(110,60,30,0.45)"),
  },
  back: {
    forest: (g, r) => {
      const h = 46 + r() * 10;
      roundTree(g, CX, CY - TILE_H * 0.3, h, "#2a7a30", "#4a3a22");
      vines(g, CX, CY - TILE_H * 0.3, h);
      roundTree(g, CX - TILE_W * 0.3, CY - 2, 34 + r() * 8, "#3a8a38", "#4a3a22");
      roundTree(g, CX + TILE_W * 0.3, CY - 1, 38 + r() * 8, "#1e6a2a", "#4a3a22");
    },
    mountain: (g, r) => {
      steps(g, CX + 2, CY - TILE_H * 0.18, 14 + r() * 3, 30 + r() * 8, "#7a8a6e", "#4a8a3a");
    },
    swamp: (g, r) => {
      reeds(g, CX, CY - TILE_H * 0.32, r, TALL_REEDS, null);
      reeds(g, CX + TILE_W * 0.33, CY - 1, r, TALL_REEDS, null);
    },
    desert: (g, r) => {
      boulder(g, CX + (r() > 0.5 ? 1 : -1) * TILE_W * 0.26, CY - 3, 8 + r() * 3, 4, "#a67a4c");
    },
  },
  front: {
    forest: (g) => {
      fern(g, CX - 6, CY + TILE_H * 0.36, "#3a9a3c");
      fern(g, CX + 10, CY + TILE_H * 0.3, "#2a7a30");
    },
    mountain: (g, r) => {
      ellipse(g, CX + 10, CY + TILE_H * 0.28, 6 + r() * 2, 3, "#4a8a3a");
    },
    swamp: (g, r) => {
      reeds(g, CX - TILE_W * 0.3, CY + 4, r, TALL_REEDS, null);
    },
    desert: (g) => {
      g.strokeStyle = "#8a6040";
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(CX + 2, CY + TILE_H * 0.3);
      g.lineTo(CX + 4, CY + TILE_H * 0.3 - 7);
      g.lineTo(CX + 8, CY + TILE_H * 0.3 - 10);
      g.moveTo(CX + 4, CY + TILE_H * 0.3 - 7);
      g.lineTo(CX, CY + TILE_H * 0.3 - 11);
      g.stroke();
    },
  },
  sky: {
    stops: [
      [0, "#0e2a18"],
      [0.3, "#1e4a2a"],
      [0.55, "#4a7a3a"],
      [0.78, "#a0a850"],
      [1, "#f0d888"],
    ],
    sun: { x: 0.3, y: 0.8, glow: "#fff0a0", core: "#ffffff", spread: 0.45 },
    haze: "rgba(240,230,170,0.4)",
    stars: 20,
    starColor: "#ffffff",
    peaks: ["rgba(60,110,70,0.5)", "rgba(40,80,50,0.75)", "rgba(20,50,30,0.95)", "#e0d090"],
    ground: [0x1e2a16, 0x04080a],
    glow: 0xe0d070,
    aurora: null,
  },
  plinth: {
    lit: "#8a8a66",
    dim: "#5a5e42",
    sideLeft: "#3a4030",
    sideRight: "#4e5440",
    rosette: "#6a7a50",
    groove: "rgba(10,25,10,0.6)",
    ridge: "rgba(230,240,200,0.22)",
  },
};
