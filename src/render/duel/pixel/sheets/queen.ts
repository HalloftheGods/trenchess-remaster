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

// leg roots in body-local coordinates: near side, then the far side (a little higher and forward)
const ROOTS: P[] = [[14.5, 4], [7, 5], [-7, 3], [-14.5, 2], [17, 3], [9.5, 4], [-4.5, 2], [-12, 1]];
const isFront = (i: number): boolean => i % 4 < 2;
const SEG = { front: [9, 8], hind: [11, 8.5] };
const PASTERN = 3;

const toFrame = (h: Horse, p: P): P => add([h.x, h.y], rot(p, h.a * D2R));
const hipOf = (h: Horse, i: number): P => toFrame(h, ROOTS[i]);

const ik = (hip: P, target: P, l1: number, l2: number, bend: number): P => {
  const d0 = sub(target, hip);
  const d = Math.min(len(d0), l1 + l2 - 0.01);
  const th = Math.atan2(d0[1], d0[0]);
  const c = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const k = th + bend * Math.acos(c);
  return add(hip, [Math.cos(k) * l1, Math.sin(k) * l1]);
};

/**
 * One leg as forward-kinematic swings (degrees from straight down, positive = forward):
 * upper leg, cannon, pastern. `plant` forces the hoof onto the floor, `false` keeps it in
 * the air; left out, a hoof that ends near the floor is planted.
 */
interface Leg {
  s1: number;
  s2: number;
  s3: number;
  plant?: boolean;
}
const legAt = (s1: number, s2 = s1, s3 = s2 + 18, plant?: boolean): Leg => ({ s1, s2, s3, plant });

const legChain = (h: Horse, i: number): { hip: P; knee: P; fet: P; hoof: P; ground: boolean } => {
  const front = isFront(i);
  const hip = hipOf(h, i);
  const [l1, l2] = front ? SEG.front : SEG.hind;
  const lg = h.legs[i];
  let knee = add(hip, dir(90 - lg.s1, l1));
  let fet = add(knee, dir(90 - lg.s2, l2));
  let hoof = add(fet, dir(90 - lg.s3, PASTERN));
  const ground = lg.plant ?? hoof[1] >= GROUND - 3.5;
  if (ground) {
    const hx = Math.round(hoof[0]);
    hoof = [hx, GROUND - 2];
    fet = [hx - 1, GROUND - 4.6];
    knee = ik(hip, fet, l1, l2, front ? -1 : 1);
    fet = add(knee, mul(norm(sub(fet, knee)), Math.min(l2, len(sub(fet, knee)))));
  }
  return { hip, knee, fet, hoof, ground };
};

const drawLeg = (cv: Canvas, h: Horse, i: number): void => {
  const far = i >= 4;
  const front = isFront(i);
  const { hip, knee, fet, hoof, ground } = legChain(h, i);
  const m = newMask();
  seg(m, hip, knee, far ? 3 : front ? 4 : 5, far ? 2 : 3);
  seg(m, knee, fet, 2, 2);
  seg(m, add(fet, mul(norm(sub(fet, knee)), -1.2)), fet, 3, 3);
  seg(m, fet, hoof, 2, 2);
  paint(
    cv,
    m,
    far
      ? { base: "C", rules: [[1, 0, "q"]], line: "q" }
      : { base: "c", rules: [[1, 0, "C"]], line: "q", lineIf: (_x, y) => y > hip[1] + 3 },
  );
  // gold-shod hoof
  const hm = newMask();
  if (ground) {
    for (let x = hoof[0] - 1; x <= hoof[0] + 1; x++) for (let y = GROUND - 1; y <= GROUND; y++) hm[y * W + x] = 1;
    hm[(GROUND - 1) * W + hoof[0] - 1] = 0;
  } else {
    seg(hm, hoof, add(hoof, mul(norm(sub(hoof, fet)), 1.6)), 3, 3);
  }
  paint(cv, hm, far ? { base: "g", rules: [[0, 1, "r"]] } : { base: "y", rules: [[0, 1, "g"], [-1, -1, "Y"]], line: "g" });
};

const neckGeom = (h: Horse): { root: P; top: P; poll: P; muzzle: P; hd: number } => {
  const root: P = [11, -3];
  const top = add(root, dir(h.neck, 17));
  const poll = add(top, dir(h.neck, 1.5));
  const muzzle = add(poll, dir(h.head, 11.5));
  return { root, top, poll, muzzle, hd: h.head };
};


/** The steed's head, nose down and forward; (1, 7) sits on the top of the neck. */
const HORSE_HEAD: Grid = [
  "..oo",
  ".oWCo",
  ".oWCo",
  "oQcCyo",
  "QQyYyyoo",
  "QhQcccWWoo",
  "hQccqoccWWoo",
  "QcccccccccWWoo",
  "QccccccccccccWo",
  "ccccccccccccccWo",
  "CCccccccccyycccWo",
  "oCCCccccyycccccqo",
  ".ooCCCyyCCcccCqo",
  "...ooooqqqCCCoo",
  ".......oooooo",
];
const HORSE_HEAD_NECK: P = [2, 8];
const HORSE_HEAD_BIT: P = [8, 12];

const BODY = { barrel: [[0, 0.5], 14, 7.5], chest: [[11.5, -1], 8, 8], haunch: [[-11.5, -2], 9, 8.5] } as const;

const headPos = (h: Horse): P => {
  const t = toFrame(h, neckGeom(h).top);
  return [Math.round(t[0] - HORSE_HEAD_NECK[0]), Math.round(t[1] - HORSE_HEAD_NECK[1])];
};
const bitPos = (h: Horse): P => add(headPos(h), HORSE_HEAD_BIT);

const coatTest = (h: Horse): Test => {
  const g = neckGeom(h);
  const body = union(
    ellipse(BODY.barrel[0] as unknown as P, BODY.barrel[1], BODY.barrel[2]),
    ellipse(BODY.chest[0] as unknown as P, BODY.chest[1], BODY.chest[2]),
    ellipse(BODY.haunch[0] as unknown as P, BODY.haunch[1], BODY.haunch[2]),
    capsule(g.root, g.top, 6.5, 4),
    capsule(add(g.root, [3, 3]), add(g.top, dir(g.hd, 1.5)), 4.5, 3),
  );
  return local(body, [h.x, h.y], h.a * D2R);
};

const maneTest = (h: Horse): Test => {
  const g = neckGeom(h);
  const nb = dir(h.neck - 90); // crest side
  const flow = dir(lerp(h.neck - 130, 175, h.mane));
  const inner: P[] = [];
  const outer: P[] = [];
  const N = 6;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const axis = lerpP(g.poll, g.root, t * 0.92);
    const r = lerp(3.6, 6.2, t);
    const base = add(axis, mul(nb, r - 1.2));
    inner.push(base);
    const l = (i % 2 ? 2.5 : 4.5) * (1 - t * 0.3) + h.mane * 2.5;
    outer.push(add(base, mul(flow, l)));
  }
  const forelock = poly([add(g.poll, dir(h.head - 90, 1.2)), add(g.poll, dir(h.head - 15, 4.8)), add(g.poll, dir(h.head + 30, 2))]);
  return local(union(poly([...inner, ...outer.reverse()]), forelock), [h.x, h.y], h.a * D2R);
};

const tailTest = (h: Horse): Test => {
  const root: P = [-19.5, -6];
  const ang = lerp(100, 160, h.tail);
  const ctrl = add(root, dir(ang - 75, 6));
  const end = add(root, dir(ang, 16));
  const parts: Test[] = [];
  const N = 10;
  let prev = root;
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const p = lerpP(lerpP(root, ctrl, t), lerpP(ctrl, end, t), t);
    const r = t < 0.45 ? lerp(2, 3.6, t / 0.45) : lerp(3.6, 1.6, (t - 0.45) / 0.55);
    parts.push(capsule(prev, p, r, r));
    prev = p;
  }
  // strand ends
  const side = dir(ang + 90);
  parts.push(poly([add(end, mul(side, 1.8)), add(end, dir(ang - 8, 3.5)), add(end, mul(side, -0.6))]));
  parts.push(poly([add(end, mul(side, -1.2)), add(add(end, dir(ang + 15, 2.5)), mul(side, -2.2)), add(end, mul(side, 0.6))]));
  return local(union(...parts), [h.x, h.y], h.a * D2R);
};

const caparisonTest = (h: Horse): Test => {
  const pts: P[] = [[-9, -6.5], [6, -6.5], [8, -2]];
  for (let x = 8; x >= -10; x -= 1) {
    const ph = ((x + 13) % 6) / 6;
    pts.push([x, 3.6 + Math.sin(ph * Math.PI) * 1.8 + (x < -6 ? (-6 - x) * 0.25 : 0)]);
  }
  pts.push([-11, -1]);
  return local(poly(pts), [h.x, h.y], h.a * D2R);
};

const drawHorse = (cv: Canvas, h: Horse, behindRider: (cv: Canvas) => void): void => {
  const a = h.a * D2R;
  // far legs first, back to front
  for (const i of [7, 6, 5, 4]) drawLeg(cv, h, i);
  // tail
  paint(cv, maskOf(tailTest(h)), {
    base: "Q",
    rules: [[0, 1, "H"], [1, 1, "h"], [0, 2, "h"], [-1, 0, "Q"]],
    line: "h",
  });
  // coat
  const coat = maskOf(coatTest(h));
  paint(cv, coat, {
    base: "c",
    rules: [[0, 1, "q"], [0, 2, "C"], [1, 2, "C"], [2, 0, "C"], [-1, -1, "W"], [0, -1, "W"]],
    line: "q",
    tone: (x, y, ch) => {
      if (ch !== "c") return undefined;
      const lp = rot([x + 0.5 - h.x, y + 0.5 - h.y], -a);
      // the belly turns away from the light: a solid shade band under the barrel
      if (lp[1] > 3.5 + Math.abs(lp[0]) * 0.04 && lp[0] > -20 && lp[0] < 20) return "C";
      return undefined;
    },
  });
  // muscle lines (selective, in the coat's shade)
  const haunch = maskOf(local(ellipse([-11.5, -2], 9, 8.5), [h.x, h.y], a));
  const chest = maskOf(local(ellipse([11.5, -1], 8, 8), [h.x, h.y], a));
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const lp = rot([x + 0.5 - h.x, y + 0.5 - h.y], -a);
      if (inM(haunch, x, y) && !inM(haunch, x + 1, y) && inM(coat, x + 1, y) && lp[1] > -4 && lp[1] < 4) cv.set(x, y, "C");
      if (inM(chest, x, y) && !inM(chest, x - 1, y) && inM(coat, x - 1, y) && lp[1] > 0 && lp[1] < 5) cv.set(x, y, "C");
    }
  // mane, then the hand-drawn head on top of the neck
  const g = neckGeom(h);
  paint(cv, maskOf(maneTest(h)), { base: "Q", rules: [[1, 0, "h"], [0, 1, "h"], [-1, -1, "Q"]], line: "h" });
  const hp = headPos(h);
  stamp(cv, HORSE_HEAD, hp[0], hp[1]);
  void g;
  // near legs
  for (const i of [3, 2, 1, 0]) drawLeg(cv, h, i);
  // caparison with gold scalloped hem
  const cap = maskOf(caparisonTest(h));
  paint(cv, cap, {
    base: "D",
    rules: [[0, 1, "g"], [0, 2, "y"], [1, 0, "N"], [-1, 0, "B"]],
    line: "N",
    tone: (x, y, ch) => {
      if (ch !== "D") return undefined;
      const lp = rot([x + 0.5 - h.x, y + 0.5 - h.y], -a);
      return lp[1] > -2 && Math.round(lp[0] + 31) % 6 === 0 ? "N" : undefined;
    },
  });
  behindRider(cv);
};

// ---------------------------------------------------------------- the queen

const HEAD: Grid = [
  "....o.o.o",
  "...oYoRoYo",
  "..oQyyyyyoo",
  ".oQhhhhhhhho",
  "oQhhhhhhhhhho",
  "ohhhhhhHhhHho",
  "ohhhhhHssHsso",
  "ohhhhHsssosso",
  "ohhhhHsssossso",
  "oHhhhoSsssSo",
  "oHhhho.oSSo",
  ".oHho..oso",
  "..oo....o",
];
const HEAD_NECK: P = [9, 11]; // the neck pixel of the head grid

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
  const seat = toFrame(h, [-1.5, -8.5]);
  const la = r.lean * D2R;
  const R = (p: P): P => add(seat, rot(p, la));
  const shoulder = R([0.5, -13]);
  const flow = r.cape;
  const F = (p: P, k: number): P => add(R(p), [-flow * k, -flow * k * 0.45]);

  // cape: army cloth, gold hem, flowing back over the steed's quarters
  const cape = poly([
    R([-2.5, -14]),
    R([1, -14]),
    R([-1, -9]),
    F([-3, -1], 4),
    F([-6, 7], 9),
    F([-9, 9], 11),
    F([-11, 5], 12),
    F([-14, 6], 13),
    F([-13, 0], 10),
    F([-8, -7], 5),
    R([-4, -12]),
  ]);
  paint(cv, maskOf(cape), {
    base: "B",
    rules: [[0, 1, "y"], [-1, 1, "y"], [1, 1, "N"], [1, 0, "D"], [-1, -1, "L"]],
    line: "N",
    tone: (x, y, ch) => {
      if (ch !== "B") return undefined;
      const lp = rot([x + 0.5 - seat[0], y + 0.5 - seat[1]], -la);
      const f = Math.round(lp[0] * 0.8 - lp[1] * 0.35);
      return (f === -5 && lp[1] > -8) || (f === -9 && lp[1] > -3) ? "D" : undefined;
    },
  });
  // long hair down the back
  const hair = poly([
    R([0, -20]),
    R([-4, -18]),
    R([-4.5, -15]),
    F([-5.5, -9], 3),
    F([-6, -4], 5),
    F([-3.5, -6.5], 3),
    F([-4.5, -2], 4),
    R([-1.5, -8]),
    R([-0.5, -14]),
  ]);
  paint(cv, maskOf(hair), {
    base: "h",
    rules: [[1, 0, "H"], [-1, 0, "Q"]],
    line: "H",
    tone: (x, y, ch) => (ch === "h" && (x * 2 + y) % 5 === 0 ? "H" : undefined),
  });

  // gown skirt over the thigh, then the steel greave and boot in a gold stirrup
  const skirt = poly([R([-4.5, -4]), R([3, -4]), R([7, -1]), R([9, 4]), R([10, 10]), R([6, 10.5]), R([2, 9]), R([-1, 6]), R([-4.5, 3])]);
  paint(cv, maskOf(skirt), {
    base: "B",
    rules: [[0, 1, "y"], [1, 1, "y"], [1, 0, "D"], [-1, 0, "L"], [0, -1, "L"]],
    line: "N",
    tone: (x, y, ch) => {
      if (ch !== "B") return undefined;
      const lp = rot([x + 0.5 - seat[0], y + 0.5 - seat[1]], -la);
      const fx = Math.round(lp[0] - lp[1] * 0.15);
      return (fx === 0 && lp[1] > 1) || (fx === 4 && lp[1] > 3) ? "D" : undefined;
    },
  });
  const ankle = R([8, 10.5]);
  const legM = newMask();
  seg(legM, add(ankle, [-1, -1]), add(ankle, [3, 0]), 2, 2);
  paint(cv, legM, { base: "M", rules: [[0, 1, "m"], [1, 0, "m"], [-1, -1, "W"]], line: "k" });
  line(cv, add(ankle, [-1, 2]), add(ankle, [2, 2]), (i) => (i === 0 ? "Y" : "y"));

  // torso: army bodice, steel breastplate with gold edge, gold belt
  const torso = poly([R([-3, -3]), R([3, -3]), R([3, -6]), R([4.2, -9.5]), R([3.5, -13.5]), R([-3, -14]), R([-4, -9.5]), R([-3.5, -5])]);
  paint(cv, maskOf(torso), {
    base: "B",
    rules: [[1, 0, "D"], [-1, 0, "L"], [0, -1, "L"]],
    line: "N",
    tone: (x, y) => {
      const lp = rot([x + 0.5 - seat[0], y + 0.5 - seat[1]], -la);
      if (lp[1] > -4.4 && lp[1] < -3) return lp[0] > 1.5 ? "g" : "y";
      if (lp[1] < -13) return lp[0] > 1 ? "g" : "y";
      if (lp[0] > 0.5 && lp[0] < 1.5 && lp[1] < -4.4) return "y";
      if (lp[0] > -2 && lp[0] < -0.8 && lp[1] < -8 && lp[1] > -12.5) return "L";
      return undefined;
    },
  });
  // neck
  const neckP = R([0.8, -14.4]);
  // head
  const hx = Math.round(neckP[0] - HEAD_NECK[0] + (r.headDx ?? 0));
  const hy = Math.round(neckP[1] - HEAD_NECK[1] + (r.headDy ?? 0));
  stamp(cv, HEAD, hx, hy);

  // rein hand by the pommel, reins to the bit
  const bit = bitPos(h);
  const reinHand = R([5, -5]);
  line(cv, reinHand, bit, (i, n) => (i === n - 1 ? "Y" : "g"));
  cv.set(Math.round(reinHand[0]), Math.round(reinHand[1]), "s");
  cv.set(Math.round(reinHand[0]) - 1, Math.round(reinHand[1]), "M");

  // sword arm: puffed army sleeve, gold pauldron, steel vambrace
  const elbow = add(shoulder, r.elbow);
  const hand = add(shoulder, r.hand);
  const arm = newMask();
  seg(arm, shoulder, elbow, 4, 3);
  paint(cv, arm, { base: "X", rules: [[1, 1, "x"], [0, 1, "x"]], line: "o" });
  const fore = newMask();
  seg(fore, elbow, hand, 3, 2);
  paint(cv, fore, { base: "M", rules: [[1, 1, "m"], [0, 1, "m"], [-1, -1, "W"]], line: "o" });
  const pm = maskOf(ellipse(add(shoulder, [-0.3, 1.2]), 2.2, 1.9));
  paint(cv, pm, { base: "y", rules: [[1, 1, "g"], [-1, -1, "Y"]], line: "g" });
  built.hand = hand;

  // rapier: slim steel blade, gold swept guard and pommel
  const bl = r.blade ?? 21;
  const d = dir(r.sword);
  const tip = add(hand, mul(d, bl));
  line(cv, add(hand, mul(d, 2)), tip, (i, n) => (i < 1 ? "m" : i >= n - 1 ? "W" : i % 4 === 1 ? "W" : "M"));
  const perp = dir(r.sword + 90);
  const gc = add(hand, mul(d, 1.4));
  line(cv, add(gc, mul(perp, -2)), add(gc, mul(perp, 2)), (i) => (i === 0 ? "Y" : "y"));
  const pom = add(hand, mul(d, -1.8));
  cv.set(Math.round(pom[0]), Math.round(pom[1]), "Y");
  cv.set(Math.round(hand[0]), Math.round(hand[1]), "s");
  built.tip = [Math.round(tip[0]), Math.round(tip[1])];
};

// ---------------------------------------------------------------- poses

/** A leg set from eight swings (near F1 F2 R1 R2, far F1 F2 R1 R2); hind cannons angle forward a little. */
const legs8 = (s: number[], plant?: (boolean | undefined)[], fold: number[] = []): Leg[] =>
  s.map((a, i) => {
    const f = fold[i] ?? 0;
    const s2 = isFront(i) ? a - f : a + 10 - f;
    return legAt(a, s2, s2 + (f > 30 ? -10 : 18), plant?.[i]);
  });

const STAND = [5, -3, -4, 4, 9, 1, -8, 0];
const standLegs = (): Leg[] => legs8(STAND, STAND.map(() => true));

/**
 * The eight-legged gallop. The four forelegs (and the four hind legs) sit at successive phases
 * of one stride, so each group fans out and the fan rolls through the cycle like a wave.
 */
const FAN_FRONT = [4, 0, 5, 1];
const FAN_HIND = [3, 7, 2, 6];
const gallopLegs = (t: number): Leg[] => {
  const out: Leg[] = [];
  const set = (i: number, ph: number, front: boolean): void => {
    const c = Math.cos(ph * 2 * Math.PI);
    const fold = ph > 0.5 ? Math.sin(((ph - 0.5) / 0.5) * Math.PI) * 60 : 0;
    if (front) {
      const s1 = 44 * c + 8;
      const s2 = s1 - fold;
      out[i] = legAt(s1, s2, s2 + 20 - fold * 0.6);
    } else {
      const s1 = 38 * c - 12;
      const s2 = s1 + 12 - fold * 0.9;
      out[i] = legAt(s1, s2, s2 + 20 - fold * 0.4);
    }
  };
  FAN_FRONT.forEach((i, k) => set(i, (t + k * GAIT_SPACING) % 1, true));
  FAN_HIND.forEach((i, k) => set(i, (t + 0.5 + k * GAIT_SPACING) % 1, false));
  return out;
};
const GAIT_SPACING = 0.16;

interface Pose {
  horse: Omit<Horse, "legs"> & { legs?: Leg[] };
  rider: Rider;
}

const build = (p: Pose, post?: (cv: Canvas, b: Built) => void): { grid: Grid; tip?: P } => {
  const hb: Horse = { ...p.horse, legs: p.horse.legs ?? standLegs() };
  const cv = new Canvas();
  const built: Built = { hand: [0, 0] };
  drawHorse(cv, hb, (c) => drawRider(c, hb, p.rider, built));
  const out = new Canvas();
  out.px = outline(cv.grid()).join("").split("");
  if (post) post(out, built);
  return { grid: fit(out.grid(), W, H), tip: built.tip };
};

const BASE_HORSE = { x: 42, y: 44, a: 0, neck: -62, head: 62, tail: 0.1, mane: 0.1 };
const IDLE_RIDER: Rider = { lean: 0, elbow: [3, 6], hand: [8, 5], sword: -68, cape: 0.05 };
const RUN_RIDER: Rider = { lean: 10, elbow: [3, 4], hand: [7, 4], sword: -16, cape: 0.65 };
const run = (t: number, dy: number, a: number, neck: number): Pose => ({
  horse: { ...BASE_HORSE, y: BASE_HORSE.y + dy, a, neck, head: neck + 106, tail: 0.75, mane: 0.7, legs: gallopLegs(t) },
  rider: { ...RUN_RIDER, cape: 0.6 + dy * -0.08, hand: [7, 4 + dy * 0.5] },
});

const poses: Record<FrameId, Pose> = {
  idle0: { horse: { ...BASE_HORSE }, rider: IDLE_RIDER },
  idle1: { horse: { ...BASE_HORSE, neck: -54, head: 64 }, rider: { ...IDLE_RIDER, elbow: [3, 6.5], hand: [8, 5.6], sword: -66, headDy: 0 } },
  walk0: run(0, 0, -2, -42),
  walk1: run(0.25, -1, 0, -44),
  walk2: run(0.5, 0, 2, -40),
  walk3: run(0.75, 1, 0, -38),
  guard: {
    horse: { ...BASE_HORSE, x: 41, a: -3, neck: -66, head: 66, legs: legs8([14, 8, 6, 0, 18, 11, 2, 6], [true, true, true, true, true, true, true, true]) },
    rider: { ...IDLE_RIDER, lean: -6, elbow: [6, 2], hand: [10, -1], sword: -50, blade: 20 },
  },
  windup: {
    horse: { ...BASE_HORSE, x: 41, a: -2, neck: -60, head: 64, mane: 0.2, legs: legs8([10, 2, 4, -2, 14, 5, 0, 2], [true, true, true, true, true, true, true, true]) },
    rider: { ...IDLE_RIDER, lean: -8, elbow: [-4, 2], hand: [-8, -2], sword: -165, cape: 0.25 },
  },
  attack0: {
    horse: { ...BASE_HORSE, x: 44, a: 2, neck: -44, head: 54, mane: 0.5, tail: 0.4, legs: legs8([30, 18, -22, -32, 36, 24, -16, -28], [undefined, true, true, true, false, true, true, true]) },
    rider: { ...IDLE_RIDER, lean: 12, elbow: [5, 0], hand: [10, -3], sword: -40, cape: 0.45 },
  },
  attack1: {
    horse: { ...BASE_HORSE, x: 45, a: 3, neck: -40, head: 50, mane: 0.6, tail: 0.5, legs: legs8([34, 22, -26, -36, 40, 28, -20, -32], [true, true, true, true, false, true, true, true]) },
    rider: { ...IDLE_RIDER, lean: 16, elbow: [5, 3], hand: [11, 4], sword: 10, blade: 22, cape: 0.55 },
  },
  hit: {
    horse: { ...BASE_HORSE, x: 40, a: -7, neck: -72, head: 46, mane: 0, tail: 0, legs: legs8([26, 18, 14, 6, 30, 22, 18, 10], [true, true, true, true, true, true, true, true]) },
    rider: { ...IDLE_RIDER, lean: -16, elbow: [-1, 4], hand: [2, 8], sword: -5, cape: 0.15, headDx: -1 },
  },
  crouch: {
    horse: { ...BASE_HORSE, y: 48, a: -8, neck: -50, head: 64, legs: legs8([18, 10, 30, 24, 22, 14, 34, 28], [true, true, true, true, true, true, true, true], [40, 40, 60, 60, 40, 40, 60, 60]) },
    rider: { ...IDLE_RIDER, lean: 14, elbow: [3, 4], hand: [7, 5], sword: -20, cape: 0.25 },
  },
  air: {
    horse: { ...BASE_HORSE, y: 38, a: -5, neck: -40, head: 52, tail: 0.95, mane: 0.9, legs: legs8([62, 50, -58, -46, 68, 56, -52, -40], [false, false, false, false, false, false, false, false], [20, 30, -10, -10, 20, 30, -10, -10]) },
    rider: { ...IDLE_RIDER, lean: 8, elbow: [3, 3], hand: [7, 3], sword: -14, cape: 0.95 },
  },
  victory0: {
    horse: { ...BASE_HORSE, neck: -70, head: 56, legs: legs8([55, -3, -4, 4, 9, 1, -8, 0], [false, true, true, true, true, true, true, true], [95, 0, 0, 0, 0, 0, 0, 0]) },
    rider: { ...IDLE_RIDER, lean: -3, elbow: [6, -1], hand: [10, -6], sword: -48, blade: 20, cape: 0.2 },
  },
  victory1: {
    horse: { ...BASE_HORSE, neck: -70, head: 56, legs: legs8([55, -3, -4, 4, 9, 1, -8, 0], [false, true, true, true, true, true, true, true], [95, 0, 0, 0, 0, 0, 0, 0]) },
    rider: { ...IDLE_RIDER, lean: -3, elbow: [6, -1], hand: [10, -6], sword: -48, blade: 20, cape: 0.2 },
  },
  special: {
    horse: { ...BASE_HORSE, x: 38, y: 40, a: -34, neck: -18, head: 30, tail: 0.25, mane: 0.5, legs: legs8([62, 48, 30, 22, 70, 56, 36, 28], [false, false, true, true, false, false, true, true], [85, 85, 30, 30, 85, 85, 30, 30]) },
    rider: { ...IDLE_RIDER, lean: 10, elbow: [6, -2], hand: [10, -6], sword: -42, blade: 19, cape: 0.5 },
  },
};

/** The cut's smear: a crescent streak swept around the sword hand, bright at the leading edge. */
const smear = (from: number, to: number, rIn: number, rOut: number) => (cv: Canvas, b: Built): void => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (cv.get(x, y) !== ".") continue;
      const d = sub([x + 0.5, y + 0.5], b.hand);
      const r = len(d);
      let ang = Math.atan2(d[1], d[0]) / D2R;
      while (ang < from) ang += 360;
      if (ang > to) continue;
      const t = (ang - from) / (to - from);
      const thick = 0.8 + (rOut - rIn) * t;
      if (r > rOut || r < rOut - thick) continue;
      const k = rOut - r;
      cv.set(x, y, k < 1 ? "W" : k < 2.2 ? "G" : "e");
    }
};

/** A four-point glint on the rapier's tip. */
const glint = (cv: Canvas, b: Built): void => {
  if (!b.tip) return;
  const [x, y] = b.tip;
  cv.set(x, y, "W");
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) cv.set(x + dx, y + dy, "W");
  for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) cv.set(x + dx, y + dy, "G");
  for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) if (cv.get(x + dx, y + dy) === ".") cv.set(x + dx, y + dy, "Y");
};

const POST: Partial<Record<FrameId, (cv: Canvas, b: Built) => void>> = {
  attack0: smear(-132, -46, 6, 17),
  victory1: glint,
};

const frames = {} as Record<FrameId, Grid>;
const tips: Partial<Record<FrameId, [number, number]>> = {};
for (const id of FRAME_IDS) {
  const r = build(poses[id], POST[id]);
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
    Q: "#fbeaa6",
    h: "#e8bc52",
    H: "#a8702a",
  },
};

export default sheet;
