import type Phaser from "phaser";
import { paint, shade } from "../../art/canvas";
import { roundRect, vertical, type Ctx } from "./draw";

export const LORE_COLORS = {
  forest: "#22a04b",
  swamp: "#2f7de1",
  mountain: "#e0393e",
  desert: "#f1b520",
};

type Icon = (g: Ctx, w: number, h: number) => void;

const plate = (hex: string) => (g: Ctx, w: number, h: number): void => {
  roundRect(g, 1.5, 1.5, w - 3, h - 3, 9);
  g.fillStyle = vertical(g, 0, h, [
    [0, shade(hex, 0.12)],
    [0.55, hex],
    [1, shade(hex, -0.22)],
  ]);
  g.fill();
  roundRect(g, 1.5, 1.5, w - 3, h - 3, 9);
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.lineWidth = 1.5;
  g.stroke();
  roundRect(g, 0.75, 0.75, w - 1.5, h - 1.5, 9.5);
  g.strokeStyle = "rgba(0,0,0,0.55)";
  g.lineWidth = 1;
  g.stroke();
};

const pine: Icon = (g, w, h) => {
  const cx = w / 2;
  g.fillStyle = "#0d3b1c";
  g.fillRect(cx - 2.5, h - 12, 5, 6);
  g.fillStyle = "#eaf7ea";
  [
    [10, 12],
    [16, 18],
    [22, 24],
  ].forEach(([top, half]) => {
    g.beginPath();
    g.moveTo(cx, top - 2);
    g.lineTo(cx + half * 0.55, top + 8);
    g.lineTo(cx - half * 0.55, top + 8);
    g.closePath();
    g.fill();
  });
};

const waves: Icon = (g, w, h) => {
  g.strokeStyle = "#eaf2ff";
  g.lineWidth = 3;
  g.lineCap = "round";
  [-7, 0, 7].forEach((dy) => {
    g.beginPath();
    for (let x = 8; x <= w - 8; x += 1) {
      const y = h / 2 + dy + Math.sin(((x - 8) / (w - 16)) * Math.PI * 2) * 2.4;
      if (x === 8) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  });
};

const peak: Icon = (g, w, h) => {
  g.fillStyle = "#fff0ee";
  g.beginPath();
  g.moveTo(w / 2, 8);
  g.lineTo(w - 7, h - 10);
  g.lineTo(7, h - 10);
  g.closePath();
  g.fill();
  g.fillStyle = "#8a1a1e";
  g.beginPath();
  g.moveTo(w / 2, 8);
  g.lineTo(w - 7, h - 10);
  g.lineTo(w / 2 + 2, h - 10);
  g.closePath();
  g.fill();
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.moveTo(w / 2, 8);
  g.lineTo(w / 2 + 5, 15);
  g.lineTo(w / 2 + 1, 14);
  g.lineTo(w / 2 - 2, 17);
  g.lineTo(w / 2 - 5, 15);
  g.closePath();
  g.fill();
};

const sun: Icon = (g, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  g.strokeStyle = "#fff8e0";
  g.lineWidth = 2.5;
  g.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10);
    g.lineTo(cx + Math.cos(a) * 15, cy + Math.sin(a) * 15);
    g.stroke();
  }
  g.beginPath();
  g.arc(cx, cy, 6.5, 0, Math.PI * 2);
  g.fillStyle = "#fff8e0";
  g.fill();
};

const ICONS: Record<keyof typeof LORE_COLORS, Icon> = { forest: pine, swamp: waves, mountain: peak, desert: sun };

export const paintBadges = (scene: Phaser.Scene): void => {
  (Object.keys(LORE_COLORS) as (keyof typeof LORE_COLORS)[]).forEach((t) =>
    paint(scene, `ui-badge-${t}`, 40, 40, (g, w, h) => {
      plate(LORE_COLORS[t])(g, w, h);
      g.shadowColor = "rgba(0,0,0,0.45)";
      g.shadowBlur = 2;
      g.shadowOffsetY = 1;
      ICONS[t](g, w, h);
    }),
  );
};
