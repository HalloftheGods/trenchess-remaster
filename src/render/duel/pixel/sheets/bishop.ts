import { FRAME_IDS, type FrameId, type Grid, type SpriteSheet } from "../sheet";

/**
 * Light Seer (bishop): a slender robed cleric in a tall white mitre, white-and-gold stole and a long
 * wooden staff crowned by a gold ring that holds a glowing orb.
 *
 * Built from hand-drawn part grids (head, torso, robe skirts) plus pixel-exact sleeves and staff drawn
 * along clean slopes. Each part is outlined on its own layer before compositing, then outline pixels
 * that sit between two inked areas are softened to the darker material (selective outlining).
 */

const W = 56;
const H = 60;
const FOOT: [number, number] = [28, 58];

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
  stamp(g: Grid, ox: number, oy: number, flipX = false): this {
    g.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = flipX ? row[row.length - 1 - x] : row[x];
        if (ch !== ".") this.set(ox + x, oy + y, ch);
      }
    });
    return this;
  }
  outline(ink = "o"): this {
    const add: P[] = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (this.get(x, y) !== ".") continue;
        if ([this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)].some((c) => c !== "." && c !== ink && c !== "z")) add.push([x, y]);
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

/** Clean stepped line from a to b. */
const steps = (a: P, b: P): P[] => {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
  const out: P[] = [];
  for (let i = 0; i <= n; i++) out.push([Math.round(a[0] + ((b[0] - a[0]) * i) / (n || 1)), Math.round(a[1] + ((b[1] - a[1]) * i) / (n || 1))]);
  return out;
};

// ---------------------------------------------------------------- parts (no outer outline; added per layer)

/** Mitre: tall, white, gold cross and base band. 9 wide, point at col 4. */
const MITRE: Grid = [
  "....X....",
  "...XXx...",
  "...XyX...",
  "..XXyXx..",
  "..XyyyX..",
  ".XXXyXxx.",
  ".XXXyXxx.",
  ".XXXyXxx.",
  "Yyyyyyyyg",
];

/** Face under the mitre, facing right: silver hair and ear at the back, brow, 2px eye, nose bump, trimmed silver beard. */
const FACE: Grid = [
  "mMMMsssss.",
  "MmMssssmm.",
  "mMmSsssos.",
  "mmMSsssoss",
  "mMmMSsssSs",
  ".mMMSsMMm.",
  ".mMMMMMmM.",
  "..mMMMMm..",
  "...mmmm...",
];

/** Eyes closed in prayer, serene. */
const FACE_UP: Grid = [
  "mMMMsssss.",
  "mMMSsssms.",
  "mMmSsssss.",
  "mMmSssSoss",
  "mmmSSsssSs",
  ".mMMSsMMm.",
  ".mMMMMMmM.",
  "..mMMMMm..",
  "...mmmm...",
];

/** Eye squeezed shut, brow knotted, mouth open in the beard. */
const FACE_HIT: Grid = [
  "mMMMssmms.",
  "mMMSsssms.",
  "mMmSsssSs.",
  "mMmSssooss",
  "mmmSSsssSs",
  ".mMMSsMMm.",
  ".mMMMMomM.",
  "..mMMMMm..",
  "...mmmm...",
];

/** Head grids: the mitre tilts back (dx per row band) when the seer looks up or is struck. */
const head = (face: Grid, tilt: number): Grid => {
  const rows: Grid = [];
  MITRE.forEach((r) => rows.push(".".repeat(2 + tilt) + r));
  face.forEach((r) => rows.push(".." + r));
  return rows;
};
const HEAD = head(FACE, 0);
const HEAD_UP = head(FACE_UP, -1);
const HEAD_HIT = head(FACE_HIT, -2);

/** Upper robe: neck, stole collar, shoulders, chest, gold cincture. 14 wide, belt on row 8. */
const TORSO: Grid = [
  ".....SS.......",
  "...XXXXXXx....",
  ".LLXXxBBBXXxD.",
  "LLBXXBBBBXXxDD",
  "LBBXxBBBBXyxDD",
  "LBBXxBBByyyxDD",
  "LBBXxBBBBXyxDN",
  "LBBXxBBBBXXxDN",
  "YyyXxyyyyXXxyg",
];

/** Long robe, standing: A-line, two folds, stole ends with gold fringe, gold hem, shoes. Top 14 wide at cols 3..16. */
const SKIRT_STAND: Grid = [
  "...LBBXxBBBBXXxDD...",
  "...LBBXxBBBBXXxDD...",
  "...LBBXxBBDBXXxDD...",
  "..LLBBXxBBDBXXxDDN..",
  "..LBBBXxBBDBXXxBDN..",
  "..LBBBXxBBDBXXxBDN..",
  "..LBBDXxBBDBXXxBDN..",
  ".LLBBDXxBBBDXXxBDDN.",
  ".LBBBDXxBBBDXXxBDDN.",
  ".LBBBDXxBBBDXXxBDDN.",
  ".LBBDBYgBBBDYyyBDDN.",
  ".LBBDBByBBBDByBBDDN.",
  "LLBBDBBBBBBDBBBDDDNN",
  "LBBBDBBBBBBDBBBBDDNN",
  "LBBBDBBBBBBDBBBBDDNN",
  "YyyyyyyyyyyyyyyyyygN",
  "....rrw.....rwwwr...",
];

/** Stride: front foot reaching forward, back heel lifted; hem swings forward. */
const SKIRT_STRIDE: Grid = [
  "...LBBXxBBBBXXxDD.....",
  "...LBBXxBBBBXXxDD.....",
  "...LBBXxBBDBXXxDD.....",
  "..LLBBXxBBDBXXxDDN....",
  "..LBBBXxBBDBXXxBDN....",
  "..LBBBXxBBDBXXxBDDN...",
  "..LBBDXxBBDBXXxBBDN...",
  ".LLBBDXxBBBDXXxBBDDN..",
  ".LBBBDXxBBBDXXxBBDDN..",
  ".LBBBDXxBBBDXXxBBBDDN.",
  ".LBBDBYgBBBDYyyBBBDDN.",
  ".LBBDBByBBBDByBBBBDDN.",
  "LLBBDBBBBBBBDBBBBBDDNN",
  "LBBBDBBBBBBBDBBBBBBDNN",
  "LBBDDBBBBBBBBDBBBBBDDN",
  "YyyyyyyyyyyyyyyyyyyygN",
  "..rrw..........rwwwwr.",
];

/** Stride, other foot: the far (shaded) foot leads, the near heel trails; hem swings back. */
const SKIRT_STRIDE2: Grid = [
  "...LBBXxBBBBXXxDD.....",
  "...LBBXxBBBBXXxDD.....",
  "...LBBXxBBBDXXxDD.....",
  "..LLBBXxBBBDXXxDDN....",
  "..LBBBXxBBBDXXxBDN....",
  "..LBBDXxBBBDXXxBDDN...",
  "..LBBDXxBBBDXXxBBDN...",
  ".LLBBDXxBBBBXXxDBDDN..",
  ".LBBBDXxBBBBXXxDBDDN..",
  ".LBBDBXxBBBBXXxDBBDDN.",
  "LLBBDBYgBBBBYyyDBBDDN.",
  "LBBBDBByBBBBByBDBBBDN.",
  "LBBBDBBBBBBBBBBDBBBDDN",
  "LBBDBBBBBBBBBBBDBBBDDN",
  "LBBDBBBBBBBBBBBBDBBBDN",
  "YyyyyyyyyyyyyyyyyyyygN",
  ".rwwwr.........rrrr...",
];

/** Passing: feet together under the robe, hem narrower, body risen one pixel (skirt one row longer). */
const SKIRT_PASS: Grid = [
  "...LBBXxBBBBXXxDD...",
  "...LBBXxBBBBXXxDD...",
  "...LBBXxBBDBXXxDD...",
  "...LBBXxBBDBXXxDDN..",
  "..LLBBXxBBDBXXxBDN..",
  "..LBBBXxBBDBXXxBDN..",
  "..LBBDXxBBDBXXxBDN..",
  "..LBBDXxBBBDXXxBDN..",
  ".LLBBDXxBBBDXXxBDDN.",
  ".LBBBDXxBBBDXXxBDDN.",
  ".LBBDBYgBBBDYyyBDDN.",
  ".LBBDBByBBBDByBBDDN.",
  ".LBBDBBBBBBDBBBBDDN.",
  "LLBBDBBBBBBDBBBBDDNN",
  "LBBBDBBBBBBDBBBBDDNN",
  "LBBBDBBBBBBDBBBBDDNN",
  "YyyyyyyyyyyyyyyyyygN",
  "......rwwwr.........",
];

/** Lunge: wide stance, robe split over the leading knee, back leg straight behind. 26 wide; top at cols 6..19. */
const SKIRT_LUNGE: Grid = [
  "......LBBXxBBBBXXxDD......",
  "......LBBXxBBBBXXxDDN.....",
  ".....LLBBXxBBBDXXxBDDN....",
  ".....LBBBXxBBBDXXxBBDDN...",
  "....LLBBDXxBBBDXXxBBBDDN..",
  "....LBBBDXxBBBBDXXxBBBDN..",
  "...LLBBDBXxBBBBDXyyBBBDDN.",
  "...LBBBDBYgBBBBDByBBBBDDN.",
  "..LLBBDBBByBBBBDBBBBBBBDN.",
  "..LBBBDBBBBBDDNNDBBBBBBDDN",
  ".LLBBDBBBBDDN..NDBBBBBBDDN",
  ".LBBBDBBBDDN....NDBBBBBDDN",
  "LLBBDBBBDDN......NBBBBBDDN",
  "LBBBDBBDDN.......NDBBBBDDN",
  "YyyyyyyygN........YyyyyygN",
  "rrw.................rwwwwr",
];

/** Crouch: knees bent under the robe, hem pooled wide on the floor. 24 wide; top at cols 5..18. */
const SKIRT_CROUCH: Grid = [
  ".....LBBXxBBBBXXxDD.....",
  "....LLBBXxBBBBXXxDDN....",
  "...LLBBBXxBBBDXXxBDDN...",
  "..LLBBBDXxBBBDXXxBBDDN..",
  ".LLBBBDBXxBBBBDXyyBBDDN.",
  ".LBBBDBBYgBBBBDByBBBDDN.",
  "LLBBDBBBByBBBBBDBBBBDDNN",
  "LBBBDBBBBBBBBBBDBBBBBDNN",
  "LBBDBBBBBBBBBBBBDBBBBDDN",
  "YyyyyyyyyyyyyyyyyyyyyygN",
  "...rrw..........rwwwwr..",
];

/** Airborne: legs tucked, robe billowing back and up. 24 wide; top at cols 5..18. */
const SKIRT_AIR: Grid = [
  ".....LBBXxBBBBXXxDD.....",
  ".....LBBXxBBBBXXxDDN....",
  "....LLBBXxBBBDXXxBDN....",
  "...LLBBBXxBBBDXXxBDDN...",
  "..LLBBBDXxBBBDXyyBBDN...",
  ".LLBBBDBYgBBBDByBBBDDN..",
  "LLBBBDBBByBBBBDBBBBDDN..",
  "LBBBDBBBBBBBBBBDBBBDDNN.",
  "LBBDDBBBBBBBBBBBDBBBDN..",
  "YyyBDDBBBBBBBBBBBDBBDN..",
  ".YyyyNDDBBBBBBBBBBDDDN..",
  "....gyyNDDDBBBBDDDNN....",
  ".......yyygNNNrwwrN.....",
  "..............rwwr......",
];

// ---------------------------------------------------------------- sleeves, hands, staff

const UPPER = 7;
const FORE = 7;

/** Two-bone arm: elbow from shoulder and wrist; bend +1 puts the elbow below/behind the line. */
const elbowOf = (sh: P, wr: P, bend: number): P => {
  const dx = wr[0] - sh[0];
  const dy = wr[1] - sh[1];
  const d = Math.hypot(dx, dy) || 1;
  const half = Math.min(d / 2, UPPER);
  const h = Math.sqrt(Math.max(0, UPPER * FORE - half * half));
  const px = -dy / d;
  const py = dx / d;
  return [Math.round(sh[0] + dx / 2 + px * h * bend), Math.round(sh[1] + dy / 2 + py * h * bend)];
};

/** A wide robe sleeve from shoulder to wrist, bell-shaped, shaded light top-left; white cuff. */
const sleeve = (sh: P, el: P, wr: P, far: boolean): Layer => {
  const base = far ? "D" : "B";
  const lite = far ? "B" : "L";
  const dark = far ? "N" : "D";
  const m = new Layer();
  const segs: [P, P, number, number][] = [
    [sh, el, 2.1, 2.1],
    [el, wr, 2.1, 2.7],
  ];
  for (const [a, b, r0, r1] of segs) {
    const pts = steps(a, b);
    pts.forEach(([x, y], i) => {
      const r = r0 + ((r1 - r0) * i) / Math.max(1, pts.length - 1);
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (dx * dx + dy * dy <= r * r) m.set(x + dx, y + dy, base);
    });
  }
  // the bell of the sleeve hangs below a level-ish forearm
  const fpts = steps(el, wr);
  const level = Math.abs(wr[1] - el[1]) <= Math.abs(wr[0] - el[0]);
  if (level)
    fpts.forEach(([x, y], i) => {
      const drop = Math.round((2 * i) / Math.max(1, fpts.length - 1));
      for (let k = 1; k <= drop; k++) m.set(x, y + 3 + k - 1, base);
    });
  const fx = wr[0] - el[0];
  const fy = wr[1] - el[1];
  const fl = Math.hypot(fx, fy) || 1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (m.get(x, y) === ".") continue;
      const t = ((x - wr[0]) * fx + (y - wr[1]) * fy) / fl;
      if (t > -0.6) m.set(x, y, ".");
      else if (t > -1.8) m.set(x, y, "X");
    }
  const out = new Layer();
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const c = m.get(x, y);
      if (c === ".") continue;
      const up = m.get(x, y - 1) === ".";
      const lf = m.get(x - 1, y) === ".";
      const dn = m.get(x, y + 1) === ".";
      const rt = m.get(x + 1, y) === ".";
      if (c === "X") {
        let gem = "y";
        if (dn || rt || far) gem = "g";
        else if (up || lf) gem = "Y";
        out.set(x, y, gem);
      } else if (up || (lf && !dn)) out.set(x, y, lite);
      else if (dn || rt) out.set(x, y, dark);
      else out.set(x, y, c);
    }
  return out;
};

/** A small fist: plus-shaped, lit top-left. */
const fist = (l: Layer, p: P): void => {
  const [x, y] = p;
  l.set(x - 1, y - 1, "s");
  l.set(x, y - 1, "s");
  l.set(x - 1, y, "s");
  l.set(x, y, "s");
  l.set(x + 1, y, "S");
  l.set(x, y + 1, "S");
  l.set(x - 1, y + 1, "S");
};

const STAFF_LEN = 45;

interface Staff {
  butt: P;
  /** The orb's centre. */
  orb: P;
  glow?: 0 | 1 | 2;
  front?: boolean;
}

/** Staff of the fixed length from a planted/held butt toward a point. */
const fromButt = (butt: P, toward: P, extra: Partial<Staff> = {}): Staff => {
  const dx = toward[0] - butt[0];
  const dy = toward[1] - butt[1];
  const d = Math.hypot(dx, dy);
  return { butt, orb: [Math.round(butt[0] + (dx / d) * STAFF_LEN), Math.round(butt[1] + (dy / d) * STAFF_LEN)], front: true, ...extra };
};
/** Staff of the fixed length from the orb toward a point (the butt end lies beyond). */
const fromOrb = (orb: P, toward: P, extra: Partial<Staff> = {}): Staff => {
  const dx = toward[0] - orb[0];
  const dy = toward[1] - orb[1];
  const d = Math.hypot(dx, dy);
  return { orb, butt: [Math.round(orb[0] + (dx / d) * STAFF_LEN), Math.round(orb[1] + (dy / d) * STAFF_LEN)], front: true, ...extra };
};
/** The point `g` pixels down the shaft from the orb. */
const along = (s: Staff, g: number): P => {
  const dx = s.butt[0] - s.orb[0];
  const dy = s.butt[1] - s.orb[1];
  const d = Math.hypot(dx, dy);
  return [Math.round(s.orb[0] + (dx / d) * g), Math.round(s.orb[1] + (dy / d) * g)];
};

/** Wooden shaft (2px, light side up-left), gold collar, finial, gold ring around a glowing orb. */
const drawStaff = (l: Layer, s: Staff): void => {
  const [ox, oy] = s.orb;
  const dx = s.butt[0] - ox;
  const dy = s.butt[1] - oy;
  const steep = Math.abs(dy) >= Math.abs(dx);
  const side = (p: P): P => (steep ? [p[0] + 1, p[1]] : [p[0], p[1] + 1]);
  const pts = steps(along(s, 5), s.butt);
  pts.forEach((p, i) => {
    l.set(p[0], p[1], "w");
    const q = side(p);
    l.set(q[0], q[1], "r");
    // grain: a darker knot every so often on the light side
    if (i > 4 && i % 9 === 0) l.set(p[0], p[1], "r");
  });
  // gold collar
  for (const [g, a, b] of [[5, "Y", "y"], [6, "y", "g"], [7, "Y", "g"]] as [number, string, string][]) {
    const p = along(s, g);
    l.set(p[0], p[1], a);
    const q = side(p);
    l.set(q[0], q[1], b);
  }
  // iron ferrule on the butt
  const f = s.butt;
  l.set(f[0], f[1], "M");
  const fq = side(f);
  l.set(fq[0], fq[1], "m");
  // ring
  for (let y = -5; y <= 5; y++)
    for (let x = -5; x <= 5; x++) {
      const d = Math.hypot(x, y);
      if (d >= 2.5 && d < 4.0) {
        const lit = -x - y;
        const inner = d < 3.0;
        let rc = "y";
        if (inner) rc = lit > 0 ? "y" : "g";
        else if (lit > 2) rc = "Y";
        else if (lit < -2) rc = "g";
        l.set(ox + x, oy + y, rc);
      }
    }
  // finial: a small gold point beyond the ring
  const fin = along(s, -5);
  l.set(fin[0], fin[1], "Y");
  // orb
  for (let y = -2; y <= 2; y++)
    for (let x = -2; x <= 2; x++) {
      const d = Math.hypot(x, y);
      if (d < 2.3) l.set(ox + x, oy + y, d < 1.1 ? "W" : "G");
    }
  l.set(ox - 1, oy - 1, "W");
  l.set(ox + 1, oy + 1, "Y");
};

/** Halo of glow around the orb (drawn after outlining, so it floats). */
const halo = (l: Layer, p: P, level: number): void => {
  const [x, y] = p;
  const put = (dx: number, dy: number, c: string): void => {
    if (l.get(x + dx, y + dy) === ".") l.set(x + dx, y + dy, c);
  };
  // soft ring of glow just outside the outline
  for (let dy = -7; dy <= 7; dy++)
    for (let dx = -7; dx <= 7; dx++) {
      const d = Math.hypot(dx, dy);
      if (d >= 5.6 && d < 6.4 && (dx + dy + 40) % 2 === 0) put(dx, dy, "G");
    }
  // rays
  const rays = level >= 2 ? 9 : 7;
  for (const [ux, uy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as P[]) for (let i = 7; i <= rays; i++) put(ux * i, uy * i, i === rays ? "G" : "W");
  if (level >= 2) for (const [ux, uy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as P[]) for (let i = 5; i <= 6; i++) put(ux * i, uy * i, i === 6 ? "G" : "W");
};

/** Four-point glint. */
const glint = (l: Layer, p: P): void => {
  const [x, y] = p;
  l.set(x, y, "W");
  for (let i = 1; i <= 3; i++) {
    const c = i === 3 ? "G" : "W";
    l.set(x + i, y, c);
    l.set(x - i, y, c);
    l.set(x, y + i, c);
    l.set(x, y - i, c);
  }
  l.set(x + 1, y + 1, "G");
  l.set(x - 1, y - 1, "G");
  l.set(x + 1, y - 1, "G");
  l.set(x - 1, y + 1, "G");
};

/** Smear arc: the orb's path as a bright crescent (leading edge W, then G, then L), centred on `c`. */
const smear = (l: Layer, c: P, r: number, a0: number, a1: number): void => {
  const n = 160;
  const put = (x: number, y: number, ch: string): void => {
    if (l.get(x, y) === ".") l.set(x, y, ch);
  };
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = a0 + (a1 - a0) * t;
    const thick = 2 + Math.round(3 * Math.pow(t, 1.4));
    for (let k = 0; k < thick; k++) {
      const rr = r - k;
      const x = Math.round(c[0] + Math.cos(a) * rr);
      const y = Math.round(c[1] + Math.sin(a) * rr);
      let ch = "L";
      if (k === 0) ch = "W";
      else if (k < thick - 1) ch = "G";
      put(x, y, ch);
    }
  }
};

// ---------------------------------------------------------------- pose assembly

type HeadKind = "n" | "up" | "hit";
type SkirtKind = "stand" | "stride" | "stride2" | "pass" | "lunge" | "crouch" | "air";

const SKIRTS: Record<SkirtKind, { g: Grid; col: number }> = {
  stand: { g: SKIRT_STAND, col: 3 },
  stride: { g: SKIRT_STRIDE, col: 3 },
  stride2: { g: SKIRT_STRIDE2, col: 3 },
  pass: { g: SKIRT_PASS, col: 3 },
  lunge: { g: SKIRT_LUNGE, col: 6 },
  crouch: { g: SKIRT_CROUCH, col: 5 },
  air: { g: SKIRT_AIR, col: 5 },
};

/** A wrist: a fixed point, or a grip `g` pixels down the staff from the orb. */
type Wrist = P | { g: number };

interface Arm {
  w: Wrist;
  bend: number;
  front: boolean;
}

interface Pose {
  /** Torso top-left. */
  t: P;
  skirt: SkirtKind;
  sx?: number;
  sb?: number;
  head?: HeadKind;
  hd?: P;
  near: Arm;
  far: Arm;
  staff: Staff;
  fx?: (l: Layer, orb: P) => void;
}

/** Selective outlining: outline pixels boxed in by robe cloth become the deep army tone. */
const soften = (g: Grid): Grid => {
  const at = (x: number, y: number): string => (x < 0 || y < 0 || x >= W || y >= H ? "." : g[y][x]);
  return g.map((row, y) =>
    row
      .split("")
      .map((ch, x) => {
        if (ch !== "o") return ch;
        const nb = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
        if (nb.some((c) => c === "." || c === "z")) return ch;
        const cloth = nb.filter((c) => "LBDN".includes(c)).length;
        return cloth >= 3 ? "N" : ch;
      })
      .join(""),
  );
};

/** Lays an arm over the figure; its ink lines that fall on robe cloth become the deep army tone. */
const overArm = (out: Layer, arm: Layer): void => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const c = arm.a[y][x];
      if (c === ".") continue;
      out.a[y][x] = c === "o" && "LBD".includes(out.a[y][x]) ? "N" : c;
    }
};

const build = (p: Pose): { grid: Grid; tip: P } => {
  const [tx, ty] = p.t;
  const sk = SKIRTS[p.skirt];
  const body = new Layer();
  const sb = p.sb ?? FOOT[1] - 1;
  const skY = Math.min(ty + 9, sb - (sk.g.length - 1));
  body.stamp(sk.g, tx - sk.col + (p.sx ?? 0), skY);
  body.stamp(TORSO, tx, ty);
  const hk = p.head ?? "n";
  let hg = HEAD;
  if (hk === "up") hg = HEAD_UP;
  else if (hk === "hit") hg = HEAD_HIT;
  const [hdx, hdy] = p.hd ?? [0, 0];
  body.stamp(hg, tx + hdx, ty - hg.length + 1 + hdy);
  body.outline();

  const wristOf = (w: Wrist): P => ("g" in w ? along(p.staff, w.g) : w);
  const arm = (sh: P, a: Arm, far: boolean): Layer => {
    const wr = wristOf(a.w);
    const l = sleeve(sh, elbowOf(sh, wr, a.bend), wr, far);
    fist(l, wr);
    return l.outline();
  };
  const nearL = arm([tx + 3, ty + 3], p.near, false);
  const farL = arm([tx + 11, ty + 3], p.far, true);

  const staffL = new Layer();
  drawStaff(staffL, p.staff);
  staffL.outline();

  const out = new Layer();
  if (!p.near.front) out.over(nearL);
  if (!p.far.front) out.over(farL);
  if (!p.staff.front) out.over(staffL);
  out.over(body);
  if (p.staff.front) out.over(staffL);
  if (p.far.front) overArm(out, farL);
  if (p.near.front) overArm(out, nearL);
  // gripping hands sit over the shaft
  for (const a of [p.far, p.near]) if ("g" in a.w && a.front) fist(out, wristOf(a.w));
  if (p.staff.glow) halo(out, p.staff.orb, p.staff.glow);
  p.fx?.(out, p.staff.orb);
  return { grid: soften(out.grid()), tip: p.staff.orb };
};

// ---------------------------------------------------------------- the poses

const FLOOR = FOOT[1] - 1;
const planted = (x: number): Staff => fromButt([x, FLOOR], [x, 0]);

const POSES: Record<FrameId, Pose> = {
  idle0: {
    t: [21, 31],
    skirt: "stand",
    near: { w: [23, 46], bend: -1, front: true },
    far: { w: { g: 26 }, bend: 1, front: true },
    staff: planted(38),
  },
  idle1: {
    t: [21, 32],
    skirt: "stand",
    near: { w: [23, 47], bend: -1, front: true },
    far: { w: { g: 27 }, bend: 1, front: true },
    staff: planted(38),
  },
  walk0: {
    t: [22, 31],
    skirt: "stride",
    near: { w: [19, 42], bend: -1, front: true },
    far: { w: { g: 25 }, bend: 1, front: true },
    staff: fromButt([44, FLOOR], [40, 0]),
  },
  walk1: {
    t: [21, 30],
    skirt: "pass",
    near: { w: [24, 43], bend: 1, front: true },
    far: { w: { g: 24 }, bend: 1, front: true },
    staff: fromButt([41, FLOOR], [39, 0]),
  },
  walk2: {
    t: [22, 31],
    skirt: "stride2",
    near: { w: [29, 42], bend: 1, front: true },
    far: { w: { g: 25 }, bend: 1, front: true },
    staff: fromButt([37, FLOOR], [40, 0]),
  },
  walk3: {
    t: [21, 30],
    skirt: "pass",
    near: { w: [25, 43], bend: 1, front: true },
    far: { w: { g: 24 }, bend: 1, front: true },
    staff: fromButt([40, FLOOR], [39, 0]),
  },
  guard: {
    t: [20, 32],
    skirt: "stand",
    sx: 1,
    hd: [-1, 1],
    near: { w: { g: 31 }, bend: 1, front: true },
    far: { w: { g: 13 }, bend: 1, front: false },
    staff: fromButt([31, FLOOR], [45, 0]),
  },
  windup: {
    t: [20, 32],
    skirt: "stride",
    sx: 1,
    hd: [-1, 0],
    near: { w: { g: 28 }, bend: 1, front: true },
    far: { w: { g: 33 }, bend: 1, front: true },
    staff: fromOrb([6, 18], [32, 38], { front: false }),
  },
  attack0: {
    t: [24, 33],
    skirt: "lunge",
    hd: [1, 0],
    near: { w: { g: 15 }, bend: 1, front: true },
    far: { w: { g: 9 }, bend: -1, front: false },
    staff: fromOrb([49, 24], [31, 36]),
    fx: (l) => smear(l, [32, 38], 22, -Math.PI * 1.02, -Math.PI * 0.25),
  },
  attack1: {
    t: [25, 35],
    skirt: "lunge",
    hd: [1, 1],
    near: { w: { g: 20 }, bend: 1, front: true },
    far: { w: { g: 13 }, bend: 1, front: true },
    staff: fromOrb([50, 52], [34, 40]),
  },
  hit: {
    t: [18, 32],
    skirt: "stand",
    sx: 2,
    head: "hit",
    hd: [-2, 1],
    near: { w: [12, 39], bend: 1, front: true },
    far: { w: { g: 27 }, bend: 1, front: true },
    staff: fromButt([41, FLOOR], [29, 10], { front: false }),
  },
  crouch: {
    t: [22, 40],
    skirt: "crouch",
    hd: [1, 1],
    near: { w: { g: 24 }, bend: 1, front: true },
    far: { w: { g: 14 }, bend: 1, front: true },
    staff: fromOrb([48, 30], [38, 38]),
  },
  air: {
    t: [22, 24],
    skirt: "air",
    sb: 46,
    head: "up",
    near: { w: { g: 24 }, bend: 1, front: true },
    far: { w: { g: 16 }, bend: 1, front: true },
    staff: fromOrb([48, 17], [30, 31]),
  },
  victory0: {
    t: [21, 31],
    skirt: "stand",
    head: "up",
    near: { w: [23, 46], bend: -1, front: true },
    far: { w: { g: 18 }, bend: 1, front: true },
    staff: fromOrb([38, 6], [38, 60]),
  },
  victory1: {
    t: [21, 31],
    skirt: "stand",
    head: "up",
    near: { w: [23, 46], bend: -1, front: true },
    far: { w: { g: 18 }, bend: 1, front: true },
    staff: fromOrb([38, 6], [38, 60], { glow: 1 }),
    fx: (l, o) => glint(l, [o[0] + 4, o[1] - 3]),
  },
  special: {
    t: [21, 32],
    skirt: "stand",
    head: "up",
    near: { w: [15, 23], bend: -1, front: true },
    far: { w: { g: 14 }, bend: 1, front: true },
    staff: fromOrb([40, 7], [38, 60], { glow: 2 }),
  },
};

const frames = {} as Record<FrameId, Grid>;
const tips: Partial<Record<FrameId, [number, number]>> = {};
for (const id of FRAME_IDS) {
  const r = build(POSES[id]);
  frames[id] = r.grid;
  tips[id] = r.tip;
}

const sheet: SpriteSheet = {
  w: W,
  h: H,
  foot: FOOT,
  frames,
  tips,
};

export default sheet;
