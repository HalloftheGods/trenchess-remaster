import Phaser from "phaser";
import type { PlayerId, UnitType } from "../../engine/types";
import { paint } from "./canvas";
import { LEGION } from "./legionArt";
import { UNDEAD } from "./styles/undeadArt";
import { CLOCKWORK } from "./styles/clockworkArt";
import { ORIGAMI } from "./styles/origamiArt";
import { PIXEL } from "./styles/pixelArt";
import { BEASTS } from "./styles/beastsArt";

export const UNIT_W = 64;
export const UNIT_H = 100;
export const UNIT_FOOT = 92;

export interface Faction {
  name: string;
  base: string;
  light: string;
  dark: string;
  trim: string;
  css: string;
}

export type PieceStyle = "legion" | "classic" | "crystal" | "glyph" | "undead" | "clockwork" | "origami" | "pixel" | "beasts";

export const STYLE_ORDER: PieceStyle[] = ["legion", "classic", "crystal", "glyph", "undead", "clockwork", "origami", "pixel", "beasts"];

export const STYLE_LABELS: Record<PieceStyle, string> = {
  legion: "Figurines",
  classic: "Chessmen",
  crystal: "Crystal",
  glyph: "Bold glyphs",
  undead: "Bone Legion",
  clockwork: "Clockwork",
  origami: "Origami",
  pixel: "8-bit",
  beasts: "Beasts",
};
export type PaletteId = "royal" | "ivory" | "verdant";

export const PALETTES: Record<PaletteId, Record<PlayerId, Faction>> = {
  royal: {
    0: { name: "Blue", base: "#3b7dd8", light: "#a6d4ff", dark: "#173a72", trim: "#f2c94c", css: "#5aa2ff" },
    1: { name: "Red", base: "#cf3b3b", light: "#ffb0a0", dark: "#5e1414", trim: "#f2c94c", css: "#ff5a5a" },
  },
  ivory: {
    0: { name: "White", base: "#e6dcc3", light: "#ffffff", dark: "#8c7f62", trim: "#c9a24a", css: "#f3e7c6" },
    1: { name: "Black", base: "#3d3b47", light: "#8e8ba3", dark: "#121118", trim: "#c9a24a", css: "#b3aee0" },
  },
  verdant: {
    0: { name: "Green", base: "#3aa65a", light: "#b6f5b8", dark: "#164a26", trim: "#f2e7c4", css: "#5fd47e" },
    1: { name: "Yellow", base: "#e6b820", light: "#fff0a0", dark: "#6a5208", trim: "#f2e7c4", css: "#ffd23d" },
  },
};

export const theme: { style: PieceStyle; palette: PaletteId } = { style: "legion", palette: "royal" };

export const FACTIONS: Record<PlayerId, Faction> = { ...PALETTES.royal };

export const applyTheme = (style: PieceStyle, palette: PaletteId): void => {
  theme.style = style;
  theme.palette = palette;
  FACTIONS[0] = PALETTES[palette][0];
  FACTIONS[1] = PALETTES[palette][1];
};

type Profile = [number, number][];

const BASE: Profile = [[92, 21], [86, 21], [84, 18], [80, 15]];

const PROFILES: Record<Exclude<UnitType, "knight">, Profile> = {
  pawn: [...BASE, [79, 11], [66, 6], [61, 10], [58, 6]],
  rook: [...BASE, [79, 14], [54, 10], [51, 15], [36, 15], [36, 0]],
  bishop: [...BASE, [79, 12], [60, 6], [56, 11], [53, 6]],
  queen: [...BASE, [79, 14], [56, 6], [52, 12], [48, 7], [44, 13]],
  king: [...BASE, [79, 15], [52, 7], [48, 13], [44, 8], [40, 14]],
};

const X = UNIT_W / 2;

const bodyGradient = (g: CanvasRenderingContext2D, f: Faction, half: number): CanvasGradient => {
  const grad = g.createLinearGradient(X - half, 0, X + half, 0);
  grad.addColorStop(0, f.dark);
  grad.addColorStop(0.3, f.light);
  grad.addColorStop(0.5, f.base);
  grad.addColorStop(1, f.dark);
  return grad;
};

const lathe = (g: CanvasRenderingContext2D, profile: Profile, f: Faction): void => {
  g.beginPath();
  profile.forEach(([y, w], i) => (i === 0 ? g.moveTo(X - w, y) : g.lineTo(X - w, y)));
  [...profile].reverse().forEach(([y, w]) => g.lineTo(X + w, y));
  g.closePath();
  g.fillStyle = bodyGradient(g, f, 21);
  g.fill();
  g.strokeStyle = f.dark;
  g.lineWidth = 1.5;
  g.stroke();
};

const ball = (g: CanvasRenderingContext2D, x: number, y: number, r: number, f: Faction, color?: string): void => {
  const grad = g.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
  grad.addColorStop(0, color ? "#fff6cf" : f.light);
  grad.addColorStop(1, color ?? f.base);
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = f.dark;
  g.lineWidth = 1.2;
  g.stroke();
};

const trimBand = (g: CanvasRenderingContext2D, y: number, half: number, f: Faction): void => {
  g.fillStyle = f.trim;
  g.fillRect(X - half, y - 1.5, half * 2, 3);
};

const crenels = (g: CanvasRenderingContext2D, f: Faction): void => {
  g.fillStyle = bodyGradient(g, f, 15);
  g.strokeStyle = f.dark;
  g.lineWidth = 1.2;
  for (const dx of [-15, -3, 9]) {
    g.beginPath();
    g.rect(X + dx, 28, 6, 9);
    g.fill();
    g.stroke();
  }
  g.fillStyle = f.dark;
  g.fillRect(X - 2, 42, 4, 7);
};

const mitre = (g: CanvasRenderingContext2D, f: Faction): void => {
  g.beginPath();
  g.moveTo(X, 22);
  g.bezierCurveTo(X + 16, 34, X + 12, 50, X + 6, 54);
  g.lineTo(X - 6, 54);
  g.bezierCurveTo(X - 12, 50, X - 16, 34, X, 22);
  g.fillStyle = bodyGradient(g, f, 13);
  g.fill();
  g.strokeStyle = f.dark;
  g.lineWidth = 1.4;
  g.stroke();
  g.beginPath();
  g.moveTo(X + 6, 30);
  g.lineTo(X - 2, 40);
  g.strokeStyle = f.dark;
  g.lineWidth = 2;
  g.stroke();
  ball(g, X, 20, 3.5, f, f.trim);
};

const crown = (g: CanvasRenderingContext2D, f: Faction, points: number): void => {
  g.beginPath();
  g.moveTo(X - 13, 44);
  for (let i = 0; i <= points; i++) {
    const x = X - 13 + (26 / points) * i;
    g.lineTo(x, i % 2 === 0 ? 28 : 38);
  }
  g.lineTo(X + 13, 44);
  g.closePath();
  g.fillStyle = bodyGradient(g, f, 13);
  g.fill();
  g.strokeStyle = f.dark;
  g.stroke();
  for (let i = 0; i <= points; i += 2) ball(g, X - 13 + (26 / points) * i, 27, 2.6, f, f.trim);
};

const kingTop = (g: CanvasRenderingContext2D, f: Faction): void => {
  g.beginPath();
  g.moveTo(X - 14, 40);
  g.lineTo(X - 11, 28);
  g.lineTo(X + 11, 28);
  g.lineTo(X + 14, 40);
  g.closePath();
  g.fillStyle = bodyGradient(g, f, 14);
  g.fill();
  g.strokeStyle = f.dark;
  g.stroke();
  trimBand(g, 30, 11, f);
  g.fillStyle = f.trim;
  g.strokeStyle = "#8a6a10";
  g.beginPath();
  g.rect(X - 2.5, 8, 5, 20);
  g.rect(X - 8, 13, 16, 5);
  g.fill();
  g.stroke();
};

const knightHead = (g: CanvasRenderingContext2D, f: Faction): void => {
  lathe(g, [...BASE, [79, 14], [72, 13]], f);
  g.beginPath();
  g.moveTo(X - 13, 74);
  g.bezierCurveTo(X - 15, 58, X - 12, 44, X - 4, 34);
  g.lineTo(X - 2, 24);
  g.lineTo(X + 4, 31);
  g.bezierCurveTo(X + 10, 33, X + 16, 40, X + 19, 48);
  g.lineTo(X + 17, 54);
  g.lineTo(X + 9, 53);
  g.lineTo(X + 3, 50);
  g.bezierCurveTo(X + 2, 58, X + 8, 64, X + 13, 74);
  g.closePath();
  g.fillStyle = bodyGradient(g, f, 17);
  g.fill();
  g.strokeStyle = f.dark;
  g.lineWidth = 1.5;
  g.stroke();
  g.beginPath();
  g.moveTo(X - 4, 34);
  g.bezierCurveTo(X - 12, 44, X - 14, 58, X - 10, 72);
  g.strokeStyle = f.trim;
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = f.dark;
  g.beginPath();
  g.arc(X + 6, 39, 2, 0, Math.PI * 2);
  g.fill();
};

const TOPS: Record<UnitType, (g: CanvasRenderingContext2D, f: Faction) => void> = {
  pawn: (g, f) => ball(g, X, 48, 10, f),
  rook: (g, f) => {
    crenels(g, f);
    trimBand(g, 52, 14, f);
  },
  bishop: (g, f) => mitre(g, f),
  queen: (g, f) => {
    crown(g, f, 6);
    trimBand(g, 50, 11, f);
  },
  king: (g, f) => {
    kingTop(g, f);
    trimBand(g, 46, 12, f);
  },
  knight: knightHead,
};

const drawUnit = (type: UnitType, f: Faction) => (g: CanvasRenderingContext2D) => {
  if (type !== "knight") lathe(g, PROFILES[type], f);
  TOPS[type](g, f);
  trimBand(g, 85, 20, f);
  g.globalAlpha = 0.35;
  g.fillStyle = "#ffffff";
  g.fillRect(X - 12, 60, 2, 18);
  g.globalAlpha = 1;
};

const glassify = (g: CanvasRenderingContext2D, f: Faction): void => {
  g.globalCompositeOperation = "source-atop";
  const sheen = g.createLinearGradient(0, 0, UNIT_W, UNIT_H);
  sheen.addColorStop(0, "rgba(255,255,255,0.75)");
  sheen.addColorStop(0.45, f.light);
  sheen.addColorStop(0.55, "rgba(255,255,255,0.15)");
  sheen.addColorStop(1, f.base);
  g.globalAlpha = 0.6;
  g.fillStyle = sheen;
  g.fillRect(0, 0, UNIT_W, UNIT_H);
  g.globalAlpha = 0.9;
  g.fillStyle = "#ffffff";
  g.fillRect(X - 9, 24, 2, 56);
  g.fillRect(X + 5, 40, 1, 30);
  g.globalCompositeOperation = "destination-in";
  g.globalAlpha = 0.82;
  g.fillRect(0, 0, UNIT_W, UNIT_H);
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
};

const GLYPHS: Record<UnitType, string> = { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" };

const drawGlyph = (g: CanvasRenderingContext2D, type: UnitType, f: Faction): void => {
  const disc = (y: number, color: string | CanvasGradient) => {
    g.beginPath();
    g.ellipse(X, y, 22, 8, 0, 0, Math.PI * 2);
    g.fillStyle = color;
    g.fill();
  };
  disc(90, f.dark);
  disc(86, bodyGradient(g, f, 22));
  g.beginPath();
  g.roundRect(X - 22, 20, 44, 62, 10);
  g.fillStyle = "rgba(10,10,14,0.82)";
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = f.base;
  g.stroke();
  g.font = "bold 40px 'DejaVu Sans', 'Segoe UI Symbol', 'Noto Sans Symbols2', serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.shadowColor = f.base;
  g.shadowBlur = 10;
  g.fillStyle = f.light;
  g.fillText(GLYPHS[type], X, 54);
  g.shadowBlur = 0;
};

const STYLES: Record<PieceStyle, (type: UnitType, f: Faction) => (g: CanvasRenderingContext2D) => void> = {
  classic: drawUnit,
  legion: (type, f) => (g) => LEGION[type](g, f),
  glyph: (type, f) => (g) => drawGlyph(g, type, f),
  crystal: (type, f) => (g) => {
    drawUnit(type, f)(g);
    glassify(g, f);
  },
  undead: (type, f) => (g) => UNDEAD[type](g, f),
  clockwork: (type, f) => (g) => CLOCKWORK[type](g, f),
  origami: (type, f) => (g) => ORIGAMI[type](g, f),
  pixel: (type, f) => (g) => PIXEL[type](g, f),
  beasts: (type, f) => (g) => BEASTS[type](g, f),
};

export const unitKey = (type: UnitType, owner: PlayerId): string => `unit-${theme.style}-${theme.palette}-${type}-${owner}`;

export const UNIT_TYPES: UnitType[] = ["king", "queen", "rook", "bishop", "knight", "pawn"];

export const paintUnits = (scene: Phaser.Scene): void => {
  for (const owner of [0, 1] as PlayerId[]) {
    for (const type of UNIT_TYPES) paint(scene, unitKey(type, owner), UNIT_W, UNIT_H, STYLES[theme.style](type, FACTIONS[owner]));
  }
};
