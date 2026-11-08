import type Phaser from "phaser";
import { ellipse, paint, radial } from "../../art/canvas";
import type { Ctx } from "./draw";

/** 4×4 repeating scanline tile: one dark line per four pixels. */
const scanlines = (g: Ctx, w: number): void => {
  g.fillStyle = "rgba(0,0,0,0.22)";
  g.fillRect(0, 0, w, 1);
  g.fillStyle = "rgba(255,255,255,0.025)";
  g.fillRect(0, 2, w, 1);
};

const vignette = (g: Ctx, w: number, h: number): void => {
  g.fillStyle = radial(g, w / 2, h / 2, w * 0.72, [
    [0, "rgba(0,0,0,0)"],
    [0.55, "rgba(0,0,0,0)"],
    [0.8, "rgba(0,0,0,0.45)"],
    [1, "rgba(0,0,0,0.92)"],
  ]);
  g.fillRect(0, 0, w, h);
};

/** Soft four-point star particle. */
const spark = (g: Ctx, w: number, h: number): void => {
  const c = w / 2;
  ellipse(g, c, c, c, c, radial(g, c, c, c, [
    [0, "rgba(255,255,255,1)"],
    [0.3, "rgba(255,240,190,0.8)"],
    [1, "rgba(255,200,80,0)"],
  ]));
  g.strokeStyle = "rgba(255,250,230,0.9)";
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(c, 1);
  g.lineTo(c, h - 1);
  g.moveTo(1, c);
  g.lineTo(w - 1, c);
  g.stroke();
};

/** Large soft radial glow, white so it can be tinted. */
const glow = (g: Ctx, w: number, h: number): void => {
  ellipse(g, w / 2, h / 2, w / 2, h / 2, radial(g, w / 2, h / 2, w / 2, [
    [0, "rgba(255,255,255,0.9)"],
    [0.35, "rgba(255,255,255,0.35)"],
    [1, "rgba(255,255,255,0)"],
  ]));
};

/** Thin diagonal streak of light for the logo glint sweep. */
const glint = (g: Ctx, w: number, h: number): void => {
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.42, "rgba(255,255,255,0.15)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.58, "rgba(255,255,255,0.15)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(w * 0.35, 0);
  g.lineTo(w, 0);
  g.lineTo(w * 0.65, h);
  g.lineTo(0, h);
  g.closePath();
  g.fill();
};

/** Thin horizontal gold rule that fades at both ends (the lockup's "=" bar). */
const rule = (g: Ctx, w: number, h: number): void => {
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "rgba(242,201,76,0)");
  grad.addColorStop(0.2, "rgba(242,201,76,1)");
  grad.addColorStop(0.8, "rgba(242,201,76,1)");
  grad.addColorStop(1, "rgba(242,201,76,0)");
  g.fillStyle = grad;
  g.fillRect(0, Math.floor(h / 2) - 1, w, 2);
};

/** Vertical column of shade that fades out at both sides, for legibility over the world. */
const pillar = (g: Ctx, w: number, h: number): void => {
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "rgba(6,8,14,0)");
  grad.addColorStop(0.22, "rgba(6,8,14,0.78)");
  grad.addColorStop(0.5, "rgba(6,8,14,0.9)");
  grad.addColorStop(0.78, "rgba(6,8,14,0.78)");
  grad.addColorStop(1, "rgba(6,8,14,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
};

export const paintEffects = (scene: Phaser.Scene): void => {
  paint(scene, "ui-scanlines", 4, 4, scanlines);
  paint(scene, "ui-vignette", 256, 256, vignette);
  paint(scene, "ui-spark", 16, 16, spark);
  paint(scene, "ui-glow", 128, 128, glow);
  paint(scene, "ui-glint", 64, 128, glint);
  paint(scene, "ui-rule", 256, 4, rule);
  paint(scene, "ui-pillar", 256, 8, pillar);
};
