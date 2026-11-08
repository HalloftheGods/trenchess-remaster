import { FRAME_IDS, fit, outline, type FrameId, type Grid, type SpriteSheet } from "../sheet";

/**
 * Nimbus Jumper (the Pawn, infantry): a nimble young footsoldier in a steel kettle hat with an
 * army band and a little white cloud (the nimbus) on top, a light army gambeson with a gold
 * belt, dark hose and leather boots, a round buckler on the far arm and a spear with a
 * leaf-shaped steel head and an army tassel.
 *
 * Frames are posed puppets rasterised pixel-exactly: limbs and torso are shapes sampled at pixel
 * centres and shaded from their surface normal (light from the top-left) into 3-4 tone ramps.
 * Parts drawn over others get a selective dark line, the silhouette gets a 1px outline, and the
 * focal details (head, buckler, spearhead) are hand-drawn or drawn pixel by pixel.
 */

const W = 52;
const H = 52;
const SOLE = 49; // last row of the boots; the outline below it (row 50) is the floor contact

type P = [number, number];
type Test = (x: number, y: number) => boolean;
type Shade = (x: number, y: number) => number;

const D2R = Math.PI / 180;
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const len = (p: P): number => Math.hypot(p[0], p[1]);
const rot = (p: P, deg: number): P => {
  const a = deg * D2R;
  return [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
};
const dir = (deg: number, l = 1): P => [Math.cos(deg * D2R) * l, Math.sin(deg * D2R) * l];
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

const LX = -0.52;
const LY = -0.68;
const LZ = 0.52;
const light = (nx: number, ny: number, nz: number): number => nx * LX + ny * LY + nz * LZ;

interface Shape {
  test: Test;
  shade: Shade;
}

const ellipse = (c: P, rx: number, ry: number): Shape => ({
  test: (x, y) => ((x - c[0]) / rx) ** 2 + ((y - c[1]) / ry) ** 2 <= 1,
  shade: (x, y) => {
    const nx = (x - c[0]) / rx;
    const ny = (y - c[1]) / ry;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    return light(nx, ny, nz);
  },
});

const capsule = (a: P, b: P, ra: number, rb = ra): Shape => {
  const near = (x: number, y: number): { d: P; r: number } => {
    const v = sub(b, a);
    const l2 = v[0] * v[0] + v[1] * v[1] || 1;
    const t = clamp(((x - a[0]) * v[0] + (y - a[1]) * v[1]) / l2, 0, 1);
    return { d: [x - a[0] - v[0] * t, y - a[1] - v[1] * t], r: ra + (rb - ra) * t };
  };
  return {
    test: (x, y) => {
      const { d, r } = near(x, y);
      return d[0] * d[0] + d[1] * d[1] <= r * r;
    },
    shade: (x, y) => {
      const { d, r } = near(x, y);
      const nx = d[0] / r;
      const ny = d[1] / r;
      return light(nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)));
    },
  };
};

const polyTest = (pts: P[]): Test => (x, y) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

// ---------------------------------------------------------------- canvas and painting

class Canvas {
  px: string[] = new Array<string>(W * H).fill(".");
  get(x: number, y: number): string {
    return x < 0 || y < 0 || x >= W || y >= H ? "." : this.px[y * W + x];
  }
  set(x: number, y: number, c: string): void {
    if (x >= 0 && y >= 0 && x < W && y < H) this.px[y * W + x] = c;
  }
  grid(): Grid {
    const rows: Grid = [];
    for (let y = 0; y < H; y++) rows.push(this.px.slice(y * W, y * W + W).join(""));
    return rows;
  }
}

type Ramp = { ramp: string[]; cuts: number[] };
const ARMY: Ramp = { ramp: ["L", "B", "D", "N"], cuts: [0.6, 0.12, -0.3] };
const HOSE: Ramp = { ramp: ["c", "C", "q"], cuts: [0.45, -0.05] };
const BOOT: Ramp = { ramp: ["w", "r", "H"], cuts: [0.62, -0.15] };
const SKIN: Ramp = { ramp: ["s", "S"], cuts: [0.05] };

interface PaintOpts {
  ramp: Ramp;
  bias?: number;
  line?: string;
  tone?: (x: number, y: number, ch: string) => string | undefined;
  keep?: boolean;
}

const pick = (r: Ramp, v: number): string => {
  for (let i = 0; i < r.cuts.length; i++) if (v > r.cuts[i]) return r.ramp[i];
  return r.ramp[r.ramp.length - 1];
};

const paint = (cv: Canvas, sh: Shape, o: PaintOpts): void => {
  const col = new Map<number, string>();
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!sh.test(x + 0.5, y + 0.5)) continue;
      let ch = pick(o.ramp, sh.shade(x + 0.5, y + 0.5) + (o.bias ?? 0));
      if (o.tone) ch = o.tone(x, y, ch) ?? ch;
      col.set(y * W + x, ch);
    }
  if (!o.keep)
    for (const [i, ch] of [...col]) {
      const n = [col.get(i - 1), col.get(i + 1), col.get(i - W), col.get(i + W)];
      const same = n.filter((c) => c === ch).length;
      if (same === 0 && n.every((c) => c !== undefined && c === n[0]) && ch !== "W" && ch !== "Y") col.set(i, n[0]!);
    }
  for (const [i, ch] of col) {
    const x = i % W;
    const y = (i - x) / W;
    let c = ch;
    if (o.line) {
      const edge = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => !col.has((y + dy) * W + x + dx) && cv.get(x + dx, y + dy) !== ".");
      if (edge) c = o.line;
    }
    cv.set(x, y, c);
  }
};

const stamp = (cv: Canvas, g: Grid, ox: number, oy: number): void => {
  g.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] !== ".") cv.set(ox + x, oy + y, row[x]);
  });
};

// ---------------------------------------------------------------- hand-drawn details

/**
 * The head in its kettle hat, facing right. 13 x 14; the neck joins at column 7, row 13.
 * Cloud nimbus on top, steel dome, army band, sloping brim shading the eyes.
 */
const HEAD_N: Grid = [
  ".....oo.oo.....",
  "....oXXoXXo....",
  "...oxXXXXXxo...",
  "..oWMxxxxxmko..",
  "..oWMMMMMMmko..",
  "..oLLBBBBBDNo..",
  "oWMMMMMMMMMmmko",
  ".okkkkkkkkkkko.",
  "..oHHhSSSSSSo..",
  "..oHhSsssosSo..",
  "..ohSSssskssso.",
  "...oSsssssSo...",
  "...oSssSSSo....",
  "....oSSSoo.....",
  ".....ooo.......",
];
const HEAD_GRIN: Grid = [
  ...HEAD_N.slice(0, 11),
  "...oSsssssSo...",
  "...oSssoWWo....",
  "....oSSSoo.....",
  ".....ooo.......",
];
const HEAD_HURT: Grid = [
  ...HEAD_N.slice(0, 9),
  "..oHhSsskSkSo..",
  "..ohSSsssssso..",
  "...oSssssSso...",
  "...oSssoko.....",
  "....oSSSoo.....",
  ".....ooo.......",
];
const HEAD: Record<string, Grid> = { n: HEAD_N, grin: HEAD_GRIN, hurt: HEAD_HURT };

/** Round buckler: army face, steel rim and a bright boss. 9 x 9. */
const BUCKLER: Grid = [
  "..ooooo..",
  ".oMMMMmo.",
  "oMLLBBDko",
  "oMLBWMDko",
  "oMBBMmNko",
  "omBDDNNko",
  "omDDNNNko",
  ".okkkkko.",
  "..ooooo..",
];

/**
 * The tucked backflip ball (knees to chest, arms hugging the shins, buckler on the curled back),
 * drawn by hand: at this size a posed puppet folds into mud. 24 x 15, stamped at BALL_AT; the chin
 * rests on the knee, the hand grips the shin and the boot tucks under the seat.
 */
const BALL: Grid = [
  ".....oooo..........ooo..",
  "...ooLLBBo........occCo.",
  "..oLLLBBBDo......occcCqo",
  ".oLLBBBBBDo.....occcCCqo",
  ".ooooooooDDo...occcCCqro",
  "oMMMMMMmkoDo..occcCCqowo",
  "oMLLBBBDkoDDooccCCqqowro",
  "oMLBWWBDDkoDLLBBBsssowro",
  "oMLBWMBDDkoLLBBDDsSSowro",
  "oMBBMmDDNkoBBDDNoSSoowrH",
  "omBDDNNNNkoqqqqooowwrrHo",
  "omDDNNNNNkoyYyoowwwrrrHo",
  ".omDDNNNkoNyyNoHHHHHHHo.",
  "..okkkkkoooNNo.ooooooo..",
  "...ooooo..oo............",
];
const BALL_AT: P = [13, 28];
const BALL_HEAD: P = [17, 16];

// ---------------------------------------------------------------- the pose

interface Pose {
  hip: P;
  /** torso tilt in degrees, + leans forward (right) */
  lean: number;
  head?: "n" | "grin" | "hurt";
  headOff?: P;
  nKnee: P;
  nAnkle: P;
  nFoot?: number;
  fKnee: P;
  fAnkle: P;
  fFoot?: number;
  /** near hand holds the spear, far arm carries the buckler */
  nHand: P;
  nBend?: number;
  fHand: P;
  fBend?: number;
  /** spear direction (butt to tip) in degrees, and where the hand grips it from the butt */
  spear: number;
  grip: number;
  /** buckler drawn in front of the body (guarding) */
  bFront?: boolean;
  /** far hand is a raised fist with the buckler slung behind */
  smear?: boolean;
  glint?: boolean;
  /** knees to chest: the near leg draws over the body */
  tuck?: boolean;
}

const grounded = (x: number): P => [x, SOLE - 2];

const T = (p: Pose, lp: P): P => add(p.hip, rot(lp, p.lean));
const toLocal = (p: Pose, x: number, y: number): P => rot(sub([x, y], p.hip), -p.lean);

const ARM_UP = 4.6;
const ARM_LO = 4.4;

const elbowOf = (sh: P, hand: P, bend: number): P => {
  const d0 = sub(hand, sh);
  const d = Math.min(len(d0), ARM_UP + ARM_LO - 0.01);
  const th = Math.atan2(d0[1], d0[0]);
  const c = clamp((ARM_UP * ARM_UP + d * d - ARM_LO * ARM_LO) / (2 * ARM_UP * d), -1, 1);
  return add(sh, dir(th / D2R + (bend * Math.acos(c)) / D2R, ARM_UP));
};

const SPEAR = 31; // total length butt to tip
const HEAD_LEN = 8;

const spearPt = (p: Pose, u: number, v = 0): P => add(p.nHand, rot([u - p.grip, v], p.spear));
const spearLocal = (p: Pose, x: number, y: number): P => {
  const l = rot(sub([x, y], p.nHand), -p.spear);
  return [l[0] + p.grip, l[1]];
};

const drawLeg = (cv: Canvas, hip: P, knee: P, ankle: P, foot: number, bias: number, near = false): void => {
  paint(cv, capsule(hip, knee, 2.5, 2.0), { ramp: HOSE, bias, line: near ? "q" : "o" });
  // boot: shaft to below the knee, folded cuff
  paint(cv, capsule(knee, ankle, 2.0, 1.8), {
    ramp: BOOT,
    bias,
    tone: (x, y, ch) => {
      const v = sub(ankle, knee);
      const t = ((x + 0.5 - knee[0]) * v[0] + (y + 0.5 - knee[1]) * v[1]) / (len(v) ** 2 || 1);
      if (t < 0.25) return ch === "w" ? "c" : ch === "r" ? "C" : "q"; // hose down to the boot
      if (t < 0.38) return ch === "H" ? "r" : "w"; // turned-down cuff, one band
      return undefined;
    },
  });
  const pts: P[] = [
    [-2, -1.2],
    [1.2, -1.2],
    [3.2, 0.3],
    [4.3, 1.2],
    [4.3, 2.5],
    [-2.3, 2.5],
  ];
  const rp = pts.map((q) => add(ankle, rot(q, foot)));
  paint(
    cv,
    {
      test: polyTest(rp),
      shade: (x, y) => {
        const l = rot(sub([x, y], ankle), -foot);
        return light(0.2, clamp((l[1] - 0.6) / 2, -1, 1), 0.6);
      },
    },
    {
      ramp: BOOT,
      bias,
      line: "o",
      tone: (x, y) => {
        const l = rot(sub([x + 0.5, y + 0.5], ankle), -foot);
        if (l[1] > 1.6) return "H"; // sole
        return undefined;
      },
    },
  );
};

const drawSpear = (cv: Canvas, p: Pose): void => {
  // smear: the thrust drawn as bright speed streaks behind the head
  if (p.smear) {
    const sh: Shape = {
      test: (x, y) => {
        const [u, v] = spearLocal(p, x, y);
        const w = 0.6 + clamp((u - 2) / 26, 0, 1) * 2.6;
        return u > 4 && u < SPEAR - HEAD_LEN + 2 && Math.abs(v + 0.2) < w;
      },
      shade: (x, y) => {
        const [u, v] = spearLocal(p, x, y);
        return (u - 4) / 24 - Math.abs(v) * 0.22;
      },
    };
    paint(cv, sh, { ramp: { ramp: ["W", "M", "L", "B"], cuts: [0.62, 0.42, 0.16] }, keep: true });
  }
  // the shaft: a clean 1px line (with its own dark line so it reads over the body)
  const a = spearPt(p, 0);
  const b = spearPt(p, SPEAR - HEAD_LEN + 1);
  const pts: [number, number][] = [];
  {
    let x0 = Math.round(a[0]);
    let y0 = Math.round(a[1]);
    const x1 = Math.round(b[0]);
    const y1 = Math.round(b[1]);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      pts.push([x0, y0]);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  const onShaft = new Set(pts.map(([x, y]) => y * W + x));
  for (const [x, y] of pts)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
      if (!onShaft.has((y + dy) * W + x + dx)) cv.set(x + dx, y + dy, "o");
  pts.forEach(([x, y], i) => {
    const u = (i / Math.max(1, pts.length - 1)) * (SPEAR - HEAD_LEN);
    cv.set(x, y, u < 1.6 ? "k" : u < 6 ? "r" : "w");
  });
  // leaf-shaped head: widest a third of the way up, ridge down the middle
  const u0 = SPEAR - HEAD_LEN;
  const prof = (u: number): number => {
    const t = (u - u0) / HEAD_LEN;
    if (t < 0 || t > 1) return -1;
    if (t < 0.18) return 0.75; // socket
    const s = (t - 0.18) / 0.82;
    return 1.75 * Math.sin(Math.PI * Math.pow(s, 0.7)) + 0.3 * (1 - s);
  };
  const head: Shape = {
    test: (x, y) => {
      const [u, v] = spearLocal(p, x, y);
      const w = prof(u);
      return w > 0 && Math.abs(v) <= w;
    },
    shade: (x, y) => {
      const [u, v] = spearLocal(p, x, y);
      const w = Math.max(prof(u), 0.5);
      const n = rot([0, v / w], p.spear);
      return light(n[0] * 0.9, n[1] * 0.9, 0.55);
    },
  };
  paint(cv, head, {
    ramp: { ramp: ["W", "M", "m", "k"], cuts: [0.58, 0.2, -0.2] },
    line: "o",
    keep: true,
    tone: (x, y, ch) => {
      const [u] = spearLocal(p, x + 0.5, y + 0.5);
      if (u < u0 + HEAD_LEN * 0.18) return "k";
      return ch;
    },
  });
  // tassel hanging under the socket
  const sk = spearPt(p, u0 - 0.2, 0);
  const tx = Math.round(sk[0]);
  const ty = Math.round(sk[1]);
  const tassel: Grid = p.smear || Math.abs(Math.sin(p.spear * D2R)) < 0.5
    ? ["Ly", "BD", "DN", ".N"]
    : ["Ly", "LB", "BD", "DN", "N."];
  const sway = Math.cos(p.spear * D2R) > 0.3 ? -1 : 0;
  tassel.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== ".") cv.set(tx + i - 1 + (j > 1 ? sway : 0), ty + 1 + j, row[i]);
  });
  if (p.glint) {
    const g = spearPt(p, SPEAR - 0.5, 0);
    const gx = Math.round(g[0]);
    const gy = Math.round(g[1]);
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [3, 0], [0, -3]] as P[])
      cv.set(gx + dx, gy + dy, Math.abs(dx) + Math.abs(dy) <= 1 ? "W" : "G");
  }
};

const drawHand = (cv: Canvas, at: P, bias = 0): void => {
  paint(cv, ellipse(at, 1.7, 1.6), { ramp: SKIN, bias, line: "o", keep: true });
};

const drawArm = (cv: Canvas, sh: P, hand: P, bend: number, bias: number, line: string): void => {
  const el = elbowOf(sh, hand, bend);
  paint(cv, capsule(sh, el, 2.1, 1.9), { ramp: ARMY, bias, line });
  paint(cv, capsule(el, hand, 1.9, 1.6), { ramp: ARMY, bias: bias - 0.05, line });
};

/** The buckler rides on the forearm, a little back from the hand. */
const bucklerAt = (fSh: P, p: Pose): [number, number] => {
  const el = elbowOf(fSh, p.fHand, p.fBend ?? 1);
  const c = add(p.fHand, [(el[0] - p.fHand[0]) * 0.35, (el[1] - p.fHand[1]) * 0.35]);
  return [Math.round(c[0]), Math.round(c[1])];
};

const DX = 1; // the whole figure sits one pixel right of where the poses put it

/** Lengthens the legs by two pixels: the upper body rises, knees rise one, grounded feet stay. */
const stretch = (p: Pose): Pose => {
  if (p.tuck) return p;
  const up = (q: P, d: number): P => [q[0], q[1] - d];
  const air = p.nAnkle[1] < SOLE - 4 && p.fAnkle[1] < SOLE - 4;
  const k = air ? 2 : 1;
  return {
    ...p,
    hip: up(p.hip, 2),
    nHand: up(p.nHand, 2),
    fHand: up(p.fHand, 2),
    nKnee: up(p.nKnee, k),
    fKnee: up(p.fKnee, k),
    nAnkle: air ? up(p.nAnkle, 2) : p.nAnkle,
    fAnkle: air ? up(p.fAnkle, 2) : p.fAnkle,
  };
};

const render = (p0: Pose): Grid => {
  const p = stretch(p0);
  const cv = new Canvas();
  if (p.tuck) {
    drawSpear(cv, p);
    stamp(cv, BALL, BALL_AT[0], BALL_AT[1]);
    stamp(cv, BUCKLER, BALL_AT[0], BALL_AT[1] + 4);
    stamp(cv, HEAD_N, BALL_HEAD[0], BALL_HEAD[1]);
    return outline(cv.grid().map((r) => (".".repeat(DX) + r).slice(0, W)));
  }
  const nHip = T(p, [-1.6, 0.5]);
  const fHip = T(p, [1.8, 0]);
  const nSh = T(p, [-1.2, -7.6]);
  const fSh = T(p, [2.4, -8]);
  const neck = T(p, [1, -9.6]);
  const FAR = -0.25;

  // far side (in the tuck it is hidden behind the ball, and the spear lies along the back)
  const bAt = p.tuck ? ([Math.round(p.fHand[0]), Math.round(p.fHand[1])] as [number, number]) : bucklerAt(fSh, p);
  if (p.tuck) drawSpear(cv, p);
  else {
    drawArm(cv, fSh, p.fHand, p.fBend ?? 1, FAR, "o");
    drawHand(cv, p.fHand, FAR);
    if (!p.bFront) stamp(cv, BUCKLER, bAt[0] - 4, bAt[1] - 4);
    drawLeg(cv, fHip, p.fKnee, p.fAnkle, p.fFoot ?? 0, FAR);
    drawLeg(cv, nHip, p.nKnee, p.nAnkle, p.nFoot ?? 0, 0, true);
  }

  // torso: quilted gambeson with a short skirt, gold belt
  const tz = (lx: number, ly: number, rx: number, ry: number): Shade => (x, y) => {
    const l = toLocal(p, x, y);
    const nx = (l[0] - lx) / rx;
    const ny = (l[1] - ly) / ry;
    const n = rot([nx, ny], p.lean);
    return light(n[0], n[1], Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)));
  };
  const body: Shape = {
    test: (x, y) => {
      const [lx, ly] = toLocal(p, x, y);
      if (ly < -9.6 || ly > 3.2) return false;
      if (ly < -5.4) return ((lx - 0.5) / 3.9) ** 2 + ((ly + 5.4) / 4.2) ** 2 <= 1;
      if (ly < -1.5) return Math.abs(lx - 0.5) <= 3.9 - (ly + 5.4) * 0.07;
      // skirt flares a little
      const half = 3.6 + (ly + 1.5) * 0.3;
      return Math.abs(lx - 0.4) <= half && !(ly > 2.2 && Math.abs(lx - 0.4) > half - 0.7);
    },
    shade: tz(-0.8, -6.5, 6.5, 8),
  };
  paint(cv, body, {
    ramp: ARMY,
    line: "N",
    tone: (x, y, ch) => {
      const [lx, ly] = toLocal(p, x + 0.5, y + 0.5);
      // quilting: a stitched line down the front and two across
      if (ly > -1.8 && ly < -0.4) return "belt";
      if (ly > 0 && Math.abs(lx - 1.3) < 0.5) return ch === "L" ? "B" : "D";
      if (ly < -2 && ly > -7.5 && Math.abs(lx - 2.0) < 0.5) return ch === "L" ? "B" : ch === "B" ? "D" : ch;
      return undefined;
    },
  });
  // belt
  for (let i = 0; i < W * H; i++) {
    if (cv.px[i] !== "belt") continue;
    const x = i % W;
    const y = (i - x) / W;
    const [lx] = toLocal(p, x + 0.5, y + 0.5);
    cv.px[i] = Math.abs(lx - 1.6) < 1 ? "Y" : lx < -1.5 ? "y" : lx > 3 ? "g" : "y";
  }
  // collar
  paint(cv, ellipse(T(p, [1.4, -8.9]), 2.2, 1.0), { ramp: { ramp: ["X", "x"], cuts: [0.1] }, keep: true });

  // tucked: the near leg folds up over the belly
  if (p.tuck) {
    stamp(cv, BUCKLER, bAt[0] - 4, bAt[1] - 4); // the buckler rides on the curled back
    drawLeg(cv, nHip, p.nKnee, p.nAnkle, p.nFoot ?? 0, 0, true);
  }
  // near arm, head, spear, hand, and a raised buckler in front of it all
  drawArm(cv, nSh, p.nHand, p.nBend ?? -1, 0.15, "N");
  const hp = add(neck, p.headOff ?? [0, 0]);
  const hg = HEAD[p.head ?? "n"];
  stamp(cv, hg, Math.round(hp[0]) - 8, Math.round(hp[1]) - (hg.length - 1));
  if (!p.tuck) drawSpear(cv, p);
  drawHand(cv, p.nHand);
  if (p.bFront) {
    stamp(cv, BUCKLER, bAt[0] - 4, bAt[1] - 4);
    drawHand(cv, p.fHand, -0.1);
  }

  return outline(cv.grid().map((r) => ("." .repeat(DX) + r).slice(0, W)));
};

// ---------------------------------------------------------------- the frames

const base: Pose = {
  hip: [24, 37],
  lean: 3,
  nKnee: [21, 42.5],
  nAnkle: grounded(20),
  fKnee: [27, 42],
  fAnkle: grounded(27),
  nHand: [30, 35],
  nBend: -1,
  fHand: [19, 34],
  spear: -88,
  grip: 12,
};

const pose = (o: Partial<Pose>): Pose => ({ ...base, ...o });

const POSES: Record<FrameId, Pose> = {
  idle0: base,
  idle1: pose({ hip: [24, 38], nKnee: [21, 43.5], fKnee: [27.5, 43], nHand: [30, 36], fHand: [19, 35] }),
  walk0: pose({ hip: [25, 36], lean: 12, nKnee: [30, 41], nAnkle: grounded(33), fKnee: [21, 42], fAnkle: [16, SOLE - 4], fFoot: 25, nHand: [31, 33], nBend: 1, spear: -36, grip: 10, fHand: [17, 32] }),
  walk1: pose({ hip: [25, 38], lean: 12, nKnee: [28, 43], nAnkle: grounded(27), fKnee: [24, 41], fAnkle: [20, 45], fFoot: 15, nHand: [30, 35], nBend: 1, spear: -27, grip: 10, fHand: [20, 34] }),
  walk2: pose({ hip: [25, 36], lean: 12, nKnee: [21, 41], nAnkle: [16, SOLE - 4], nFoot: 25, fKnee: [29, 41.5], fAnkle: grounded(32), nHand: [29, 32], nBend: 1, spear: -24, grip: 10, fHand: [24, 31] }),
  walk3: pose({ hip: [25, 38], lean: 12, nKnee: [24, 41], nAnkle: [20, 45], nFoot: 15, fKnee: [28, 43], fAnkle: grounded(27), nHand: [29, 34], nBend: 1, spear: -30, grip: 10, fHand: [21, 34] }),
  guard: pose({ hip: [23, 38], lean: 8, headOff: [0, 1], nKnee: [19, 43], nAnkle: grounded(17), fKnee: [28, 43], fAnkle: grounded(31), fHand: [30, 31], fBend: 1, bFront: true, nHand: [24, 36], nBend: 1, spear: -35, grip: 10 }),
  windup: pose({ hip: [22, 38], lean: -8, headOff: [-1, 0], nKnee: [18, 43], nAnkle: grounded(17), fKnee: [28, 43], fAnkle: grounded(32), nHand: [16, 31], nBend: 1, spear: -6, grip: 9, fHand: [30, 31], fBend: -1 }),
  attack0: pose({ hip: [25, 38], lean: 12, nKnee: [19, 43], nAnkle: grounded(16), fKnee: [31, 43], fAnkle: grounded(34), nHand: [29, 31], nBend: 1, spear: -2, grip: 9, smear: true, fHand: [18, 33] }),
  attack1: pose({ hip: [26, 39], lean: 18, nKnee: [19, 43.5], nAnkle: grounded(13), fKnee: [33, 41], fAnkle: grounded(36), nHand: [35, 30], nBend: 1, spear: 0, grip: 16, fHand: [16, 36], fBend: -1 }),
  hit: pose({ hip: [22, 37], lean: -16, head: "hurt", headOff: [-1, 0], nKnee: [19, 42.5], nAnkle: grounded(18), fKnee: [27, 42], fAnkle: grounded(28), nHand: [28, 35], nBend: 1, spear: -62, grip: 12, fHand: [15, 31] }),
  crouch: pose({ hip: [23, 42], lean: 22, nKnee: [22, 44], nAnkle: grounded(18), fKnee: [30, 41], fAnkle: grounded(29), nHand: [31, 38], nBend: 1, spear: -25, grip: 10, fHand: [23, 38] }),
  air: pose({ hip: [24, 31], lean: 6, nKnee: [22, 37], nAnkle: [17, 41], nFoot: 30, fKnee: [30, 34], fAnkle: [28, 40], fFoot: 20, nHand: [30, 27], nBend: 1, spear: -40, grip: 10, fHand: [18, 25] }),
  victory0: pose({ hip: [24, 37], lean: 0, head: "grin", nKnee: [21, 42.5], nAnkle: grounded(19), fKnee: [28, 42], fAnkle: grounded(30), nHand: [33, 30], nBend: 1, spear: -90, grip: 11, fHand: [21, 36], fBend: 1 }),
  victory1: pose({ hip: [24, 37], lean: 0, head: "grin", nKnee: [21, 42.5], nAnkle: grounded(19), fKnee: [28, 42], fAnkle: grounded(30), nHand: [33, 30], nBend: 1, spear: -90, grip: 11, fHand: [21, 36], fBend: 1, glint: true }),
  special: pose({ hip: [21, 39], lean: 30, tuck: true, nKnee: [27, 34], nAnkle: [26.5, 39.5], nFoot: 0, fKnee: [27, 34], fAnkle: [26, 40], nHand: [28, 37], nBend: 1, spear: -60, grip: 4, fHand: [17, 34] }),
};

const frames = Object.fromEntries(FRAME_IDS.map((id) => [id, fit(render(POSES[id]), W, H)])) as Record<FrameId, Grid>;

const tipOf = (p: Pose): [number, number] => {
  const t = spearPt(stretch(p), SPEAR - 0.5, 0);
  return [Math.round(t[0]) + DX, Math.round(t[1])];
};

const sheet: SpriteSheet = {
  w: W,
  h: H,
  foot: [26, 50],
  frames,
  // c C q: the soldier's undyed linen hose
  palette: { c: "#d6c6a4", C: "#9c8566", q: "#5e4a38" },
  tips: Object.fromEntries(FRAME_IDS.map((id) => [id, tipOf(POSES[id])])) as Partial<Record<FrameId, [number, number]>>,
};

export default sheet;
