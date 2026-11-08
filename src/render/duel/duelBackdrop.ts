import Phaser from "phaser";
import type { Terrain } from "../../engine/types";
import { addPainted, rand } from "../art/canvas";
import { FX } from "./duelFx";

/** Size of one painted backdrop layer; layers tile horizontally (every shape wraps at BW). */
export const BW = 1024;
export const BH = 512;
/** Texture row the chessmen stand on. */
export const FLOOR_ROW = 362;

type G = CanvasRenderingContext2D;
type LayerId = "sky" | "far" | "mid" | "ground" | "fore";
const LAYER_IDS: LayerId[] = ["sky", "far", "mid", "ground", "fore"];
/** How far each layer moves for a pixel of ground movement. */
const PARALLAX: Record<LayerId, number> = { sky: 0.04, far: 0.14, mid: 0.38, ground: 1, fore: 1.7 };

interface Look {
  sky: [string, string, string];
  sun: string;
  sunAt: [number, number, number];
  far: string;
  haze: string;
  mid: string;
  ground: [string, string, string];
  fore: string;
  /** Multiplied into the fighters: the light of the place. */
  light: number;
  clouds: number;
}

const LOOKS: Record<Terrain, Look> = {
  flat: { sky: ["#2f6fd0", "#78b0ec", "#f6e2b8"], sun: "#fff3c0", sunAt: [770, 112, 34], far: "#6c93c0", haze: "#b8d0e8", mid: "#4a8540", ground: ["#7cb455", "#5a9440", "#3a6c2c"], fore: "#22461c", light: 0xfff8ee, clouds: 9 },
  forest: { sky: ["#0c2426", "#285a4e", "#a6d8a6"], sun: "#f2ffd8", sunAt: [300, 150, 26], far: "#21463c", haze: "#5c8e76", mid: "#132c22", ground: ["#4c7a3a", "#2f5a2c", "#1a361c"], fore: "#0b1a10", light: 0xe4f4dc, clouds: 0 },
  swamp: { sky: ["#1c2628", "#465850", "#a2ac86"], sun: "#e8ecc8", sunAt: [680, 96, 22], far: "#36443c", haze: "#7c8c76", mid: "#1f2a24", ground: ["#55603c", "#3a4630", "#212a20"], fore: "#0e1610", light: 0xd8e2cc, clouds: 4 },
  mountain: { sky: ["#16204a", "#4a5c96", "#cdd6ee"], sun: "#ffffff", sunAt: [210, 92, 24], far: "#59628a", haze: "#a8b2d4", mid: "#363b50", ground: ["#878a96", "#62656f", "#3c3e48"], fore: "#1a1c24", light: 0xe6ecff, clouds: 6 },
  desert: { sky: ["#c85a34", "#f0a456", "#ffe6a8"], sun: "#fff8dc", sunAt: [620, 220, 70], far: "#c0703c", haze: "#f2b878", mid: "#d68e48", ground: ["#f0c886", "#d8a862", "#b2803e"], fore: "#8a5a2a", light: 0xfff0d8, clouds: 2 },
};

export const lightOf = (t: Terrain): number => LOOKS[t].light;

const key = (t: Terrain, layer: LayerId): string => `dbg-${t}-${layer}`;

const wave = (x: number, n: number, phase: number): number => Math.sin((Math.PI * 2 * n * x) / BW + phase);

const vgrad = (g: G, y0: number, y1: number, stops: string[]): CanvasGradient => {
  const grad = g.createLinearGradient(0, y0, 0, y1);
  stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
  return grad;
};

/** Draws `fn` at x and again one tile to either side, so shapes crossing the seam wrap. */
const wrap = (x: number, fn: (x: number) => void): void => {
  for (const dx of [-BW, 0, BW]) if (x + dx > -200 && x + dx < BW + 200) fn(x + dx);
};

/** Fills the area under a ridge line `top(x)` with `fill`. */
const ridge = (g: G, top: (x: number) => number, fill: string | CanvasGradient): void => {
  g.beginPath();
  g.moveTo(0, BH);
  for (let x = 0; x <= BW; x += 4) g.lineTo(x, top(x));
  g.lineTo(BW, BH);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
};

const blob = (g: G, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient): void => {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
};

const sky = (t: Terrain) => (g: G): void => {
  const L = LOOKS[t];
  const rnd = rand(11);
  g.fillStyle = vgrad(g, 0, FLOOR_ROW, L.sky);
  g.fillRect(0, 0, BW, BH);
  if (t === "mountain" || t === "swamp") {
    for (let i = 0; i < 120; i++) {
      g.fillStyle = `rgba(255,255,255,${0.2 + rnd() * 0.6})`;
      g.fillRect(rnd() * BW, rnd() * 150, 1.5, 1.5);
    }
  }
  const [sx, sy, sr] = L.sunAt;
  const glow = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 6);
  glow.addColorStop(0, L.sun);
  glow.addColorStop(0.18, `${L.sun}aa`);
  glow.addColorStop(1, `${L.sun}00`);
  g.fillStyle = glow;
  g.fillRect(0, 0, BW, BH);
  blob(g, sx, sy, sr, sr, L.sun);
  for (let i = 0; i < L.clouds; i++) {
    const cx = rnd() * BW;
    const cy = 40 + rnd() * 140;
    const w = 60 + rnd() * 110;
    wrap(cx, (x) => {
      for (let j = 0; j < 6; j++) blob(g, x + (j - 2.5) * w * 0.3, cy + Math.sin(j * 2.1) * 6, w * 0.3, 14 + rnd() * 10, `rgba(255,255,255,${0.12 + rnd() * 0.2})`);
    });
  }
};

const conifer = (g: G, x: number, base: number, h: number, fill: string): void => {
  g.beginPath();
  g.moveTo(x, base - h);
  for (let i = 1; i <= 4; i++) {
    const y = base - h + (h * i) / 4.2;
    const w = (h * 0.28 * i) / 4 + 4;
    g.lineTo(x + w, y);
    g.lineTo(x + w * 0.45, y - 2);
  }
  g.lineTo(x + 3, base);
  g.lineTo(x - 3, base);
  for (let i = 4; i >= 1; i--) {
    const y = base - h + (h * i) / 4.2;
    const w = (h * 0.28 * i) / 4 + 4;
    g.lineTo(x - w * 0.45, y - 2);
    g.lineTo(x - w, y);
  }
  g.closePath();
  g.fillStyle = fill;
  g.fill();
};

const deadTree = (g: G, x: number, base: number, h: number, color: string, rnd: () => number): void => {
  g.strokeStyle = color;
  g.lineCap = "round";
  const branch = (x0: number, y0: number, len: number, ang: number, w: number, depth: number): void => {
    const x1 = x0 + Math.cos(ang) * len;
    const y1 = y0 + Math.sin(ang) * len;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo(x0 + Math.cos(ang + 0.4) * len * 0.5, y0 + Math.sin(ang + 0.4) * len * 0.5, x1, y1);
    g.stroke();
    if (depth <= 0) return;
    branch(x1, y1, len * 0.7, ang - 0.5 - rnd() * 0.4, w * 0.6, depth - 1);
    branch(x1, y1, len * 0.65, ang + 0.4 + rnd() * 0.4, w * 0.6, depth - 1);
  };
  branch(x, base, h * 0.45, -Math.PI / 2 + (rnd() - 0.5) * 0.3, h * 0.07, 3);
};

const FAR: Record<Terrain, (g: G) => void> = {
  flat: (g) => {
    const L = LOOKS.flat;
    ridge(g, (x) => FLOOR_ROW - 70 - 26 * wave(x, 2, 0.4) - 12 * wave(x, 5, 1.3), vgrad(g, 250, FLOOR_ROW, [L.haze, L.far]));
  },
  forest: (g) => {
    const L = LOOKS.forest;
    const rnd = rand(5);
    ridge(g, (x) => FLOOR_ROW - 40 - 10 * wave(x, 3, 0), L.far);
    for (let x = 0; x < BW; x += 22 + rnd() * 10) {
      const h = 90 + rnd() * 70;
      wrap(x, (xx) => conifer(g, xx, FLOOR_ROW - 30, h, L.far));
    }
    g.fillStyle = vgrad(g, 160, FLOOR_ROW, [`${L.haze}00`, `${L.haze}88`]);
    g.fillRect(0, 160, BW, FLOOR_ROW - 160);
  },
  swamp: (g) => {
    const L = LOOKS.swamp;
    const rnd = rand(9);
    ridge(g, (x) => FLOOR_ROW - 34 - 8 * wave(x, 4, 1), L.far);
    for (let i = 0; i < 9; i++) {
      const x = (i + rnd() * 0.6) * (BW / 9);
      wrap(x, (xx) => deadTree(g, xx, FLOOR_ROW - 30, 120 + rnd() * 80, L.far, rnd));
    }
    g.fillStyle = vgrad(g, 200, FLOOR_ROW, [`${L.haze}00`, `${L.haze}cc`]);
    g.fillRect(0, 200, BW, FLOOR_ROW - 200);
  },
  mountain: (g) => {
    const L = LOOKS.mountain;
    const top = (x: number): number => FLOOR_ROW - 150 - 90 * Math.abs(wave(x, 3, 0.2)) - 30 * Math.abs(wave(x, 7, 1.1)) + 20 * wave(x, 2, 0);
    ridge(g, top, vgrad(g, 80, FLOOR_ROW, [L.haze, L.far]));
    g.fillStyle = "rgba(244,248,255,0.92)";
    for (let x = 0; x < BW; x += 2) {
      const y = top(x);
      if (y < 170) g.fillRect(x, y, 2, (170 - y) * 0.55 + 3);
    }
  },
  desert: (g) => {
    const L = LOOKS.desert;
    ridge(g, (x) => FLOOR_ROW - 40 - 12 * wave(x, 2, 2), vgrad(g, 260, FLOOR_ROW, [L.haze, L.far]));
    const mesa = (x: number, w: number, h: number): void => {
      g.beginPath();
      g.moveTo(x - w * 0.62, FLOOR_ROW - 36);
      g.lineTo(x - w * 0.5, FLOOR_ROW - 36 - h);
      g.lineTo(x + w * 0.5, FLOOR_ROW - 36 - h);
      g.lineTo(x + w * 0.62, FLOOR_ROW - 36);
      g.closePath();
      g.fillStyle = vgrad(g, FLOOR_ROW - 36 - h, FLOOR_ROW, [L.haze, L.far]);
      g.fill();
    };
    [[120, 160, 90], [470, 90, 60], [800, 220, 120]].forEach(([x, w, h]) => wrap(x, (xx) => mesa(xx, w, h)));
  },
};

const MID: Record<Terrain, (g: G) => void> = {
  flat: (g) => {
    const L = LOOKS.flat;
    const rnd = rand(3);
    ridge(g, (x) => FLOOR_ROW - 26 - 18 * wave(x, 3, 2.2) - 6 * wave(x, 9, 0.5), vgrad(g, 300, FLOOR_ROW, ["#5e9a4c", L.mid]));
    for (let i = 0; i < 7; i++) {
      const x = rnd() * BW;
      const base = FLOOR_ROW - 30 - 14 * wave(x, 3, 2.2);
      wrap(x, (xx) => {
        g.fillStyle = "#4a3420";
        g.fillRect(xx - 3, base - 30, 6, 32);
        [[0, -46, 22], [-14, -36, 16], [14, -36, 16]].forEach(([dx, dy, r]) => blob(g, xx + dx, base + dy, r, r * 0.9, "#3a6e30"));
        blob(g, xx - 6, base - 52, 10, 8, "rgba(255,255,200,0.18)");
      });
    }
  },
  forest: (g) => {
    const L = LOOKS.forest;
    const rnd = rand(17);
    for (let i = 0; i < 6; i++) {
      const x = (i + 0.2 + rnd() * 0.5) * (BW / 6);
      const w = 26 + rnd() * 20;
      wrap(x, (xx) => {
        const bark = g.createLinearGradient(xx - w / 2, 0, xx + w / 2, 0);
        bark.addColorStop(0, "#2a3a26");
        bark.addColorStop(0.4, "#1a2618");
        bark.addColorStop(1, "#0a120a");
        g.fillStyle = bark;
        g.beginPath();
        g.moveTo(xx - w * 0.5, 0);
        g.lineTo(xx + w * 0.5, 0);
        g.lineTo(xx + w * 0.7, FLOOR_ROW - 8);
        g.lineTo(xx - w * 0.7, FLOOR_ROW - 8);
        g.closePath();
        g.fill();
      });
    }
    for (let x = 0; x < BW; x += 30) wrap(x, (xx) => blob(g, xx, 20 + 30 * Math.abs(wave(xx, 5, 0.7)), 60, 50, L.mid));
    for (let x = 0; x < BW; x += 48) wrap(x, (xx) => blob(g, xx + 12, 40 + 26 * Math.abs(wave(xx, 3, 1.7)), 30, 18, "rgba(80,140,90,0.25)"));
    ridge(g, (x) => FLOOR_ROW - 14 - 10 * Math.abs(wave(x, 13, 0.2)), "#1c3a22");
  },
  swamp: (g) => {
    const L = LOOKS.swamp;
    const rnd = rand(23);
    for (let i = 0; i < 4; i++) {
      const x = (i + rnd() * 0.5) * (BW / 4);
      wrap(x, (xx) => {
        deadTree(g, xx, FLOOR_ROW - 6, 200 + rnd() * 60, L.mid, rnd);
        g.strokeStyle = "rgba(120,140,96,0.55)";
        g.lineWidth = 2;
        for (let m = 0; m < 6; m++) {
          const mx = xx - 50 + rnd() * 100;
          const my = FLOOR_ROW - 150 + rnd() * 60;
          g.beginPath();
          g.moveTo(mx, my);
          g.quadraticCurveTo(mx + 4, my + 20, mx - 2, my + 30 + rnd() * 30);
          g.stroke();
        }
      });
    }
    g.strokeStyle = L.mid;
    g.lineWidth = 2.5;
    for (let x = 0; x < BW; x += 5 + rnd() * 6) {
      const h = 20 + rnd() * 50;
      g.beginPath();
      g.moveTo(x, FLOOR_ROW - 4);
      g.quadraticCurveTo(x + 3, FLOOR_ROW - h / 2, x + 6 * (rnd() - 0.3), FLOOR_ROW - h);
      g.stroke();
    }
  },
  mountain: (g) => {
    const L = LOOKS.mountain;
    const top = (x: number): number => FLOOR_ROW - 20 - 70 * Math.abs(wave(x, 4, 0.9)) * (0.5 + 0.5 * Math.abs(wave(x, 2, 0.3))) - 16 * Math.abs(wave(x, 11, 2));
    ridge(g, top, vgrad(g, 200, FLOOR_ROW, ["#4c5268", L.mid]));
    g.strokeStyle = "rgba(200,210,240,0.35)";
    g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x <= BW; x += 4) g.lineTo(x, top(x) + 1);
    g.stroke();
    const rnd = rand(41);
    for (let i = 0; i < 18; i++) {
      g.fillStyle = "rgba(255,190,120,0.55)";
      const x = rnd() * BW;
      g.fillRect(x, top(x) + 20 + rnd() * 40, 3, 3);
    }
  },
  desert: (g) => {
    const top = (x: number): number => FLOOR_ROW - 18 - 34 * Math.max(0, wave(x, 3, 0.6)) - 10 * wave(x, 7, 1);
    ridge(g, top, vgrad(g, 260, FLOOR_ROW, ["#f0b466", "#c8843e"]));
    g.strokeStyle = "rgba(255,240,200,0.6)";
    g.lineWidth = 3;
    g.beginPath();
    for (let x = 0; x <= BW; x += 4) g.lineTo(x, top(x));
    g.stroke();
  },
};

const ground = (t: Terrain) => (g: G): void => {
  const L = LOOKS[t];
  const rnd = rand(29);
  const y0 = FLOOR_ROW - 24;
  g.fillStyle = vgrad(g, y0, BH, L.ground);
  g.fillRect(0, y0, BW, BH - y0);
  g.fillStyle = "rgba(255,255,255,0.08)";
  g.fillRect(0, y0, BW, 3);
  for (let i = 0; i < 260; i++) {
    const y = y0 + 6 + Math.pow(rnd(), 1.4) * (BH - y0);
    const len = 4 + ((y - y0) / (BH - y0)) * 26;
    g.fillStyle = rnd() > 0.5 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)";
    const x = rnd() * BW;
    wrap(x, (xx) => g.fillRect(xx, y, len, 1 + (y - y0) / 60));
  }
  if (t === "swamp") {
    for (let i = 0; i < 7; i++) {
      const x = rnd() * BW;
      const y = FLOOR_ROW + 14 + rnd() * 110;
      wrap(x, (xx) => {
        blob(g, xx, y, 60 + rnd() * 70, 8 + (y - FLOOR_ROW) / 9, "rgba(96,130,124,0.75)");
        blob(g, xx - 10, y - 2, 40, 2, "rgba(220,240,220,0.35)");
      });
    }
  }
  if (t === "desert") {
    g.strokeStyle = "rgba(150,100,40,0.35)";
    g.lineWidth = 2;
    for (let y = FLOOR_ROW - 10; y < BH; y += 12 + (y - FLOOR_ROW) / 8) {
      g.beginPath();
      for (let x = 0; x <= BW; x += 8) g.lineTo(x, y + 3 * wave(x, 16, y));
      g.stroke();
    }
  }
  if (t === "mountain") {
    for (let i = 0; i < 26; i++) {
      const x = rnd() * BW;
      const y = FLOOR_ROW - 10 + rnd() * 140;
      const r = 4 + ((y - FLOOR_ROW) / 140) * 14;
      wrap(x, (xx) => {
        blob(g, xx, y, r * 1.4, r * 0.8, "#4a4c58");
        blob(g, xx - r * 0.3, y - r * 0.3, r * 0.8, r * 0.4, "rgba(255,255,255,0.18)");
      });
    }
  }
  if (t === "forest" || t === "flat") {
    for (let i = 0; i < 180; i++) {
      const x = rnd() * BW;
      const y = FLOOR_ROW - 18 + rnd() * 150;
      const h = 3 + ((y - FLOOR_ROW) / 150) * 10;
      g.fillStyle = rnd() > 0.5 ? "rgba(170,220,120,0.35)" : "rgba(20,50,20,0.35)";
      wrap(x, (xx) => g.fillRect(xx, y - h, 1.5, h));
    }
  }
};

const fore = (t: Terrain) => (g: G): void => {
  const L = LOOKS[t];
  const rnd = rand(53);
  g.filter = "blur(3px)";
  g.fillStyle = L.fore;
  g.strokeStyle = L.fore;
  for (let i = 0; i < 5; i++) {
    const x = (i + rnd() * 0.5) * (BW / 5);
    wrap(x, (xx) => {
      if (t === "mountain" || t === "desert") {
        blob(g, xx, BH - 10, 90 + rnd() * 70, 40 + rnd() * 30, L.fore);
        return;
      }
      g.lineCap = "round";
      for (let s = 0; s < 14; s++) {
        const h = 60 + rnd() * 110;
        g.lineWidth = t === "forest" ? 6 : 4;
        g.beginPath();
        g.moveTo(xx + (s - 7) * 7, BH);
        g.quadraticCurveTo(xx + (s - 7) * 9, BH - h * 0.6, xx + (s - 7) * 16 + (rnd() - 0.5) * 30, BH - h);
        g.stroke();
      }
    });
  }
  g.filter = "none";
};

const PAINT: Record<LayerId, (t: Terrain) => (g: G) => void> = {
  sky,
  far: (t) => FAR[t],
  mid: (t) => MID[t],
  ground,
  fore,
};

const paintLayer = (scene: Phaser.Scene, k: string, painter: (g: G) => void): void => {
  if (scene.textures.exists(k)) return;
  const canvas = document.createElement("canvas");
  canvas.width = BW;
  canvas.height = BH;
  painter(canvas.getContext("2d")!);
  addPainted(scene, k, canvas);
};

interface Ambience {
  key: string;
  tints: number[];
  config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
}

/** Drifting things in the air of each place, in pixels per second at k = 1. */
const ambience = (t: Terrain, w: number, h: number, k: number): Ambience[] => {
  const zone = (y0: number, y1: number): Phaser.Types.GameObjects.Particles.EmitZoneData => ({ type: "random", source: new Phaser.Geom.Rectangle(-w * 0.2, y0, w * 1.4, y1 - y0) as Phaser.Types.GameObjects.Particles.RandomZoneSource, quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData);
  const all: Record<Terrain, Ambience[]> = {
    flat: [{ key: FX.mote, tints: [0xfff2b0, 0xffffff], config: { lifespan: 5000, frequency: 120, speedX: { min: 6 * k, max: 20 * k }, speedY: { min: -6 * k, max: 4 * k }, scale: { min: 0.12 * k, max: 0.3 * k }, alpha: { start: 0.8, end: 0 }, blendMode: Phaser.BlendModes.ADD, emitZone: zone(h * 0.1, h * 0.8) } }],
    forest: [
      { key: FX.leaf, tints: [0x8ac860, 0xd8c050, 0x5a9a40], config: { lifespan: 6000, frequency: 160, speedX: { min: -14 * k, max: 10 * k }, speedY: { min: 14 * k, max: 30 * k }, rotate: { start: 0, end: 720 }, scale: { min: 0.12 * k, max: 0.26 * k }, alpha: { start: 1, end: 0.2 }, emitZone: zone(-h * 0.1, h * 0.2) } },
      { key: FX.mote, tints: [0xe8ff9a], config: { lifespan: 3000, frequency: 260, speedX: { min: -6 * k, max: 6 * k }, speedY: { min: -6 * k, max: 6 * k }, scale: { start: 0.25 * k, end: 0 }, blendMode: Phaser.BlendModes.ADD, emitZone: zone(h * 0.4, h * 0.85) } },
    ],
    swamp: [{ key: FX.mote, tints: [0xd8ff70, 0xa8ff90], config: { lifespan: 3600, frequency: 140, speedX: { min: -8 * k, max: 8 * k }, speedY: { min: -10 * k, max: 2 * k }, scale: { start: 0.3 * k, end: 0 }, alpha: { start: 1, end: 0 }, blendMode: Phaser.BlendModes.ADD, emitZone: zone(h * 0.35, h * 0.85) } }],
    mountain: [{ key: FX.mote, tints: [0xffffff, 0xe0e8ff], config: { lifespan: 4200, frequency: 40, speedX: { min: -50 * k, max: -20 * k }, speedY: { min: 30 * k, max: 60 * k }, scale: { min: 0.15 * k, max: 0.38 * k }, alpha: { start: 0.95, end: 0.2 }, emitZone: zone(-h * 0.1, h * 0.1) } }],
    desert: [{ key: FX.mote, tints: [0xffe0a0, 0xf0c070], config: { lifespan: 2400, frequency: 30, speedX: { min: -160 * k, max: -90 * k }, speedY: { min: -6 * k, max: 6 * k }, scale: { min: 0.1 * k, max: 0.24 * k }, alpha: { start: 0.7, end: 0 }, emitZone: zone(h * 0.45, h * 0.9) } }],
  };
  return all[t];
};

/**
 * The battlefield behind a duel: five painted layers of the defender's terrain (sky, far range,
 * near scenery, the floor and a blurred foreground), each a tile sprite that scrolls at its own
 * parallax rate, plus the drifting air of the place (motes, leaves, fireflies, snow, sand).
 */
export class DuelBackdrop {
  private readonly layers: { sprite: Phaser.GameObjects.TileSprite; factor: number }[] = [];
  private readonly emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private readonly tileScale: number;
  readonly floorY: number;

  constructor(scene: Phaser.Scene, back: Phaser.GameObjects.Container, front: Phaser.GameObjects.Container, terrain: Terrain, w: number, h: number, k: number) {
    const padX = w * 0.25;
    const padY = h * 0.08;
    this.tileScale = (h + padY * 2) / BH;
    this.floorY = -padY + FLOOR_ROW * this.tileScale;
    for (const id of LAYER_IDS) {
      const tk = key(terrain, id);
      paintLayer(scene, tk, PAINT[id](terrain));
      const sprite = scene.add.tileSprite(-padX, -padY, w + padX * 2, h + padY * 2, tk).setOrigin(0, 0).setTileScale(this.tileScale);
      sprite.tilePositionX = Math.random() * BW;
      this.layers.push({ sprite, factor: PARALLAX[id] });
      (id === "fore" ? front : back).add(sprite);
    }
    for (const a of ambience(terrain, w, h, k / 4)) {
      const e = scene.add.particles(0, 0, a.key, { ...a.config, tint: a.tints });
      this.emitters.push(e);
      back.add(e);
      e.fastForward(4000);
    }
  }

  /** Moves the scenery as if the camera travelled `dx` screen pixels along the floor. */
  push(dx: number): void {
    this.layers.forEach((l) => (l.sprite.tilePositionX += (dx * l.factor) / this.tileScale));
  }

  setSpeed(s: number): void {
    this.emitters.forEach((e) => (e.timeScale = s));
  }

  /** The sky drifts on its own. */
  tick(dt: number): void {
    this.layers[0].sprite.tilePositionX += dt * 4;
  }
}
