import { outline, type Grid } from "./sheet";
import type { Palette } from "./palette";

/**
 * Pixel effect animations. Legend: W white, L light grey, D grey (W/L/D take the tint the game
 * gives them, so one spark serves gold, white or army colours), plus fixed colours
 * Y pale yellow, O orange, R red, G holy glow, B ice blue, o outline. '.' is transparent.
 */
export const FX_PALETTE: Palette = {
  W: "#ffffff",
  L: "#c4c4d0",
  D: "#7c7c8c",
  Y: "#fff08a",
  O: "#f89c30",
  R: "#e83c46",
  G: "#fff6c4",
  B: "#9cd8ff",
  o: "#140c1c",
};

export interface FxSheet {
  w: number;
  h: number;
  frames: Grid[];
}

/**
 *   spark   ~9x9, 4 frames: a hit spark bursting and fading
 *   slash   ~40x40, 3 frames: a crescent sword trail sweeping top-right to bottom (facing right)
 *   impact  ~32x32, 3 frames: the big hit burst (star of rays, then broken ring)
 *   dust    ~14x10, 4 frames: a puff of ground dust swelling and thinning
 *   glint   ~11x11, 2 frames: a four-point twinkle on a weapon
 *   ring    ~64x14, 3 frames: a flattened ground shockwave ellipse expanding
 *   shard   ~5x5, 2 frames: a tumbling fragment
 *   pillar  ~16x56, 3 frames: a stone spike erupting from the ground (grows, full, cracked)
 *   fence   18x26, 1 frame: one show-jumping bar (striped pole between two capped posts)
 *   rune    ~88x18, 2 frames: a flattened glowing diamond-in-circle rune on the ground
 *   cloud   ~16x10, 3 frames: a little white nimbus puff (the Nimbus Jumper's landing)
 *   beam    ~24x8, 1 frame: one horizontal slice of a vertical light beam (tiled downward)
 */
export type FxId = "spark" | "slash" | "impact" | "dust" | "glint" | "ring" | "shard" | "pillar" | "fence" | "rune" | "cloud" | "beam";


// ---------------------------------------------------------------------------------------------
// Helpers. Effects are authored either as literal grids (small, hand-placed pixels) or drawn
// pixel-exact by a shape function sampled at pixel centres, then cleaned of stray pixels.
// ---------------------------------------------------------------------------------------------

const G = (s: string): Grid => s.trim().split(/\s+/);

/** Builds a w x h grid from a per-pixel function (sampled at the pixel's centre). */
const paint = (w: number, h: number, fn: (x: number, y: number) => string): Grid =>
  Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => fn(x + 0.5, y + 0.5) || ".").join(""));

/** Removes lone pixels with no 4-neighbour (noise from sampling). */
const despeckle = (g: Grid, keep = ""): Grid =>
  g.map((row, y) =>
    row
      .split("")
      .map((ch, x) => {
        if (ch === "." || keep.includes(ch)) return ch;
        const n = [g[y][x - 1], g[y][x + 1], g[y - 1]?.[x], g[y + 1]?.[x]].filter((c) => c && c !== ".").length;
        return n === 0 ? "." : ch;
      })
      .join(""),
  );

/** Fills one-pixel bites out of an edge (a gap with filled pixels on three of its four sides). */
const fillNotches = (g: Grid): Grid =>
  g.map((row, y) =>
    row
      .split("")
      .map((ch, x) => {
        if (ch !== ".") return ch;
        const n = [g[y][x - 1], g[y][x + 1], g[y - 1]?.[x], g[y + 1]?.[x]].filter((c) => c && c !== ".");
        // only solid body edges: a gap among grey pixels is deliberate dither
        if (n.length < 3 || n.includes("D")) return ch;
        if (n.includes("L")) return "L";
        return n[0];
      })
      .join(""),
  );

const set = (g: Grid, pts: [number, number, string][]): Grid => {
  const out = g.map((r) => r.split(""));
  for (const [x, y, c] of pts) if (out[y] && x >= 0 && x < out[y].length) out[y][x] = c;
  return out.map((r) => r.join(""));
};

/** Pixel-exact line (Bresenham). */
const line = (x0: number, y0: number, x1: number, y1: number, c: string): [number, number, string][] => {
  const pts: [number, number, string][] = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    pts.push([x0, y0, c]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return pts;
};

const blankGrid = (w: number, h: number): Grid => Array.from({ length: h }, () => ".".repeat(w));

// ---------------------------------------------------------------------------------------------
// spark: 9x9 hit spark. Flash, full four-point star, rays fly off the hollow centre, embers.
// ---------------------------------------------------------------------------------------------
const SPARK: Grid[] = [
  G(`
.........
.........
....L....
...LWL...
..LWWWL..
...LWL...
....L....
.........
.........`),
  G(`
....L....
....W....
..L.W.L..
...WWW...
LWWWWWWWL
...WWW...
..L.W.L..
....W....
....L....`),
  G(`
....D....
.L..L..L.
....L....
.........
DLL...LLD
.........
....L....
.L..L..L.
....D....`),
  G(`
....D....
.........
.D.....D.
.........
D.......D
.........
.D.....D.
.........
....D....`),
];

// ---------------------------------------------------------------------------------------------
// glint: 11x11 four-point twinkle, then a smaller turned sparkle.
// ---------------------------------------------------------------------------------------------
const GLINT: Grid[] = [
  G(`
.....D.....
.....L.....
.....W.....
.....W.....
....LWL....
DLWWWWWWWLD
....LWL....
.....W.....
.....W.....
.....L.....
.....D.....`),
  G(`
...........
...........
.....L.....
...D.W.D...
.....W.....
..LWWWWWL..
.....W.....
...D.W.D...
.....L.....
...........
...........`),
];

// ---------------------------------------------------------------------------------------------
// shard: 5x5 tumbling fragment (lit edge top-left).
// ---------------------------------------------------------------------------------------------
const SHARD: Grid[] = [
  G(`
.W...
WWL..
.LLD.
..LDD
...D.`),
  G(`
.....
..WW.
.WLLD
WLLD.
.DD..`),
];

// ---------------------------------------------------------------------------------------------
// slash: 40x40 crescent trail of a sword cut facing right, sweeping from the top round to the
// bottom. Drawn as a classic "moon" (an outer circle minus an offset inner circle), so both
// edges are true circles that step evenly. Tones run in bands from the outer edge: a crisp white
// blade edge (2px where the trail is thick) over a light body. The older end of
// the trail (the top) cools to light/grey and dithers away; the fresh end is a sharp white point.
// ---------------------------------------------------------------------------------------------
interface SlashSpec {
  c: [number, number]; // outer circle centre
  r: number; // outer radius
  off: number; // inner circle offset (max thickness)
  dir: number; // direction (deg) the inner circle is pushed away from (thickest point)
  from: number; // trail visible from this angle (deg, -90 = straight up) ...
  to: number; // ... to this angle
  age: number; // 0 fresh, 1 fading
}

const slashFrame = (k: SlashSpec): Grid => {
  const [cx, cy] = k.c;
  const ix = cx - Math.cos((k.dir * Math.PI) / 180) * k.off;
  const iy = cy - Math.sin((k.dir * Math.PI) / 180) * k.off;
  const ri = k.r + 0.35;
  const g = paint(40, 40, (x, y) => {
    const dOut = k.r - Math.hypot(x - cx, y - cy);
    const dIn = Math.hypot(x - ix, y - iy) - ri;
    if (dOut < 0 || dIn < 0) return "";
    const a = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
    if (a < k.from || a > k.to) return "";
    const t = (a - k.from) / (k.to - k.from); // 0 old end .. 1 fresh end
    const thick = dOut + dIn;
    let tone = dOut < 1 || (dOut < 2 && thick > 4.5) ? 0 : 1;
    // the old end cools: whites become light, then the tail dithers out
    if (t < 0.4) tone = Math.max(tone, 1);
    if (t < 0.2) tone = 2;
    tone += k.age;
    const chk = (Math.floor(x) + Math.floor(y)) % 2 === 0;
    if (t < 0.1 && chk) return "";
    if (k.age > 0) {
      // the spent trail: grey dissolves, the rest breaks into three slivers
      if (tone >= 2) return "";
      if (t < 0.2 || (t > 0.42 && t < 0.5) || (t > 0.72 && t < 0.78)) return "";
    }
    const toneChar: Record<number, string> = { 0: "W", 1: "L", 2: "D" };
    return toneChar[tone] ?? "";
  });
  return fillNotches(despeckle(g, "D"));
};

const SLASH: Grid[] = [
  slashFrame({ c: [14, 19], r: 18, off: 6, dir: -40, from: -105, to: 50, age: 0 }),
  slashFrame({ c: [14, 19], r: 18, off: 10, dir: 10, from: -100, to: 100, age: 0 }),
  slashFrame({ c: [14, 19], r: 18, off: 5, dir: 35, from: -60, to: 125, age: 1 }),
];

// ---------------------------------------------------------------------------------------------
// impact: 32x32 big hit. A star of rays round a white core, the rays flying out from a hollow
// ring, then a broken ring of fragments. Drawn on the pixel grid (rays are straight runs and
// clean 45-degree staircases) around the pixel corner (16,16) so the burst is symmetric.
// ---------------------------------------------------------------------------------------------
const mirror4 = (pts: [number, number, string][]): [number, number, string][] =>
  pts.flatMap(([x, y, c]) => [[x, y, c], [31 - x, y, c], [x, 31 - y, c], [31 - x, 31 - y, c]] as [number, number, string][]);

/** Ring of pixels whose rounded distance from the centre is in [r0, r1]. */
const disc = (r0: number, r1: number, c: string, keep: (a: number) => boolean = () => true): [number, number, string][] => {
  const pts: [number, number, string][] = [];
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 16);
      const a = ((Math.atan2(y + 0.5 - 16, x + 0.5 - 16) * 180) / Math.PI + 360) % 360;
      if (d >= r0 && d < r1 && keep(a)) pts.push([x, y, c]);
    }
  return pts;
};

/** One quadrant (up/left) of a ray set; mirror4 completes it. from/to are distances in pixels. */
const quadRays = (cf: number, ct: number, cWide: number, df: number, dt: number, dWide: number): [number, number, string][] => {
  const pts: [number, number, string][] = [];
  // vertical ray (up) over columns 15 (and 16 by mirroring), horizontal ray (left) over rows 15
  for (let d = cf; d <= ct; d++) {
    const tip = d > ct - 2;
    const c = tip ? "L" : "W";
    pts.push([15, 15 - d, c], [15 - d, 15, c]);
    if (d < cf + cWide) pts.push([14, 15 - d, "L"], [15 - d, 14, "L"]);
  }
  // diagonal ray (up-left)
  for (let k = df; k <= dt; k++) {
    const tip = k === dt;
    pts.push([15 - k, 15 - k, tip ? "L" : "W"]);
    if (k < df + dWide) pts.push([14 - k, 15 - k, "L"], [15 - k, 14 - k, "L"]);
  }
  return pts;
};

const IMPACT: Grid[] = [
  set(blankGrid(32, 32), mirror4([...disc(0, 5.2, "L"), ...disc(0, 4.2, "W"), ...quadRays(4, 15, 6, 3, 10, 4)])),
  set(blankGrid(32, 32), mirror4([...disc(5, 8.6, "L"), ...disc(6, 7.6, "W"), ...quadRays(10, 15, 2, 7, 11, 2)])),
  set(blankGrid(32, 32), mirror4([...disc(11, 13, "L", (a) => (a + 22.5) % 45 > 12 && (a + 22.5) % 45 < 33), ...disc(11, 12, "D", (a) => (a + 22.5) % 45 > 8 && (a + 22.5) % 45 < 37 && !((a + 22.5) % 45 > 12 && (a + 22.5) % 45 < 33))])),
];

// ---------------------------------------------------------------------------------------------
// Puffs (dust, cloud): hand-placed lumps lit from the top-left (W caps, L body), ringed in D.
// ---------------------------------------------------------------------------------------------
const rimmed = (g: Grid): Grid => outline(g, "D");

// dust: rolls outward to the LEFT of where it is played (the right-hand puff is mirrored)
const DUST: Grid[] = [
  rimmed(G(`
..............
..............
..............
..............
..............
..........W...
........WWLL..
.......WWLLL..
........LLL...
..............`)),
  rimmed(G(`
..............
..............
..............
.....WW.......
....WWWL..W...
....WWLL.WWL..
...WWLLLWWLL..
...WLLLLLLLL..
....LLL.LLL...
..............`)),
  rimmed(G(`
..............
....WW........
...WWWL.WW....
...WWLLWWLL...
..WWLLLWLLL...
..WLLLLLLLL...
...LLL..LL....
..............
..............
..............`)),
  rimmed(G(`
..............
...LL.........
..LLLL..LL....
..LLL..LLL....
.......LL.....
..............
..............
..............
..............
..............`)),
];

const CLOUD: Grid[] = [
  rimmed(G(`
................
................
................
................
.......WW.......
.....WWWLWW.....
.....WWLLWL.....
......LLLL......
................
................`)),
  rimmed(G(`
................
......WW........
....WWWWL.WW....
..W.WWWLLWWWL...
.WWWWWLLLWWLLL..
.WWLLLLLLLLLL...
..LLL.LLLL.LL...
................
................
................`)),
  rimmed(G(`
................
................
...WW......WL...
..WWLL....WLLL..
..WLLL.....LL...
...LL..WL.......
......LLLL......
................
................
................`)),
];

// ---------------------------------------------------------------------------------------------
// ring: 64x14 flattened ground shockwave, near half bright, far half dim, expanding and breaking.
// ---------------------------------------------------------------------------------------------
const ringFrame = (rx: number, ry: number, th: number, broken: boolean): Grid =>
  despeckle(
    paint(64, 14, (x, y) => {
      const cx = 32;
      const cy = 7;
      const dOut = Math.hypot((x - cx) / rx, (y - cy) / ry);
      const dIn = Math.hypot((x - cx) / (rx - th), (y - cy) / Math.max(0.5, ry - th * 0.42));
      if (dOut > 1 || dIn < 1) return "";
      const near = y > cy;
      if (broken) {
        const a = (Math.atan2((y - cy) / ry, (x - cx) / rx) * 180) / Math.PI + 360;
        if (a % 40 < 13) return "";
        return near ? "L" : "D";
      }
      const outer = Math.hypot((x - cx) / (rx - 1.1), (y - cy) / (ry - 0.6)) > 1;
      if (near) return outer ? "W" : "L";
      return outer ? "L" : "D";
    }),
  );

const RING: Grid[] = [ringFrame(13, 3.6, 3.2, false), ringFrame(23, 5.4, 3.6, false), ringFrame(31.5, 6.6, 2.6, true)];

// ---------------------------------------------------------------------------------------------
// rune: 88x18 flattened magic circle lying on the ground: a bright outer ring with a thin inner
// ring, a four-pointed star (diamond) whose points touch the inner ring, glyph ticks in the
// four lunes and a small diamond seal at the centre. Dim and bright pulse frames.
// ---------------------------------------------------------------------------------------------
const RX = 44;
const RY = 9;

/** Pixel-exact ellipse outline: for each pixel, is it on the ring of radii (rx, ry)? */
const ellipseRing = (rx: number, ry: number): [number, number][] => {
  const pts = new Set<string>();
  // walk the angle finely and plot the rounded point: gives a 1px, 8-connected outline
  for (let i = 0; i < 2000; i++) {
    const a = (i / 2000) * Math.PI * 2;
    pts.add(`${Math.round(RX - 0.5 + Math.cos(a) * rx)},${Math.round(RY - 0.5 + Math.sin(a) * ry)}`);
  }
  // thin to a clean 1px line: drop pixels that make an L-shaped double step
  const has = (x: number, y: number): boolean => pts.has(`${x},${y}`);
  for (const k of [...pts]) {
    const [x, y] = k.split(",").map(Number);
    const corner =
      (has(x - 1, y) && has(x, y - 1) && !has(x - 1, y - 1)) ||
      (has(x + 1, y) && has(x, y - 1) && !has(x + 1, y - 1)) ||
      (has(x - 1, y) && has(x, y + 1) && !has(x - 1, y + 1)) ||
      (has(x + 1, y) && has(x, y + 1) && !has(x + 1, y + 1));
    if (corner && (Math.abs(x - RX + 0.5) > rx * 0.3)) pts.delete(k);
  }
  return [...pts].map((k) => k.split(",").map(Number) as [number, number]);
};

const runeFrame = (bright: boolean): Grid => {
  const hi = bright ? "W" : "L";
  const lo = bright ? "L" : "D";
  const pts: [number, number, string][] = [];
  // inner ring (thin, softer; near half a step brighter)
  for (const [x, y] of ellipseRing(34.5, 5.5)) pts.push([x, y, y >= RY ? hi : lo]);
  // rune glyphs in the band between the rings, placed round the ellipse
  const band: [number, number][] = [];
  for (let i = 0; i < 14; i++) {
    const a = ((i + 0.5) / 14) * Math.PI * 2;
    band.push([Math.round(RX - 0.5 + Math.cos(a) * 39), Math.round(RY - 0.5 + Math.sin(a) * 7)]);
  }
  band.forEach(([x, y], i) => {
    const c = y >= RY ? hi : lo;
    if (Math.abs(x - RX) > 30) {
      // at the wide ends there is room for a little two-stroke glyph
      pts.push([x, y - 1, c], [x, y, c], [x + (x < RX ? 1 : -1), y, c]);
    } else if (i % 2) pts.push([x, y, c], [x + 1, y, c]);
    else pts.push([x, y, c]);
  });
  // a four-point star inside the inner ring: long points left/right, short up/down
  pts.push(...line(20, 8, 33, 8, lo), ...line(13, 9, 33, 9, hi), ...line(54, 8, 67, 8, lo), ...line(54, 9, 74, 9, hi));
  pts.push([43, 5, lo], [44, 5, lo], [43, 12, hi], [44, 12, hi]);
  // outer ring last (bright, the near half white)
  for (const [x, y] of ellipseRing(43.5, 8.5)) pts.push([x, y, y >= RY ? "W" : hi]);
  // centre seal: a small diamond with a white heart
  pts.push(
    [43, 6, lo], [44, 6, lo],
    [42, 7, lo], [43, 7, hi], [44, 7, hi], [45, 7, lo],
    [38, 8, lo], [39, 8, lo], [40, 8, lo], [41, 8, hi], [42, 8, hi], [43, 8, "W"], [44, 8, "W"], [45, 8, hi], [46, 8, hi], [47, 8, lo], [48, 8, lo], [49, 8, lo],
    [39, 9, hi], [40, 9, hi], [41, 9, hi], [42, 9, "W"], [43, 9, "W"], [44, 9, "W"], [45, 9, "W"], [46, 9, hi], [47, 9, hi], [48, 9, hi],
    [42, 10, hi], [43, 10, "W"], [44, 10, "W"], [45, 10, hi],
    [43, 11, hi], [44, 11, hi],
  );
  return set(blankGrid(88, 18), pts);
};

const RUNE: Grid[] = [runeFrame(false), runeFrame(true)];

// ---------------------------------------------------------------------------------------------
// beam: 24x8 slice of a column of holy light; tiles vertically (period 8).
// ---------------------------------------------------------------------------------------------
/**
 * Left half of a beam row (column 11 is the centre): a rare mote, a checker-dithered fringe, a
 * grey edge, a light band and a wide white core. One soft ripple per period (a light notch in
 * the core's edge, a grey notch in the light band) makes the column visibly flow when scrolled.
 */
const beamHalf = (y: number): string => {
  const c = Array.from({ length: 12 }, () => ".");
  if (y === 1) c[1] = "D";
  if (y === 5) c[2] = "L";
  if (y % 2 === 0) c[3] = "D";
  c[4] = "D";
  c[5] = y === 6 ? "D" : "L";
  c[6] = "L";
  c[7] = y === 2 || y === 3 ? "L" : "W";
  for (let x = 8; x < 12; x++) c[x] = "W";
  return c.join("");
};
const BEAM: Grid[] = [Array.from({ length: 8 }, (_, y) => beamHalf(y) + beamHalf((y + 4) % 8).split("").reverse().join(""))];

// ---------------------------------------------------------------------------------------------
// pillar: 16x56 stone spike erupting from the ground: rising tip, full spire, cracked.
// ---------------------------------------------------------------------------------------------
const PW = 16;
const PH = 56;

/** Left edge, ridge and right edge of the spire at row y (0 = tip, 55 = ground). */
const spire = (y: number): [number, number, number] => {
  const t = y / (PH - 1);
  // jagged breaks in the silhouette: the edge steps in a pixel where a slab ends
  const nl = (y >= 16 && y < 19 ? 1 : 0) + (y >= 34 && y < 37 ? 1 : 0);
  const nr = (y >= 25 && y < 28 ? 1 : 0) + (y >= 44 && y < 46 ? 1 : 0);
  const xl = Math.round(7.4 - 6.4 * Math.pow(t, 0.8)) + nl;
  const xr = Math.round(8.6 + 6.0 * Math.pow(t, 0.85)) - nr;
  const ridge = Math.round(8 + 1.2 * t);
  return [xl, Math.min(ridge, xr - 1), xr];
};

const spireGrid = (): string[][] => {
  const g = Array.from({ length: PH }, () => Array.from({ length: PW }, () => "."));
  for (let y = 2; y < PH; y++) {
    const [xl, ridge, xr] = spire(y);
    for (let x = xl; x <= xr; x++) {
      let c = "D";
      if (x < ridge) c = "L";
      else if (x === ridge) c = "W";
      if (x === xl || x === xr) c = "o";
      g[y][x] = c;
    }
  }
  // the tip
  g[0][8] = "o";
  g[1][7] = "o";
  g[1][8] = "W";
  g[1][9] = "o";
  // glints on the lit edge just under each break, and at the top
  for (const [x, y] of [[7, 5], [7, 6], [6, 11], [6, 19], [6, 20], [5, 21], [5, 37], [4, 38], [4, 39]] as [number, number][]) if (g[y][x] === "L") g[y][x] = "W";
  // slab joints: chisel lines across the lit face (shade) and the shadow face (outline colour)
  const joint = (y0: number): void => {
    const [xl, ridge, xr] = spire(y0);
    for (let x = xl + 1; x < xr; x++) {
      const yy = y0 + Math.floor((x - xl - 1) / 2);
      if (yy >= PH) continue;
      g[yy][x] = x <= ridge ? "D" : "o";
      if (x < ridge && g[yy + 1]?.[x] === "L") g[yy + 1][x] = "W";
    }
  };
  joint(15);
  joint(33);
  // weathering: a few pocks on the lit face, a seam on the shadow face
  for (const [x, y] of [[5, 26], [4, 45], [6, 48]] as [number, number][]) {
    if (g[y][x] === "L") g[y][x] = "D";
    if (g[y + 1][x] === "L") g[y + 1][x] = "W";
  }
  for (const [x, y, c] of line(11, 41, 12, 47, "o")) if (g[y][x] === "D") g[y][x] = c;
  return g;
};

const rubble = (g: string[][], rocks: [number, number, number][]): void => {
  for (const [x0, y0, w] of rocks) {
    for (let x = x0; x < x0 + w; x++) {
      for (let y = y0; y < PH; y++) {
        if (x < 0 || x >= PW) continue;
        const edge = x === x0 || x === x0 + w - 1 || y === y0;
        const corner = (x === x0 || x === x0 + w - 1) && y === y0;
        if (corner) continue;
        if (edge) g[y][x] = "o";
        else if (y === y0 + 1 && x < x0 + w - 2) g[y][x] = "L";
        else g[y][x] = "D";
      }
    }
  }
};

const pillarRising = (): Grid => {
  const full = spireGrid();
  const g = Array.from({ length: PH }, () => Array.from({ length: PW }, () => "."));
  const drop = 30;
  for (let y = 0; y < PH - drop - 2; y++) g[y + drop] = [...full[y]];
  rubble(g, [[0, 50, 5], [11, 49, 5], [3, 52, 4], [9, 52, 4]]);
  // flying grit
  g[44][1] = "L";
  g[42][14] = "L";
  g[46][13] = "D";
  return g.map((r) => r.join(""));
};

const pillarFull = (): Grid => {
  const g = spireGrid();
  rubble(g, [[0, 52, 4], [12, 51, 4]]);
  return g.map((r) => r.join(""));
};

const pillarCracked = (): Grid => {
  const g = spireGrid();
  rubble(g, [[0, 52, 4], [12, 51, 4]]);
  let out = g.map((r) => r.join(""));
  // one jagged fissure down the spire, with a short branch, and a glint on its lit lip
  const crack: [number, number, string][] = [
    ...line(8, 10, 8, 14, "o"), ...line(8, 14, 9, 23, "o"), ...line(9, 23, 6, 31, "o"),
    ...line(6, 31, 8, 39, "o"), ...line(8, 39, 5, 47, "o"), ...line(9, 23, 11, 27, "o"),
  ];
  out = set(out, crack);
  // a chip knocked off the lit edge, and a hairline on the shadow side
  const chip: [number, number, string][] = [];
  for (let y = 29; y <= 30; y++) {
    const [xl] = spire(y);
    chip.push([xl, y, "."], [xl + 1, y, "o"]);
  }
  return set(out, chip);
};

const PILLAR: Grid[] = [pillarRising(), pillarFull(), pillarCracked()];

// ---------------------------------------------------------------------------------------------
// fence: 18x26 one show-jumping bar: two white wings with capped posts and a red/white striped
// pole between them, a thinner ground pole below. The knight clears three of these in a row.
// ---------------------------------------------------------------------------------------------
const FENCE_W = 18;
const FENCE_H = 26;
const fenceGrid = (): Grid => {
  const g = Array.from({ length: FENCE_H }, () => Array.from({ length: FENCE_W }, () => "."));
  const post = (x: number, top: number): void => {
    // a rounded cap, then a 2px white upright (lit left, light-grey right) in an outline
    g[top][x + 1] = "o";
    g[top][x + 2] = "o";
    g[top + 1][x] = "o";
    g[top + 1][x + 1] = "W";
    g[top + 1][x + 2] = "W";
    g[top + 1][x + 3] = "o";
    for (let y = top + 2; y < FENCE_H; y++) {
      const foot = y === FENCE_H - 1;
      g[y][x] = "o";
      g[y][x + 1] = foot ? "o" : "W";
      g[y][x + 2] = foot ? "o" : "L";
      g[y][x + 3] = "o";
    }
  };
  /** A striped pole `thick` pixels deep (plus its outline) between the posts. */
  const pole = (top: number, thick: number): void => {
    for (let x = 3; x < FENCE_W - 3; x++) {
      const red = Math.floor((x - 3) / 3) % 2 === 1;
      g[top][x] = "o";
      for (let k = 1; k <= thick; k++) {
        const shade = k === thick ? "L" : "W";
        g[top + k][x] = red ? "R" : shade;
      }
      g[top + thick + 1][x] = "o";
    }
  };
  post(0, 2);
  post(FENCE_W - 4, 2);
  pole(6, 3);
  pole(16, 2);
  return g.map((r) => r.join(""));
};

const FENCE: Grid[] = [fenceGrid()];

/** The authored effect sheets (every frame exactly w x h). */
export const FX: Record<FxId, FxSheet> = {
  spark: { w: 9, h: 9, frames: SPARK },
  slash: { w: 40, h: 40, frames: SLASH },
  impact: { w: 32, h: 32, frames: IMPACT },
  dust: { w: 14, h: 10, frames: DUST },
  glint: { w: 11, h: 11, frames: GLINT },
  ring: { w: 64, h: 14, frames: RING },
  shard: { w: 5, h: 5, frames: SHARD },
  pillar: { w: PW, h: PH, frames: PILLAR },
  fence: { w: FENCE_W, h: FENCE_H, frames: FENCE },
  rune: { w: 88, h: 18, frames: RUNE },
  cloud: { w: 16, h: 10, frames: CLOUD },
  beam: { w: 24, h: 8, frames: BEAM },
};

// Guard against hand-edit slips: every frame must be exactly its sheet's size.
for (const [id, s] of Object.entries(FX)) {
  s.frames.forEach((f, i) => {
    if (f.length !== s.h || f.some((r) => r.length !== s.w)) console.warn(`fx ${id} frame ${i} is not ${s.w}x${s.h}`);
  });
}
