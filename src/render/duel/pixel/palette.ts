import type { Faction } from "../../art/unitArt";

/**
 * The duel's pixel palette. Every sprite grid is a list of strings, one character per pixel,
 * drawn from this legend. Faction colours (L B D N) and the glow `e` come from the army's
 * colours, so one grid serves both sides and every colour theme.
 *
 *   .  transparent
 *   o  outline (near-black plum)
 *   L B D N   army ramp: light, base, shade, deep
 *   W  white highlight     M m k  steel: light, mid, dark
 *   Y y g     gold: light, mid, dark
 *   s S       skin, skin shade      h H  hair light, hair dark
 *   w r       wood/leather light, dark
 *   c C q     steed coat light, mid, dark     Q  mane/tail
 *   X x       white cloth, cloth shade (robes, mitre)
 *   G         holy glow (pale gold)              e  eye/visor glow (army light)
 *   R         red gem / accent                   U  blue gem / accent
 *   z         ground shadow (drawn translucent)
 */
export type Palette = Record<string, string>;

export const BASE: Palette = {
  o: "#140c1c",
  W: "#ffffff",
  M: "#c8ccd8",
  m: "#868ca2",
  k: "#4a4e62",
  Y: "#fff08a",
  y: "#f0b42c",
  g: "#a0641c",
  s: "#f6c8a0",
  S: "#c88a62",
  h: "#9a5c30",
  H: "#52301a",
  w: "#b07a40",
  r: "#5e3618",
  c: "#b8b4c4",
  C: "#7e7a90",
  q: "#46425a",
  Q: "#2a2636",
  X: "#f4f0e2",
  x: "#b4ac9c",
  G: "#fff6c4",
  R: "#e83c46",
  U: "#3cb4f0",
  z: "rgba(10,6,20,0.35)",
};

const hexRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const mix = (a: string, b: string, t: number): string => {
  const [r0, g0, b0] = hexRgb(a);
  const [r1, g1, b1] = hexRgb(b);
  const c = (x: number, y: number): string => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${c(r0, r1)}${c(g0, g1)}${c(b0, b1)}`;
};

/** The full palette for one army: the shared colours plus its ramp, and any per-sheet overrides. */
export const armyPalette = (f: Faction, overrides: Palette = {}): Palette => ({
  ...BASE,
  L: f.light,
  B: f.base,
  D: mix(f.base, f.dark, 0.55),
  N: f.dark,
  e: f.light,
  ...overrides,
});
