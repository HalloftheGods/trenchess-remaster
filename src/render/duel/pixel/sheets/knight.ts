import { FRAME_IDS, outline, type FrameId, type Grid, type SpriteSheet } from "../sheet";

/**
 * Shadow Knight: a dark lancer in blackened plate on a charcoal warhorse.
 * Every frame is posed from a small skeleton (steed body, legs by IK, rider, arm, lance) and
 * painted part by part with form shading (rim light top-left, shade bottom-right) and a selective
 * outline where a part overlaps the parts behind it. Hand touches (visor, specular, eye) go last.
 */

const W = 88;
const H = 72;
const FLOOR = 70;

type P = [number, number];
type Mask = Uint8Array;

// ---------------------------------------------------------------- raster helpers

class Canvas {
  px: string[] = new Array<string>(W * H).fill(".");
  get(x: number, y: number): string {
    return x < 0 || y < 0 || x >= W || y >= H ? "." : this.px[y * W + x];
  }
  set(x: number, y: number, c: string): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < W && y < H) this.px[y * W + x] = c;
  }
  ifInk(x: number, y: number, c: string): void {
    if (this.get(Math.round(x), Math.round(y)) !== ".") this.set(x, y, c);
  }
  grid(): Grid {
    const rows: Grid = [];
    for (let y = 0; y < H; y++) rows.push(this.px.slice(y * W, y * W + W).join(""));
    return rows;
  }
}

const newMask = (): Mask => new Uint8Array(W * H);
const has = (m: Mask, x: number, y: number): boolean => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x] === 1;
const fill = (m: Mask, test: (x: number, y: number) => boolean, x0 = 0, y0 = 0, x1 = W, y1 = H): Mask => {
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, Math.ceil(y1)); y++)
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x1)); x++) if (test(x, y)) m[y * W + x] = 1;
  return m;
};

/** Rotated ellipse (angle in radians, screen space). */
const ell = (m: Mask, c: P, rx: number, ry: number, ang = 0): Mask => {
  const co = Math.cos(ang);
  const si = Math.sin(ang);
  const r = Math.max(rx, ry) + 1;
  return fill(
    m,
    (x, y) => {
      const dx = x - c[0];
      const dy = y - c[1];
      const lx = dx * co + dy * si;
      const ly = -dx * si + dy * co;
      return (lx / rx) ** 2 + (ly / ry) ** 2 <= 1;
    },
    c[0] - r,
    c[1] - r,
    c[0] + r + 1,
    c[1] + r + 1,
  );
};

/** Tapered capsule from a (radius r0) to b (radius r1). */
const cap = (m: Mask, a: P, b: P, r0: number, r1 = r0): Mask => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy || 1;
  const r = Math.max(r0, r1) + 1;
  return fill(
    m,
    (x, y) => {
      let t = ((x - a[0]) * dx + (y - a[1]) * dy) / l2;
      t = Math.max(0, Math.min(1, t));
      const px = a[0] + dx * t - x;
      const py = a[1] + dy * t - y;
      const rr = r0 + (r1 - r0) * t;
      return px * px + py * py <= rr * rr + 0.15;
    },
    Math.min(a[0], b[0]) - r,
    Math.min(a[1], b[1]) - r,
    Math.max(a[0], b[0]) + r + 1,
    Math.max(a[1], b[1]) + r + 1,
  );
};

const poly = (m: Mask, pts: P[]): Mask => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return fill(
    m,
    (x, y) => {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    },
    Math.min(...xs) - 1,
    Math.min(...ys) - 1,
    Math.max(...xs) + 2,
    Math.max(...ys) + 2,
  );
};

/** Chebyshev-stepped points from a to b (even stairs on clean slopes). */
const steps = (a: P, b: P): P[] => {
  const n = Math.max(Math.abs(Math.round(b[0]) - Math.round(a[0])), Math.abs(Math.round(b[1]) - Math.round(a[1])));
  const out: P[] = [];
  for (let i = 0; i <= n; i++) out.push([Math.round(a[0] + ((b[0] - a[0]) * i) / (n || 1)), Math.round(a[1] + ((b[1] - a[1]) * i) / (n || 1))]);
  return out;
};

interface Ramp {
  hi: string;
  base: string;
  sh: string;
  /** selective outline drawn on what lies behind this part */
  line: string;
  /** shade offset: pixel is shaded if (x+dx, y+dy) is outside the mask */
  shade?: P[];
  /** rim light offsets */
  rim?: P[];
  deep?: string;
}

const paint = (cv: Canvas, m: Mask, r: Ramp, tone?: (x: number, y: number, ch: string) => string | undefined): void => {
  const shade = r.shade ?? [[1, 1], [0, 2]];
  const rim = r.rim ?? [[-1, 0], [0, -1]];
  const col = new Map<number, string>();
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!has(m, x, y)) continue;
      let ch = r.base;
      if (r.deep && !has(m, x, y + 1) && !has(m, x + 1, y)) ch = r.deep;
      else if (shade.some(([dx, dy]) => !has(m, x + dx, y + dy))) ch = r.sh;
      else if (rim.some(([dx, dy]) => !has(m, x + dx, y + dy))) ch = r.hi;
      if (tone) ch = tone(x, y, ch) ?? ch;
      col.set(y * W + x, ch);
    }
  // clean lone pixels
  for (const [i, ch] of [...col]) {
    const n = [col.get(i - 1), col.get(i + 1), col.get(i - W), col.get(i + W)];
    if (n.every((c) => c !== undefined && c === n[0]) && n[0] !== ch) col.set(i, n[0]!);
  }
  // selective outline onto what is behind
  for (const i of col.keys()) {
    const x = i % W;
    const y = (i - x) / W;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!has(m, nx, ny) && cv.get(nx, ny) !== "." && cv.get(nx, ny) !== "o") cv.set(nx, ny, r.line);
    }
  }
  for (const [i, ch] of col) cv.px[i] = ch;
};

const rad = (d: number): number => (d * Math.PI) / 180;
const addP = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const mul = (a: P, s: number): P => [a[0] * s, a[1] * s];
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const dirOf = (deg: number): P => [Math.cos(rad(deg)), Math.sin(rad(deg))];

/** Two-bone IK: knee point between j and f; bend +1 puts the joint to the left of j->f (behind for a downward leg). */
const ik = (j: P, f: P, l1: number, l2: number, bend: number): P => {
  const dx = f[0] - j[0];
  const dy = f[1] - j[1];
  let d = Math.hypot(dx, dy);
  d = Math.max(Math.min(d, l1 + l2 - 0.01), Math.abs(l1 - l2) + 0.01, 0.01);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ux = dx / (Math.hypot(dx, dy) || 1);
  const uy = dy / (Math.hypot(dx, dy) || 1);
  return [j[0] + ux * a + bend * h * uy, j[1] + uy * a - bend * h * ux];
};


// ---------------------------------------------------------------- materials

const COAT: Ramp = { hi: "c", base: "C", sh: "q", line: "Q", deep: "Q" };
const COAT_FAR: Ramp = { hi: "C", base: "q", sh: "Q", line: "Q" };
const HAIR: Ramp = { hi: "q", base: "Q", sh: "Q", line: "o", shade: [[1, 1]] };
const PLATE: Ramp = { hi: "m", base: "k", sh: "q", line: "o", deep: "Q" };
const STEEL: Ramp = { hi: "M", base: "m", sh: "k", line: "o", shade: [[1, 1]] };
const CLOTH: Ramp = { hi: "L", base: "B", sh: "D", line: "N", deep: "N" };

// ---------------------------------------------------------------- pose

interface Leg {
  f: P; // fetlock
  h: P; // hoof centre
}

interface Pose {
  c: P; // barrel centre
  up: number; // body tilt degrees, front up
  neck: number; // neck angle (degrees above horizontal, withers to poll)
  head: number; // head angle (degrees below horizontal, poll to muzzle)
  ff: Leg; // front far
  fn: Leg; // front near
  hf: Leg; // hind far
  hn: Leg; // hind near
  tail: number; // tail lift 0..1
  hem: number; // caparison flutter phase
  lean: number; // rider lean (degrees forward)
  elbow: P; // near elbow, from the shoulder
  hand: P; // near hand, from the shoulder
  lance: number; // lance angle (0 = forward, negative = up)
  grip?: number; // slide the lance through the hand (+ = further forward)
  cape: number; // 0 hanging .. 1 streaming
  plume: number;
  smear?: boolean;
  glint?: boolean;
  dy?: number; // rider bob
}

const g = (hx: number): Leg => ({ f: [hx - 1, FLOOR - 4], h: [hx, FLOOR - 1] });

const rot = (p: Pose, v: P): P => {
  const a = rad(p.up);
  return [p.c[0] + v[0] * Math.cos(a) + v[1] * Math.sin(a), p.c[1] - v[0] * Math.sin(a) + v[1] * Math.cos(a)];
};

// ---------------------------------------------------------------- steed

const drawLeg = (cv: Canvas, p: Pose, leg: Leg, front: boolean, far: boolean): void => {
  const ramp = far ? COAT_FAR : COAT;
  const j = front ? rot(p, [12, 3]) : rot(p, [-13, 2]);
  const knee = front ? ik(j, leg.f, 9, 7, -1) : ik(j, leg.f, 10, 8, 1);
  const m = newMask();
  if (front) {
    cap(m, j, knee, 3, 1.9);
    cap(m, knee, leg.f, 1.5, 1.3);
  } else {
    cap(m, j, knee, 4.2, 1.8);
    cap(m, knee, leg.f, 1.4, 1.3);
  }
  cap(m, leg.f, lerp(leg.f, leg.h, 0.8), 1.3, 1.1);
  paint(cv, m, ramp);
  // feathering at the fetlock
  const fe = newMask();
  cap(fe, leg.f, [leg.f[0] - 1.6, leg.f[1] + 1.8], 1.1, 0.7);
  paint(cv, fe, far ? { ...HAIR, hi: "Q" } : HAIR);
  // hoof (a steel-shod block, flat on the ground when planted)
  const hm = newMask();
  const [hx, hy] = [Math.round(leg.h[0]), Math.round(leg.h[1])];
  const grounded = hy >= FLOOR - 1;
  if (grounded) {
    poly(hm, [[hx - 1.5, hy - 1.5], [hx + 1.5, hy - 1.5], [hx + 2.5, FLOOR + 0.5], [hx - 1.5, FLOOR + 0.5]]);
  } else {
    const d: P = [leg.h[0] - leg.f[0], leg.h[1] - leg.f[1]];
    const l = Math.hypot(d[0], d[1]) || 1;
    const u: P = [d[0] / l, d[1] / l];
    cap(hm, leg.h, addP(leg.h, mul(u, 1.3)), 1.5, 1.6);
  }
  paint(cv, hm, far ? { hi: "k", base: "q", sh: "Q", line: "o", shade: [[1, 0], [0, 1]] } : { hi: "m", base: "k", sh: "q", line: "o", shade: [[1, 0], [0, 1]] }, (_x, y, ch) => {
    if (grounded && y === FLOOR) return far ? "Q" : "m";
    if (ch === "m" && grounded && y < FLOOR - 1) return "k";
    return undefined;
  });
};

const poll = (p: Pose): P => addP(rot(p, [11, -6]), mul(dirOf(-p.neck), 17));

/** Head frame: s along the face (poll to muzzle), t toward the front of the face. */
const headAt = (p: Pose): ((s: number, t: number) => P) => {
  const P0 = poll(p);
  const d = dirOf(p.head);
  const n: P = [d[1], -d[0]];
  return (s, t) => addP(P0, addP(mul(d, s), mul(n, t)));
};

const drawTail = (cv: Canvas, p: Pose): void => {
  const b = rot(p, [-17, -4]);
  const t = p.tail;
  // the hank's spine blends from hanging (t=0) to streaming (t=1)
  const spine = (k: number): P => {
    const hang: P = [-2 - 9 * Math.sin(k * 1.9) + k * 3, -1 + 17 * k * k + 4 * k];
    const stream: P = [-2 - 15 * k, -1 + 5 * k + Math.sin(k * 7) * 1.2];
    return addP(b, lerp(hang, stream, t));
  };
  const m = newMask();
  const N = 10;
  for (let i = 0; i < N; i++) {
    const k0 = i / N;
    const k1 = (i + 1) / N;
    const rr = (k: number): number => (k < 0.35 ? 1.8 + k * 5 : 3.5 - (k - 0.35) * 4);
    cap(m, spine(k0), spine(k1), rr(k0), rr(k1));
  }
  // a split, wispy end
  cap(m, spine(0.85), addP(spine(1), [1.2 - t, 1.8 - t]), 1, 0.4);
  paint(cv, m, HAIR);
  // strands
  for (const off of [-0.9, 0.9]) {
    for (let k = 0.25; k < 0.9; k += 0.04) {
      const a = spine(k);
      const d = addP(spine(k + 0.04), mul(a, -1));
      const l = Math.hypot(d[0], d[1]) || 1;
      const q: P = [a[0] - (d[1] / l) * off, a[1] + (d[0] / l) * off];
      if (has(m, Math.round(q[0]), Math.round(q[1]) + 1) && has(m, Math.round(q[0]) - 1, Math.round(q[1]))) cv.set(q[0], q[1], off < 0 ? "q" : "Q");
    }
  }
};

const drawBody = (cv: Canvas, p: Pose): void => {
  const a = -rad(p.up);
  const m = newMask();
  ell(m, rot(p, [0, 0.5]), 16, 7, a);
  ell(m, rot(p, [11, 0]), 7, 7.5, a);
  ell(m, rot(p, [-12, -1]), 7, 7.5, a);
  paint(cv, m, COAT);
};

const drawNeckHead = (cv: Canvas, p: Pose): void => {
  const P0 = poll(p);
  const at = headAt(p);
  const withers = rot(p, [6, -7]);
  const chest = rot(p, [18, 2]);
  const nv: P = [P0[0] - withers[0], P0[1] - withers[1]];
  const nl = Math.hypot(nv[0], nv[1]);
  const out: P = [nv[1] / nl, -nv[0] / nl]; // behind the crest
  // mane first: locks falling behind the crest (the neck covers their roots)
  const mane: P[] = [at(-0.5, 1), addP(P0, mul(out, 2.5))];
  for (let i = 1; i <= 4; i++) {
    const e = lerp(P0, withers, i / 4.6);
    mane.push(addP(addP(e, mul(out, 4.6)), [-1.2, 1.4]), addP(e, mul(out, 2.2)));
  }
  mane.push(addP(withers, [-3.5, 1]), addP(withers, [1, 2]), lerp(withers, P0, 0.5));
  const mm = newMask();
  poly(mm, mane);
  paint(cv, mm, { ...HAIR, line: "Q" });
  // neck and head as one form
  const nm = newMask();
  poly(nm, [withers, addP(P0, mul(out, 0.6)), at(0, 1), at(2, -2.5), at(4.5, -4.8), at(7, -3.4), lerp(at(7, -3.4), chest, 0.5), chest, rot(p, [10, 6])]);
  cap(nm, at(1.2, -0.2), at(10.5, 0), 3.4, 2.5);
  ell(nm, at(3.6, -2.0), 4.0, 3.6);
  ell(nm, at(11.4, -0.6), 2.8, 2.7);
  paint(cv, nm, COAT);
  // jaw line (the cheek's lower curve) and a soft shade under the jowl
  for (let k = 0; k <= 5; k++) {
    const a = (k / 5) * Math.PI * 0.9;
    const q = at(3.8 + Math.cos(a) * 2.6, -2.0 - Math.sin(a) * 2.4);
    if (k > 0) cv.ifInk(q[0], q[1], "q");
  }
  // muzzle: a lighter soft nose, dark nostril and mouth corner
  cv.ifInk(...at(11.6, 1.2), "c");
  cv.ifInk(...at(12.6, 0.6), "c");
  cv.set(...at(12.3, -0.6), "Q");
  cv.ifInk(...at(10.2, -2.6), "Q");
  cv.ifInk(...at(9.4, -2.6), "Q");
  // the mane falls over the near side of the crest in locks
  const mn = newMask();
  for (let i = 0; i <= 5; i++) {
    const e = lerp(addP(P0, mul(out, 0.8)), withers, i / 5.5);
    const len = i % 2 === 0 ? 3.2 : 2.2;
    cap(mn, addP(e, mul(out, 0.8)), addP(addP(e, mul(out, -len)), [-1.0, 0.6]), 1.3, 0.6);
  }
  ell(mn, at(-0.4, 0.4), 1.6, 1.4);
  paint(cv, mn, { hi: "Q", base: "Q", sh: "Q", line: "Q" });
  for (let i = 1; i <= 8; i++) {
    const e = addP(lerp(addP(P0, mul(out, 0.8)), withers, i / 10), mul(out, -0.4));
    cv.ifInk(e[0], e[1], "q");
  }
  // ear, pricked forward
  const em = newMask();
  poly(em, [at(-0.4, 1.8), at(0.6, -1.6), addP(P0, [-0.8, -5.5])]);
  paint(cv, em, { ...COAT, line: "q" });
  // chanfron: a slim steel face plate down the forehead and nose
  const cm = newMask();
  poly(cm, [at(0.8, 3.6), at(8.4, 3.0), at(9.2, 1.4), at(2.4, 0.6)]);
  paint(cv, cm, { ...STEEL, line: "Q", rim: [[0, -1], [-1, 0]] });
  cv.ifInk(...at(2.6, 2.6), "W");
  // eye glow beside the plate, bit ring
  cv.set(...at(3.6, 0.0), "e");
  cv.set(...at(3.6, -1.0), "Q");
  cv.ifInk(...at(9.8, -3.4), "M");
};

const drawCaparison = (cv: Canvas, p: Pose): void => {
  const m = newMask();
  const front = 17;
  const back = -19;
  const hem: P[] = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const x = back + 1 + ((front - 1 - back) * i) / n;
    const dag = i % 2 === 0 ? 2 : 0;
    const flutter = p.hem ? Math.sin(p.hem * 1.7 + i * 1.3) * 0.9 : 0;
    hem.push(rot(p, [x - (p.hem ? 1 : 0) * (1 - i / n), 7 + dag + flutter]));
  }
  const pts: P[] = [rot(p, [10, -8]), rot(p, [3, -9]), rot(p, [-7, -9]), rot(p, [-14, -8]), rot(p, [-18, -5]), rot(p, [back, 1])];
  pts.push(...hem);
  pts.push(rot(p, [front + 0.5, 2]), rot(p, [front - 1, -3]), rot(p, [14, -6]));
  poly(m, pts);
  const e0 = rot(p, [-3, 1]);
  const inEmblem = (x: number, y: number): boolean => Math.abs(x - Math.round(e0[0])) <= 3 && y >= Math.round(e0[1]) - 4 && y <= Math.round(e0[1]) + 3;
  // hanging folds: each dagged point is a ridge (lit on its left, shaded on its right),
  // each notch a valley; they rise from the hem and fade out toward the saddle
  const ridges = hem.filter((_, i) => i % 2 === 0 && i > 0 && i < n);
  const valleys = hem.filter((_, i) => i % 2 === 1 && i > 1 && i < n - 1);
  paint(cv, m, { ...CLOTH, shade: [[1, 1], [0, 2], [2, 0]] }, (x, y, ch) => {
    if (!has(m, x, y + 1)) return "g";
    if (!has(m, x, y + 2)) return "y";
    if (!has(m, x, y + 3) && ch !== "D") return "N";
    if (ch !== "B" || inEmblem(x, y)) return undefined;
    for (const f of ridges) {
      const fx = Math.round(f[0]);
      const len = 9;
      if (y > f[1] - 3 - len && y < f[1] - 3) {
        const up = f[1] - 3 - y;
        if (x === fx - 1 && up < len - 1) return "L";
        if (x === fx + 1 && up < len - 3) return "D";
      }
    }
    for (const f of valleys) {
      const fx = Math.round(f[0]);
      if (y > f[1] - 10 && y < f[1] - 2 && x === fx) return "D";
      if (y > f[1] - 6 && y < f[1] - 2 && x === fx + 1) return "D";
    }
    return undefined;
  });
  // emblem: a gold chess knight
  const ex = Math.round(e0[0]);
  const ey = Math.round(e0[1]);
  const emblem = ["..yy.", ".yYyy", "yYy.y", "..yy.", ".yyy.", "ggggg"];
  emblem.forEach((row, y) => [...row].forEach((ch, x) => ch !== "." && cv.ifInk(ex + x - 2, ey + y - 3, ch)));
};

// ---------------------------------------------------------------- rider

interface Rider {
  hip: P;
  tan: number;
  /** u up from the hip, f forward; the upper body leans by shearing. */
  at: (u: number, f: number) => P;
}

const riderFrame = (p: Pose): Rider => {
  const hip = addP(rot(p, [-2, -9]), [0, p.dy ?? 0]);
  const tan = Math.tan(rad(p.lean));
  return { hip, tan, at: (u, f) => [hip[0] + f + u * tan, hip[1] - u] };
};

const shoulderOf = (r: Rider): P => {
  const q = r.at(10, 1);
  return [Math.round(q[0]), Math.round(q[1])];
};

const drawCape = (cv: Canvas, p: Pose, r: Rider): void => {
  const s = p.cape;
  const at = r.at;
  const m = newMask();
  // trailing edge sweeps back with speed; the bottom edge ripples
  const tail = (u: number, back: number, drop: number): P => {
    const q = at(u, -back);
    return [q[0] - s * back * 0.45, q[1] + drop * (1 - s * 0.6) + (1 - s) * (11 - u) * 0.5];
  };
  const pts: P[] = [
    at(12, -3),
    at(11, -6),
    tail(10, 8, 0),
    tail(7, 12, 1),
    tail(3, 15, 2),
    tail(0, 16, 4),
    tail(-1, 13, 2),
    tail(-2, 11, 4),
    tail(-1, 8, 2),
    tail(-2, 6, 3),
    at(1, -4),
    at(6, -4),
  ];
  poly(m, pts);
  const f1a = at(10, -5);
  const f1b = tail(-1, 12.5, 1);
  const f2a = at(9, -4);
  const f2b = tail(-1, 7.5, 1);
  const near = (x: number, y: number, a: P, b: P): number => {
    const t = Math.max(0, Math.min(1, ((x - a[0]) * (b[0] - a[0]) + (y - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)));
    return t < 0.3 ? 9 : Math.hypot(a[0] + (b[0] - a[0]) * t - x, a[1] + (b[1] - a[1]) * t - y);
  };
  paint(cv, m, { hi: "B", base: "D", sh: "N", line: "N", shade: [[0, 1], [1, 1]] }, (x, y, ch) => {
    if (ch !== "D") return undefined;
    if (near(x, y, f1a, f1b) < 0.6 || near(x, y, f2a, f2b) < 0.6) return "N";
    if (near(x + 1, y, f1a, f1b) < 0.6) return "B";
    return undefined;
  });
};

const drawRiderLeg = (cv: Canvas, r: Rider): void => {
  const knee = addP(r.hip, [7, 5]);
  const ankle = addP(r.hip, [4, 14]);
  const t = newMask();
  cap(t, addP(r.hip, [1, 0]), knee, 3.2, 2.5);
  paint(cv, t, { ...PLATE, line: "Q" });
  const s = newMask();
  cap(s, knee, ankle, 2.3, 1.7);
  paint(cv, s, { ...PLATE, line: "Q" });
  const kn = newMask();
  ell(kn, addP(knee, [0.6, -0.2]), 2.1, 1.9);
  paint(cv, kn, STEEL);
  // sabaton in the stirrup
  const f = newMask();
  cap(f, addP(ankle, [0, 1]), addP(ankle, [4, 2]), 1.5, 1.1);
  paint(cv, f, PLATE);
  steps(addP(ankle, [-1, 3]), addP(ankle, [4, 3])).forEach(([x, y]) => cv.set(x, y, "m"));
  steps(addP(ankle, [-1, -2]), addP(ankle, [-1, 2])).forEach(([x, y]) => cv.set(x, y, "r"));
};

/** Upper body, hip at (7, 24): closed great helm with a glowing slit, gorget, surcoat over plate. */
const UPPER: Grid = [
  "....oooooo......",
  "...oMWMmmko.....",
  "..oMMmkkkkqo....",
  "..oMkkkkkkqqo...",
  "..ommmmmmmmmo...",
  "..okkooooeeWo...",
  "..omkkkkkqqqo...",
  "..okkkkkkokqo...",
  "..okkkkkokqqo...",
  "...oqqqqqqqo....",
  "....okmkqo......",
  "..ookkkkkqoo....",
  ".okmkkkkkkkqo...",
  ".omkkkkkkkkkqo..",
  ".oyyyyyyyyyyyo..",
  ".oLBBBBBBBBBBDo.",
  ".oLBBBBBBBBBBDo.",
  ".oLBBBBBBBBBDDo.",
  "..oLBBBBBBBBDo..",
  "..oLBBBBBBBBDo..",
  "..orrrrrrryrro..",
  ".oLBBBBBBBBBDo..",
  ".oLBBBDBBBBBBDo.",
  "oLBBBDBBBBBDBDo.",
  "oNNNNNNNNNNNNNo.",
];

const PAULDRON: Grid = ["..ooooo..", ".oMMmmko.", "oMmkkkkqo", "omkkkkkqo", "oLBBBBBDo", ".ooooooo."];

const drawTorso = (cv: Canvas, p: Pose, r: Rider): void => {
  const at = r.at;
  // saddle: cantle behind, pommel in front
  const sd = newMask();
  poly(sd, [at(-1, -8), at(3, -8), at(1, -4), at(-1, -2)]);
  poly(sd, [at(-1, 5), at(2, 8), at(-1, 9)]);
  paint(cv, sd, { hi: "w", base: "r", sh: "o", line: "o" });
  // plume streams back from the crown
  const c = at(24, -3);
  const [cx, cy] = [Math.round(c[0]), Math.round(c[1])];
  const s = p.plume;
  const pm = newMask();
  poly(pm, [
    [cx - 0.5, cy - 2],
    [cx + 2.5, cy - 3],
    [cx + 2, cy + 1],
    [cx - 3, cy + 2],
    [cx - 7 - s * 3, cy + 4 + s],
    [cx - 11 - s * 4, cy + 9 - s * 3],
    [cx - 10 - s * 3, cy + 5 - s],
    [cx - 13 - s * 4, cy + 5 - s * 3],
    [cx - 8 - s * 3, cy + 0 - s * 2],
    [cx - 4, cy - 2],
  ]);
  paint(cv, pm, { ...CLOTH, deep: undefined, shade: [[0, 1], [1, 1]] });
  // a feather split running down the plume's length
  steps([cx - 1, cy], [cx - 9 - s * 3, cy + 4 - s * 1.5]).forEach(([x, y], i) => i > 0 && has(pm, x, y - 1) && has(pm, x, y + 1) && cv.set(x, y, "D"));
  // the upper body, sheared for the lean
  const ox = Math.round(r.hip[0]) - 7;
  const oy = Math.round(r.hip[1]) - 24;
  UPPER.forEach((row, y) => {
    const dx = Math.round((24 - y) * r.tan);
    [...row].forEach((ch, x) => ch !== "." && cv.set(ox + x + dx, oy + y, ch));
  });
};

const drawFarArm = (cv: Canvas, p: Pose, r: Rider): void => {
  const hand = r.at(6, 8);
  const at = headAt(p);
  const bit = at(8.6, -2.9);
  steps(hand, bit).forEach(([x, y], i, a) => i > 0 && i < a.length - 1 && cv.set(x, y, "r"));
  const m = newMask();
  ell(m, hand, 1.6, 1.5);
  paint(cv, m, PLATE);
};

const drawNearArm = (cv: Canvas, p: Pose, r: Rider): void => {
  const sh = shoulderOf(r);
  const el = addP(sh, p.elbow);
  const hand = addP(sh, p.hand);
  drawLance(cv, p, hand);
  const ua = newMask();
  cap(ua, sh, el, 2.2, 1.9);
  cap(ua, el, hand, 1.9, 1.6);
  ell(ua, hand, 2.1, 1.9);
  paint(cv, ua, { ...PLATE, line: "o" });
  cv.ifInk(el[0], el[1], "m");
  cv.ifInk(el[0] - 1, el[1], "M");
  PAULDRON.forEach((row, y) => [...row].forEach((ch, x) => ch !== "." && cv.set(sh[0] - 4 + x, sh[1] - 3 + y, ch)));
  cv.ifInk(hand[0] - 1, hand[1] - 1, "m");
  cv.ifInk(hand[0], hand[1] - 1, "m");
};

const LANCE_FRONT = 37;
const LANCE_BACK = 9;

const lanceTip = (p: Pose, hand: P): P => addP(hand, mul(dirOf(p.lance), LANCE_FRONT + (p.grip ?? 0)));

const drawLance = (cv: Canvas, p: Pose, hand: P): void => {
  const d = dirOf(p.lance);
  const grip = p.grip ?? 0;
  const butt = addP(hand, mul(d, -LANCE_BACK + grip));
  const tip = lanceTip(p, hand);
  const steep = Math.abs(d[1]) > Math.abs(d[0]);
  const off: P = steep ? [1, 0] : [0, 1];
  const pts = steps(butt, tip);
  const n = pts.length;
  if (p.smear) {
    // the thrust streak: a cone of speed lines converging on the point
    for (const k of [-3, -2, -1, 2, 3, 4]) {
      const a = Math.abs(k < 0 ? k : k - 1);
      const from = addP(tip, mul(d, -40 + a * 8));
      const to = addP(tip, mul(d, -3 - a * 3));
      const sp = steps(from, to);
      sp.forEach(([x, y], i) => {
        const t = i / sp.length;
        let c = "L";
        if (t > 0.7 - a * 0.1) c = "W";
        else if (t > 0.35) c = "M";
        cv.set(x - off[1] * 0 + (steep ? k : 0), y + (steep ? 0 : k), c);
      });
    }
  }
  const headLen = 7;
  pts.forEach(([x, y], i) => {
    if (i >= n - headLen) return;
    const stripe = Math.floor((i + 1) / 4) % 2 === 0;
    if (i < 2) {
      cv.set(x, y, "r");
      cv.set(x + off[0], y + off[1], "r");
    } else {
      cv.set(x, y, stripe ? "L" : "m");
      cv.set(x + off[0], y + off[1], stripe ? "D" : "k");
    }
  });
  for (let i = n - headLen; i < n; i++) {
    const [x, y] = pts[i];
    cv.set(x, y, i >= n - 2 ? "W" : "M");
    if (i < n - 3) cv.set(x + off[0], y + off[1], "m");
  }
  // vamplate: a steel cone in front of the hand
  const v0 = addP(hand, mul(d, 2));
  const v1 = addP(hand, mul(d, 7));
  const nrm: P = [-d[1], d[0]];
  const vm = newMask();
  poly(vm, [addP(v0, mul(nrm, -3.2)), addP(v0, mul(nrm, 3.8)), addP(v1, mul(nrm, 1.6)), addP(v1, mul(nrm, -0.6))]);
  paint(cv, vm, STEEL);
  cv.ifInk(...addP(v0, mul(nrm, -2.5)), "W");
};

// ---------------------------------------------------------------- frame assembly

const render = (p: Pose): { grid: Grid; tip: P } => {
  const cv = new Canvas();
  const r = riderFrame(p);
  drawLeg(cv, p, p.hf, false, true);
  drawLeg(cv, p, p.ff, true, true);
  drawTail(cv, p);
  drawBody(cv, p);
  drawLeg(cv, p, p.hn, false, false);
  drawLeg(cv, p, p.fn, true, false);
  drawNeckHead(cv, p);
  drawCape(cv, p, r);
  drawCaparison(cv, p);
  drawFarArm(cv, p, r);
  drawTorso(cv, p, r);
  drawRiderLeg(cv, r);
  drawNearArm(cv, p, r);
  const tip = lanceTip(p, addP(shoulderOf(r), p.hand));
  const [tx, ty] = [Math.round(tip[0]), Math.round(tip[1])];
  if (p.glint) {
    for (let k = 1; k <= 3; k++) {
      const c = ({ 1: "W", 2: "Y" } as Record<number, string>)[k] ?? "y";
      cv.set(tx + k, ty, c);
      cv.set(tx - k, ty, c);
      cv.set(tx, ty - k, c);
      cv.set(tx, ty + k, c);
    }
    cv.set(tx, ty, "W");
  }
  return { grid: outline(cv.grid()), tip: [tx, ty] };
};

const BASE_POSE: Pose = {
  c: [38, 47],
  up: 0,
  neck: 52,
  head: 52,
  ff: g(59),
  fn: g(51),
  hf: g(29),
  hn: g(21),
  tail: 0.1,
  hem: 0,
  lean: 3,
  elbow: [0, 7],
  hand: [5, 10],
  lance: -64,
  cape: 0.15,
  plume: 0.2,
};

const pose = (o: Partial<Pose>): Pose => ({ ...BASE_POSE, ...o });

const GALLOP = { lean: 9, hand: [6, 7] as P, elbow: [1, 6] as P, lance: -34, cape: 0.9, plume: 1, neck: 50, head: 42 };

const POSES: Record<FrameId, Pose> = {
  idle0: pose({}),
  idle1: pose({ dy: 1, hand: [5, 10], tail: 0.15, cape: 0.2, plume: 0.3 }),
  // four-beat gallop
  walk0: pose({
    ...GALLOP,
    c: [38, 46],
    up: 1,
    ff: { f: [68, 59], h: [71, 62] },
    fn: g(62),
    hf: { f: [16, 62], h: [12, 64] },
    hn: g(24),
    tail: 0.7,
    hem: 1,
  }),
  walk1: pose({
    ...GALLOP,
    c: [38, 45],
    ff: g(63),
    fn: { f: [58, 60], h: [55, 63] },
    hf: g(31),
    hn: { f: [17, 60], h: [13, 62] },
    tail: 0.85,
    hem: 2,
    dy: 1,
  }),
  walk2: pose({
    ...GALLOP,
    c: [39, 44],
    up: -2,
    ff: { f: [53, 61], h: [50, 63] },
    fn: { f: [57, 62], h: [55, 65] },
    hf: { f: [35, 63], h: [38, 66] },
    hn: g(32),
    tail: 1,
    hem: 3,
  }),
  walk3: pose({
    ...GALLOP,
    c: [38, 45],
    up: 2,
    ff: g(64),
    fn: { f: [67, 58], h: [71, 60] },
    hf: { f: [21, 62], h: [17, 64] },
    hn: g(18),
    tail: 0.8,
    hem: 4,
  }),
  guard: pose({ lean: -4, hand: [6, 3], elbow: [1, 6], lance: -58, grip: -10, cape: 0.1, head: 62, neck: 66 }),
  windup: pose({ lean: -7, hand: [-1, 8], elbow: [-4, 5], lance: -6, grip: -2, cape: 0.3, plume: 0.4, head: 58 }),
  attack0: pose({ c: [41, 46], lean: 14, hand: [9, 7], elbow: [4, 6], lance: -2, grip: -4, smear: true, cape: 0.9, plume: 1, neck: 52, head: 45, ff: g(61), fn: g(55), hf: g(30), hn: g(24), tail: 0.6, hem: 2 }),
  attack1: pose({ c: [42, 46], lean: 17, hand: [11, 5], elbow: [6, 4], lance: 0, grip: -7, cape: 1, plume: 1, neck: 48, head: 40, ff: { f: [67, 61], h: [70, 64] }, fn: g(58), hf: g(29), hn: { f: [20, 64], h: [16, 67] }, tail: 0.7, hem: 3 }),
  hit: pose({ c: [36, 47], up: 4, lean: -14, hand: [2, 7], elbow: [-2, 6], lance: -28, cape: 0.05, plume: 0.05, head: 30, neck: 72, ff: g(54), fn: g(49), hf: g(27), hn: g(21) }),
  crouch: pose({
    c: [37, 50],
    up: 8,
    lean: 16,
    hand: [7, 8],
    lance: -4,
    head: 62,
    neck: 44,
    ff: g(58),
    fn: g(52),
    hf: g(37),
    hn: g(32),
    tail: 0.2,
    cape: 0.4,
    plume: 0.5,
  }),
  air: pose({
    c: [39, 42],
    up: 3,
    lean: 10,
    neck: 52,
    head: 45,
    ff: { f: [68, 55], h: [72, 57] },
    fn: { f: [65, 58], h: [68, 61] },
    hf: { f: [14, 55], h: [10, 57] },
    hn: { f: [17, 58], h: [13, 60] },
    tail: 1,
    hem: 1.5,
    cape: 1,
    plume: 1,
    hand: [7, 7],
    lance: -4,
  }),
  victory0: pose({
    c: [37, 46],
    up: 14,
    neck: 70,
    head: 48,
    ff: { f: [60, 47], h: [62, 51] },
    fn: { f: [64, 49], h: [67, 52] },
    hf: g(31),
    hn: g(25),
    lean: 2,
    hand: [5, 2],
    elbow: [0, 6],
    lance: -74,
    grip: -9,
    cape: 0.6,
    plume: 0.7,
    tail: 0.5,
  }),
  victory1: pose({}),
  special: pose({
    c: [40, 37],
    up: 18,
    neck: 40,
    head: 44,
    ff: { f: [55, 44], h: [53, 47] },
    fn: { f: [58, 47], h: [56, 50] },
    hf: { f: [18, 56], h: [14, 59] },
    hn: { f: [22, 58], h: [18, 61] },
    tail: 1,
    hem: 2,
    lean: 14,
    hand: [8, 7],
    elbow: [3, 6],
    lance: -8,
    grip: -3,
    cape: 1,
    plume: 1,
  }),
};
POSES.victory1 = { ...POSES.victory0, glint: true };

const frames = {} as Record<FrameId, Grid>;
const tips: Partial<Record<FrameId, [number, number]>> = {};
for (const id of FRAME_IDS) {
  const { grid, tip } = render(POSES[id]);
  frames[id] = grid;
  tips[id] = tip;
}

const sheet: SpriteSheet = {
  w: W,
  h: H,
  foot: [44, FLOOR],
  frames,
  tips,
  // a black warhorse: charcoal coat, near-black mane
  palette: {
    c: "#7a6460",
    C: "#4c3c3e",
    q: "#2e2328",
    Q: "#160f14",
  },
};

export default sheet;
