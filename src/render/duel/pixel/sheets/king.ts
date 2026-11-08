import { FRAME_IDS, fit, type FrameId, type Grid, type SpriteSheet } from "../sheet";

/**
 * Equinox King: armoured warrior-king with a two-handed greatsword.
 * Built from hand-drawn part grids (head, torso, skirt, cape, feet) plus pixel-exact limbs and
 * blade drawn along clean slopes, each part outlined on its own layer before compositing.
 */

const W = 76;
const H = 76;
const FOOT: [number, number] = [36, 74];

type P = [number, number];

class Layer {
  a: string[][];
  constructor() {
    this.a = Array.from({ length: H }, () => Array.from({ length: W }, () => "."));
  }
  set(x: number, y: number, c: string): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    this.a[y][x] = c;
  }
  get(x: number, y: number): string {
    if (x < 0 || y < 0 || x >= W || y >= H) return ".";
    return this.a[y][x];
  }
  stamp(g: Grid, ox: number, oy: number): this {
    g.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] !== ".") this.set(ox + x, oy + y, row[x]);
    });
    return this;
  }
  /** 1px outline around the shape, outside it. */
  outline(ink = "o"): this {
    const add: P[] = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (this.get(x, y) !== ".") continue;
        if ([this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)].some((c) => c !== "." && c !== ink)) add.push([x, y]);
      }
    add.forEach(([x, y]) => this.set(x, y, ink));
    return this;
  }
  over(l: Layer): this {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (l.a[y][x] !== ".") this.a[y][x] = l.a[y][x];
    return this;
  }
  grid(): Grid {
    return this.a.map((r) => r.join(""));
  }
}

/** Steps a clean line from a to b (chebyshev steps, so slopes 0, 1/2, 1, 2 stair evenly). */
const steps = (a: P, b: P): P[] => {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
  const out: P[] = [];
  for (let i = 0; i <= n; i++) out.push([Math.round(a[0] + ((b[0] - a[0]) * i) / (n || 1)), Math.round(a[1] + ((b[1] - a[1]) * i) / (n || 1))]);
  return out;
};

/** A thick limb along a polyline; the light side faces up-left. ramp = colours across the width. */
const limb = (l: Layer, pts: P[], ramp: string[]): void => {
  const half = Math.floor((ramp.length - 1) / 2);
  for (let s = 0; s < pts.length - 1; s++) {
    const a = pts[s];
    const b = pts[s + 1];
    const vertical = Math.abs(b[1] - a[1]) >= Math.abs(b[0] - a[0]);
    for (const [x, y] of steps(a, b))
      ramp.forEach((c, i) => {
        const o = i - half;
        l.set(vertical ? x + o : x, vertical ? y : y + o, c);
      });
  }
};

// ---------------------------------------------------------------- sword

interface Blade {
  /** Crossguard centre. */
  g: P;
  /** Direction from the guard toward the tip, in chebyshev units (max(|x|,|y|) = 1). */
  u: P;
  len?: number;
}

const at = (b: Blade, t: number): P => [Math.round(b.g[0] + b.u[0] * t), Math.round(b.g[1] + b.u[1] * t)];

const drawSword = (b: Blade): { layer: Layer; tip: P; hands: [P, P] } => {
  const l = new Layer();
  const len = b.len ?? 19;
  const vertical = Math.abs(b.u[1]) >= Math.abs(b.u[0]);
  const side = (p: P, o: number): P => (vertical ? [p[0] + o, p[1]] : [p[0], p[1] + o]);
  // blade: light edge on the up-left side, steel core, dark back edge
  for (let t = 1; t <= len; t++) {
    const p = at(b, t);
    const tipZone = t >= len - 1;
    l.set(...p, tipZone ? "M" : "M");
    if (!tipZone || t === len - 1) l.set(...side(p, -1), "W");
    if (!tipZone) l.set(...side(p, 1), t < 4 ? "k" : "m");
  }
  // fuller groove near the guard
  for (let t = 2; t <= 8; t++) l.set(...at(b, t), "m");
  // grip
  for (let t = -6; t <= -1; t++) {
    l.set(...at(b, t), t % 2 ? "r" : "w");
  }
  // pommel
  const pm = at(b, -7);
  l.set(...pm, "y");
  l.set(...side(pm, -1), "Y");
  l.set(...side(pm, 1), "g");
  l.set(...at(b, -8), "g");
  // crossguard, perpendicular to the blade
  for (let o = -3; o <= 3; o++) {
    const p = side(at(b, 0), o);
    l.set(...p, o < -1 ? "Y" : o > 1 ? "g" : "y");
    const q: P = vertical ? [p[0], p[1] + (b.u[1] > 0 ? -1 : 1)] : [p[0] + (b.u[0] > 0 ? -1 : 1), p[1]];
    if (Math.abs(o) <= 1) l.set(...q, "g");
  }
  l.set(...side(at(b, 0), 0), "R");
  return { layer: l, tip: at(b, len + 1), hands: [at(b, -2), at(b, -5)] };
};

// ---------------------------------------------------------------- parts

/** Head with crown, facing right (outline added later). Chin = row 11, neck under x 4..7. */
const HEAD: Grid = [
  "..y...Y...y.",
  ".yy..YYy.yg.",
  ".yYYYYRyyyg.",
  ".gggggggggg.",
  "HHhhhhhsss..",
  "HHHhhssssss.",
  "HHhhSssosss.",
  "HHhSSssssss.",
  ".HHSssssss..",
  ".HhhSshhhh..",
  "..Hhhhhhhh..",
  "...Hhhhh....",
];

const TORSO: Grid = [
  "......kmMMMk........",
  "....kmMMMMMmk.yyy...",
  "...mMMMMMMMmmyMMmy..",
  "..mMyyyyyyyymyMmmky.",
  "..myLLLBBBBBymMmmkk.",
  "..myLBBBBBBDymmmkk..",
  "..myLBBBYBBDykkkk...",
  "..myBBBYYYBDDy......",
  "..myBBBBYBBDDy......",
  "..mkyBBBYBDDNy......",
  "..mkyBBBBBDDNy......",
  "...kyBBBBDDDNy......",
  "...kyBBBBDDNy.......",
  "...rrrrrrYrrrr......",
  "...rwwwwyYywwr......",
];

const PAULDRON: Grid = [
  "..yyyy..",
  ".yWWMMy.",
  "yWMMMmmy",
  "yMMMmmmk",
  "gmmmmmkk",
  ".gkkkkk.",
];

const SKIRT: Grid = [
  "..LBBBBBBDDN..",
  "..LBBBBBBDDN..",
  ".LLBBDBBBDDNN.",
  ".LBBBDBBBDNDN.",
  ".LBBDDBBBDNDN.",
  ".LBBDBBBDDNDNN",
  "LBBBDBBBDDNDNN",
  "LBBDDBBBDNNDNN",
  "yyyyyyyyyyyggg",
];

const CAPE: Grid = [
  ".......NNNN.",
  "......NDDNN.",
  ".....NDDDNN.",
  "....NDDDNNN.",
  "....NDDNDNN.",
  "...NDDNNDNN.",
  "...NDDNDDNN.",
  "..NDDNNDDNN.",
  "..NDDNNDNNN.",
  "..NDNNDDNNN.",
  ".NDDNNDDNNN.",
  ".NDDNDDNNNN.",
  ".NDNNDDNNNN.",
  "NDDNNDNNNN..",
  "NDDNDDNNNN..",
  "NDNNDDNNN...",
  "NDNNDNNNN...",
  "NNDNNDNNN...",
  "NNNNNNNN....",
  "NNN.NNN.....",
];

const FOOTG: Grid = [
  "MMmk...",
  "MMmmmk.",
  "mmkkkkk",
];

const GAUNT: Grid = [
  "MMm",
  "Mmk",
  "mkk",
];

// ---------------------------------------------------------------- pose

interface Pose {
  /** Body offset from the idle position (moves torso, head, skirt, cape, shoulders). */
  bx?: number;
  by?: number;
  /** Upper-body lean, in pixels of shift per row above the belt (+ forward, - back). */
  lean?: number;
  head?: P;
  headGrid?: Grid;
  cape?: Grid;
  capeAt?: P;
  nearLeg: [P, P, P];
  farLeg: [P, P, P];
  nearElbow: P;
  farElbow: P;
  blade: Blade;
  /** Which grip point the near hand takes: 0 = by the guard, 1 = by the pommel. */
  nearHand?: 0 | 1;
  smear?: { c: P; r: number; a0: number; a1: number };
  glint?: boolean;
}

const LEG = ["W", "M", "m", "k"];
const ARM = ["M", "m", "k"];
const FAR = ["m", "k", "k"];

const shear = (l: Layer, pivot: number, lean: number): Layer => {
  if (!lean) return l;
  const out = new Layer();
  for (let y = 0; y < H; y++) {
    const off = Math.round(Math.max(0, pivot - y) * lean);
    for (let x = 0; x < W; x++) if (l.a[y][x] !== ".") out.set(x + off, y, l.a[y][x]);
  }
  return out;
};

/** A crescent streak along a circle: thin at the trailing end, thick at the leading end. */
const drawSmear = (l: Layer, c: P, r: number, a0: number, a1: number): void => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = x - c[0];
      const dy = y - c[1];
      const d = Math.sqrt(dx * dx + dy * dy);
      let a = (Math.atan2(dy, dx) * 180) / Math.PI;
      const lo = Math.min(a0, a1);
      const hi = Math.max(a0, a1);
      while (a < lo) a += 360;
      while (a > lo + 360) a -= 360;
      if (a > hi) continue;
      const t = (a - a0) / (a1 - a0);
      const th = 1 + t * 5;
      const k = r - d;
      if (k < -0.5 || k > th) continue;
      l.set(x, y, k < 0.6 ? "W" : k < 2 ? "M" : "L");
    }
};

const build = (p: Pose): { grid: Grid; tip: P } => {
  const bx = p.bx ?? 0;
  const by = p.by ?? 0;
  const lean = p.lean ?? 0;
  const tx = 26 + bx;
  const ty = 35 + by;
  const pivot = ty + 14;
  const sh = (q: P): P => [q[0] + Math.round(Math.max(0, pivot - q[1]) * lean), q[1]];
  const nearSh = sh([tx + 4, ty + 4]);
  const farSh = sh([tx + 16, ty + 3]);
  const sw = drawSword(p.blade);
  const nh = p.nearHand ?? 1;

  const out = new Layer();
  const cape = new Layer().stamp(p.cape ?? CAPE, tx - 6 + (p.capeAt?.[0] ?? 0), ty + 1 + (p.capeAt?.[1] ?? 0));
  out.over(shear(cape, pivot, lean).outline());

  if (p.smear) {
    const sm = new Layer();
    drawSmear(sm, p.smear.c, p.smear.r, p.smear.a0, p.smear.a1);
    out.over(sm);
  }

  const farArm = new Layer();
  limb(farArm, [farSh, p.farElbow, sw.hands[1 - nh]], FAR);
  farArm.stamp(GAUNT, sw.hands[1 - nh][0] - 1, sw.hands[1 - nh][1] - 1);
  out.over(farArm.outline());

  const leg = (q: [P, P, P], dark: boolean): Layer => {
    const l = new Layer();
    limb(l, [q[0], q[1]], dark ? ["m", "m", "k", "k", "k"] : ["W", "M", "M", "m", "k"]);
    limb(l, [q[1], q[2]], dark ? ["m", "m", "k", "k"] : LEG);
    l.set(q[1][0], q[1][1], dark ? "M" : "W");
    l.stamp(FOOTG, q[2][0] - 1, q[2][1] + 1);
    return l.outline();
  };
  out.over(leg(p.farLeg, true)).over(leg(p.nearLeg, false));

  const skirt = new Layer().stamp(SKIRT, tx + 2, ty + 15);
  const torso = shear(new Layer().stamp(TORSO, tx, ty), pivot, lean);
  out.over(skirt.over(torso).outline());
  const hx = tx + 5 + (p.head?.[0] ?? 0) + Math.round(11 * lean);
  out.over(new Layer().stamp(p.headGrid ?? HEAD, hx, ty - 11 + (p.head?.[1] ?? 0)).outline());

  out.over(sw.layer.outline());

  const nearArm = new Layer();
  limb(nearArm, [nearSh, p.nearElbow, sw.hands[nh]], ARM);
  nearArm.stamp(GAUNT, sw.hands[nh][0] - 1, sw.hands[nh][1] - 1);
  nearArm.stamp(PAULDRON, nearSh[0] - 4, nearSh[1] - 3);
  out.over(nearArm.outline());

  if (p.glint) {
    const [gx, gy] = sw.tip;
    const star: Grid = ["...W...", "...G...", "..GWG..", "WGWWWGW", "..GWG..", "...G...", "...W..."];
    out.stamp(star, gx - 3, gy - 3);
  }
  return { grid: fit(out.grid(), W, H), tip: sw.tip };
};

/** Tucked somersault ball: cape wrapped round, head down, knees in, sword hugged along the body. */
const buildBall = (): { grid: Grid; tip: P } => {
  const cx = 36;
  const cy = 50;
  const R = 11.5;
  const out = new Layer();
  const cape = new Layer();
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > R) continue;
      const lit = (-dx - dy) / R;
      let c = "N";
      if (lit > 0.35) c = "D";
      if (d > R - 2.2 && lit > 0.5) c = "B";
      if (d > R - 1 && lit > 0.9) c = "L";
      cape.set(x, y, c);
    }
  out.over(cape.outline());
  const sw = drawSword({ g: [cx - 2, cy + 6], u: [-1, -1], len: 14 });
  const legs = new Layer();
  limb(legs, [[cx + 1, cy + 6], [cx + 8, cy + 3]], ["W", "M", "M", "m", "k"]);
  limb(legs, [[cx + 8, cy + 3], [cx + 3, cy + 9]], LEG);
  legs.set(cx + 8, cy + 3, "W");
  out.over(legs.outline());
  const head = new Layer().stamp(rot(HEAD), cx + 1, cy - 11);
  out.over(head.outline());
  out.over(sw.layer.outline());
  const arm = new Layer();
  limb(arm, [[cx - 2, cy - 3], [cx - 3, cy + 3], sw.hands[0]], ARM);
  arm.stamp(GAUNT, sw.hands[0][0] - 1, sw.hands[0][1] - 1);
  out.over(arm.outline());
  return { grid: fit(out.grid(), W, H), tip: sw.tip };
};

/** Rotates a grid 90 degrees clockwise. */
const rot = (g: Grid): Grid => g[0].split("").map((_, x) => g.map((r) => r[x]).reverse().join(""));

const CAPE_FLOW: Grid = [
  "...............NNNN",
  "...........NNNNDDNN",
  ".......NNNNDDDDDDNN",
  "....NNNDDDDDNNNDDNN",
  "..NNDDDDNNNNDDDDNNN",
  ".NDDDNNNDDDDDDNNNNN",
  "NDDNNDDDDNNNNDDNNN.",
  "NDNNDDNNNNNDDDNNN..",
  ".NNDDNNNNDDNNNNN...",
  "..NNNNNNNNNNNN.....",
  "...NNN..NNNN.......",
];

const HEAD_HIT: Grid = HEAD.map((r, y) => (y === 6 ? r.replace("o", "H") : r));

const IDLE: Pose = {
  nearLeg: [[31, 52], [29, 62], [28, 70]],
  farLeg: [[39, 52], [42, 62], [43, 70]],
  nearElbow: [31, 47],
  farElbow: [45, 45],
  blade: { g: [46, 42], u: [1, -1] },
};

const bump = (q: P, dx: number, dy: number): P => [q[0] + dx, q[1] + dy];

const poses: Record<FrameId, Pose> = {
  idle0: IDLE,
  idle1: { ...IDLE, by: 1, nearElbow: bump(IDLE.nearElbow, 0, 1), farElbow: bump(IDLE.farElbow, 0, 1), blade: { ...IDLE.blade, g: bump(IDLE.blade.g, 0, 1) } },
  walk0: {
    lean: 0.15,
    cape: CAPE_FLOW,
    capeAt: [-8, 0],
    nearLeg: [[32, 52], [38, 60], [40, 69]],
    farLeg: [[38, 52], [33, 61], [27, 66]],
    nearElbow: [33, 47],
    farElbow: [46, 45],
    blade: { g: [48, 43], u: [1, -1] },
  },
  walk1: {
    by: 1,
    lean: 0.15,
    cape: CAPE_FLOW,
    capeAt: [-8, 1],
    nearLeg: [[32, 53], [35, 62], [33, 70]],
    farLeg: [[38, 53], [36, 61], [29, 63]],
    nearElbow: [33, 48],
    farElbow: [46, 46],
    blade: { g: [48, 44], u: [1, -1] },
  },
  walk2: {
    lean: 0.15,
    cape: CAPE_FLOW,
    capeAt: [-8, 0],
    nearLeg: [[32, 52], [29, 61], [23, 66]],
    farLeg: [[38, 52], [43, 60], [45, 69]],
    nearElbow: [33, 47],
    farElbow: [46, 45],
    blade: { g: [48, 43], u: [1, -1] },
  },
  walk3: {
    by: 1,
    lean: 0.15,
    cape: CAPE_FLOW,
    capeAt: [-8, 1],
    nearLeg: [[32, 53], [33, 61], [27, 64]],
    farLeg: [[38, 53], [41, 62], [39, 70]],
    nearElbow: [33, 48],
    farElbow: [46, 46],
    blade: { g: [48, 44], u: [1, -1] },
  },
  guard: {
    by: 2,
    lean: -0.1,
    nearLeg: [[31, 54], [27, 63], [26, 70]],
    farLeg: [[39, 54], [44, 62], [45, 70]],
    nearElbow: [33, 47],
    farElbow: [45, 44],
    blade: { g: [43, 35], u: [0.5, -1] },
    nearHand: 1,
  },
  windup: {
    lean: -0.15,
    head: [-1, 0],
    cape: CAPE_FLOW,
    capeAt: [-6, 2],
    nearLeg: [[31, 52], [28, 62], [26, 70]],
    farLeg: [[39, 52], [44, 61], [46, 70]],
    nearElbow: [26, 32],
    farElbow: [38, 31],
    blade: { g: [28, 22], u: [-1, 0.5] },
    nearHand: 1,
  },
  attack0: {
    by: 2,
    lean: 0.25,
    cape: CAPE_FLOW,
    capeAt: [-8, 0],
    nearLeg: [[31, 54], [26, 62], [22, 70]],
    farLeg: [[39, 54], [46, 60], [48, 70]],
    nearElbow: [38, 44],
    farElbow: [49, 42],
    blade: { g: [54, 36], u: [1, -0.5] },
    smear: { c: [42, 40], r: 22, a0: -170, a1: -30 },
  },
  attack1: {
    by: 5,
    lean: 0.4,
    cape: CAPE_FLOW,
    capeAt: [-6, 2],
    nearLeg: [[31, 57], [25, 64], [20, 70]],
    farLeg: [[39, 57], [47, 62], [48, 70]],
    nearElbow: [42, 50],
    farElbow: [51, 48],
    blade: { g: [52, 57], u: [0.5, 1], len: 15 },
    nearHand: 1,
  },
  hit: {
    by: 1,
    lean: -0.3,
    bx: -2,
    head: [-2, 1],
    headGrid: HEAD_HIT,
    nearLeg: [[29, 53], [26, 62], [25, 70]],
    farLeg: [[37, 53], [42, 60], [44, 67]],
    nearElbow: [27, 46],
    farElbow: [40, 46],
    blade: { g: [40, 55], u: [1, 0.5] },
  },
  crouch: {
    by: 7,
    lean: 0.35,
    nearLeg: [[31, 59], [24, 64], [26, 70]],
    farLeg: [[39, 59], [46, 62], [44, 70]],
    nearElbow: [37, 53],
    farElbow: [46, 52],
    blade: { g: [36, 60], u: [-1, 0.5] },
  },
  air: {
    by: -2,
    lean: 0.1,
    cape: CAPE_FLOW,
    capeAt: [-6, -3],
    nearLeg: [[31, 50], [38, 55], [32, 62]],
    farLeg: [[38, 50], [44, 54], [40, 61]],
    nearElbow: [28, 30],
    farElbow: [38, 29],
    blade: { g: [33, 20], u: [-1, -0.5] },
    nearHand: 1,
  },
  victory0: {
    cape: CAPE_FLOW,
    capeAt: [-7, 0],
    nearLeg: [[31, 52], [28, 62], [26, 70]],
    farLeg: [[39, 52], [43, 62], [45, 70]],
    nearElbow: [32, 30],
    farElbow: [44, 31],
    blade: { g: [42, 20], u: [0.5, -1], len: 17 },
    nearHand: 1,
  },
  victory1: {} as Pose,
  special: {} as Pose,
};
poses.victory1 = { ...poses.victory0, glint: true };

const frames = {} as Record<FrameId, Grid>;
const tips: Partial<Record<FrameId, [number, number]>> = {};
for (const id of FRAME_IDS) {
  const r = id === "special" ? buildBall() : build(poses[id]);
  frames[id] = r.grid;
  tips[id] = r.tip;
}

const sheet: SpriteSheet = { w: W, h: H, foot: FOOT, frames, tips };

export default sheet;
