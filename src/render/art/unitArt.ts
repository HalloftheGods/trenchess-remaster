import Phaser from "phaser";
import type { PlayerId, UnitType } from "../../engine/types";
import { paint } from "./canvas";

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

export const FACTIONS: Record<PlayerId, Faction> = {
  0: { name: "Azure Legion", base: "#3b7dd8", light: "#a6d4ff", dark: "#173a72", trim: "#f2c94c", css: "#5aa2ff" },
  1: { name: "Crimson Host", base: "#cf3b3b", light: "#ffb0a0", dark: "#5e1414", trim: "#f2c94c", css: "#ff5a5a" },
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

export const unitKey = (type: UnitType, owner: PlayerId): string => `unit-${type}-${owner}`;

export const UNIT_TYPES: UnitType[] = ["king", "queen", "rook", "bishop", "knight", "pawn"];

export const paintUnits = (scene: Phaser.Scene): void => {
  for (const owner of [0, 1] as PlayerId[]) {
    for (const type of UNIT_TYPES) paint(scene, unitKey(type, owner), UNIT_W, UNIT_H, drawUnit(type, FACTIONS[owner]));
  }
};
