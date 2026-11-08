import Phaser from "phaser";
import type { Order, Pos, Unit } from "../../engine/types";
import { FACTIONS } from "../art/unitArt";

/** One unit's sprites plus the cell it last stood on. */
export interface Token {
  unit: Unit;
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  bob: Phaser.Tweens.Tween;
  glow: Phaser.FX.Glow | null;
  r: number;
  c: number;
}

/** One hop of an order animation. */
export interface Leg {
  to: Pos;
  duration: number;
  arc: number;
  capture: boolean;
}

/** A fractional board position being tweened, with its arc height. */
export interface Proxy {
  r: number;
  c: number;
  lift: number;
}

export const factionTint = (owner: 0 | 1): number => Phaser.Display.Color.HexStringToColor(FACTIONS[owner].css).color;

const ARCS: Record<string, number> = { step: 10, jump: 70, flip: 80 };

export const legsOf = (order: Order): Leg[] => {
  const isCapture = (p: Pos) => order.captures.some((c) => c[0] === p[0] && c[1] === p[1]);
  if (order.style === "slide") return order.path.map((to) => ({ to, duration: 150, arc: 6, capture: isCapture(to) }));
  if (order.style === "joust") {
    return [
      { to: order.path[0], duration: 220, arc: 40, capture: isCapture(order.path[0]) },
      { to: order.to, duration: 220, arc: 30, capture: isCapture(order.to) },
    ];
  }
  return [{ to: order.to, duration: order.style === "step" ? 260 : 560, arc: ARCS[order.style], capture: isCapture(order.to) }];
};
