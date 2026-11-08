import type Phaser from "phaser";
import { paint, radial } from "../../art/canvas";
import { goldRim, roundRect, vertical, type Ctx } from "./draw";

const GOLD: [number, string][] = [
  [0, "#fff1b8"],
  [0.5, "#f2c94c"],
  [1, "#a8761a"],
];

/** Gold arrow head pointing right. */
const marker = (g: Ctx, w: number, h: number): void => {
  g.shadowColor = "rgba(242,201,76,0.8)";
  g.shadowBlur = 8;
  g.beginPath();
  g.moveTo(5, 4);
  g.lineTo(w - 4, h / 2);
  g.lineTo(5, h - 4);
  g.lineTo(10, h / 2);
  g.closePath();
  g.fillStyle = vertical(g, 0, h, GOLD);
  g.fill();
  g.shadowBlur = 0;
  g.strokeStyle = "#5a3d10";
  g.lineWidth = 1;
  g.stroke();
};

const dot = (on: boolean) => (g: Ctx, w: number, h: number): void => {
  g.beginPath();
  g.arc(w / 2, h / 2, on ? 5.5 : 4, 0, Math.PI * 2);
  g.fillStyle = on ? radial(g, w / 2 - 1, h / 2 - 1, 6, GOLD) : "rgba(233,226,207,0.28)";
  g.fill();
  g.strokeStyle = on ? "#6a4a12" : "rgba(242,201,76,0.5)";
  g.lineWidth = 1;
  g.stroke();
};

const check = (on: boolean) => (g: Ctx, w: number, h: number): void => {
  roundRect(g, 2, 2, w - 4, h - 4, 6);
  g.fillStyle = vertical(g, 0, h, [
    [0, "#1c2130"],
    [1, "#0b0e16"],
  ]);
  g.fill();
  goldRim(g, 2.5, 2.5, w - 5, h - 5, 6, 1.25);
  if (!on) return;
  g.strokeStyle = "#ffe9a8";
  g.lineWidth = 3.5;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.shadowColor = "rgba(242,201,76,0.9)";
  g.shadowBlur = 6;
  g.beginPath();
  g.moveTo(7, h / 2 + 1);
  g.lineTo(12, h - 8);
  g.lineTo(w - 7, 8);
  g.stroke();
};

const knob = (g: Ctx, w: number, h: number): void => {
  g.beginPath();
  g.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
  g.fillStyle = radial(g, w / 2 - 3, h / 2 - 4, w / 2, GOLD);
  g.fill();
  g.strokeStyle = "#5a3d10";
  g.lineWidth = 1.5;
  g.stroke();
  g.beginPath();
  g.arc(w / 2, h / 2, 4, 0, Math.PI * 2);
  g.fillStyle = "#2a2010";
  g.fill();
};

const track = (g: Ctx, w: number, h: number): void => {
  roundRect(g, 0, 1, w, h - 2, 3);
  g.fillStyle = vertical(g, 0, h, [
    [0, "#0a0d14"],
    [1, "#2a3142"],
  ]);
  g.fill();
  roundRect(g, 0.5, 1.5, w - 1, h - 3, 3);
  g.strokeStyle = "rgba(242,201,76,0.35)";
  g.lineWidth = 1;
  g.stroke();
};

const chevron = (g: Ctx, w: number, h: number): void => {
  g.strokeStyle = vertical(g, 0, h, GOLD);
  g.lineWidth = 4;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.shadowColor = "rgba(242,201,76,0.6)";
  g.shadowBlur = 6;
  g.beginPath();
  g.moveTo(w * 0.36, 6);
  g.lineTo(w * 0.66, h / 2);
  g.lineTo(w * 0.36, h - 6);
  g.stroke();
};

/** Compass ring with N/E/S/W ticks (letters are added as text by the widget). */
const ring = (g: Ctx, w: number, h: number): void => {
  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2 - 6;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fillStyle = radial(g, cx, cy, r, [
    [0, "rgba(14,18,28,0.35)"],
    [0.86, "rgba(14,18,28,0.75)"],
    [1, "rgba(30,36,50,0.95)"],
  ]);
  g.fill();
  [r, r - 14].forEach((rr, i) => {
    g.beginPath();
    g.arc(cx, cy, rr, 0, Math.PI * 2);
    g.strokeStyle = i === 0 ? "#f2c94c" : "rgba(242,201,76,0.45)";
    g.lineWidth = i === 0 ? 2.5 : 1;
    g.stroke();
  });
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const cardinal = i % 6 === 0;
    const len = cardinal ? 12 : 5;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3));
    g.lineTo(cx + Math.cos(a) * (r - 3 - len), cy + Math.sin(a) * (r - 3 - len));
    g.strokeStyle = cardinal ? "#fff1b8" : "rgba(233,226,207,0.6)";
    g.lineWidth = cardinal ? 2.5 : 1;
    g.stroke();
  }
};

export const paintControls = (scene: Phaser.Scene): void => {
  paint(scene, "ui-marker", 28, 28, marker);
  paint(scene, "ui-dot", 14, 14, dot(false));
  paint(scene, "ui-dot-on", 14, 14, dot(true));
  paint(scene, "ui-check", 28, 28, check(false));
  paint(scene, "ui-check-on", 28, 28, check(true));
  paint(scene, "ui-knob", 28, 28, knob);
  paint(scene, "ui-track", 8, 8, track);
  paint(scene, "ui-chevron", 28, 28, chevron);
  paint(scene, "ui-ring", 160, 160, ring);
};
