import Phaser from "phaser";
import type { Unit, UnitType } from "../../engine/types";
import { addPainted, shade } from "../art/canvas";
import { FACTIONS, theme, type Faction } from "../art/unitArt";

/**
 * The duel fighters are cut-out puppets: every limb, the weapon, the cape and the steed are
 * painted once as separate canvas textures in rig units, then hinged together in DuelRig.
 * Textures are painted at RES pixels per unit so they stay smooth at full-screen size.
 */
export const RES = 4;

type G = CanvasRenderingContext2D;
type Fill = string | CanvasGradient;

export type Helm = "crown" | "tiara" | "keep" | "mitre" | "plume" | "nimbus";
export type Weapon = "greatsword" | "rapier" | "hammer" | "staff" | "lance" | "spear";
export type Offhand = "none" | "tower" | "buckler";

export interface Kit {
  /** Overall size relative to a 100-unit-tall footman. */
  scale: number;
  /** Legs on the steed: 0 fights on foot. */
  mount: 0 | 4 | 8;
  helm: Helm;
  weapon: Weapon;
  offhand: Offhand;
  cape: boolean;
  robe: boolean;
  bulk: number;
  /** Polearm holders thrust; everyone else swings. */
  thrusts: boolean;
  /** Steed coat light / base / dark, and mane. */
  coat?: [string, string, string, string];
}

export const KITS: Record<UnitType, Kit> = {
  king: { scale: 1.08, mount: 0, helm: "crown", weapon: "greatsword", offhand: "none", cape: true, robe: false, bulk: 1.12, thrusts: false },
  queen: { scale: 0.95, mount: 8, helm: "tiara", weapon: "rapier", offhand: "none", cape: true, robe: false, bulk: 0.9, thrusts: false, coat: ["#ffffff", "#e9e4f3", "#9a90b4", "#f4e2a8"] },
  rook: { scale: 1.16, mount: 0, helm: "keep", weapon: "hammer", offhand: "tower", cape: false, robe: false, bulk: 1.36, thrusts: false },
  bishop: { scale: 1, mount: 0, helm: "mitre", weapon: "staff", offhand: "none", cape: false, robe: true, bulk: 0.96, thrusts: false },
  knight: { scale: 0.95, mount: 4, helm: "plume", weapon: "lance", offhand: "buckler", cape: true, robe: false, bulk: 1, thrusts: true, coat: ["#6c6680", "#3a3546", "#15121c", "#0c0a12"] },
  pawn: { scale: 0.88, mount: 0, helm: "nimbus", weapon: "spear", offhand: "buckler", cape: false, robe: false, bulk: 0.9, thrusts: true },
};

export type PartId = "legF" | "legB" | "torso" | "head" | "armF" | "armB" | "weapon" | "offhand" | "cape" | "steed" | "sLegF" | "sLegB" | "neck" | "tail";

/** Size and hinge of a part, in rig units. */
export interface PartSpec {
  w: number;
  h: number;
  ox: number;
  oy: number;
}

const WEAPON_SPECS: Record<Weapon, PartSpec> = {
  greatsword: { w: 14, h: 82, ox: 7, oy: 9 },
  rapier: { w: 16, h: 74, ox: 8, oy: 11 },
  hammer: { w: 32, h: 66, ox: 16, oy: 8 },
  staff: { w: 20, h: 88, ox: 10, oy: 22 },
  lance: { w: 16, h: 116, ox: 8, oy: 20 },
  spear: { w: 12, h: 80, ox: 6, oy: 24 },
};

const OFFHAND_SPECS: Record<Offhand, PartSpec> = {
  none: { w: 1, h: 1, ox: 0, oy: 0 },
  tower: { w: 30, h: 48, ox: 15, oy: 16 },
  buckler: { w: 20, h: 20, ox: 10, oy: 10 },
};

export const partSpec = (part: PartId, kit: Kit): PartSpec => {
  const fixed: Record<Exclude<PartId, "weapon" | "offhand">, PartSpec> = {
    legF: { w: 16, h: 48, ox: 8, oy: 3 },
    legB: { w: 16, h: 48, ox: 8, oy: 3 },
    torso: { w: 40, h: 48, ox: 20, oy: 44 },
    head: { w: 36, h: 44, ox: 17, oy: 41 },
    armF: { w: 16, h: 34, ox: 8, oy: 4 },
    armB: { w: 16, h: 34, ox: 8, oy: 4 },
    cape: { w: 32, h: 60, ox: 26, oy: 3 },
    steed: { w: 88, h: 46, ox: 44, oy: 23 },
    sLegF: { w: 12, h: 44, ox: 6, oy: 2 },
    sLegB: { w: 12, h: 44, ox: 6, oy: 2 },
    neck: { w: 46, h: 56, ox: 9, oy: 47 },
    tail: { w: 28, h: 42, ox: 24, oy: 4 },
  };
  if (part === "weapon") return WEAPON_SPECS[kit.weapon];
  if (part === "offhand") return OFFHAND_SPECS[kit.offhand];
  return fixed[part];
};

export const partKey = (unit: Unit, part: PartId): string => `drig-${theme.palette}-${unit.owner}-${unit.type}-${part}`;

const INK = "rgba(16,10,26,0.92)";
const METAL = ["#ffffff", "#d3d7e0", "#8c919e", "#4e5260"];
const DARK_METAL = ["#a6a2b8", "#5a566a", "#2c2a36", "#141219"];
const GOLD = ["#fff6c4", "#f2c94c", "#b0841c", "#5a3e08"];
const LEATHER = ["#8a5e3c", "#5e3c24", "#34200f"];
const WOOD = ["#b07c48", "#7a4e26", "#432810"];
const SKIN = "#efc29a";
const SKIN_SHADE = "#c98f66";

const hgrad = (g: G, x0: number, x1: number, stops: string[]): CanvasGradient => {
  const grad = g.createLinearGradient(x0, 0, x1, 0);
  stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
  return grad;
};

const vgrad = (g: G, y0: number, y1: number, stops: string[]): CanvasGradient => {
  const grad = g.createLinearGradient(0, y0, 0, y1);
  stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
  return grad;
};

const finish = (g: G, fill: Fill, lw: number): void => {
  g.fillStyle = fill;
  g.fill();
  if (lw <= 0) return;
  g.strokeStyle = INK;
  g.lineWidth = lw;
  g.lineJoin = "round";
  g.stroke();
};

const poly = (g: G, pts: number[], fill: Fill, lw = 0.7): void => {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  finish(g, fill, lw);
};

const rrect = (g: G, x: number, y: number, w: number, h: number, r: number, fill: Fill, lw = 0.7): void => {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  finish(g, fill, lw);
};

const circ = (g: G, x: number, y: number, r: number, fill: Fill, lw = 0.7): void => {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  finish(g, fill, lw);
};

const ell = (g: G, x: number, y: number, rx: number, ry: number, fill: Fill, lw = 0.7): void => {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  finish(g, fill, lw);
};

const curve = (g: G, pts: number[], color: string, width: number): void => {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i + 3 < pts.length; i += 4) g.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = "round";
  g.stroke();
};

/** A soft specular streak along the lit edge. */
const gleam = (g: G, x0: number, y0: number, x1: number, y1: number, width = 1.1): void => {
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.lineWidth = width;
  g.lineCap = "round";
  g.stroke();
};

const cloth = (g: G, f: Faction, x0: number, x1: number): CanvasGradient => hgrad(g, x0, x1, [f.light, f.base, f.base, f.dark]);

/** Darkens everything painted so far: the far limbs sit in shadow. */
const dim = (g: G, w: number, h: number, a: number): void => {
  g.save();
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = `rgba(8,6,20,${a})`;
  g.fillRect(0, 0, w, h);
  g.restore();
};

const leg = (g: G, f: Faction, kit: Kit): void => {
  if (kit.robe) {
    poly(g, [2, 0, 14, 0, 15.5, 40, 0.5, 40], cloth(g, f, 0, 16));
    rrect(g, 0.5, 37, 15, 3.5, 1, hgrad(g, 0, 16, GOLD), 0.5);
    poly(g, [3, 40.5, 12, 40.5, 15.5, 44, 15.5, 47, 3, 47], hgrad(g, 3, 16, LEATHER));
    return;
  }
  rrect(g, 3, 0, 10, 25, 4, cloth(g, f, 3, 13));
  rrect(g, 3.6, 22, 8.8, 19, 3, hgrad(g, 3.6, 12.4, METAL));
  gleam(g, 5.4, 25, 5.2, 38);
  circ(g, 8, 23.5, 4.2, hgrad(g, 3.8, 12.2, METAL));
  poly(g, [2.6, 39, 11.5, 39, 15.4, 43, 15.4, 47, 2.6, 47], hgrad(g, 2.6, 15.4, LEATHER));
  rrect(g, 2.6, 45.2, 12.8, 1.8, 0.6, "#1c120a", 0);
};

const torso = (g: G, f: Faction, kit: Kit): void => {
  const b = kit.bulk;
  const x = (d: number): number => 20 + d * b;
  if (kit.robe) {
    poly(g, [x(-9), 26, x(9), 26, x(13), 47, x(-13), 47], cloth(g, f, x(-13), x(13)));
    poly(g, [x(-9), 44, x(9), 44, x(10), 12, x(6), 6, x(-6), 6, x(-10), 12], cloth(g, f, x(-10), x(10)));
    poly(g, [x(-2.6), 6, x(2.6), 6, x(3), 47, x(-3), 47], hgrad(g, x(-3), x(3), GOLD), 0.5);
    poly(g, [x(-1), 16, x(1), 16, x(1), 20, x(4), 20, x(4), 22, x(1), 22, x(1), 30, x(-1), 30, x(-1), 22, x(-4), 22, x(-4), 20, x(-1), 20], "#fffbe8", 0.4);
    rrect(g, x(-10), 33, 20 * b, 4, 2, hgrad(g, x(-10), x(10), LEATHER), 0.5);
    return;
  }
  const plate = kit.helm === "plume" ? DARK_METAL : METAL;
  poly(g, [x(-8.5), 41, x(8.5), 41, x(11.5), 13, x(6.5), 6, x(-6.5), 6, x(-11.5), 13], hgrad(g, x(-11.5), x(11.5), plate));
  gleam(g, x(-8), 14, x(-6.5), 34, 1.4);
  poly(g, [x(-5.5), 11, x(5.5), 11, x(4.8), 47, x(0), 44.5, x(-4.8), 47], cloth(g, f, x(-5.5), x(5.5)), 0.6);
  poly(g, [x(-5.5), 11, x(5.5), 11, x(5.3), 13, x(-5.3), 13], f.trim, 0);
  poly(g, [x(0), 18, x(3), 23, x(0), 28, x(-3), 23], hgrad(g, x(-3), x(3), GOLD), 0.5);
  rrect(g, x(-9.5), 36, 19 * b, 5, 2, hgrad(g, x(-9.5), x(9.5), LEATHER), 0.5);
  rrect(g, x(-2), 36.4, 4, 4.2, 1, hgrad(g, x(-2), x(2), GOLD), 0.4);
};

const face = (g: G, cx: number, cy: number, r: number): void => {
  circ(g, cx, cy, r, hgrad(g, cx - r, cx + r, [SKIN, SKIN, SKIN_SHADE]));
  circ(g, cx + r * 0.52, cy - r * 0.08, r * 0.15, "#1b1020", 0);
  curve(g, [cx + r * 0.25, cy - r * 0.42, cx + r * 0.5, cy - r * 0.55, cx + r * 0.78, cy - r * 0.4], "#4a2a1a", 0.8);
  curve(g, [cx + r * 0.42, cy + r * 0.48, cx + r * 0.62, cy + r * 0.56, cx + r * 0.78, cy + r * 0.42], "#8a4a3a", 0.6);
};

const HELMS: Record<Helm, (g: G, f: Faction) => void> = {
  crown: (g, f) => {
    poly(g, [10, 30, 6, 38, 18, 41, 22, 36], hgrad(g, 6, 22, [shade(f.trim, -0.1), shade(f.trim, -0.35)]), 0.6);
    face(g, 18, 27, 9);
    poly(g, [12, 32, 18, 39, 26, 33, 25, 30, 18, 34, 13, 29], "#e8e0d0", 0.5);
    poly(g, [8.5, 21, 8.5, 9, 12.5, 14, 17, 5, 21.5, 14, 26, 9, 26, 21], hgrad(g, 8.5, 26, GOLD));
    circ(g, 17, 16, 2.2, f.light, 0.5);
    circ(g, 11, 17.5, 1.3, "#ff5a6a", 0.4);
    circ(g, 23.5, 17.5, 1.3, "#5ad6ff", 0.4);
    gleam(g, 10.2, 19, 10.2, 12);
  },
  tiara: (g, f) => {
    curve(g, [16, 16, 4, 20, 6, 36, 7, 41, 12, 42], "#f4dc9a", 7);
    curve(g, [16, 16, 4, 20, 6, 36, 7, 41, 12, 42], "rgba(120,80,20,0.35)", 1);
    face(g, 19, 27, 8.4);
    curve(g, [11, 22, 16, 15, 26, 21], "#f4dc9a", 5);
    poly(g, [11, 19, 15, 13, 18, 16, 21, 10, 24, 16, 26, 19, 18, 18], hgrad(g, 11, 26, GOLD), 0.5);
    circ(g, 21, 13.5, 1.6, f.light, 0.4);
  },
  keep: (g, f) => {
    rrect(g, 5, 10, 25, 30, 5, hgrad(g, 5, 30, METAL), 0.8);
    poly(g, [5, 13, 5, 5, 10, 5, 10, 9, 15, 9, 15, 5, 20, 5, 20, 9, 25, 9, 25, 5, 30, 5, 30, 13], hgrad(g, 5, 30, METAL), 0.8);
    rrect(g, 15, 22, 15.5, 3.4, 1, "#0d0a14", 0);
    rrect(g, 21, 22.6, 7, 1.6, 0.8, f.light, 0);
    [28, 31, 34].forEach((y) => circ(g, 26, y, 0.8, "#1a1622", 0));
    poly(g, [16, 13, 18, 13, 18, 39, 16, 39], f.base, 0.4);
    gleam(g, 8, 14, 8, 34, 1.6);
  },
  mitre: (g, f) => {
    poly(g, [7, 40, 6, 22, 12, 15, 26, 15, 31, 24, 30, 40], cloth(g, f, 6, 31));
    face(g, 21, 28, 7.6);
    poly(g, [10, 18, 12, 4, 18, 0.5, 25, 4, 28, 18], hgrad(g, 10, 28, ["#fffdf2", "#efe6c8", "#b8ab84"]));
    poly(g, [17.5, 1.5, 19.5, 1.5, 19.5, 17.5, 17.5, 17.5], hgrad(g, 17, 20, GOLD), 0.3);
    poly(g, [14.5, 8, 22.5, 8, 22.5, 10, 14.5, 10], hgrad(g, 14, 23, GOLD), 0.3);
    rrect(g, 9.5, 15.5, 19, 3, 1.4, hgrad(g, 9, 29, GOLD), 0.5);
  },
  plume: (g, f) => {
    curve(g, [16, 12, 6, 6, 2, 16, -1, 24, 4, 30], f.base, 6);
    curve(g, [16, 12, 6, 6, 2, 16, -1, 24, 4, 30], f.light, 2);
    rrect(g, 6, 11, 24, 29, 9, hgrad(g, 6, 30, DARK_METAL), 0.8);
    poly(g, [15, 22, 31, 21, 31, 25, 15, 26], "#05040a", 0);
    poly(g, [20, 22.4, 30, 22, 30, 23.8, 20, 24.2], f.light, 0);
    poly(g, [17, 11, 19, 11, 19, 39, 17, 39], shade(f.dark, -0.1), 0.3);
    gleam(g, 9, 16, 9, 34, 1.4);
  },
  nimbus: (g, f) => {
    face(g, 18, 28, 8.6);
    poly(g, [4, 22, 32, 22, 27, 18, 25, 11, 11, 11, 9, 18], hgrad(g, 4, 32, METAL), 0.7);
    rrect(g, 3, 20.6, 30, 3, 1.4, cloth(g, f, 3, 33), 0.5);
    [[13, 8, 4], [18, 6, 5], [23, 8, 4]].forEach(([x, y, r]) => circ(g, x, y, r, "#ffffff", 0.5));
    circ(g, 18, 7.5, 3, "#eef6ff", 0);
  },
};

const head = (g: G, f: Faction, kit: Kit): void => {
  rrect(g, 13.5, 33, 8, 9, 2, hgrad(g, 13, 22, kit.helm === "plume" ? DARK_METAL : METAL), 0.6);
  HELMS[kit.helm](g, f);
};

const arm = (g: G, f: Faction, kit: Kit): void => {
  const plate = kit.helm === "plume" ? DARK_METAL : METAL;
  if (kit.robe) {
    poly(g, [3, 2, 13, 2, 14.5, 26, 1.5, 26], cloth(g, f, 1.5, 14.5));
    rrect(g, 1.5, 23, 13, 3.4, 1.2, hgrad(g, 1, 15, GOLD), 0.5);
    circ(g, 8, 29.5, 3.6, SKIN);
    return;
  }
  const r = 6.2 * Math.min(kit.bulk, 1.25);
  rrect(g, 4.6, 6, 6.8, 14, 3, hgrad(g, 4.6, 11.4, plate));
  rrect(g, 4, 18, 8, 10.5, 3, hgrad(g, 4, 12, plate));
  gleam(g, 5.8, 19.5, 5.8, 27);
  circ(g, 8, 30, 3.8, hgrad(g, 4, 12, LEATHER));
  g.beginPath();
  g.arc(8, 6.2, r, Math.PI * 0.95, Math.PI * 2.05);
  g.closePath();
  finish(g, cloth(g, f, 8 - r, 8 + r), 0.7);
  rrect(g, 8 - r, 5.6, r * 2, 2, 1, f.trim, 0.4);
};

const WEAPONS: Record<Weapon, (g: G, f: Faction) => void> = {
  greatsword: (g) => {
    circ(g, 7, 3, 2.6, hgrad(g, 4, 10, GOLD));
    rrect(g, 5.4, 4.8, 3.2, 9, 1, hgrad(g, 5, 9, LEATHER));
    poly(g, [0.6, 13.2, 13.4, 13.2, 12.6, 16.4, 1.4, 16.4], hgrad(g, 0, 14, GOLD));
    poly(g, [3.8, 16.4, 10.2, 16.4, 9.6, 73, 7, 81, 4.4, 73], hgrad(g, 3.8, 10.2, METAL));
    gleam(g, 5.4, 19, 5.4, 70, 0.9);
    curve(g, [7, 19, 7, 40, 7, 64], "rgba(70,80,104,0.55)", 0.8);
  },
  rapier: (g, f) => {
    circ(g, 8, 2.6, 2.4, hgrad(g, 5, 11, GOLD));
    rrect(g, 6.6, 4, 2.8, 7.6, 1, hgrad(g, 6, 10, LEATHER));
    g.beginPath();
    g.ellipse(8, 11.5, 6.2, 4.4, 0, Math.PI, Math.PI * 2);
    g.strokeStyle = GOLD[2];
    g.lineWidth = 1.6;
    g.stroke();
    poly(g, [2, 11, 14, 11, 13, 13.6, 3, 13.6], hgrad(g, 2, 14, GOLD), 0.5);
    circ(g, 8, 12.3, 1.5, f.light, 0.3);
    poly(g, [6.9, 13.6, 9.1, 13.6, 8.7, 70, 8, 73.5, 7.3, 70], hgrad(g, 6.8, 9.2, METAL), 0.5);
  },
  hammer: (g, f) => {
    rrect(g, 14.4, 0, 3.2, 52, 1.4, hgrad(g, 14, 18, WOOD));
    [8, 20, 32].forEach((y) => rrect(g, 13.8, y, 4.4, 2.4, 0.8, hgrad(g, 13, 19, LEATHER), 0.4));
    rrect(g, 2, 47, 28, 16, 2.4, hgrad(g, 2, 30, METAL), 0.8);
    rrect(g, 13.4, 46, 5.2, 18, 1, cloth(g, f, 13, 19), 0.5);
    poly(g, [2, 50, -0.5, 55, 2, 60], hgrad(g, -1, 3, METAL), 0.5);
    poly(g, [30, 50, 32.5, 55, 30, 60], hgrad(g, 29, 33, METAL), 0.5);
    gleam(g, 4, 50, 4, 60, 1.4);
  },
  staff: (g, f) => {
    rrect(g, 8.8, 0, 2.4, 74, 1.1, hgrad(g, 8.5, 11.5, WOOD), 0.5);
    rrect(g, 8.2, 0, 3.6, 3, 1, hgrad(g, 8, 12, GOLD), 0.4);
    rrect(g, 8.2, 62, 3.6, 4, 1, hgrad(g, 8, 12, GOLD), 0.4);
    const glow = g.createRadialGradient(10, 79, 0, 10, 79, 10);
    glow.addColorStop(0, "rgba(255,255,230,0.95)");
    glow.addColorStop(0.45, "rgba(255,226,140,0.55)");
    glow.addColorStop(1, "rgba(255,210,120,0)");
    g.fillStyle = glow;
    g.fillRect(0, 68, 20, 20);
    g.beginPath();
    g.ellipse(10, 78, 6.8, 7.4, 0, 0, Math.PI * 2);
    g.strokeStyle = GOLD[2];
    g.lineWidth = 1.6;
    g.stroke();
    circ(g, 10, 78, 4, hgrad(g, 6, 14, ["#ffffff", "#fff2b8", f.light]), 0.5);
  },
  lance: (g, f) => {
    rrect(g, 6.4, 0, 3.2, 21, 1, hgrad(g, 6, 10, LEATHER));
    poly(g, [0.6, 21, 15.4, 21, 10.6, 30, 5.4, 30], hgrad(g, 0, 16, DARK_METAL));
    poly(g, [5.2, 30, 10.8, 30, 8.6, 114, 7.4, 114], cloth(g, f, 5, 11));
    for (let y = 36; y < 104; y += 12) {
      const t = (y - 30) / 84;
      const hw = 2.8 * (1 - t) + 0.6;
      poly(g, [8 - hw, y, 8 + hw, y - 2, 8 + hw, y + 2.5, 8 - hw, y + 4.5], f.trim, 0);
    }
    poly(g, [8.4, 74, 15.5, 80, 8.4, 86], cloth(g, f, 8, 16), 0.5);
    gleam(g, 6.6, 32, 7.8, 100, 0.7);
  },
  spear: (g, f) => {
    rrect(g, 5, 0, 2, 64, 1, hgrad(g, 4.5, 7.5, WOOD), 0.4);
    rrect(g, 4.4, 59, 3.2, 3, 0.8, hgrad(g, 4, 8, GOLD), 0.4);
    poly(g, [6, 62, 9.6, 69, 6, 79.5, 2.4, 69], hgrad(g, 2.4, 9.6, METAL), 0.6);
    gleam(g, 4.2, 69, 6, 63, 0.7);
    curve(g, [6, 58, 9, 60, 10, 64], f.base, 2);
    curve(g, [6, 58, 8, 61, 8, 66], f.light, 1.2);
  },
};

const OFFHANDS: Record<Offhand, (g: G, f: Faction) => void> = {
  none: () => undefined,
  tower: (g, f) => {
    poly(g, [1, 8, 1, 2, 7, 2, 7, 5, 12, 5, 12, 2, 18, 2, 18, 5, 23, 5, 23, 2, 29, 2, 29, 8, 29, 38, 15, 47, 1, 38], cloth(g, f, 1, 29), 0.9);
    poly(g, [3.5, 9, 26.5, 9, 26.5, 36.5, 15, 44, 3.5, 36.5], "rgba(0,0,0,0)", 0);
    g.strokeStyle = f.trim;
    g.lineWidth = 1.6;
    g.stroke();
    poly(g, [10, 32, 10, 18, 12.5, 18, 12.5, 16, 14, 16, 14, 18, 16, 18, 16, 16, 17.5, 16, 17.5, 18, 20, 18, 20, 32], f.trim, 0.5);
    rrect(g, 13.4, 26, 3.2, 6, 1.5, f.dark, 0);
    gleam(g, 4, 10, 4, 34, 1.6);
  },
  buckler: (g, f) => {
    circ(g, 10, 10, 9, hgrad(g, 1, 19, METAL), 0.8);
    circ(g, 10, 10, 7, cloth(g, f, 3, 17), 0.5);
    circ(g, 10, 10, 2.6, hgrad(g, 7, 13, GOLD), 0.5);
    gleam(g, 5, 6, 4, 12, 1.2);
  },
};

const cape = (g: G, f: Faction): void => {
  g.beginPath();
  g.moveTo(26, 2);
  g.quadraticCurveTo(31, 4, 30, 9);
  g.quadraticCurveTo(26, 34, 22, 58);
  g.quadraticCurveTo(12, 54, 2, 57);
  g.quadraticCurveTo(10, 30, 18, 4);
  g.closePath();
  finish(g, vgrad(g, 0, 58, [f.base, f.dark, shade(f.dark, -0.12)]), 0.8);
  curve(g, [2, 56, 12, 53, 22, 57], f.trim, 1.6);
  curve(g, [18, 10, 14, 30, 10, 52], "rgba(0,0,0,0.22)", 1.4);
};

const coatGrad = (g: G, y0: number, y1: number, coat: string[]): CanvasGradient => vgrad(g, y0, y1, [coat[0], coat[1], coat[2]]);

const steed = (g: G, f: Faction, kit: Kit): void => {
  const coat = kit.coat!;
  ell(g, 44, 21, 34, 14.5, coatGrad(g, 6, 36, coat), 0.9);
  ell(g, 70, 19, 12, 13.5, coatGrad(g, 6, 34, coat), 0);
  ell(g, 17, 18, 14, 13.5, coatGrad(g, 4, 32, coat), 0);
  g.beginPath();
  g.moveTo(10, 20);
  g.quadraticCurveTo(44, 26, 80, 18);
  g.lineTo(78, 34);
  for (let x = 78; x > 12; x -= 6) g.quadraticCurveTo(x - 3, 40, x - 6, 35);
  g.closePath();
  finish(g, cloth(g, f, 10, 80), 0.7);
  curve(g, [12, 34, 44, 38, 78, 33], f.trim, 1.6);
  poly(g, [44, 24, 48, 28, 44, 32, 40, 28], hgrad(g, 40, 48, GOLD), 0.5);
  rrect(g, 34, 3.5, 18, 7, 3, hgrad(g, 34, 52, LEATHER), 0.6);
  rrect(g, 36, 2.5, 14, 2.4, 1.2, f.trim, 0);
  gleam(g, 22, 9, 60, 8, 1.3);
};

const steedLeg = (g: G, kit: Kit): void => {
  const coat = kit.coat!;
  poly(g, [1.5, 0, 10.5, 0, 8.6, 22, 7.6, 37, 4.4, 37, 3.4, 22], hgrad(g, 1, 11, [coat[0], coat[1], coat[2]]), 0.7);
  if (kit.mount === 8) curve(g, [3.6, 33, 6, 39, 8.6, 33], "#fffaf0", 3);
  poly(g, [3.4, 37, 8.8, 37, 10.6, 43, 2.6, 43], hgrad(g, 2, 11, ["#5a4a3e", "#2a2018", "#120c08"]), 0.6);
};

const neck = (g: G, f: Faction, kit: Kit): void => {
  const coat = kit.coat!;
  poly(g, [2, 47, 18, 50, 30, 22, 22, 11, 8, 26], coatGrad(g, 10, 50, coat), 0.8);
  poly(g, [22, 9, 31, 4, 44, 17, 44.5, 23, 38, 25.5, 27, 19], coatGrad(g, 4, 26, coat), 0.8);
  poly(g, [24, 8, 25.5, 0.5, 29.5, 6], coatGrad(g, 0, 8, coat), 0.6);
  circ(g, 32, 11.5, 1.4, "#0a0610", 0);
  circ(g, 42, 21, 0.9, "#0a0610", 0);
  curve(g, [24, 8, 14, 16, 6, 32, 3, 40, 2, 46], coat[3], 5.5);
  curve(g, [24, 8, 16, 18, 9, 30], "rgba(255,255,255,0.25)", 1.2);
  curve(g, [27, 18.5, 33, 14, 38.5, 25], f.trim, 1);
  curve(g, [27, 18.5, 22, 22, 18, 30], f.trim, 1);
  if (kit.helm === "plume") poly(g, [27, 6.5, 36, 9, 44, 18, 41, 21, 30, 13], hgrad(g, 27, 44, DARK_METAL), 0.6);
  else poly(g, [27, 6.5, 31, 5, 33, 8, 29, 10], hgrad(g, 26, 34, GOLD), 0.4);
};

const tail = (g: G, kit: Kit): void => {
  const mane = kit.coat![3];
  curve(g, [24, 4, 14, 8, 10, 22, 6, 34, 2, 40], mane, 7);
  curve(g, [24, 4, 16, 10, 13, 24], "rgba(255,255,255,0.22)", 1.4);
};

const paintPart = (scene: Phaser.Scene, key: string, spec: PartSpec, draw: (g: G) => void): void => {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(spec.w * RES);
  canvas.height = Math.ceil(spec.h * RES);
  const g = canvas.getContext("2d")!;
  g.scale(RES, RES);
  draw(g);
  addPainted(scene, key, canvas);
};

/** The parts a chessman's rig is built from. */
export const rigParts = (kit: Kit): PartId[] => {
  const base: PartId[] = ["torso", "head", "armF", "armB", "weapon", "legF", "legB"];
  if (kit.offhand !== "none") base.push("offhand");
  if (kit.cape) base.push("cape");
  if (kit.mount) base.push("steed", "sLegF", "sLegB", "neck", "tail");
  return base;
};

/** Paints every part of `unit`'s rig in the current palette (idempotent). */
export const paintRig = (scene: Phaser.Scene, unit: Unit): void => {
  const f = FACTIONS[unit.owner];
  const kit = KITS[unit.type];
  const painters: Record<PartId, (g: G) => void> = {
    legF: (g) => leg(g, f, kit),
    legB: (g) => {
      leg(g, f, kit);
      dim(g, 16, 48, 0.32);
    },
    torso: (g) => torso(g, f, kit),
    head: (g) => head(g, f, kit),
    armF: (g) => arm(g, f, kit),
    armB: (g) => {
      arm(g, f, kit);
      dim(g, 16, 34, 0.3);
    },
    weapon: (g) => WEAPONS[kit.weapon](g, f),
    offhand: (g) => OFFHANDS[kit.offhand](g, f),
    cape: (g) => cape(g, f),
    steed: (g) => steed(g, f, kit),
    sLegF: (g) => steedLeg(g, kit),
    sLegB: (g) => {
      steedLeg(g, kit);
      dim(g, 12, 44, 0.38);
    },
    neck: (g) => neck(g, f, kit),
    tail: (g) => tail(g, kit),
  };
  for (const part of rigParts(kit)) paintPart(scene, partKey(unit, part), partSpec(part, kit), painters[part]);
};
