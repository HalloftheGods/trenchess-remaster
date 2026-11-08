import Phaser from "phaser";
import { TILE_H, TILE_W, TOP_TILE } from "../iso";
import { diamondPath, ellipse, paint, radial } from "./canvas";

const markerDiamond = (stroke: string, fill: string, width: number) => (g: CanvasRenderingContext2D, w: number, h: number) => {
  diamondPath(g, w / 2, h / 2, TILE_W - 8, TILE_H - 4);
  g.fillStyle = fill;
  g.fill();
  g.shadowColor = stroke;
  g.shadowBlur = 8;
  g.strokeStyle = stroke;
  g.lineWidth = width;
  g.stroke();
};

const SQ = TOP_TILE - 6;

const markerSquare = (stroke: string, fill: string, width: number) => (g: CanvasRenderingContext2D, w: number, h: number) => {
  g.beginPath();
  g.roundRect(w / 2 - SQ / 2, h / 2 - SQ / 2, SQ, SQ, 5);
  g.fillStyle = fill;
  g.fill();
  g.shadowColor = stroke;
  g.shadowBlur = 8;
  g.strokeStyle = stroke;
  g.lineWidth = width;
  g.stroke();
};

const crosshairTop = (g: CanvasRenderingContext2D, w: number, h: number): void => {
  markerSquare("#ff4d4d", "rgba(255,60,60,0.25)", 3)(g, w, h);
  g.shadowBlur = 0;
  g.strokeStyle = "rgba(255,230,230,0.9)";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(w / 2, h / 2, 11, 0, Math.PI * 2);
  g.moveTo(w / 2 - 20, h / 2);
  g.lineTo(w / 2 - 6, h / 2);
  g.moveTo(w / 2 + 6, h / 2);
  g.lineTo(w / 2 + 20, h / 2);
  g.stroke();
};

const dotTop = (g: CanvasRenderingContext2D, w: number, h: number): void => {
  ellipse(g, w / 2, h / 2, 9, 9, radial(g, w / 2, h / 2, 9, [[0, "rgba(160,255,240,0.95)"], [1, "rgba(80,220,255,0.2)"]]));
};

const crosshair = (g: CanvasRenderingContext2D, w: number, h: number): void => {
  markerDiamond("#ff4d4d", "rgba(255,60,60,0.25)", 3)(g, w, h);
  g.shadowBlur = 0;
  g.strokeStyle = "rgba(255,230,230,0.9)";
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(w / 2, h / 2, 12, 6, 0, 0, Math.PI * 2);
  g.moveTo(w / 2 - 20, h / 2);
  g.lineTo(w / 2 - 6, h / 2);
  g.moveTo(w / 2 + 6, h / 2);
  g.lineTo(w / 2 + 20, h / 2);
  g.stroke();
};

const dot = (g: CanvasRenderingContext2D, w: number, h: number): void => {
  ellipse(g, w / 2, h / 2, 10, 5, radial(g, w / 2, h / 2, 10, [[0, "rgba(160,255,240,0.95)"], [1, "rgba(80,220,255,0.2)"]]));
};

/** Square counterparts of every marker for the classic top-down projection (`mk-*-top`, `fog-top`). */
const paintTopMarkers = (scene: Phaser.Scene): void => {
  const sz = TOP_TILE + 10;
  paint(scene, "mk-move-top", sz, sz, markerSquare("#5ff2ff", "rgba(80,230,255,0.14)", 2));
  paint(scene, "mk-dot-top", sz, sz, dotTop);
  paint(scene, "mk-attack-top", sz, sz, crosshairTop);
  paint(scene, "mk-select-top", sz, sz, markerSquare("#ffd54a", "rgba(255,210,70,0.22)", 3));
  paint(scene, "mk-hover-top", sz, sz, markerSquare("#ffffff", "rgba(255,255,255,0.08)", 1.5));
  paint(scene, "mk-last-top", sz, sz, markerSquare("rgba(255,230,120,0.6)", "rgba(255,220,90,0.18)", 1));
  paint(scene, "mk-deploy-top", sz, sz, markerSquare("rgba(140,255,160,0.7)", "rgba(120,255,140,0.10)", 1));
  paint(scene, "mk-danger-top", sz, sz, markerSquare("#ff8a3d", "rgba(255,120,40,0.25)", 2.5));
  paint(scene, "fog-top", sz, sz, (g, w, h) => {
    g.fillStyle = "rgba(14,18,32,0.62)";
    g.fillRect(w / 2 - TOP_TILE / 2, h / 2 - TOP_TILE / 2, TOP_TILE, TOP_TILE);
  });
};

/** Particle sprites for the ambient terrain effects. */
const paintAmbient = (scene: Phaser.Scene): void => {
  paint(scene, "bubble", 16, 16, (g) => {
    g.strokeStyle = "rgba(220,255,245,0.9)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(8, 8, 6, 0, Math.PI * 2);
    g.stroke();
    ellipse(g, 5.5, 5.5, 1.6, 1.2, "rgba(255,255,255,0.9)");
  });
  paint(scene, "wisp", 48, 12, (g) => {
    const grad = g.createLinearGradient(0, 0, 48, 0);
    grad.addColorStop(0, "rgba(250,230,180,0)");
    grad.addColorStop(0.5, "rgba(250,230,180,0.8)");
    grad.addColorStop(1, "rgba(250,230,180,0)");
    ellipse(g, 24, 6, 24, 4, grad);
  });
  paint(scene, "mist", 96, 96, (g) => ellipse(g, 48, 48, 48, 48, radial(g, 48, 48, 48, [[0, "rgba(240,246,255,0.55)"], [0.5, "rgba(240,246,255,0.2)"], [1, "rgba(240,246,255,0)"]])));
};

export const paintFx = (scene: Phaser.Scene): void => {
  const mw = TILE_W + 8;
  const mh = TILE_H + 8;
  paint(scene, "mk-move", mw, mh, markerDiamond("#5ff2ff", "rgba(80,230,255,0.14)", 2));
  paint(scene, "mk-dot", mw, mh, dot);
  paint(scene, "mk-attack", mw, mh, crosshair);
  paint(scene, "mk-select", mw, mh, markerDiamond("#ffd54a", "rgba(255,210,70,0.22)", 3));
  paint(scene, "mk-hover", mw, mh, markerDiamond("#ffffff", "rgba(255,255,255,0.08)", 1.5));
  paint(scene, "mk-last", mw, mh, markerDiamond("rgba(255,230,120,0.6)", "rgba(255,220,90,0.18)", 1));
  paint(scene, "mk-deploy", mw, mh, markerDiamond("rgba(140,255,160,0.7)", "rgba(120,255,140,0.10)", 1));
  paint(scene, "mk-danger", mw, mh, markerDiamond("#ff8a3d", "rgba(255,120,40,0.25)", 2.5));
  paint(scene, "fog", mw, mh, (g, w, h) => {
    diamondPath(g, w / 2, h / 2, TILE_W + 2, TILE_H + 1);
    g.fillStyle = "rgba(14,18,32,0.62)";
    g.fill();
  });
  paintTopMarkers(scene);
  paintAmbient(scene);
  paint(scene, "glow", 64, 64, (g) => ellipse(g, 32, 32, 32, 32, radial(g, 32, 32, 32, [[0, "rgba(255,255,255,1)"], [0.4, "rgba(255,255,255,0.5)"], [1, "rgba(255,255,255,0)"]])));
  paint(scene, "spark", 12, 12, (g) => ellipse(g, 6, 6, 6, 6, radial(g, 6, 6, 6, [[0, "#ffffff"], [0.5, "rgba(255,240,180,0.9)"], [1, "rgba(255,200,80,0)"]])));
  paint(scene, "shard", 10, 10, (g) => {
    g.beginPath();
    g.moveTo(5, 0);
    g.lineTo(10, 8);
    g.lineTo(1, 10);
    g.closePath();
    g.fillStyle = "#ffffff";
    g.fill();
  });
  paint(scene, "dust", 32, 32, (g) => ellipse(g, 16, 16, 16, 16, radial(g, 16, 16, 16, [[0, "rgba(235,220,190,0.8)"], [1, "rgba(235,220,190,0)"]])));
  paint(scene, "ring", 128, 64, (g) => {
    g.beginPath();
    g.ellipse(64, 32, 60, 28, 0, 0, Math.PI * 2);
    g.strokeStyle = "#ffffff";
    g.lineWidth = 4;
    g.stroke();
  });
  paint(scene, "shadow", 64, 24, (g) => ellipse(g, 32, 12, 30, 11, radial(g, 32, 12, 30, [[0, "rgba(0,0,0,0.45)"], [1, "rgba(0,0,0,0)"]])));
  paint(scene, "cloud", 256, 128, (g) => ellipse(g, 128, 64, 128, 64, radial(g, 128, 64, 128, [[0, "rgba(0,0,0,0.5)"], [1, "rgba(0,0,0,0)"]])));
};
