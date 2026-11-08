import { FRAME_IDS, fit, outline, type FrameId, type Grid, type SpriteSheet } from "../sheet";

/**
 * Sacred Queen: a queen in a tiara with long golden hair, army gown and gold-trimmed cape,
 * a rapier, riding an eight-legged pearl steed (four pairs of legs, Sleipnir style).
 *
 * The sheet is drawn pixel-exactly by a tiny rasteriser: every material is a mask that is
 * shaded with directional rim rules (light from the top-left), parts in front get a selective
 * darker line where they overlap parts behind, and the whole silhouette gets a 1px outline.
 * Hand-drawn grids cover the details that need a pixel artist's hand (the face, the tiara).
 */

const W = 88;
const H = 72;
const GROUND = 70;

type P = [number, number];
type Test = (x: number, y: number) => boolean;
type Rule = [number, number, string];

const D2R = Math.PI / 180;
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const mul = (a: P, k: number): P => [a[0] * k, a[1] * k];
const rot = (p: P, a: number): P => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
const dir = (deg: number, len = 1): P => [Math.cos(deg * D2R) * len, Math.sin(deg * D2R) * len];
const len = (p: P): number => Math.hypot(p[0], p[1]);
const norm = (p: P): P => mul(p, 1 / (len(p) || 1));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerpP = (a: P, b: P, t: number): P => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

// ---------------------------------------------------------------- shapes (sampled at pixel centres)

const ellipse = (c: P, rx: number, ry: number): Test => (x, y) => ((x - c[0]) / rx) ** 2 + ((y - c[1]) / ry) ** 2 <= 1;

const capsule = (a: P, b: P, ra: number, rb: number): Test => (x, y) => {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const l2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / l2));
  const r = ra + (rb - ra) * t;
  return (x - a[0] - vx * t) ** 2 + (y - a[1] - vy * t) ** 2 <= r * r;
};

const poly = (pts: P[]): Test => (x, y) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const union = (...ts: Test[]): Test => (x, y) => ts.some((t) => t(x, y));
const minus = (a: Test, b: Test): Test => (x, y) => a(x, y) && !b(x, y);

/** A test written in a local frame (origin `o`, rotated by `a` radians) seen from frame space. */
const local = (t: Test, o: P, a: number): Test => (x, y) => {
  const p = rot([x - o[0], y - o[1]], -a);
  return t(p[0], p[1]);
};

// ---------------------------------------------------------------- canvas, masks and painting

type Mask = Uint8Array;

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

const newMask = (): Mask => new Uint8Array(W * H);
const inM = (m: Mask, x: number, y: number): boolean => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x] === 1;

const maskOf = (t: Test): Mask => {
  const m = newMask();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (t(x + 0.5, y + 0.5)) m[y * W + x] = 1;
  return m;
};

const orMask = (a: Mask, b: Mask): Mask => {
  const m = newMask();
  for (let i = 0; i < m.length; i++) m[i] = a[i] | b[i];
  return m;
};

/** A thick line with clean, constant-width runs (legs, arms, blade). */
const seg = (m: Mask, a: P, b: P, w0: number, w1 = w0): void => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const vertical = Math.abs(dy) >= Math.abs(dx);
  const major = Math.max(Math.abs(dx), Math.abs(dy));
  const minor = Math.min(Math.abs(dx), Math.abs(dy));
  const comp = Math.sqrt(1 + (minor / (major || 1)) ** 2);
  const n = Math.max(1, Math.round(major));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const cx = a[0] + dx * t;
    const cy = a[1] + dy * t;
    const w = Math.max(1, Math.round((w0 + (w1 - w0) * t) * comp));
    if (vertical) {
      const y = Math.round(cy);
      const x0 = Math.round(cx - w / 2);
      for (let k = 0; k < w; k++) if (x0 + k >= 0 && x0 + k < W && y >= 0 && y < H) m[y * W + x0 + k] = 1;
    } else {
      const x = Math.round(cx);
      const y0 = Math.round(cy - w / 2);
      for (let k = 0; k < w; k++) if (x >= 0 && x < W && y0 + k >= 0 && y0 + k < H) m[(y0 + k) * W + x] = 1;
    }
  }
};

interface PaintOpts {
  base: string;
  /** First rule whose offset pixel is outside the mask picks the colour (rim lighting / shading). */
  rules?: Rule[];
  /** Colour of the selective outline drawn where this part overlaps parts already painted. */
  line?: string;
  lineIf?: (x: number, y: number) => boolean;
  /** Final say over a pixel's colour (folds, trims). */
  tone?: (x: number, y: number, ch: string) => string | undefined;
}

const paint = (cv: Canvas, m: Mask, o: PaintOpts): void => {
  const col = new Map<number, string>();
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!inM(m, x, y)) continue;
      let ch = o.base;
      for (const [dx, dy, c] of o.rules ?? []) {
        if (!inM(m, x + dx, y + dy)) {
          ch = c;
          break;
        }
      }
      if (o.tone) ch = o.tone(x, y, ch) ?? ch;
      col.set(y * W + x, ch);
    }
  // remove lone pixels (a pixel whose four neighbours all agree on another colour)
  for (const [i, ch] of [...col]) {
    const x = i % W;
    const y = (i - x) / W;
    const n = [col.get(i - 1), col.get(i + 1), col.get(i - W), col.get(i + W)];
    if (n.every((c) => c !== undefined && c === n[0]) && n[0] !== ch && x > 0 && x < W - 1) col.set(i, n[0]!);
  }
  for (const [i, ch] of col) {
    const x = i % W;
    const y = (i - x) / W;
    let c = ch;
    if (o.line && (!o.lineIf || o.lineIf(x, y))) {
      const edge = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => !inM(m, x + dx, y + dy) && cv.get(x + dx, y + dy) !== ".");
      if (edge) c = o.line;
    }
    cv.set(x, y, c);
  }
};

/** Straight 1px line (Bresenham), optionally only over already-inked pixels. */
const line = (cv: Canvas, a: P, b: P, c: string | ((i: number, n: number) => string), onlyInk = false): P[] => {
  let x0 = Math.round(a[0]);
  let y0 = Math.round(a[1]);
  const x1 = Math.round(b[0]);
  const y1 = Math.round(b[1]);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const pts: P[] = [];
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
  pts.forEach(([x, y], i) => {
    if (onlyInk && cv.get(x, y) === ".") return;
    cv.set(x, y, typeof c === "string" ? c : c(i, pts.length));
  });
  return pts;
};

const stamp = (cv: Canvas, g: Grid, ox: number, oy: number): void => {
  g.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] !== ".") cv.set(ox + x, oy + y, row[x]);
  });
};

// ---------------------------------------------------------------- the steed

/** One leg: fetlock position (frame space), pastern vector, and whether the hoof is planted. */
interface Leg {
  f: P;
  pv: P;
  ground: boolean;
}

interface Horse {
  /** body centre in frame space and tilt in degrees (negative = forequarters up) */
  x: number;
  y: number;
  a: number;
  neck: number;
  head: number;
  /** tail and mane flow: 0 hangs, 1 streams straight back */
  tail: number;
  mane: number;
  /** near F1 F2 R1 R2, far F1 F2 R1 R2 */
  legs: Leg[];
}

// leg roots in body-local coordinates: near side, then the far side (behind, offset forward)
const ROOTS: P[] = [[13.5, 2], [7.5, 3], [-6.5, 1], [-12.5, 0], [16, 1], [10.5, 2], [-3.5, 0], [-9.5, -1]];
const isFront = (i: number): boolean => i % 4 < 2;
const SEG = { front: [8, 8], hind: [9, 8] };

const toFrame = (h: Horse, p: P): P => add([h.x, h.y], rot(p, h.a * D2R));
const hipOf = (h: Horse, i: number): P => toFrame(h, ROOTS[i]);

const ik = (hip: P, target: P, l1: number, l2: number, bend: number): P => {
  const d0 = sub(target, hip);
  const d = Math.min(len(d0), l1 + l2 - 0.01);
  const th = Math.atan2(d0[1], d0[0]);
  const c = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const a1 = Math.acos(c);
  const k = th + bend * a1;
  return add(hip, [Math.cos(k) * l1, Math.sin(k) * l1]);
};

/** A planted leg, the hoof's centre at frame x = hx. */
const plant = (hx: number, lean = 1): Leg => ({ f: [hx - lean, GROUND - 4], pv: [lean, 2], ground: true });
/** A raised leg: fetlock at (x, y) with a pastern vector. */
const lift = (x: number, y: number, pv: P): Leg => ({ f: [x, y], pv, ground: false });

const drawLeg = (cv: Canvas, h: Horse, i: number): void => {
  const far = i >= 4;
  const front = isFront(i);
  const hip = hipOf(h, i);
  const [l1, l2] = front ? SEG.front : SEG.hind;
  const knee = ik(hip, h.legs[i].f, l1, l2, front ? -1 : 1);
  const lg = h.legs[i];
  const fet = add(knee, mul(norm(sub(lg.f, knee)), Math.min(l2, len(sub(lg.f, knee)))));
  const m = newMask();
  seg(m, hip, knee, far ? 3 : front ? 4 : 5, far ? 2 : 3);
  seg(m, knee, fet, 2, 2);
  seg(m, add(fet, mul(norm(sub(fet, knee)), -1)), fet, 3, 3);
  let hoofTop: P;
  if (lg.ground) {
    const hx = Math.round(fet[0] + lg.pv[0]);
    hoofTop = [hx, GROUND - 2];
    seg(m, fet, hoofTop, 2, 2);
  } else {
    hoofTop = add(fet, lg.pv);
    seg(m, fet, hoofTop, 2, 2);
  }
  paint(cv, m, far ? { base: "C", rules: [[1, 0, "q"]], line: "q" } : { base: "c", rules: [[1, 0, "C"]], line: "q", lineIf: (_x, y) => y > hip[1] + 3 });
  // hoof (gold-shod)
  const hm = newMask();
  if (lg.ground) {
    for (let x = hoofTop[0] - 1; x <= hoofTop[0] + 1; x++) for (let y = GROUND - 1; y <= GROUND; y++) hm[y * W + x] = 1;
    hm[(GROUND - 1) * W + hoofTop[0] - 1] = 0;
  } else {
    seg(hm, hoofTop, add(hoofTop, mul(norm(lg.pv), 1.6)), 3, 3);
  }
  paint(cv, hm, far ? { base: "g", rules: [[0, 1, "r"]] } : { base: "y", rules: [[0, 1, "g"], [-1, -1, "Y"]], line: "g" });
};

const neckGeom = (h: Horse): { root: P; top: P; poll: P; muzzle: P; hd: number } => {
  const root: P = [9, -2];
  const top = add(root, dir(h.neck, 13.5));
  const poll = add(top, dir(h.neck, 1.5));
  const muzzle = add(poll, dir(h.head, 10.5));
  return { root, top, poll, muzzle, hd: h.head };
};

const coatTest = (h: Horse): Test => {
  const g = neckGeom(h);
  const jowl = add(add(g.poll, dir(g.hd, 3.2)), dir(g.hd + 90, 1.4));
  const earA = add(g.poll, dir(g.hd - 90, 0.5));
  const ear = poly([add(earA, dir(g.hd + 180, 1.6)), add(earA, dir(g.hd - 120, 5.5)), add(earA, dir(g.hd - 30, 1.8))]);
  const body = union(
    ellipse([0, 0.5], 13, 6.5),
    ellipse([10, -0.5], 7, 7),
    ellipse([-10, -1.5], 8, 7.5),
    capsule(g.root, g.top, 5.5, 3.4),
    capsule(add(g.root, [3, 2]), add(g.top, dir(g.hd, 1)), 4, 2.6),
    capsule(g.poll, g.muzzle, 3.3, 2.4),
    ellipse(jowl, 3.3, 3.2),
    ear,
  );
  return local(body, [h.x, h.y], h.a * D2R);
};

const maneTest = (h: Horse): Test => {
  const g = neckGeom(h);
  const back = norm(sub(g.root, g.top));
  const nb = dir(h.neck - 90); // crest side
  const flow = dir(lerp(h.neck - 150, 180, h.mane));
  const inner: P[] = [];
  const outer: P[] = [];
  const N = 7;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const axis = lerpP(g.poll, g.root, t * 0.95);
    const r = lerp(3.0, 5.0, t);
    const base = add(axis, mul(nb, r - 1.5));
    inner.push(base);
    const l = (i % 2 ? 3.2 : 5) * (1 - t * 0.35) + h.mane * 2;
    outer.push(add(add(base, mul(flow, l)), mul(back, 0.8)));
  }
  const forelock = poly([add(g.poll, dir(h.head - 90, 1)), add(g.poll, dir(h.head - 10, 4.5)), add(g.poll, dir(h.head + 40, 2))]);
  return local(union(poly([...inner, ...outer.reverse()]), forelock), [h.x, h.y], h.a * D2R);
};

const tailTest = (h: Horse): Test => {
  const root: P = [-17, -4];
  const ang = lerp(105, 175, h.tail);
  const ctrl = add(root, dir(ang - 70, 6));
  const end = add(root, dir(ang, 19));
  const parts: Test[] = [];
  const N = 10;
  let prev = root;
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const a = lerpP(root, ctrl, t);
    const b = lerpP(ctrl, end, t);
    const p = lerpP(a, b, t);
    const r = t < 0.5 ? lerp(2, 3.2, t * 2) : lerp(3.2, 1.2, (t - 0.5) * 2);
    parts.push(capsule(prev, p, r, r));
    prev = p;
  }
  // strand ends
  const side = dir(ang + 90);
  parts.push(poly([add(end, mul(side, 2)), add(end, dir(ang, 3)), add(end, mul(side, -0.5))]));
  parts.push(poly([add(end, mul(side, -2.5)), add(add(end, dir(ang, 1.5)), mul(side, -3)), add(end, mul(side, -0.5))]));
  return local(union(...parts), [h.x, h.y], h.a * D2R);
};

const caparisonTest = (h: Horse): Test => {
  const pts: P[] = [[-11, -5], [6, -5.5], [10, -3], [12.5, 2], [13, 7.5]];
  for (let x = 13; x >= -14; x -= 1) {
    const ph = ((x + 14) % 5) / 5;
    pts.push([x, 7.4 + Math.sin(ph * Math.PI) * 1.6]);
  }
  pts.push([-15, 6], [-14.5, 1], [-13, -3]);
  return local(poly(pts), [h.x, h.y], h.a * D2R);
};

const drawHorse = (cv: Canvas, h: Horse, behindRider: (cv: Canvas) => void): void => {
  const a = h.a * D2R;
  const L = (p: P): P => toFrame(h, p);
  // far legs first, back to front
  for (const i of [7, 6, 5, 4]) drawLeg(cv, h, i);
  // tail
  paint(cv, maskOf(tailTest(h)), {
    base: "Q",
    rules: [[1, 1, "H"], [0, 2, "h"], [2, 0, "h"]],
    line: "h",
    tone: (x, y, ch) => (ch === "Q" && (x * 3 + y * 2) % 7 === 0 && y > L([-17, -4])[1] + 4 ? "h" : undefined),
  });
  // coat
  const coat = maskOf(coatTest(h));
  paint(cv, coat, {
    base: "c",
    rules: [[0, 1, "C"], [1, 2, "C"], [2, 0, "C"], [-1, -1, "W"], [0, -1, "W"]],
    line: "q",
  });
  // muscle lines (selective, in the coat's shade)
  const haunch = maskOf(local(ellipse([-10, -1.5], 8, 7.5), [h.x, h.y], a));
  const chest = maskOf(local(ellipse([10, -0.5], 7, 7), [h.x, h.y], a));
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const lp = rot([x + 0.5 - h.x, y + 0.5 - h.y], -a);
      if (inM(haunch, x, y) && !inM(haunch, x + 1, y) && inM(coat, x + 1, y) && lp[1] > -4 && lp[1] < 4) cv.set(x, y, "C");
      if (inM(chest, x, y) && !inM(chest, x - 1, y) && inM(coat, x - 1, y) && lp[1] > -4 && lp[1] < 5) cv.set(x, y, "C");
    }
  // face details
  const g = neckGeom(h);
  const eye = L(add(add(g.poll, dir(g.hd, 3.4)), dir(g.hd - 90, 0.9)));
  cv.set(Math.round(eye[0]), Math.round(eye[1]), "o");
  cv.set(Math.round(eye[0]) - 1, Math.round(eye[1]), "q");
  const nos = L(add(add(g.poll, dir(g.hd, 8.6)), dir(g.hd - 90, 0.6)));
  cv.set(Math.round(nos[0]), Math.round(nos[1]), "q");
  // mane
  paint(cv, maskOf(maneTest(h)), { base: "Q", rules: [[1, 1, "H"], [1, 0, "h"], [0, 1, "h"]], line: "h" });
  // gold bridle: cheek strap, noseband, browband, reins
  const cheekA = L(add(add(g.poll, dir(g.hd, 1.2)), dir(g.hd + 90, 0.6)));
  const nose = L(add(g.poll, dir(g.hd, 6.8)));
  const noseUp = L(add(add(g.poll, dir(g.hd, 6.3)), dir(g.hd - 90, 2.6)));
  const noseDn = L(add(add(g.poll, dir(g.hd, 7.2)), dir(g.hd + 90, 2.4)));
  line(cv, cheekA, nose, "y", true);
  line(cv, noseUp, noseDn, (i) => (i === 0 ? "Y" : "y"), true);
  const bit = L(add(add(g.poll, dir(g.hd, 8)), dir(g.hd + 90, 1.8)));
  cv.set(Math.round(bit[0]), Math.round(bit[1]), "Y");
  // near legs
  for (const i of [3, 2, 1, 0]) drawLeg(cv, h, i);
  // caparison with gold scalloped hem
  const cap = maskOf(caparisonTest(h));
  paint(cv, cap, {
    base: "B",
    rules: [[0, 1, "g"], [0, 2, "y"], [-1, 0, "L"], [0, -1, "L"], [1, 1, "D"]],
    line: "N",
    tone: (x, y, ch) => {
      if (ch !== "B") return undefined;
      const lp = rot([x + 0.5 - h.x, y + 0.5 - h.y], -a);
      const fx = Math.round(lp[0] + 30) % 5;
      if (lp[1] > 1 && fx === 0) return "D";
      if (lp[1] > 3 && fx === 1) return "L";
      if (lp[0] > 9) return "D";
      return undefined;
    },
  });
  // breast collar with a jewel
  const pc = newMask();
  seg(pc, L([10.5, -4]), L([16.5, 1.5]), 2, 2);
  paint(cv, pc, { base: "y", rules: [[0, 1, "g"], [-1, -1, "Y"]] });
  const gem = L([15.5, 2.5]);
  cv.set(Math.round(gem[0]), Math.round(gem[1]), "R");
  behindRider(cv);
  // reins from the bit back to the rider's rein hand (drawn by the rider)
  void bit;
};

// ---------------------------------------------------------------- the queen

const HEAD: Grid = [
  "....o.o.o....",
  "...oYoYoYo...",
  "..oyyyRyyyo..",
  ".ohQQQhhhhho.",
  "ohQQhhhhhhhho",
  "ohQhhhhhhhhho",
  "ohhhhhHhhssho",
  "ohhhhHsssssso",
  "ohhhhHsskssso",
  "oHhhhHSsksSso",
  "oHhhhHSsssso.",
  "oHhhho.SSoo..",
  ".oHHo...o....",
];
const HEAD_NECK: P = [7, 11]; // pixel of the head grid that sits on top of the neck

interface Rider {
  /** lean in degrees from upright, positive = forward */
  lean: number;
  /** sword-arm elbow and hand relative to the shoulder */
  elbow: P;
  hand: P;
  /** rapier direction in degrees (0 = right, -90 = up) and length */
  sword: number;
  blade?: number;
  /** cape / hair flow 0..1 */
  cape: number;
  /** extra head offset (recoil) */
  headDx?: number;
  headDy?: number;
}

interface Built {
  tip?: P;
  hand: P;
}

const drawRider = (cv: Canvas, h: Horse, r: Rider, built: Built): void => {
  const seat = toFrame(h, [-1, -7]);
  const la = r.lean * D2R;
  const R = (p: P): P => add(seat, rot(p, la));
  const shoulder = R([0.5, -10.5]);
  const flow = r.cape;

  // long hair falling down the back
  const hairTop = R([-2, -18]);
  const hair = poly([
    R([-1, -19]),
    R([-4.5, -16]),
    add(R([-6, -10]), [-flow * 3, 0]),
    add(R([-7.5, -5]), [-flow * 6, -flow * 2]),
    add(R([-4, -6]), [-flow * 3, -flow]),
    add(R([-5.5, -3]), [-flow * 4, -flow * 2]),
    R([-2, -8]),
    R([0, -14]),
  ]);
  // cape
  const cape = poly([
    R([-2.5, -11]),
    R([1, -11.5]),
    R([-1, -6]),
    add(R([-3, 1]), [-flow * 4, 0]),
    add(R([-8, 9]), [-flow * 10, -flow * 7]),
    add(R([-12, 6]), [-flow * 11, -flow * 8]),
    add(R([-11, 2]), [-flow * 9, -flow * 6]),
    add(R([-14, 2]), [-flow * 11, -flow * 9]),
    add(R([-7, -5]), [-flow * 4, -flow * 4]),
  ]);
  const capeM = maskOf(cape);
  paint(cv, capeM, {
    base: "D",
    rules: [[0, 1, "y"], [-1, 1, "y"], [1, 1, "N"], [-1, -1, "B"]],
    line: "N",
    tone: (x, y, ch) => (ch === "D" && (x + y) % 4 === 0 && y > shoulder[1] + 4 ? "N" : undefined),
  });
  paint(cv, maskOf(hair), { base: "h", rules: [[1, 1, "H"], [-1, -1, "Q"], [1, 0, "H"]], line: "H" });
  void hairTop;

  // leg: gown skirt over the thigh, steel greave and gold-tipped boot in the stirrup
  const knee = R([6, 3]);
  const ankle = add(knee, [-0.5, 8]);
  const legM = newMask();
  seg(legM, ankle, add(ankle, [2.5, 0.5]), 2, 2);
  seg(legM, knee, ankle, 3, 3);
  paint(cv, legM, { base: "M", rules: [[1, 0, "m"], [0, 1, "k"], [-1, 0, "W"]], line: "k" });
  const stirrup = add(ankle, [1, 2]);
  line(cv, add(stirrup, [-1, 0]), add(stirrup, [2, 0]), "y");
  const skirt = poly([R([-4, -3]), R([3, -3]), R([7, 0]), R([9, 4]), R([8.5, 7]), R([4, 7.5]), R([0, 5]), R([-4, 3])]);
  paint(cv, maskOf(skirt), {
    base: "B",
    rules: [[0, 1, "y"], [1, 1, "y"], [1, 0, "D"], [-1, 0, "L"], [0, -1, "L"]],
    line: "N",
    tone: (x, y, ch) => (ch === "B" && (x - y) % 4 === 0 ? "D" : undefined),
  });

  // torso: army bodice, gold breastplate edge and belt
  const torso = poly([R([-3, -2]), R([3, -2]), R([3, -5]), R([4, -7.5]), R([3.5, -10.5]), R([-3, -11]), R([-4, -7.5]), R([-3.5, -4])]);
  const torsoM = maskOf(torso);
  paint(cv, torsoM, {
    base: "B",
    rules: [[1, 0, "D"], [2, 0, "D"], [-1, 0, "L"], [0, -1, "L"]],
    line: "N",
    tone: (x, y, ch) => {
      const lp = rot([x + 0.5 - seat[0], y + 0.5 - seat[1]], -la);
      if (lp[1] > -3.2 && lp[1] < -1.8) return "y";
      if (lp[1] < -10 && lp[0] > -1) return "Y";
      if (lp[0] > 1.6 && lp[0] < 3.4 && lp[1] < -4 && lp[1] > -9) return ch === "D" ? "M" : "W";
      return undefined;
    },
  });
  // neck
  const neckP: P = add(R([0.8, -11.5]), [0, 0]);
  cv.set(Math.round(neckP[0]), Math.round(neckP[1]), "S");
  cv.set(Math.round(neckP[0]) + 1, Math.round(neckP[1]), "s");
  // pauldron
  const pm = maskOf(ellipse(add(shoulder, [-0.6, 0.6]), 2.6, 2.1));
  paint(cv, pm, { base: "y", rules: [[1, 1, "g"], [-1, -1, "Y"]], line: "g" });
  // head
  const hx = Math.round(neckP[0] - HEAD_NECK[0] + 1 + (r.headDx ?? 0));
  const hy = Math.round(neckP[1] - HEAD_NECK[1] + (r.headDy ?? 0));
  stamp(cv, HEAD, hx, hy);

  // reins hand (near the pommel) and reins to the bit
  const g = neckGeom(h);
  const bit = toFrame(h, add(add(g.poll, dir(g.hd, 8)), dir(g.hd + 90, 1.8)));
  const reinHand = R([5, -4]);
  line(cv, reinHand, bit, (i, n) => (i === 0 || i === n - 1 ? "y" : "g"));
  cv.set(Math.round(reinHand[0]), Math.round(reinHand[1]), "s");

  // sword arm
  const elbow = add(shoulder, r.elbow);
  const hand = add(shoulder, r.hand);
  const arm = newMask();
  seg(arm, shoulder, elbow, 3, 3);
  paint(cv, arm, { base: "B", rules: [[1, 1, "D"], [-1, -1, "L"]], line: "N" });
  const fore = newMask();
  seg(fore, elbow, hand, 3, 2);
  paint(cv, fore, { base: "M", rules: [[1, 1, "m"], [-1, -1, "W"]], line: "k" });
  built.hand = hand;

  // rapier
  const bl = r.blade ?? 21;
  const d = dir(r.sword);
  const tip = add(hand, mul(d, bl));
  const pts = line(cv, add(hand, mul(d, 2)), tip, (i, n) => (i < 2 ? "m" : i >= n - 2 ? "W" : i % 3 === 0 ? "W" : "M"));
  void pts;
  const perp = dir(r.sword + 90);
  line(cv, add(add(hand, mul(d, 1.5)), mul(perp, -2)), add(add(hand, mul(d, 1.5)), mul(perp, 2)), (i) => (i === 0 ? "Y" : "y"));
  const pom = add(hand, mul(d, -1.6));
  cv.set(Math.round(pom[0]), Math.round(pom[1]), "Y");
  cv.set(Math.round(hand[0]), Math.round(hand[1]), "s");
  built.tip = [Math.round(tip[0]), Math.round(tip[1])];
};

// ---------------------------------------------------------------- poses

const standLegs = (h: Horse, spread = 0): Leg[] =>
  ROOTS.map((_, i) => {
    const hip = hipOf(h, i);
    const s = isFront(i) ? spread : -spread;
    return plant(Math.round(hip[0] + (isFront(i) ? 1 : 0) + s), 1);
  });

/** The eight-legged gallop: each leg's phase is offset along the body so the legs roll in a wave. */
const gallopLegs = (h: Horse, t: number): Leg[] =>
  ROOTS.map((r, i) => {
    const hip = hipOf(h, i);
    const front = isFront(i);
    const ph = (t + (16 - r[0]) * 0.034 + (i >= 4 ? 0.13 : 0) + 1) % 1;
    if (ph < 0.45) {
      const s = ph / 0.45;
      const hx = Math.round(hip[0] + lerp(front ? 6 : 4, front ? -4 : -7, s));
      return plant(hx, front ? 1 : 1);
    }
    const s = (ph - 0.45) / 0.55;
    const lift0 = Math.sin(s * Math.PI);
    const fx = hip[0] + lerp(front ? -5 : -8, front ? 8 : 5, s);
    const fy = GROUND - 4 - lift0 * (front ? 9 : 6);
    const pv: P = front ? [lerp(-1, -2.5, lift0), lerp(2, 1.5, lift0)] : [lerp(0.5, -1, lift0), 2.2];
    return lift(fx, fy, pv);
  });

interface Pose {
  horse: Omit<Horse, "legs"> & { legs?: (h: Horse) => Leg[] };
  rider: Rider;
}

const build = (p: Pose, post?: (cv: Canvas, b: Built) => void): { grid: Grid; tip?: P } => {
  const hb = { ...p.horse, legs: [] as Leg[] };
  hb.legs = p.horse.legs ? p.horse.legs(hb) : standLegs(hb);
  const cv = new Canvas();
  const built: Built = { hand: [0, 0] };
  drawHorse(cv, hb, (c) => drawRider(c, hb, p.rider, built));
  const out = new Canvas();
  out.px = outline(cv.grid()).join("").split("");
  if (post) post(out, built);
  return { grid: fit(out.grid(), W, H), tip: built.tip };
};

const BASE_HORSE = { x: 43, y: 45, a: 0, neck: -62, head: 58, tail: 0.1, mane: 0.1 };
const IDLE_RIDER: Rider = { lean: 0, elbow: [2, 4], hand: [5, 6], sword: -62, cape: 0.05 };

const poses: Record<FrameId, Pose> = {
  idle0: { horse: { ...BASE_HORSE }, rider: IDLE_RIDER },
  idle1: { horse: { ...BASE_HORSE, y: 45.6, neck: -60, head: 60 }, rider: { ...IDLE_RIDER, hand: [5, 6.5], sword: -60 } },
  walk0: { horse: { ...BASE_HORSE, y: 44, a: -2, neck: -45, head: 55, tail: 0.6, mane: 0.6, legs: (h) => gallopLegs(h, 0) }, rider: { ...IDLE_RIDER, lean: 8, sword: -20, hand: [6, 4], elbow: [3, 3], cape: 0.6 } },
  walk1: { horse: { ...BASE_HORSE, y: 43, a: 0, neck: -48, head: 57, tail: 0.7, mane: 0.7, legs: (h) => gallopLegs(h, 0.25) }, rider: { ...IDLE_RIDER, lean: 8, sword: -22, hand: [6, 4], elbow: [3, 3], cape: 0.7 } },
  walk2: { horse: { ...BASE_HORSE, y: 44, a: 2, neck: -45, head: 55, tail: 0.6, mane: 0.6, legs: (h) => gallopLegs(h, 0.5) }, rider: { ...IDLE_RIDER, lean: 8, sword: -20, hand: [6, 4], elbow: [3, 3], cape: 0.6 } },
  walk3: { horse: { ...BASE_HORSE, y: 45, a: 0, neck: -42, head: 53, tail: 0.5, mane: 0.5, legs: (h) => gallopLegs(h, 0.75) }, rider: { ...IDLE_RIDER, lean: 8, sword: -18, hand: [6, 4], elbow: [3, 3], cape: 0.5 } },
  guard: { horse: { ...BASE_HORSE, x: 42, neck: -70, head: 62 }, rider: { ...IDLE_RIDER, lean: -4, elbow: [3, 2], hand: [7, -2], sword: -100, blade: 20 } },
  windup: { horse: { ...BASE_HORSE, neck: -58 }, rider: { ...IDLE_RIDER, lean: -6, elbow: [-4, 1], hand: [-7, -3], sword: -160, cape: 0.2 } },
  attack0: { horse: { ...BASE_HORSE, x: 44, neck: -52, head: 55, mane: 0.4, tail: 0.3 }, rider: { ...IDLE_RIDER, lean: 10, elbow: [4, 1], hand: [9, -1], sword: -30, cape: 0.4 } },
  attack1: { horse: { ...BASE_HORSE, x: 45, neck: -48, head: 52, mane: 0.5, tail: 0.4 }, rider: { ...IDLE_RIDER, lean: 14, elbow: [5, 3], hand: [11, 4], sword: 12, blade: 22, cape: 0.5 } },
  hit: { horse: { ...BASE_HORSE, x: 41, a: -5, neck: -78, head: 40, mane: 0.0, tail: 0.0 }, rider: { ...IDLE_RIDER, lean: -14, elbow: [-1, 4], hand: [2, 7], sword: -10, cape: 0.15, headDx: -1 } },
  crouch: { horse: { ...BASE_HORSE, y: 48, a: 6, neck: -50, head: 60 }, rider: { ...IDLE_RIDER, lean: 12, elbow: [3, 3], hand: [6, 4], sword: -20, cape: 0.2 } },
  air: { horse: { ...BASE_HORSE, y: 40, a: -6, neck: -40, head: 48, tail: 0.9, mane: 0.9 }, rider: { ...IDLE_RIDER, lean: 6, elbow: [3, 3], hand: [6, 3], sword: -15, cape: 0.9 } },
  victory0: { horse: { ...BASE_HORSE, neck: -74, head: 50 }, rider: { ...IDLE_RIDER, lean: -2, elbow: [3, -3], hand: [4, -9], sword: -80, cape: 0.15 } },
  victory1: { horse: { ...BASE_HORSE, neck: -74, head: 50 }, rider: { ...IDLE_RIDER, lean: -2, elbow: [3, -3], hand: [4, -9], sword: -80, cape: 0.15 } },
  special: { horse: { ...BASE_HORSE, x: 40, y: 41, a: -32, neck: -78, head: 35, tail: 0.3, mane: 0.5 }, rider: { ...IDLE_RIDER, lean: 12, elbow: [3, -3], hand: [5, -8], sword: -70, cape: 0.5 } },
};

const frames = {} as Record<FrameId, Grid>;
const tips: Partial<Record<FrameId, [number, number]>> = {};
for (const id of FRAME_IDS) {
  const r = build(poses[id]);
  frames[id] = r.grid;
  if (r.tip) tips[id] = r.tip;
}

const sheet: SpriteSheet = {
  w: W,
  h: H,
  foot: [44, GROUND],
  frames,
  tips,
  palette: {
    c: "#fbf8ff",
    C: "#d6cfe8",
    q: "#9a90b8",
    Q: "#fbf0c4",
    h: "#ecc864",
    H: "#b07c2c",
  },
};

export default sheet;
