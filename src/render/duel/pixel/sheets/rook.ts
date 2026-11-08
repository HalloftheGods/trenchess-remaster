import { FRAME_IDS, fit, outline, type FrameId, type Grid, type SpriteSheet } from "../sheet";

/**
 * Twilight Fortress (the Rook, heavy armour): a walking fortress in dark plate, a barrel great
 * helm crowned with crenellations and a glowing visor slit, huge layered pauldrons, an army
 * tabard, a crenellated tower shield with a gold tower emblem on the far arm and a heavy
 * warhammer in the near hand.
 *
 * Frames are posed puppets rasterised pixel-exactly: every part is a shape sampled at pixel
 * centres and shaded from its surface normal (light from the top-left) into a 3-4 tone ramp.
 * Parts drawn over others get a selective dark line, the silhouette gets a 1px outline, and the
 * focal details (helm, emblem, fists) are hand-drawn grids.
 */

const W = 60;
const H = 58;
const SOLE = 55; // last row of the sabatons; the outline below it is the floor contact (row 56)

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

// light from the top-left, a little in front
const LX = -0.52;
const LY = -0.68;
const LZ = 0.52;
const light = (nx: number, ny: number, nz: number): number => nx * LX + ny * LY + nz * LZ;

// ---------------------------------------------------------------- shapes with normals

interface Shape {
  test: Test;
  shade: Shade;
}

const ellipse = (c: P, rx: number, ry: number, flat = 1): Shape => ({
  test: (x, y) => ((x - c[0]) / rx) ** 2 + ((y - c[1]) / ry) ** 2 <= 1,
  shade: (x, y) => {
    const nx = (x - c[0]) / rx;
    const ny = (y - c[1]) / ry;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)) * flat;
    const l = Math.hypot(nx, ny, nz) || 1;
    return light(nx / l, ny / l, nz / l);
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
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      return light(nx, ny, nz);
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

const STEEL = { ramp: ["W", "M", "m", "k"], cuts: [0.86, 0.46, -0.04] };
const ARMY = { ramp: ["L", "B", "D", "N"], cuts: [0.62, 0.12, -0.32] };
const GOLD = { ramp: ["Y", "y", "g"], cuts: [0.42, -0.18] };
const WOOD = { ramp: ["w", "r"], cuts: [0.05] };

interface PaintOpts {
  ramp: { ramp: string[]; cuts: number[] };
  /** added to the light value (far-side parts sit a tone darker) */
  bias?: number;
  /** selective outline colour where this part overlaps ink painted before it */
  line?: string;
  /** final say over a pixel (seams, trims, folds) */
  tone?: (x: number, y: number, ch: string) => string | undefined;
  /** keep lone pixels (thin parts) */
  keep?: boolean;
}

const pick = (r: { ramp: string[]; cuts: number[] }, v: number): string => {
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

/** The barrel great helm with its crenellated crown, facing right. 14 x 15, top-left origin. */
const HELM: Grid = [
  "oooo.oooo.oooo",
  "oMWo.oMMo.oMmo",
  "oWMoooMmmoomko",
  "oMMMMMMmmmmmko",
  "okmmmmmmmmkkko",
  "oMMMMmmmmmmmko",
  "oWMMmmmmmmmkko",
  "oMMmmmmkoooooo",
  "oMMmmmko eeeeo",
  "oMmmmmmkoooooo",
  "oMMmmmmmmkmkko",
  "oMmmmmmmmkokoo",
  "omMmmmmmmmkkko",
  ".okmmmmmmmmko.",
  "..oooooooooo..",
];

/** The gold tower emblem of the shield. */
const EMBLEM: Grid = [
  "Y.Y.y",
  "YYyyg",
  ".Yyg.",
  ".Yog.",
  ".Yyg.",
  ".Yyg.",
  "Yyyyg",
];

// ---------------------------------------------------------------- the pose

interface Pose {
  /** pelvis centre */
  hip: P;
  /** torso tilt in degrees, + leans forward (right) */
  lean: number;
  /** extra head offset (recoil, nod) */
  headOff?: P;
  /** near (viewer-side) leg knee and ankle, far leg knee and ankle; foot tilt in degrees */
  nKnee: P;
  nAnkle: P;
  nFoot?: number;
  fKnee: P;
  fAnkle: P;
  fFoot?: number;
  /** hands: near holds the hammer, far holds the shield */
  nHand: P;
  nBend?: number;
  fHand: P;
  /** hammer shaft direction (grip to head), degrees in screen space */
  ham: number;
  /** shield centre */
  shield: P;
  /** smear arc for the swing: from angle to angle */
  smear?: [number, number];
  /** a glint on the hammer head */
  glint?: boolean;
  /** the shield arm swings back behind the body (attacks), so the torso is not hidden */
  shieldBack?: boolean;
}

const grounded = (x: number): P => [x, SOLE - 3];

/** Torso-local point (origin the pelvis, y up is negative) to frame space. */
const T = (p: Pose, lp: P): P => add(p.hip, rot(lp, p.lean));
const toLocal = (p: Pose, x: number, y: number): P => rot(sub([x, y], p.hip), -p.lean);

const ARM_UP = 6.5;
const ARM_LO = 6.5;

const elbowOf = (sh: P, hand: P, bend: number): P => {
  const d0 = sub(hand, sh);
  const d = Math.min(len(d0), ARM_UP + ARM_LO - 0.01);
  const th = Math.atan2(d0[1], d0[0]);
  const c = clamp((ARM_UP * ARM_UP + d * d - ARM_LO * ARM_LO) / (2 * ARM_UP * d), -1, 1);
  return add(sh, dir(th / D2R + (bend * Math.acos(c)) / D2R, ARM_UP));
};

// hammer geometry (local: u along the shaft from the grip, v across)
const HAM = { pommel: -6, collar: 13, headA: 15, headB: 24, half: 6.5 };

const hamLocal = (p: Pose, x: number, y: number): P => rot(sub([x, y], p.nHand), -p.ham);
const hamPt = (p: Pose, u: number, v: number): P => add(p.nHand, rot([u, v], p.ham));

const drawLeg = (cv: Canvas, hip: P, knee: P, ankle: P, foot: number, bias: number): void => {
  // greave and cuisse
  paint(cv, capsule(hip, knee, 4.3, 3.7), { ramp: STEEL, bias, line: "k" });
  paint(cv, capsule(knee, ankle, 3.7, 3.0), { ramp: STEEL, bias, line: "o" });
  // knee cop
  paint(cv, ellipse(add(knee, [0.8, -0.2]), 3.5, 3.0), { ramp: STEEL, bias: bias + 0.12, line: "k" });
  // sabaton: a heavy, square-toed boot
  const pts: P[] = [
    [-3.2, -1.6],
    [1.5, -1.6],
    [3.5, 0.2],
    [6.2, 1.4],
    [6.6, 3.5],
    [-3.6, 3.5],
  ];
  const rp = pts.map((q) => add(ankle, rot(q, foot)));
  const t = polyTest(rp);
  paint(
    cv,
    {
      test: t,
      shade: (x, y) => {
        const l = rot(sub([x, y], ankle), -foot);
        // plated toe cap reads as a rounded box
        const ny = clamp((l[1] - 1) / 2.6, -1, 1);
        const nx = clamp((l[0] - 1.5) / 6, -1, 1) ** 3;
        return light(nx * 0.6, ny * 0.9, 0.55);
      },
    },
    {
      ramp: STEEL,
      bias,
      line: "o",
      tone: (x, y, ch) => {
        const l = rot(sub([x + 0.5, y + 0.5], ankle), -foot);
        if (l[1] > 2.4) return "k"; // sole
        if (Math.abs(l[0] - 2.3) < 0.5 && l[1] < 2.4) return ch === "W" || ch === "M" ? "m" : "k"; // lame seam
        return undefined;
      },
    },
  );
};

const drawShield = (cv: Canvas, p: Pose): void => {
  const cx = Math.round(p.shield[0]);
  const cy = Math.round(p.shield[1]);
  const x0 = cx - 6;
  const x1 = cx + 5; // 12 px wide
  const y0 = cy - 11;
  const y1 = cy + 12;
  const merlon = (dx: number): boolean => dx <= 2 || dx === 5 || dx === 6 || dx >= 9;
  const inside = (x: number, y: number): boolean => {
    if (x < x0 || x > x1) return false;
    const dx = x - x0;
    if (y >= y0 - 2 && y < y0) return merlon(dx);
    if (y < y0 || y > y1) return false;
    if (y === y1 && (dx === 0 || dx === 11)) return false;
    if (y === y1 - 1 && (dx === 0 || dx === 11)) return false;
    if (y === y1 && (dx === 1 || dx === 10)) return false;
    return true;
  };
  const px = new Map<number, string>();
  for (let y = y0 - 2; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (!inside(x, y)) continue;
      const rim = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      const dx = x - x0;
      let ch: string;
      if (rim) {
        // steel rim: lit on the left and the tops, dark on the right and the bottom
        if (!inside(x, y + 1) || !inside(x + 1, y)) ch = dx >= 9 || !inside(x, y + 1) ? "k" : "m";
        else if (!inside(x - 1, y)) ch = "M";
        else ch = "M";
        if (!inside(x, y - 1) && dx <= 2) ch = "W";
      } else if (y < y0) {
        ch = dx <= 2 ? "M" : dx <= 6 ? "m" : "k"; // merlon faces
      } else {
        // army face, gently convex across its width
        const nx = (dx - 5.5) / 6.5;
        let v = light(nx, -0.1, Math.sqrt(1 - nx * nx));
        if (y === y0 + 1) v -= 0.3; // under the crown rim
        ch = pick(ARMY, v - 0.08);
        if (y === y0) ch = dx <= 3 ? "M" : dx <= 8 ? "m" : "k"; // crown band
        if (y === y0 + 1) ch = "k";
      }
      px.set(y * W + x, ch);
    }
  for (const [i, ch] of px) {
    const x = i % W;
    cv.set(x, (i - x) / W, ch);
  }
  // inner bevel line (gold trim) a pixel inside the rim
  for (let y = y0 + 3; y <= y1 - 2; y++) {
    cv.set(x0 + 2, y, y < y1 - 2 ? "y" : "g");
    cv.set(x1 - 2, y, "g");
  }
  for (let x = x0 + 2; x <= x1 - 2; x++) cv.set(x, y1 - 2, "g");
  stamp(cv, EMBLEM, cx - 3, cy - 3);
  // bolts
  cv.set(x0 + 2, y0 + 3, "Y");
  cv.set(x1 - 2, y0 + 3, "y");
};

const drawSmear = (cv: Canvas, p: Pose): void => {
  // the smear: the head's path drawn as a bright arc, behind the whole figure
  if (p.smear) {
    const [a0, a1] = p.smear;
    // a crescent that tapers from a hairline at the start of the swing to a thick blade of light
    // just behind the head: white leading rim, then steel, then the army glow on the inside
    const R = HAM.headA + 6;
    const band = (x: number, y: number): { t: number; k: number } | undefined => {
      const d = sub([x, y], p.nHand);
      const r = len(d);
      let a = Math.atan2(d[1], d[0]) / D2R;
      while (a < a0) a += 360;
      while (a >= a0 + 360) a -= 360;
      if (a > a1) return undefined;
      const t = (a - a0) / (a1 - a0);
      const th = 2 + 7 * t * t;
      const k = (R - r) / th; // 0 at the outer rim, 1 at the inner edge
      return k >= 0 && k <= 1 ? { t, k } : undefined;
    };
    const sh: Shape = {
      test: (x, y) => band(x, y) !== undefined,
      shade: (x, y) => {
        const b = band(x, y)!;
        return b.t < 0.25 ? -1 : 1 - b.k * 1.6;
      },
    };
    paint(cv, sh, { ramp: { ramp: ["W", "M", "L", "B"], cuts: [0.68, 0.3, -0.5] }, keep: true });
  }
};

const drawHammer = (cv: Canvas, p: Pose): void => {
  const shaftA = hamPt(p, HAM.pommel + 1, 0);
  const shaftB = hamPt(p, HAM.headA, 0);
  // shaft: dark wood with a lit edge, wrapped grip
  paint(cv, capsule(shaftA, shaftB, 1.15), {
    ramp: WOOD,
    keep: true,
    tone: (x, y, ch) => {
      const l = hamLocal(p, x + 0.5, y + 0.5);
      if (l[0] > 3 && l[0] < 12 && Math.round(l[0]) % 4 === 0) return "g"; // gold binding rings
      return ch;
    },
  });
  // pommel
  paint(cv, ellipse(hamPt(p, HAM.pommel, 0), 1.9, 1.9), { ramp: GOLD, line: "o", keep: true });
  // collar
  const collar: Shape = {
    test: (x, y) => {
      const l = hamLocal(p, x, y);
      return l[0] >= HAM.collar - 0.3 && l[0] <= HAM.headA + 0.2 && Math.abs(l[1]) <= 2.1;
    },
    shade: (x, y) => {
      const l = hamLocal(p, x, y);
      const n = rot([0, l[1] / 2.2], p.ham);
      return light(n[0], n[1], 0.7);
    },
  };
  paint(cv, collar, { ramp: GOLD, line: "o", keep: true });
  // the head: a squared maul block, shaded per face (flat planes read as forged steel), with
  // dark grooves setting off the two striking plates and a gold boss in the middle
  const hu = (HAM.headB - HAM.headA) / 2;
  const uc = (HAM.headA + HAM.headB) / 2;
  const hv = HAM.half;
  const inHead = (u: number, v: number): boolean => {
    const du = Math.abs(u - uc);
    const dv = Math.abs(v);
    if (du > hu || dv > hv) return false;
    return du + dv <= hu + hv - 1.2; // 1px chamfered corners
  };
  const sides: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const head: Shape = {
    test: (x, y) => {
      const [u, v] = hamLocal(p, x, y);
      return inHead(u, v);
    },
    shade: () => 0,
  };
  paint(cv, head, {
    ramp: STEEL,
    line: "o",
    keep: true,
    tone: (x, y) => {
      const [u, v] = hamLocal(p, x + 0.5, y + 0.5);
      const du = u - uc;
      // the edge facing the light is polished, the far edge in shadow
      let edgeLit = 0;
      let isEdge = false;
      for (const [su, sv] of sides) {
        if (!inHead(u + su * 1.0, v + sv * 1.0)) {
          isEdge = true;
          const n = rot([su, sv], p.ham);
          edgeLit += n[0] * LX + n[1] * LY;
        }
      }
      if (isEdge) return edgeLit > 0.25 ? "W" : edgeLit < -0.25 ? "k" : "m";
      // grooves before the striking plates
      if (Math.abs(Math.abs(v) - (hv - 2)) < 0.5) return "k";
      // flat front face: lit half M, shaded half m
      const w = rot([du, v], p.ham);
      return w[0] * LX + w[1] * LY > -0.6 ? "M" : "m";
    },
  });
  // gold boss riveted to the middle of the head, stamped so it stays round at every angle
  const bc = hamPt(p, uc, 0);
  const bx = Math.floor(bc[0]);
  const by = Math.floor(bc[1]);
  stamp(cv, [".y.", "yYg", ".g."], bx - 1, by - 1);
  if (p.glint) {
    // a four-point star flaring off the top corner of the head
    const g = hamPt(p, HAM.headB, -HAM.half);
    const gx = Math.round(g[0]);
    const gy = Math.round(g[1]);
    const STAR: [number, number, string][] = [
      [0, 0, "W"], [1, 0, "W"], [-1, 0, "W"], [0, 1, "W"], [0, -1, "W"],
      [2, 0, "G"], [-2, 0, "G"], [0, 2, "G"], [0, -2, "G"], [3, 0, "G"], [-3, 0, "G"], [0, 3, "G"], [0, -3, "G"],
    ];
    for (const [dx, dy, c] of STAR) cv.set(gx + dx, gy + dy, c);
  }
};

const drawFist = (cv: Canvas, at: P, bias = 0): void => {
  paint(cv, ellipse(at, 2.4, 2.3), { ramp: STEEL, bias, line: "o" });
  const x = Math.round(at[0]);
  const y = Math.round(at[1]);
  cv.set(x - 1, y - 1, bias < 0 ? "m" : "M");
  cv.set(x + 1, y, "k");
  cv.set(x, y + 1, "k");
};

const drawPauldron = (cv: Canvas, c: P, scale: number, bias: number, line: string): void => {
  const rx = 6.3 * scale;
  const ry = 4.6 * scale;
  // lower lames first, then the big dome
  paint(cv, ellipse(add(c, [-0.6, 4.8 * scale]), rx * 0.8, ry * 0.62), { ramp: STEEL, bias: bias - 0.08, line: "k" });
  paint(cv, ellipse(add(c, [-0.3, 2.7 * scale]), rx * 0.92, ry * 0.72), { ramp: STEEL, bias: bias - 0.04, line: "k" });
  paint(cv, ellipse(c, rx, ry), {
    ramp: STEEL,
    bias,
    line,
    tone: (x, y, ch) => {
      // gold rim along the lower edge of the dome
      const nx = (x + 0.5 - c[0]) / rx;
      const ny = (y + 0.5 - c[1]) / ry;
      const d = nx * nx + ny * ny;
      if (ny > 0.15 && d > 0.6) return ch === "k" ? "g" : "y";
      return undefined;
    },
  });
};

const render = (p: Pose): Grid => {
  const cv = new Canvas();
  const lean = p.lean;
  const nHip = T(p, [-3.5, 0]);
  const fHip = T(p, [3.5, -0.5]);
  const nSh = T(p, [-5, -15]);
  const fSh = T(p, [7.5, -15]);
  const neck = T(p, [1, -18]);
  const FAR = -0.22;
  drawSmear(cv, p);

  // ---- far side: pauldron, arm, leg
  drawPauldron(cv, add(fSh, [0.5, -0.5]), 0.78, FAR, "o");
  const fEl = elbowOf(fSh, p.fHand, 1);
  paint(cv, capsule(fSh, fEl, 2.6, 2.4), { ramp: STEEL, bias: FAR, line: "o" });
  paint(cv, capsule(fEl, p.fHand, 2.6, 2.9), { ramp: STEEL, bias: FAR, line: "o" });
  if (p.shieldBack) {
    drawFist(cv, p.fHand, FAR);
    drawShield(cv, p);
  }
  drawLeg(cv, fHip, p.fKnee, p.fAnkle, p.fFoot ?? 0, FAR);
  // ---- near leg
  drawLeg(cv, nHip, p.nKnee, p.nAnkle, p.nFoot ?? 0, 0);

  // ---- torso: barrel cuirass, faulds, tabard
  const tz = (lx: number, ly: number): Shade => (x, y) => {
    const l = toLocal(p, x, y);
    const nx = (l[0] - lx) / 10.5;
    const ny = (l[1] - ly) / 9;
    const n = rot([nx, ny], lean);
    return light(n[0], n[1], Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)));
  };
  const faulds: Shape = {
    test: (x, y) => {
      const [lx, ly] = toLocal(p, x, y);
      const half = 8.2 + (ly + 3) * 0.32;
      return ly >= -4 && ly <= 4.5 && Math.abs(lx - 0.5) <= half;
    },
    shade: tz(-1, -6),
  };
  paint(cv, faulds, {
    ramp: STEEL,
    line: "o",
    tone: (x, y) => {
      const [, ly] = toLocal(p, x + 0.5, y + 0.5);
      if (Math.abs(ly - 0.6) < 0.5 || Math.abs(ly - 3.6) < 0.5) return "k"; // lame overlaps
      return undefined;
    },
  });
  const chest: Shape = {
    test: (x, y) => {
      const [lx, ly] = toLocal(p, x, y);
      if (ly < -3.5 && ((lx - 1) / 9.6) ** 2 + ((ly + 11) / 7.6) ** 2 <= 1) return true;
      return ly >= -11 && ly <= -2.5 && Math.abs(lx - 0.5) <= 7.4 - (ly + 11) * 0.1;
    },
    shade: tz(-1, -12),
  };
  paint(cv, chest, {
    ramp: STEEL,
    line: "o",
    tone: (x, y) => {
      const [lx, ly] = toLocal(p, x + 0.5, y + 0.5);
      // the plackart seam curving over the belly
      if (Math.abs(ly + 6 + Math.abs(lx - 1) * 0.12) < 0.5 && Math.abs(lx - 1) < 6.5) return "k";
      return undefined;
    },
  });
  // tabard: chest panel and a long skirt to the knees
  const tabard: Shape = {
    test: (x, y) => {
      const [lx, ly] = toLocal(p, x, y);
      if (ly < -14.5 || ly > 9.5) return false;
      const c = 1.6;
      const half = ly < -3 ? 3.4 + (ly + 14.5) * 0.06 : 3.9 + (ly + 3) * 0.08;
      if (ly > 8.5 && Math.abs(lx - c) > half - 0.5) return false;
      return Math.abs(lx - c) <= half;
    },
    shade: (x, y) => {
      const [lx, ly] = toLocal(p, x, y);
      const nx = (lx - 0.5) / 7.5;
      // folds in the skirt
      const fold = ly > -1 ? Math.sin((lx - 1.6) * 1.35) * 0.32 * clamp((ly + 1) / 6, 0, 1) : 0;
      const n = rot([nx, -0.15], lean);
      return light(n[0], n[1], Math.sqrt(Math.max(0, 1 - nx * nx))) + fold;
    },
  };
  paint(cv, tabard, {
    ramp: ARMY,
    line: "N",
    tone: (x, y, ch) => {
      const [lx, ly] = toLocal(p, x + 0.5, y + 0.5);
      if (ly > 8) return ch === "L" || ch === "B" ? "y" : "g"; // gold hem
      if (Math.abs(lx - 1.6) < 0.6 && ly > -12 && ly < -5) return ch === "L" ? "B" : undefined;
      return undefined;
    },
  });
  // belt with a gold buckle
  const belt: Shape = {
    test: (x, y) => {
      const [lx, ly] = toLocal(p, x, y);
      return ly >= -4.6 && ly <= -2.6 && Math.abs(lx - 0.6) <= 7.9;
    },
    shade: tz(-1, -6),
  };
  paint(cv, belt, {
    ramp: { ramp: ["w", "w", "r"], cuts: [0.3, -0.25] },
    keep: true,
    tone: (x, y, ch) => {
      const [lx, ly] = toLocal(p, x + 0.5, y + 0.5);
      if (Math.abs(lx - 2.6) <= 1.6) return lx < 2.3 ? "Y" : "y";
      if (ly > -3.6) return ch === "w" ? "r" : "o";
      return ch === "r" ? "r" : "w";
    },
  });
  // gorget
  paint(cv, ellipse(T(p, [0.5, -15.5]), 6.2, 2.8), { ramp: STEEL, line: "o", bias: 0.05 });

  // ---- head
  const hp = add(neck, p.headOff ?? [0, 0]);
  stamp(cv, HELM.map((r) => r.replace(/ /g, "o")), Math.round(hp[0]) - 7, Math.round(hp[1]) - 13);

  // ---- shield on the far arm
  if (!p.shieldBack) {
    drawFist(cv, p.fHand, FAR);
    drawShield(cv, p);
  }

  // ---- near pauldron, arm, hammer, fist
  const nEl = elbowOf(nSh, p.nHand, p.nBend ?? -1);
  paint(cv, capsule(nSh, nEl, 2.8, 2.6), { ramp: STEEL, line: "o" });
  paint(cv, capsule(nEl, p.nHand, 2.7, 3.1), {
    ramp: STEEL,
    line: "k",
    tone: (x, y) => {
      // vambrace cuff in gold near the wrist
      const v = sub(p.nHand, nEl);
      const t = ((x + 0.5 - nEl[0]) * v[0] + (y + 0.5 - nEl[1]) * v[1]) / (len(v) ** 2 || 1);
      if (t > 0.62 && t < 0.78) return "g";
      return undefined;
    },
  });
  drawPauldron(cv, add(nSh, [-0.5, -1]), 1, 0, "o");
  drawHammer(cv, p);
  drawFist(cv, p.nHand);

  return outline(cv.grid());
};

// ---------------------------------------------------------------- the frames

const base: Pose = {
  hip: [30, 37],
  lean: 0,
  nKnee: [25, 45.5],
  nAnkle: grounded(23),
  fKnee: [35.5, 45],
  fAnkle: grounded(36),
  nHand: [20, 33],
  fHand: [41, 34],
  ham: -90,
  shield: [44, 36],
};

const pose = (o: Partial<Pose>): Pose => ({ ...base, ...o });

const POSES: Record<FrameId, Pose> = {
  idle0: base,
  idle1: pose({ hip: [30, 38], nKnee: [25, 46], fKnee: [35.5, 45.5], nHand: [20, 34], fHand: [41, 35], shield: [44, 37] }),
  // heavy stomp: contact, down, passing (near leg lifting), up
  walk0: pose({ hip: [30, 37], lean: 4, nKnee: [24, 46], nAnkle: grounded(20), fKnee: [37, 45], fAnkle: grounded(40), nHand: [20, 33], fHand: [42, 34], shield: [45, 36] }),
  walk1: pose({ hip: [30, 38.5], lean: 6, nKnee: [26, 46], nAnkle: [25, SOLE - 4], nFoot: 18, fKnee: [36, 46], fAnkle: grounded(36), nHand: [21, 34], fHand: [42, 35], shield: [45, 37] }),
  walk2: pose({ hip: [30, 36], lean: 3, nKnee: [32, 43], nAnkle: [32, 49], nFoot: -6, fKnee: [33, 45], fAnkle: grounded(31), nHand: [21, 32], fHand: [42, 33], shield: [45, 35] }),
  walk3: pose({ hip: [31, 37], lean: 5, nKnee: [36, 45], nAnkle: grounded(39), fKnee: [29, 46], fAnkle: [26, SOLE - 3.5], fFoot: 14, nHand: [22, 33], fHand: [43, 34], shield: [46, 36] }),
  guard: pose({ hip: [29, 39], lean: 6, headOff: [0, 1], nKnee: [23, 47], nAnkle: grounded(19), fKnee: [37, 46], fAnkle: grounded(39), nHand: [23, 35], ham: -135, fHand: [40, 27], shield: [41, 27] }),
  windup: pose({ hip: [29, 37], lean: -7, headOff: [-1, 0], nKnee: [23, 46], nAnkle: grounded(20), fKnee: [36, 45], fAnkle: grounded(39), nHand: [21, 14], nBend: 1, ham: 135, fHand: [40, 35], shield: [43, 37] }),
  attack0: pose({ hip: [31, 38], lean: 8, nKnee: [24, 46], nAnkle: grounded(20), fKnee: [38, 46], fAnkle: grounded(41), nHand: [35, 26], nBend: 1, ham: -45, smear: [-185, -62], fHand: [38, 36], shield: [40, 38], shieldBack: true }),
  attack1: pose({ hip: [32, 39], lean: 12, headOff: [1, 0], nKnee: [25, 47], nAnkle: grounded(20), fKnee: [40, 46], fAnkle: grounded(42), nHand: [33, 31], nBend: 1, ham: 0, fHand: [38, 36], shield: [40, 38], shieldBack: true }),
  hit: pose({ hip: [29, 37], lean: -12, headOff: [-2, 0], nKnee: [23, 45], nAnkle: grounded(21), fKnee: [34, 45.5], fAnkle: grounded(37), nHand: [25, 34], ham: -153.43, fHand: [39, 33], shield: [41, 35] }),
  crouch: pose({ hip: [30, 42], lean: 10, nKnee: [24, 48], nAnkle: grounded(20), fKnee: [38, 47], fAnkle: grounded(38), nHand: [26, 38], ham: 153.43, fHand: [41, 39], shield: [44, 41] }),
  air: pose({ hip: [30, 31], lean: 4, nKnee: [26, 38], nAnkle: [22, 44], nFoot: 20, fKnee: [37, 37], fAnkle: [35, 44], fFoot: 10, nHand: [25, 14], nBend: 1, ham: 180, fHand: [41, 29], shield: [44, 31] }),
  victory0: pose({ hip: [30, 37], lean: -2, nKnee: [24.5, 45.5], nAnkle: grounded(22), fKnee: [36, 45], fAnkle: grounded(37), nHand: [33, 28], nBend: 1, ham: -135, fHand: [43, 35], shield: [47, 43] }),
  victory1: pose({ hip: [30, 37], lean: -2, nKnee: [24.5, 45.5], nAnkle: grounded(22), fKnee: [36, 45], fAnkle: grounded(37), nHand: [33, 28], nBend: 1, ham: -135, fHand: [43, 35], shield: [47, 43], glint: true }),
  special: pose({ hip: [31, 43], lean: 16, headOff: [1, 0], nKnee: [23, 48], nAnkle: grounded(19), fKnee: [40, 48], fAnkle: grounded(41), nHand: [42, 31], nBend: 1, ham: 90, fHand: [37, 40], shield: [39, 41], shieldBack: true }),
};

const frames = Object.fromEntries(FRAME_IDS.map((id) => [id, fit(render(POSES[id]), W, H)])) as Record<FrameId, Grid>;

const tipOf = (p: Pose, id: FrameId): [number, number] => {
  // thrust and slam strike with the end face; swings strike with the leading side face
  const t = id === "attack1" || id === "special" ? hamPt(p, HAM.headB, 0) : hamPt(p, (HAM.headA + HAM.headB) / 2, HAM.half);
  return [Math.round(t[0]), Math.round(t[1])];
};

const sheet: SpriteSheet = {
  w: W,
  h: H,
  foot: [30, 56],
  frames,
  tips: Object.fromEntries(FRAME_IDS.map((id) => [id, tipOf(POSES[id], id)])) as Partial<Record<FrameId, [number, number]>>,
};

export default sheet;
