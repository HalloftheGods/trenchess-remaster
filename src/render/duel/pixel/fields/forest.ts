import type { Battlefield } from "../field";
import { TILE_W, wave, type PixelPainter } from "../painter";
import type { Grid } from "../sheet";
import { mix, type Palette } from "../palette";

/**
 * "The Whispering Woods": dim emerald twilight under a closed canopy. A pale gap of light far
 * behind, rows of conifer and oak silhouettes fading into green mist, shafts of light falling
 * between big mossy trunks, a leafy canopy overhang across the top and a mossy floor with
 * roots, ferns and fallen leaves.
 */

// ---------------------------------------------------------------- palettes
const SKY = ["#0f241d", "#142d24", "#1a372b", "#214332", "#2a503a", "#365f44", "#456f4f", "#577f5b", "#6b9067", "#80a275"];
const GLOW = { halo: "#93b282", ring: "#adc796", inner: "#c9dcae", core: "#e6efca" };
const FAR: Palette = { a: "#9fbd97", b: "#8eb08c", c: "#86a886", t: "#7fa082" };
const FAR_MIST = "#9cbc96";
const BACK: Palette = { a: "#7da27a", b: "#6a9270", c: "#5d8566", t: "#557a5c" };
const BACK_MIST = "#82a67e";
const SHAFT = "rgba(226,246,196,0.13)";
const SHAFT_CORE = "rgba(240,252,214,0.10)";
const BARK = { o: "#17241d", d: "#22322a", m: "#2f4136", l: "#3e5443", h: "#506a50" };
const MOSS = { d: "#33502f", m: "#466a37", l: "#5b8040", h: "#759a4a" };
const LEAF = { base: "#0d1d16", lo: "#16301f", mid: "#1f4027", hi: "#2d5631", tip: "#3d6b38" };
const FLOOR_FAR = "#4c7148";
const GROUND: [number, string][] = [
  [113, "#62895a"],
  [117, "#5a8253"],
  [122, "#527a4c"],
  [128, "#4b7346"],
  [133, "#456b41"],
  [141, "#3f633c"],
  [151, "#375936"],
  [163, "#2f4e30"],
];
const GTEX: Record<string, string> = {
  a: "#7aa05e", // moss tuft light
  b: "#6a9152", // moss tuft mid
  d: "#2c4a2c", // tuft shadow
  f: "#9a7a3c", // leaf light
  F: "#6a5430", // leaf dark
  p: "#b4944e", // leaf highlight
  r: "#6a4e34", // root light
  R: "#4a3626", // root mid
  q: "#2e2219", // root dark
  n: "#5e8a46", // fern light
  N: "#3e6634", // fern dark
};
const DAPPLE = { lo: "#6f9a5c", hi: "#84ad68", top: "#99bf78" };
const DARK = "#10201a";
const FRONT = { o: "#08130e", b: "#0e1e16", l: "#183223" };

// ---------------------------------------------------------------- helpers

/** Signed horizontal distance across the wrap seam. */
const wdx = (x: number, cx: number): number => ((((x - cx) % TILE_W) + TILE_W * 1.5) % TILE_W) - TILE_W / 2;

/** Hard horizontal strata with a short ordered-dither blend above each seam. */
const strata = (p: PixelPainter, stops: [number, string][], bottom: number, blend = 3): void => {
  for (let i = 0; i < stops.length; i++) {
    const [y, c] = stops[i];
    const end = i + 1 < stops.length ? stops[i + 1][0] : bottom;
    p.rect(0, y, p.w, end - y, c);
  }
  for (let i = 1; i < stops.length; i++) {
    const [seam, c] = stops[i];
    for (let b = 0; b < blend; b++) p.dither(0, seam - blend + b, p.w, 1, c, Math.round(((b + 1) / (blend + 1)) * 16));
  }
};

/** A tiered conifer silhouette: 'a' rim light, 'b' lit half, 'c' shade half, 't' trunk. */
const spruce = (h: number, w: number): Grid => {
  const W = w | 1;
  const cx = (W - 1) / 2;
  const crownH = h - 2;
  const tiers = Math.max(3, Math.round(crownH / 7));
  const rows: string[] = [];
  for (let j = 0; j < crownH; j++) {
    const t = j / (crownH - 1);
    const tierPos = ((j * tiers) / crownH) % 1;
    let half = Math.round(cx * (0.1 + 0.9 * t) * (0.55 + 0.45 * tierPos));
    if (j < 2) half = 0;
    let row = "";
    for (let i = 0; i < W; i++) {
      const dx = i - cx;
      if (Math.abs(dx) > half) row += ".";
      else if (dx === -half && tierPos > 0.35 && half > 0) row += "a";
      else row += dx <= 0 ? "b" : "c";
    }
    rows.push(row);
  }
  for (let j = 0; j < 2; j++) rows.push(".".repeat(cx) + "t" + ".".repeat(W - cx - 1));
  return rows;
};

interface Blob {
  x: number;
  y: number;
  r: number;
}

/**
 * A leafy crown: a rough ellipse filled with small leaf-cluster discs. Shading mixes each
 * cluster's own normal with the whole crown's, so clusters read as lumps while the crown keeps
 * one light direction (top-left): 'a' lit, 'b' mid, 'c' shade.
 */
const crown = (rx: number, ry: number, seed: number): Grid => {
  const blobs: Blob[] = [];
  let s = seed;
  const rnd = (): number => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const n = Math.round((rx * ry) / 7);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * 0.8;
    blobs.push({ x: Math.round(Math.cos(a) * rx * d), y: Math.round(Math.sin(a) * ry * d), r: 3 + Math.round(rnd() * 2) });
  }
  blobs.sort((p, q) => p.y - q.y);
  const W = rx * 2 + 9;
  const H = ry * 2 + 9;
  const rows: string[] = [];
  for (let j = 0; j < H; j++) {
    let row = "";
    for (let i = 0; i < W; i++) {
      const x = i - rx - 4;
      const y = j - ry - 4;
      let own: Blob | null = null;
      for (const b of blobs) if ((x - b.x) ** 2 + (y - b.y) ** 2 <= b.r * b.r + b.r * 0.6) own = b;
      if (!own) {
        // close the gaps between clusters inside the crown so no light leaks through as specks
        row += (x / (rx * 0.85)) ** 2 + (y / (ry * 0.85)) ** 2 <= 1 ? "c" : ".";
        continue;
      }
      const ln = -0.6 * ((x - own.x) / own.r) - 0.8 * ((y - own.y) / own.r);
      const lg = -0.6 * (x / rx) - 0.8 * (y / ry);
      const l = 0.45 * ln + 0.75 * lg;
      row += l > 0.3 ? "a" : l > -0.3 ? "b" : "c";
    }
    rows.push(row);
  }
  return rows;
};

/** A thin row of trees stamped at their base line, spread over the tile with jitter. */
const treeRow = (p: PixelPainter, pal: Palette, base: number, count: number, hMin: number, hMax: number, oakEvery: number): void => {
  for (let i = 0; i < count; i++) {
    const x = Math.round((i / count) * TILE_W + p.rand() * (TILE_W / count) * 0.6);
    const h = Math.round(hMin + p.rand() * (hMax - hMin));
    if (oakEvery > 0 && i % oakEvery === oakEvery - 1) {
      const g = crown(Math.round(h * 0.42), Math.round(h * 0.3), 7 + i * 131);
      const gx = x - Math.round(g[0].length / 2);
      p.rect(x, base - Math.round(h * 0.4), 2, Math.round(h * 0.4), pal.t);
      p.stamp(g, gx, base - Math.round(h * 0.08) - g.length, pal);
    } else {
      const g = spruce(h, Math.round(h * 0.42));
      p.stamp(g, x - Math.floor(g[0].length / 2), base - g.length, pal);
    }
  }
};

/**
 * Mist: a solid bank with a rolling, hard-edged top (no checker seam, which read as a fence),
 * so the tree bases sink into it.
 */
const mist = (p: PixelPainter, bottom: number, c: string): void => {
  p.ridge((x) => bottom - 3 - 2 * wave(x, 4, bottom) - wave(x, 9, bottom * 0.7), c);
};

// ---------------------------------------------------------------- layers

/** Backdrop: emerald gloom deepening upward and a pale gap of light far behind the trees. */
const paintSky = (p: PixelPainter): void => {
  p.bands(0, 112, SKY, 3);
  p.rect(0, 112, p.w, p.h - 112, SKY[SKY.length - 1]);
  const [gx, gy] = [214, 66];
  const rings: [number, number, string][] = [
    [34, 26, GLOW.halo],
    [25, 19, GLOW.ring],
    [17, 13, GLOW.inner],
    [10, 8, GLOW.core],
  ];
  for (const [rx, ry, c] of rings) p.ellipse(gx, gy, rx, ry, c);
};

/** Far: the palest conifers and oaks dissolving into mist. */
const paintFar = (p: PixelPainter): void => {
  p.reseed(311);
  treeRow(p, FAR, 104, 22, 30, 52, 5);
  mist(p, 104, FAR_MIST);
};

/** Back: nearer, darker tree line, thin distant trunks and the shafts of light. */
const paintBack = (p: PixelPainter): void => {
  p.reseed(977);
  // thin trunks rising into the canopy
  for (let i = 0; i < 9; i++) {
    const x = Math.round(i * 35.5 + p.rand() * 12);
    const w = 2 + Math.round(p.rand() * 2);
    p.rect(x, 0, w, 108, BACK.c);
    p.vline(x, 0, 108, BACK.b);
  }
  treeRow(p, BACK, 110, 16, 44, 70, 4);
  mist(p, 110, BACK_MIST);
  // shafts of light slanting down to the right
  const shafts: [number, number][] = [
    [150, 12],
    [176, 6],
    [36, 9],
    [262, 7],
  ];
  for (const [sx, sw] of shafts) {
    for (let y = 14; y < 118; y++) {
      const x = Math.round(sx + y * 0.42);
      // taper to a point near the floor instead of a screen-door fade
      const k = y < 80 ? 1 : Math.max(0, 1 - (y - 80) / 34);
      const w = Math.round(sw * k);
      if (w <= 0) continue;
      const x0 = x + Math.floor((sw - w) / 2);
      p.hline(x0, y, w, SHAFT);
      if (w > 7) p.hline(x0 + 2, y, w - 4, SHAFT_CORE);
    }
  }
};

interface Trunk {
  x: number;
  w: number;
  seed: number;
}
const TRUNKS: Trunk[] = [
  { x: 6, w: 26, seed: 1 },
  { x: 96, w: 14, seed: 2.3 },
  { x: 172, w: 20, seed: 4.1 },
  { x: 268, w: 12, seed: 5.7 },
];
const ROOT_Y = 113;

/** A big mossy trunk: cylinder shading, segmented bark plates, moss patches on the lit side, flared roots. */
const trunk = (p: PixelPainter, t: Trunk): void => {
  const flare = 12;
  const plates = Math.max(2, Math.round(t.w / 5));
  for (let y = 0; y < ROOT_Y; y++) {
    const k = y - (ROOT_Y - flare);
    const extra = k > 0 ? Math.round((k * k) / 9) : 0;
    const sway = Math.round(wave(y * 2, 1, t.seed) * 1.4);
    const L = t.x - extra + sway;
    const R = t.x + t.w + Math.round(extra * 0.8) + sway;
    const span = R - L;
    for (let x = L; x <= R; x++) {
      const u = (x - L) / span;
      let c: string;
      if (x === L || x === R) c = BARK.o;
      else if (u < 0.14) c = BARK.h;
      else if (u < 0.42) c = BARK.l;
      else if (u < 0.76) c = BARK.m;
      else c = BARK.d;
      if (x !== L && x !== R && k < 4) {
        // bark plates: a crack at each plate's left edge, broken into segments
        const pu = (u * plates + 0.15 * Math.sin(y * 0.13 + t.seed)) % 1;
        const plate = Math.floor(u * plates + 0.15 * Math.sin(y * 0.13 + t.seed));
        const cracked = Math.sin(y * 0.21 + plate * 2.3 + t.seed) > -0.75;
        if (pu < 1 / (span / plates) && cracked && u > 0.1) c = u < 0.42 ? BARK.m : u < 0.76 ? BARK.d : BARK.o;
      }
      // cushion moss: one continuous strip down the lit side with a scalloped inner edge
      const env = Math.min(1, (Math.sin(y * 0.06 + t.seed * 3) + 0.45) * 2.5, (y - 18) / 6);
      const mossOn = y < ROOT_Y - 4 && env > 0;
      if (mossOn) {
        // a moss sheet down the lit side with an irregular soft inner edge; it is lit where it bulges
        const bulge = Math.sin(y * 0.21 + t.seed) + 0.6 * Math.sin(y * 0.53 + t.seed * 2);
        const mw = Math.round((t.w * 0.24 + 1.6 * bulge) * env) + (k > 0 ? extra : 0);
        const mx = x - L;
        if (mx <= mw) {
          if (mx === mw) c = MOSS.d;
          else if (mx === 0) c = MOSS.m;
          else if (mx <= Math.max(1, mw * 0.5) && bulge > 0.2) c = MOSS.h;
          else if (mx < mw - 1) c = MOSS.l;
          else c = MOSS.m;
        }
      }
      p.px(x, y, c);
    }
  }
};

/** Canopy discs hanging along the top edge, shaded per disc against the top-left light. */
const canopyBlobs = (p: PixelPainter): Blob[] => {
  p.reseed(4242);
  const blobs: Blob[] = [];
  for (let x = 0; x < TILE_W; x += 9) {
    const base = 20 + Math.round(6 * wave(x, 3, 0.4) + 4 * wave(x, 5, 2.1));
    const r = 5 + Math.round(p.rand() * 4);
    blobs.push({ x: x + Math.round(p.rand() * 5), y: base - 3, r: r + 2 });
    blobs.push({ x: x + 4 + Math.round(p.rand() * 4), y: base + Math.round(p.rand() * 5), r });
  }
  // a few heavy clumps hanging lower
  for (const [x, y, r] of [
    [40, 32, 7],
    [128, 30, 6],
    [205, 34, 8],
    [300, 29, 6],
  ] as [number, number, number][]) {
    blobs.push({ x, y, r }, { x: x + 7, y: y + 4, r: r - 2 });
  }
  return blobs;
};

const paintCanopy = (p: PixelPainter): void => {
  const blobs = canopyBlobs(p);
  for (let x = 0; x < TILE_W; x++) {
    const top = 14 + Math.round(3 * wave(x, 3, 0.4));
    p.vline(x, 0, top, LEAF.base);
    let low = top - 1;
    for (let y = 0; y < 48; y++) {
      let own: Blob | null = null;
      for (const b of blobs) {
        const dx = wdx(x, b.x);
        if (dx * dx + (y - b.y) ** 2 <= b.r * b.r + b.r * 0.6) own = b;
      }
      if (!own) continue;
      const nx = wdx(x, own.x) / own.r;
      const ny = (y - own.y) / own.r;
      const l = -0.55 * nx - 0.83 * ny;
      const c = l > 0.55 ? LEAF.hi : l > 0.05 ? LEAF.mid : l > -0.55 ? LEAF.lo : LEAF.base;
      p.px(x, y, c);
      low = y;
    }
    // ragged leaf fringe hanging from the underside
    const tooth = [0, 1, 2, 0, 1, 0, 0, 1, 3, 1, 0, 0, 2, 1][(x * 5 + (x >> 3)) % 14];
    for (let k = 1; k <= tooth; k++) p.px(x, low + k, k === tooth && tooth > 1 ? LEAF.mid : LEAF.lo);
  }
  // hanging vines
  p.reseed(88);
  for (const [vx, len] of [
    [58, 30],
    [63, 18],
    [140, 26],
    [226, 36],
    [231, 20],
    [312, 24],
  ] as [number, number][]) {
    const y0 = 26;
    for (let j = 0; j < len; j++) {
      const x = vx + Math.round(Math.sin(j * 0.18) * 1.2);
      p.px(x, y0 + j, LEAF.lo);
      if (j % 5 === 2) p.px(x - 1, y0 + j, LEAF.mid);
      if (j % 5 === 4) p.px(x + 1, y0 + j, LEAF.lo);
    }
    p.px(vx + Math.round(Math.sin(len * 0.18) * 1.2), y0 + len, LEAF.mid);
  }
};

/** Mid: the far floor strip, the big trunks and the canopy overhang. */
const paintMid = (p: PixelPainter): void => {
  p.ridge((x) => 107 + Math.round(1.5 * wave(x, 6, 1.2) + wave(x, 11)), FLOOR_FAR);
  p.ridge((x) => 108 + Math.round(1.5 * wave(x, 6, 1.2) + wave(x, 11)), GROUND[0][1]);
  for (const t of TRUNKS) p.ellipse(t.x + Math.round(t.w / 2), ROOT_Y - 1, t.w + 10, 2, mix(GROUND[0][1], DARK, 0.3));
  for (const t of TRUNKS) trunk(p, t);
  paintCanopy(p);
};

// ---------------------------------------------------------------- ground

const LEAVES: Grid[] = [["fF"], ["pf.", ".fF"], [".pf.", "pffF", ".FF."]];
const FERN: Grid = [
  "....n.....n....",
  "..n.n..n..n.n..",
  ".nnNn.nNn.nNnn.",
  "n..Nn.nNn.nN..n",
  "...N..nNn..N...",
  "....N.NNN.N....",
  ".....NNNNN.....",
];

/** The ground strata colour at row y. */
const bandAt = (y: number): string => {
  let c = GROUND[0][1];
  for (const [sy, sc] of GROUND) if (y >= sy) c = sc;
  return c;
};


/** Grass tufts in three sizes: 'l' lit tip, 'm' lit blade, 'd' shaded blade, 's' root shadow. */
const TUFTS: Grid[] = [
  [".l..l", "lm.md", "mmdmd", ".sss."],
  ["..l...l..", "l.m..lm.l", "mlm.lmd.d", "mmmdmmdmd", ".mmddmdd.", "..sssss.."],
  [
    "......l......",
    "..l...m...l..",
    "..m..lm..lm..",
    "l.ml.mm.lmd.l",
    "m.mm.mmdmmd.d",
    "mlmmdmmdmmdld",
    "mmmmdmmddmdmd",
    ".mmdddmdddmd.",
    "..sssssssss..",
  ],
];
const tuft = (p: PixelPainter, cx: number, y: number, size: number): void => {
  const g = TUFTS[size];
  const base = bandAt(y);
  const pal: Palette = {
    l: mix(base, "#d2ea9c", 0.45),
    m: mix(base, "#a8cc78", 0.2),
    d: mix(base, DARK, 0.3),
    s: mix(base, DARK, 0.18),
  };
  p.stamp(g, cx - Math.floor(g[0].length / 2), y - g.length + 1, pal);
};

/** A hard-edged patch of canopy shadow, darkening whichever strata it lies on. */
const shadowPatch = (p: PixelPainter, cx: number, cy: number, rx: number, ry: number): void => {
  for (let y = -ry; y <= ry; y++) {
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))) + 0.35);
    const lobe = Math.round(2 * wave(cx + y * 7, 3));
    p.hline(cx - half + lobe, cy + y, half * 2 + 1, mix(bandAt(cy + y), DARK, 0.16));
  }
};

/** Ground: misty far floor, canopy shadows, dappled light, grass tufts, ferns and leaves. */
const paintGround = (p: PixelPainter): void => {
  strata(p, GROUND, p.h, 3);
  // broad canopy shadows: big calm shapes, flatter far away
  for (const [cx, cy, rx, ry] of [
    [20, 118, 22, 2],
    [190, 116, 18, 2],
    [60, 128, 34, 4],
    [250, 134, 40, 5],
    [150, 152, 54, 7],
    [10, 160, 40, 8],
  ] as [number, number, number, number][])
    shadowPatch(p, cx, cy, rx, ry);
  // dappled light where the shafts land: two solid tones, no screen-door rim
  for (const [cx, cy, rx, ry] of [
    [226, 119, 12, 1],
    [104, 132, 24, 3],
    [292, 146, 28, 4],
  ] as [number, number, number, number][]) {
    p.ellipse(cx, cy, rx, ry, DAPPLE.lo);
    p.ellipse(cx - 2, cy - Math.floor(ry / 3), Math.round(rx * 0.55), Math.max(0, ry - 2), DAPPLE.hi);
  }
  // grass tufts in perspective: small, tight and sparse far; big and fuller near
  p.reseed(5150);
  for (let y = 116; y < p.h; ) {
    const d = y - 112;
    const spacing = 26 + d * 1.6;
    const n = Math.max(3, Math.round(TILE_W / spacing));
    const phase = p.rand() * spacing;
    for (let i = 0; i < n; i++) {
      if (p.rand() < 0.45) continue;
      const cx = Math.round(phase + (i / n) * TILE_W + (p.rand() - 0.5) * spacing * 0.6);
      const size = d < 12 ? 0 : d < 30 ? 1 : 2;
      tuft(p, cx, y, size);
      if (size > 0 && p.rand() < 0.5) tuft(p, cx + (size === 2 ? 9 : 6), y + 1, size - 1);
    }
    y += 4 + Math.floor(d / 4);
  }
  // fallen leaves gathered in small drifts
  for (const [x, y, size, count] of [
    [186, 142, 2, 3],
    [312, 140, 2, 3],
    [44, 156, 2, 4],
  ] as [number, number, number, number][]) {
    for (let k = 0; k < count; k++) p.stamp(LEAVES[size], x + k * (3 + size * 2) - (k % 2) * 1, y + (k % 2) * (1 + size), GTEX);
  }
  for (const [x, y] of [
    [8, 124],
    [168, 121],
    [246, 127],
  ] as [number, number][])
    p.stamp(FERN, x, y, GTEX);
};

// ---------------------------------------------------------------- foreground

/** One arching fern frond as a dark silhouette: a 2px stem with feathered leaflets, rim lit on top. */
const frond = (p: PixelPainter, x0: number, y0: number, len: number, dir: number, rise: number): void => {
  for (let i = 0; i <= len; i++) {
    const t = i / len;
    const x = Math.round(x0 + dir * i);
    const y = Math.round(y0 - rise * Math.sin(Math.PI * t * 0.85));
    p.px(x, y, FRONT.b);
    p.px(x, y + 1, FRONT.b);
    if (i % 2 === 0 && t > 0.06 && t < 0.97) {
      const leaf = Math.max(1, Math.round((1 - t) * 6));
      for (let k = 1; k <= leaf; k++) {
        const fx = x + dir * Math.floor(k / 2);
        p.px(fx, y - k, FRONT.b);
        p.px(fx + dir, y - k, FRONT.b);
        p.px(fx, y + 1 + k, FRONT.b);
        p.px(fx + dir, y + 1 + k, FRONT.b);
      }
      p.px(x + dir * Math.floor(leaf / 2), y - leaf - 1, FRONT.l);
    }
  }
};

/** Front: dark fern clumps and a low bank along the very bottom only. */
const paintFront = (p: PixelPainter): void => {
  for (const [cx, s] of [
    [24, 1],
    [128, 0.8],
    [214, 1],
    [296, 0.9],
  ] as [number, number][]) {
    frond(p, cx, 175, Math.round(26 * s), -1, Math.round(8 * s));
    frond(p, cx + 2, 174, Math.round(30 * s), 1, Math.round(9 * s));
    frond(p, cx - 4, 178, Math.round(20 * s), -1, Math.round(5 * s));
    frond(p, cx + 6, 178, Math.round(22 * s), 1, Math.round(5 * s));
  }
  p.ridge((x) => 170 + Math.round(2 * wave(x, 4, 0.7) + wave(x, 9)), FRONT.b);
  for (let x = 0; x < p.w; x++) p.px(x, 170 + Math.round(2 * wave(x, 4, 0.7) + wave(x, 9)) - 0, FRONT.l);
  p.ridge((x) => 172 + Math.round(2 * wave(x, 4, 0.7) + wave(x, 9)), FRONT.o);
};

const field: Battlefield = {
  terrain: "forest",
  ambient: "fireflies",
  ambientColors: ["#f2ffb4", "#cdf27e", "#fff2c2"],
  layers: [
    { parallax: 0.05, paint: paintSky },
    { parallax: 0.15, paint: paintFar },
    { parallax: 0.3, paint: paintBack },
    { parallax: 0.55, paint: paintMid },
    { parallax: 1, paint: paintGround },
    { parallax: 1.4, front: true, paint: paintFront },
  ],
};

export default field;
