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

const drawSword = (b: Blade, grip: [number, number] = [-5, -2]): { layer: Layer; tip: P; hands: [P, P] } => {
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
  const guardTone = (o: number): string => {
    if (o < -1) return "Y";
    if (o > 1) return "g";
    return "y";
  };
  const backStep = (u: number): number => (u > 0 ? -1 : 1);
  for (let o = -3; o <= 3; o++) {
    const p = side(at(b, 0), o);
    l.set(...p, guardTone(o));
    const q: P = vertical ? [p[0], p[1] + backStep(b.u[1])] : [p[0] + backStep(b.u[0]), p[1]];
    if (Math.abs(o) <= 1) l.set(...q, "g");
  }
  l.set(...side(at(b, 0), 0), "R");
  return { layer: l, tip: at(b, len + 1), hands: [at(b, grip[0]), at(b, grip[1])] };
};

// ---------------------------------------------------------------- parts

/** Head with crown, facing right (outline added later). Chin = row 11, neck under x 4..7. */
const HEAD: Grid = [
  "..y...Y...y.",
  ".yy..YYy.yg.",
  ".yYYYYRyyyg.",
  ".gggggggggg.",
  "hhhhhHsssss.",
  "hhhhHSssHss.",
  "hhhHSsSsoss.",
  "HhhHSssssss",
  ".HHHSsssssSs",
  ".HHhSShhhhS.",
  "..HhhhhhhH..",
  "...HHhhhH...",
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
  ".........NNN",
  "........NDDN",
  ".......NDDDN",
  ".......BDDNN",
  "......BDDDNN",
  "......BDDNNN",
  ".....BDDDNNN",
  ".....BDDNDNN",
  "....BDDDNDNN",
  "....BDDNNDDN",
  "...BDDDNNDDN",
  "...BDDNNDDDN",
  "...BDDNNDDNN",
  "..BDDDNNDDNN",
  "..BDDNNDDDNN",
  "..BDDNNDDNNN",
  ".BDDDNNDDNNN",
  ".BDDNNNDDNNN",
  ".BDDNNDDDNNN",
  "BDDDNNDDNNNN",
  "BDDNNNDDNNNN",
  "BDDNNDDDNNN.",
  "yyyNNyyyNN..",
  ".gg...gg....",
];


const FOOTG: Grid = [
  "MMmk...",
  "MMmmmk.",
  "mmkkkkk",
];

const GAUNT: Grid = [
  "WMm",
  "Mmk",
  "mkk",
];

/** Elbow cop: a round plate with a lit top-left. */
const ELBOW: Grid = [
  ".Mm.",
  "MWMk",
  "mMmk",
  ".kk.",
];

/** Arm from shoulder through elbow to hand: steel tube, elbow cop, gold cuff above the gauntlet. */
const arm = (l: Layer, sh: P, el: P, hand: P, ramp: string[], far = false): void => {
  limb(l, [sh, el, hand], ramp);
  const n = Math.max(Math.abs(hand[0] - el[0]), Math.abs(hand[1] - el[1]));
  if (n > 3) {
    const t = (n - 2) / n;
    const c: P = [Math.round(el[0] + (hand[0] - el[0]) * t), Math.round(el[1] + (hand[1] - el[1]) * t)];
    const vertical = Math.abs(hand[1] - el[1]) >= Math.abs(hand[0] - el[0]);
    const cuffTone = (o: number): string => {
      if (far) return "g";
      if (o < 1) return "y";
      return "g";
    };
    [-1, 0, 1].forEach((o) => l.set(vertical ? c[0] + o : c[0], vertical ? c[1] : c[1] + o, cuffTone(o)));
  }
  if (!far) l.stamp(ELBOW, el[0] - 1, el[1] - 1);
  l.stamp(far ? ["mmk", "mkk", "kkk"] : GAUNT, hand[0] - 1, hand[1] - 1);
};

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
  /** Grip positions (steps behind the guard) of the near and far hand. */
  grip?: [number, number];
  /** Torso rows folded away (chest bending forward). */
  squash?: number;
  /** Draw the sword behind the body (overhead windups). */
  swordBehind?: boolean;
  /** The far hand leaves the grip and goes here. */
  farFree?: P;
  smear?: { c: P; r: number; a0: number; a1: number };
  glint?: boolean;
}

const LEG = ["M", "W", "m", "k"];
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
      const th = 0.6 + Math.pow(t, 1.6) * 6.5;
      const k = r - d;
      if (k < -0.5 || k > th) continue;
      let tone = "B";
      if (k < 0.9 || th < 2) tone = "W";
      else if (k < th * 0.65) tone = "L";
      l.set(x, y, tone);
    }
};

const build = (p: Pose): { grid: Grid; tip: P } => {
  const bx = p.bx ?? 0;
  const by = p.by ?? 0;
  const lean = p.lean ?? 0;
  const squash = p.squash ?? 0;
  const tx = 26 + bx;
  const ty = 35 + by;
  const ty2 = ty + squash;
  const pivot = ty + 14;
  const sh = (q: P): P => [q[0] + Math.round(Math.max(0, pivot - q[1]) * lean), q[1]];
  const nearSh = sh([tx + 4, ty2 + 4]);
  const farSh = sh([tx + 16, ty2 + 3]);
  const sw = drawSword(p.blade, p.grip);
  const [nearGrip, farGrip] = sw.hands;

  const out = new Layer();
  const cape = new Layer().stamp(p.cape ?? CAPE, tx - 6 + (p.capeAt?.[0] ?? 0), ty2 + 1 + (p.capeAt?.[1] ?? 0));
  out.over(shear(cape, pivot, lean).outline());

  if (p.smear) {
    const sm = new Layer();
    drawSmear(sm, p.smear.c, p.smear.r, p.smear.a0, p.smear.a1);
    out.over(sm);
  }
  if (p.swordBehind) out.over(sw.layer.outline());

  const farHand = p.farFree ?? farGrip;
  const farArm = new Layer();
  arm(farArm, farSh, p.farElbow, farHand, FAR, true);
  out.over(farArm.outline());

  const leg = (q: [P, P, P], dark: boolean): Layer => {
    const l = new Layer();
    limb(l, [q[0], q[1]], dark ? ["m", "M", "m", "k", "k"] : ["M", "W", "M", "m", "k"]);
    limb(l, [q[1], q[2]], dark ? ["m", "M", "k", "k"] : LEG);
    // poleyn (knee cop): a rounded plate with a crisp highlight
    l.stamp(dark ? [".mk", "mMk", "kkk"] : [".MMm", "MWMk", "mMmk", ".kk."], q[1][0] - 1, q[1][1] - 1);
    l.stamp(FOOTG, q[2][0] - 1, q[2][1] + 1);
    return l.outline();
  };
  out.over(leg(p.farLeg, true)).over(leg(p.nearLeg, false));

  const drop = SQUASH_ROWS.slice(0, squash);
  const skirt = new Layer().stamp(SKIRT, tx + 2, ty + 15);
  const torso = shear(new Layer().stamp(TORSO.filter((_, r) => !drop.includes(r)), tx, ty2), pivot, lean);
  out.over(skirt.over(torso).outline());
  const hx = tx + 5 + (p.head?.[0] ?? 0) + Math.round((pivot - ty2) * lean);
  const hy = ty2 - 11 + (p.head?.[1] ?? 0);
  out.over(new Layer().stamp(p.headGrid ?? HEAD, hx, hy).outline());

  if (!p.swordBehind) out.over(sw.layer.outline());

  const nearArm = new Layer();
  arm(nearArm, nearSh, p.nearElbow, nearGrip, ARM);
  nearArm.stamp(PAULDRON, nearSh[0] - 4, nearSh[1] - 3);
  out.over(nearArm.outline());

  if (p.glint) {
    const [gx, gy] = sw.tip;
    const star: Grid = ["...W...", "...G...", "..GWG..", "WGWWWGW", "..GWG..", "...G...", "...W..."];
    out.stamp(star, gx - 3, gy - 3);
  }
  return { grid: fit(out.grid(), W, H), tip: sw.tip };
};

/** Torso rows dropped (in this order) when the chest folds forward. */
const SQUASH_ROWS = [6, 9, 11, 8, 10];

/** Rotates a grid 90 degrees clockwise (top goes right). */
const rotCW = (g: Grid): Grid => {
  const w = Math.max(...g.map((r) => r.length));
  const rows = g.map((r) => r.padEnd(w, "."));
  return Array.from({ length: w }, (_, y) => rows.map((_, x) => rows[rows.length - 1 - x][y]).join(""));
};

/**
 * Tucked somersault ball: the cape wrapped round him with swirling folds, head tucked forward
 * (crown leading), knees drawn to the chest, sword hugged flat under him. Centred low (near the
 * foot anchor) so the game's spin around the anchor stays a tight roll rather than a wide orbit.
 */
const buildBall = (): { grid: Grid; tip: P } => {
  const cx = 35;
  const cy = 61;
  const R = 12.2;
  const out = new Layer();
  const cape = new Layer();
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > R) continue;
      const lit = (-dx - dy) / (d || 1);
      let c = "D";
      if (lit < -0.35 || d < 3) c = "N";
      if (lit > 0.3 && d > R - 4) c = "B";
      if (lit > 0.75 && d > R - 1.6) c = "L";
      // swept folds: two shade arcs following the roll, and a rim light on the shadow side
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (Math.abs(d - (R - 4)) < 0.6 && ang > -200 + 360 * 0 && ang < -95 && ang > -180) c = "D";
      if (Math.abs(d - (R - 4)) < 0.6 && ang > 150) c = "D";
      if (Math.abs(d - (R - 2.6)) < 0.5 && ang > 20 && ang < 80) c = "B";
      cape.set(x, y, c);
    }
  out.over(cape.outline());
  // head tucked: rotated so the crown leads and the face looks down at the knees
  const head = rotCW(HEAD.map((r) => r.padEnd(12, ".")));
  out.over(new Layer().stamp(head, cx - 1, cy - 12).outline());
  // tucked knee drawn up under the chin, shin folded back beneath
  const legs = new Layer();
  limb(legs, [[cx - 2, cy + 3], [cx + 6, cy + 3]], ["W", "M", "m", "k"]);
  limb(legs, [[cx + 6, cy + 4], [cx + 3, cy + 7]], ["M", "m", "k"]);
  legs.stamp(["Mk", "kk"], cx + 6, cy + 2);
  legs.set(cx + 6, cy + 2, "W");
  out.over(legs.outline());
  // the greatsword juts out of the roll, so the spin reads as a whirling blade
  const sw = drawSword({ g: [cx - 6, cy + 7], u: [-1, 0.5], len: 11 }, [-1, -3]);
  out.over(sw.layer.outline());
  const am = new Layer();
  am.stamp(PAULDRON, cx - 8, cy - 6);
  am.stamp(GAUNT, cx - 3, cy + 4);
  am.set(cx - 2, cy + 3, "y");
  am.set(cx - 1, cy + 3, "y");
  am.set(cx, cy + 3, "g");
  out.over(am.outline());
  return { grid: fit(out.grid(), W, H), tip: sw.tip };
};

const CAPE_FLOW: Grid = [
  "...............NNNN.",
  "...........NNNNDDDN.",
  "........NNNDDDDDDDN.",
  ".....NNNDDDDDDBBBDN.",
  "...NNDDDDDBBBBDDDDN.",
  ".NNDDDBBBBDDDDNNNNN.",
  "NDDBBBDDDDNNNNNDDNN.",
  "NDBDDDNNNNNDDDDDNN..",
  ".NDDNNNDDDDDNNNN....",
  ".NNNNDDDNNNN........",
  "..NN.NNNN...........",
];

const HEAD_HIT: Grid = HEAD.map((r, y) => (y === 6 ? r.replace("o", "H") : r));

const IDLE: Pose = {
  nearLeg: [[31, 52], [29, 62], [28, 70]],
  farLeg: [[39, 52], [42, 62], [43, 70]],
  nearElbow: [31, 50],
  farElbow: [44, 45],
  blade: { g: [44, 44], u: [1, -1] },
};

const bump = (q: P, dx: number, dy: number): P => [q[0] + dx, q[1] + dy];

const WALK = (by: number, nearLeg: [P, P, P], farLeg: [P, P, P]): Pose => ({
  by,
  lean: 0.25,
  cape: CAPE_FLOW,
  capeAt: [-8, 0],
  nearLeg,
  farLeg,
  nearElbow: [33, 50 + by],
  farElbow: [46, 45 + by],
  blade: { g: [47, 44 + by], u: [1, -1] },
});

const poses: Record<FrameId, Pose> = {
  idle0: IDLE,
  idle1: { ...IDLE, by: 1, nearElbow: bump(IDLE.nearElbow, 0, 1), farElbow: bump(IDLE.farElbow, 0, 1), blade: { ...IDLE.blade, g: bump(IDLE.blade.g, 0, 1) } },
  walk0: WALK(0, [[32, 52], [38, 60], [40, 69]], [[38, 52], [33, 61], [27, 66]]),
  walk1: WALK(1, [[32, 53], [35, 62], [33, 70]], [[38, 53], [36, 61], [29, 63]]),
  walk2: WALK(0, [[32, 52], [29, 61], [23, 66]], [[38, 52], [43, 60], [45, 69]]),
  walk3: WALK(1, [[32, 53], [33, 61], [27, 64]], [[38, 53], [41, 62], [39, 70]]),
  guard: {
    by: 2,
    nearLeg: [[31, 54], [27, 63], [26, 70]],
    farLeg: [[39, 54], [44, 62], [45, 70]],
    nearElbow: [33, 48],
    farElbow: [45, 45],
    blade: { g: [43, 36], u: [0.5, -1] },
  },
  windup: {
    lean: -0.25,
    head: [0, 0],
    cape: CAPE_FLOW,
    capeAt: [-7, 3],
    swordBehind: true,
    nearLeg: [[31, 52], [28, 62], [26, 70]],
    farLeg: [[39, 52], [44, 61], [46, 70]],
    nearElbow: [25, 31],
    farElbow: [39, 28],
    blade: { g: [26, 19], u: [-1, -0.5], len: 19 },
    grip: [-2, -5],
  },
  attack0: {
    by: 2,
    lean: 0.5,
    squash: 2,
    cape: CAPE_FLOW,
    capeAt: [-9, -2],
    nearLeg: [[31, 54], [26, 62], [22, 70]],
    farLeg: [[39, 54], [46, 60], [48, 70]],
    nearElbow: [40, 46],
    farElbow: [51, 44],
    blade: { g: [54, 39], u: [1, -0.5], len: 17 },
    smear: { c: [45, 42], r: 23, a0: -175, a1: -25 },
  },
  attack1: {
    by: 5,
    lean: 1,
    squash: 4,
    cape: CAPE_FLOW,
    capeAt: [-4, -3],
    nearLeg: [[31, 57], [25, 64], [20, 70]],
    farLeg: [[39, 57], [47, 62], [49, 70]],
    nearElbow: [40, 58],
    farElbow: [53, 51],
    blade: { g: [51, 58], u: [0.5, 1], len: 15 },
  },
  hit: {
    by: 1,
    lean: -0.25,
    bx: -2,
    head: [-1, 1],
    headGrid: HEAD_HIT,
    nearLeg: [[29, 53], [26, 62], [25, 70]],
    farLeg: [[37, 53], [42, 60], [44, 67]],
    nearElbow: [27, 47],
    farElbow: [40, 47],
    blade: { g: [42, 55], u: [1, 0.5] },
  },
  crouch: {
    by: 7,
    lean: 0.5,
    squash: 3,
    cape: CAPE_FLOW,
    capeAt: [-7, 6],
    swordBehind: true,
    nearLeg: [[31, 59], [26, 65], [21, 70]],
    farLeg: [[39, 59], [47, 61], [46, 70]],
    nearElbow: [39, 53],
    farElbow: [49, 52],
    blade: { g: [41, 55], u: [-1, -0.5], len: 19 },
    grip: [-5, -2],
  },
  air: {
    by: -2,
    lean: 0.25,
    cape: CAPE_FLOW,
    capeAt: [-7, -3],
    swordBehind: true,
    nearLeg: [[31, 50], [38, 55], [32, 62]],
    farLeg: [[38, 50], [44, 54], [40, 61]],
    nearElbow: [24, 31],
    farElbow: [36, 27],
    blade: { g: [24, 21], u: [-1, -0.25], len: 18 },
    grip: [-2, -5],
  },
  victory0: {
    cape: CAPE_FLOW,
    capeAt: [-7, 0],
    nearLeg: [[31, 52], [28, 62], [26, 70]],
    farLeg: [[39, 52], [43, 62], [45, 70]],
    nearElbow: [29, 32],
    farElbow: [46, 44],
    farFree: [41, 50],
    blade: { g: [30, 22], u: [0, -1], len: 18 },
    grip: [-3, -6],
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
