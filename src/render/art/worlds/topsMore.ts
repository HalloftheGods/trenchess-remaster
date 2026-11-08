import { ellipse, shade } from "../canvas";
import { S } from "./geometry";
import type { TopPainter } from "./recipe";

/** Top-down detail factories for the themed worlds. */

/** Asphalt with dashed lane lines and a faint block grid. */
export const gridTop = (lane: string, grid: string): TopPainter => (g) => {
  g.strokeStyle = grid;
  g.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.moveTo((S * i) / 4, 0);
    g.lineTo((S * i) / 4, S);
    g.moveTo(0, (S * i) / 4);
    g.lineTo(S, (S * i) / 4);
    g.stroke();
  }
  g.strokeStyle = lane;
  g.lineWidth = 1.5;
  g.setLineDash([6, 5]);
  g.beginPath();
  g.moveTo(S / 2, 2);
  g.lineTo(S / 2, S - 2);
  g.moveTo(2, S / 2);
  g.lineTo(S - 2, S / 2);
  g.stroke();
  g.setLineDash([]);
};

/** Skyscraper roofs seen from above: boxes with lit window rows and rooftop lights. */
export const rooftopsTop = (wall: string, window: string): TopPainter => (g, _p, r) => {
  const boxes: [number, number, number, number][] = [
    [6, 6, 26, 30],
    [36, 10, 22, 22],
    [10, 40, 20, 18],
    [36, 38, 22, 20],
  ];
  for (const [x, y, w, h] of boxes) {
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillRect(x + 3, y + 3, w, h);
    g.fillStyle = shade(wall, r() * 0.1 - 0.05);
    g.fillRect(x, y, w, h);
    g.fillStyle = shade(wall, 0.12);
    g.fillRect(x, y, w, 2);
    g.fillRect(x, y, 2, h);
    g.fillStyle = window;
    for (let k = 0; k < 4; k++) {
      if (r() < 0.4) continue;
      g.globalAlpha = 0.5 + r() * 0.5;
      g.fillRect(x + 4 + r() * (w - 8), y + 4 + r() * (h - 8), 2, 2);
    }
    g.globalAlpha = 1;
    ellipse(g, x + w / 2, y + h / 2, 1.5, 1.5, "#ff3b6b");
  }
};

/** Glowing pools in a dark shore. */
export const poolsTop = (fill: string, rim: string, shore: string): TopPainter => (g, _p, r) => {
  for (let i = 0; i < 3; i++) {
    const x = 14 + r() * (S - 28);
    const y = 14 + r() * (S - 28);
    const rad = 7 + r() * 8;
    ellipse(g, x, y, rad + 3, rad * 0.8 + 2, shore);
    g.save();
    g.shadowColor = rim;
    g.shadowBlur = 10;
    ellipse(g, x, y, rad, rad * 0.8, fill);
    g.restore();
    ellipse(g, x - rad * 0.3, y - rad * 0.3, rad * 0.35, rad * 0.25, rim);
  }
};

/** Polygonal crack network (concrete, dry mud, cooled basalt). */
export const crackedTop = (color: string, count = 7): TopPainter => (g, _p, r) => {
  g.strokeStyle = color;
  g.lineWidth = 1;
  for (let i = 0; i < count; i++) {
    let x = 6 + r() * (S - 12);
    let y = 6 + r() * (S - 12);
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (r() - 0.5) * 16;
      y += (r() - 0.5) * 16;
      g.lineTo(x, y);
    }
    g.stroke();
  }
};

/** A frozen sheet: pale sheen, long fractures and trapped bubbles. */
export const iceTop = (crack: string, sheen: string): TopPainter => (g, _p, r) => {
  const grad = g.createLinearGradient(0, 0, S, S);
  grad.addColorStop(0, sheen);
  grad.addColorStop(0.5, "rgba(255,255,255,0)");
  grad.addColorStop(1, sheen);
  g.fillStyle = grad;
  g.fillRect(4, 4, S - 8, S - 8);
  g.strokeStyle = crack;
  g.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) {
    let x = r() * S;
    let y = r() * S;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 3; k++) {
      x += (r() - 0.5) * 30;
      y += (r() - 0.5) * 30;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  for (let i = 0; i < 5; i++) ellipse(g, 8 + r() * (S - 16), 8 + r() * (S - 16), 1.5, 1.5, "rgba(255,255,255,0.5)");
};

/** Concentric stone steps seen from above, moss in the seams. */
export const stepsTop = (stone: string, moss: string): TopPainter => (g, _p, r) => {
  for (let i = 0; i < 4; i++) {
    const inset = 4 + i * 7;
    g.fillStyle = shade(stone, i * 0.06);
    g.fillRect(inset, inset, S - inset * 2, S - inset * 2);
    g.strokeStyle = "rgba(0,0,0,0.35)";
    g.lineWidth = 1;
    g.strokeRect(inset + 0.5, inset + 0.5, S - inset * 2 - 1, S - inset * 2 - 1);
  }
  g.fillStyle = moss;
  for (let i = 0; i < 8; i++) {
    g.globalAlpha = 0.5 + r() * 0.5;
    ellipse(g, 6 + r() * (S - 12), 6 + r() * (S - 12), 2 + r() * 2, 1.5 + r(), moss);
  }
  g.globalAlpha = 1;
};

/** Charred stumps from above with ember glow. */
export const embersTop = (ember: string): TopPainter => (g, _p, r) => {
  for (let i = 0; i < 6; i++) {
    const x = 8 + r() * (S - 16);
    const y = 8 + r() * (S - 16);
    ellipse(g, x + 2, y + 2, 4, 3.5, "rgba(0,0,0,0.4)");
    ellipse(g, x, y, 3.5, 3.5, "#1b1612");
    g.save();
    g.shadowColor = ember;
    g.shadowBlur = 6;
    ellipse(g, x, y, 1.2, 1.2, ember);
    g.restore();
  }
};

/** Scattered pebbles and bones in two colours. */
export const pebblesTop = (hues: [string, string], count = 12): TopPainter => (g, _p, r) => {
  for (let i = 0; i < count; i++) {
    const x = 4 + r() * (S - 8);
    const y = 4 + r() * (S - 8);
    ellipse(g, x + 0.6, y + 0.6, 2.2, 1.6, "rgba(0,0,0,0.3)");
    ellipse(g, x, y, 2 + r(), 1.4 + r() * 0.6, i % 2 ? hues[0] : hues[1]);
  }
};
