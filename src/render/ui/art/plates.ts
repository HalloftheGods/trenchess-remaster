import type Phaser from "phaser";
import { paint } from "../../art/canvas";
import { brushed, goldRim, rivet, roundRect, vertical, type Ctx } from "./draw";

/** Dark lacquered steel plate with a gold rim and riveted corners (64×64, corner 18). */
const steelPanel = (g: Ctx, w: number, h: number): void => {
  roundRect(g, 1, 1, w - 2, h - 2, 9);
  g.fillStyle = vertical(g, 0, h, [
    [0, "rgba(34,40,54,0.96)"],
    [0.5, "rgba(18,22,32,0.96)"],
    [1, "rgba(10,12,20,0.97)"],
  ]);
  g.fill();
  g.save();
  roundRect(g, 1, 1, w - 2, h - 2, 9);
  g.clip();
  brushed(g, 0, 0, w, h, 77, 0.035);
  g.restore();
  goldRim(g, 2.5, 2.5, w - 5, h - 5, 8, 1.5);
  roundRect(g, 6, 6, w - 12, h - 12, 5);
  g.strokeStyle = "rgba(242,201,76,0.18)";
  g.lineWidth = 1;
  g.stroke();
  [
    [10, 10],
    [w - 10, 10],
    [10, h - 10],
    [w - 10, h - 10],
  ].forEach(([x, y]) => rivet(g, x, y, 3));
};

/** Aged parchment with a burnt edge (64×64, corner 18). */
const parchment = (g: Ctx, w: number, h: number): void => {
  roundRect(g, 1, 1, w - 2, h - 2, 7);
  g.fillStyle = vertical(g, 0, h, [
    [0, "#e8d6a8"],
    [0.5, "#dcc48f"],
    [1, "#c9ab72"],
  ]);
  g.fill();
  g.save();
  roundRect(g, 1, 1, w - 2, h - 2, 7);
  g.clip();
  brushed(g, 0, 0, w, h, 311, 0.03);
  const burn = g.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.72);
  burn.addColorStop(0, "rgba(90,50,10,0)");
  burn.addColorStop(0.8, "rgba(90,50,10,0.25)");
  burn.addColorStop(1, "rgba(40,18,4,0.7)");
  g.fillStyle = burn;
  g.fillRect(0, 0, w, h);
  g.restore();
  roundRect(g, 1.5, 1.5, w - 3, h - 3, 7);
  g.strokeStyle = "#3a2410";
  g.lineWidth = 2;
  g.stroke();
};

interface ButtonLook {
  top: string;
  mid: string;
  bottom: string;
  rim: boolean;
  alpha: number;
  inset: string;
}

const LOOKS: Record<string, ButtonLook> = {
  "ui-btn": { top: "#3a4458", mid: "#232a3a", bottom: "#141926", rim: true, alpha: 1, inset: "rgba(255,255,255,0.10)" },
  "ui-btn-hover": { top: "#4c5a74", mid: "#2d3650", bottom: "#1a2133", rim: true, alpha: 1, inset: "rgba(255,230,160,0.25)" },
  "ui-btn-down": { top: "#161b28", mid: "#1d2432", bottom: "#2a3344", rim: true, alpha: 1, inset: "rgba(0,0,0,0.35)" },
  "ui-btn-primary": { top: "#ffe39a", mid: "#e2b23a", bottom: "#9c6b14", rim: true, alpha: 1, inset: "rgba(255,255,255,0.35)" },
  "ui-btn-primary-hover": { top: "#fff2c2", mid: "#f3c651", bottom: "#b07d1c", rim: true, alpha: 1, inset: "rgba(255,255,255,0.5)" },
  "ui-btn-disabled": { top: "#2a2e38", mid: "#20242d", bottom: "#181b22", rim: false, alpha: 0.75, inset: "rgba(255,255,255,0.04)" },
};

const button = (look: ButtonLook) => (g: Ctx, w: number, h: number): void => {
  g.globalAlpha = look.alpha;
  roundRect(g, 1, 1, w - 2, h - 2, 8);
  g.fillStyle = vertical(g, 0, h, [
    [0, look.top],
    [0.5, look.mid],
    [1, look.bottom],
  ]);
  g.fill();
  roundRect(g, 4, 4, w - 8, h - 8, 5);
  g.strokeStyle = look.inset;
  g.lineWidth = 1;
  g.stroke();
  if (look.rim) goldRim(g, 2, 2, w - 4, h - 4, 7, 1.25);
  else {
    roundRect(g, 2, 2, w - 4, h - 4, 7);
    g.strokeStyle = "#4a4f5c";
    g.lineWidth = 1.25;
    g.stroke();
  }
  [
    [8, 8],
    [w - 8, 8],
    [8, h - 8],
    [w - 8, h - 8],
  ].forEach(([x, y]) => rivet(g, x, y, 2));
  g.globalAlpha = 1;
};

const segment = (on: boolean) => (g: Ctx, w: number, h: number): void => {
  roundRect(g, 1, 1, w - 2, h - 2, 6);
  g.fillStyle = on
    ? vertical(g, 0, h, [
        [0, "#ffe39a"],
        [0.55, "#d9a93a"],
        [1, "#8f6112"],
      ])
    : vertical(g, 0, h, [
        [0, "rgba(40,46,60,0.9)"],
        [1, "rgba(16,19,28,0.9)"],
      ]);
  g.fill();
  roundRect(g, 1.5, 1.5, w - 3, h - 3, 6);
  g.strokeStyle = on ? "#fff3cc" : "rgba(242,201,76,0.45)";
  g.lineWidth = 1;
  g.stroke();
};

export const paintPlates = (scene: Phaser.Scene): void => {
  paint(scene, "ui-panel", 64, 64, steelPanel);
  paint(scene, "ui-panel-parchment", 64, 64, parchment);
  Object.entries(LOOKS).forEach(([key, look]) => paint(scene, key, 48, 48, button(look)));
  paint(scene, "ui-seg", 40, 40, segment(false));
  paint(scene, "ui-seg-on", 40, 40, segment(true));
};
