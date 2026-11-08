import type { UnitType } from "../../engine/types";
import type { Faction } from "./unitArt";
import { ellipse, shade } from "./canvas";

type G = CanvasRenderingContext2D;

const X = 32;
const SKIN = "#e8b98f";
const STEEL = "#c9ccd4";
const WOOD = "#8a5a2e";

const lit = (g: G, f: Faction, x0: number, x1: number): CanvasGradient => {
  const grad = g.createLinearGradient(x0, 0, x1, 0);
  grad.addColorStop(0, f.light);
  grad.addColorStop(0.45, f.base);
  grad.addColorStop(1, f.dark);
  return grad;
};

const metal = (g: G, x0: number, x1: number): CanvasGradient => {
  const grad = g.createLinearGradient(x0, 0, x1, 0);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.4, STEEL);
  grad.addColorStop(1, "#6d717c");
  return grad;
};

const poly = (g: G, pts: number[], fill: string | CanvasGradient, stroke = "rgba(0,0,0,0.55)"): void => {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = stroke;
  g.lineWidth = 1.2;
  g.stroke();
};

const disc = (g: G, f: Faction): void => {
  ellipse(g, X, 89, 21, 7, f.dark);
  ellipse(g, X, 86, 21, 7, lit(g, f, X - 21, X + 21));
  ellipse(g, X, 85, 18, 5, shade(f.base, 0.1));
};

const head = (g: G, y: number, helm: "cap" | "plume" | "wing" | "hood" | "crown", f: Faction): void => {
  ellipse(g, X, y, 6.5, 7, SKIN);
  const helms: Record<typeof helm, () => void> = {
    cap: () => poly(g, [X - 8, y - 1, X - 6, y - 8, X, y - 10, X + 6, y - 8, X + 8, y - 1], metal(g, X - 8, X + 8)),
    plume: () => {
      poly(g, [X - 8, y - 1, X - 6, y - 8, X, y - 10, X + 6, y - 8, X + 8, y - 1], metal(g, X - 8, X + 8));
      poly(g, [X - 2, y - 10, X + 2, y - 18, X + 8, y - 14, X + 2, y - 9], f.base);
    },
    wing: () => {
      poly(g, [X - 7, y - 2, X - 6, y - 9, X + 6, y - 9, X + 7, y - 2], metal(g, X - 7, X + 7));
      poly(g, [X - 7, y - 6, X - 16, y - 16, X - 11, y - 5], "#ffffff");
      poly(g, [X + 7, y - 6, X + 16, y - 16, X + 11, y - 5], "#e8eef7");
    },
    hood: () => poly(g, [X - 9, y + 4, X - 8, y - 6, X, y - 14, X + 8, y - 6, X + 9, y + 4, X + 5, y + 2, X + 5, y - 4, X - 5, y - 4, X - 5, y + 2], lit(g, f, X - 9, X + 9)),
    crown: () => poly(g, [X - 8, y - 4, X - 8, y - 13, X - 4, y - 8, X, y - 15, X + 4, y - 8, X + 8, y - 13, X + 8, y - 4], f.trim, "#7a5a10"),
  };
  helms[helm]();
};

const legs = (g: G, top: number, spread: number): void => {
  g.fillStyle = "#3b3026";
  g.fillRect(X - spread - 3, top, 5, 84 - top);
  g.fillRect(X + spread - 2, top, 5, 84 - top);
};

const cloud = (g: G): void => {
  for (const [dx, dy, r] of [[-12, 84, 7], [-3, 86, 8], [8, 85, 7], [15, 87, 5]]) ellipse(g, X + dx, dy, r, r * 0.6, "rgba(245,250,255,0.92)");
};

const pawn = (g: G, f: Faction): void => {
  disc(g, f);
  cloud(g);
  g.strokeStyle = WOOD;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(X + 13, 84);
  g.lineTo(X + 13, 26);
  g.stroke();
  poly(g, [X + 13, 20, X + 16, 28, X + 10, 28], metal(g, X + 10, X + 16));
  legs(g, 70, 4);
  poly(g, [X - 9, 72, X - 8, 52, X + 8, 52, X + 9, 72], lit(g, f, X - 9, X + 9));
  g.fillStyle = f.trim;
  g.fillRect(X - 9, 62, 18, 2.5);
  head(g, 45, "cap", f);
  ellipse(g, X - 9, 62, 10, 12, lit(g, f, X - 19, X + 1));
  ellipse(g, X - 9, 62, 3, 3, f.trim);
  g.strokeStyle = f.trim;
  g.lineWidth = 1.5;
  g.beginPath();
  g.ellipse(X - 9, 62, 9, 11, 0, 0, Math.PI * 2);
  g.stroke();
};

const knight = (g: G, f: Faction): void => {
  disc(g, f);
  steed(g, f, "#3a2c2a");
  poly(g, [X - 6, 60, X - 5, 42, X + 6, 42, X + 7, 60], lit(g, f, X - 6, X + 7));
  poly(g, [X - 5, 44, X - 18, 66, X - 4, 62], shade(f.dark, -0.1));
  head(g, 35, "plume", f);
  g.strokeStyle = WOOD;
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(X - 14, 62);
  g.lineTo(X + 28, 22);
  g.stroke();
  poly(g, [X + 28, 22, X + 22, 24, X + 31, 16], metal(g, X + 22, X + 31));
};

const bishop = (g: G, f: Faction): void => {
  disc(g, f);
  poly(g, [X - 15, 84, X - 8, 46, X + 8, 46, X + 15, 84], lit(g, f, X - 15, X + 15));
  g.fillStyle = f.trim;
  g.fillRect(X - 1.5, 50, 3, 34);
  head(g, 40, "hood", f);
  g.strokeStyle = WOOD;
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(X + 16, 86);
  g.lineTo(X + 16, 22);
  g.stroke();
  const orb = g.createRadialGradient(X + 15, 17, 1, X + 16, 18, 9);
  orb.addColorStop(0, "#ffffff");
  orb.addColorStop(0.35, f.light);
  orb.addColorStop(1, "rgba(255,255,255,0)");
  ellipse(g, X + 16, 18, 9, 9, orb);
};

const rook = (g: G, f: Faction): void => {
  disc(g, f);
  poly(g, [X - 15, 82, X - 12, 32, X + 12, 32, X + 15, 82], WOOD);
  g.strokeStyle = "rgba(40,20,5,0.5)";
  g.lineWidth = 1;
  for (let y = 38; y < 82; y += 7) {
    g.beginPath();
    g.moveTo(X - 14, y);
    g.lineTo(X + 14, y);
    g.stroke();
  }
  poly(g, [X - 15, 32, X - 15, 24, X - 9, 24, X - 9, 28, X - 3, 28, X - 3, 24, X + 3, 24, X + 3, 28, X + 9, 28, X + 9, 24, X + 15, 24, X + 15, 32], "#a06a38");
  poly(g, [X - 12, 44, X + 12, 44, X + 11, 56, X - 11, 56], lit(g, f, X - 12, X + 12));
  g.fillStyle = "#1c120a";
  g.fillRect(X - 4, 62, 8, 12);
  for (const wx of [X - 12, X + 12]) {
    ellipse(g, wx, 84, 6, 6, "#3a2414");
    ellipse(g, wx, 84, 2, 2, f.trim);
  }
  g.strokeStyle = "#3a2414";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(X, 24);
  g.lineTo(X, 6);
  g.stroke();
  poly(g, [X, 6, X + 14, 10, X, 15], f.base);
};

const steed = (g: G, f: Faction, coat: string): void => {
  g.strokeStyle = shade(coat, -0.35);
  g.lineWidth = 3.5;
  for (const lx of [X - 13, X - 7, X + 7, X + 13]) {
    g.beginPath();
    g.moveTo(lx, 70);
    g.lineTo(lx + (lx < X ? -1 : 1), 86);
    g.stroke();
  }
  ellipse(g, X, 66, 19, 9, coat);
  poly(g, [X + 12, 66, X + 16, 48, X + 24, 42, X + 29, 47, X + 22, 52, X + 19, 66], coat);
  poly(g, [X + 22, 41, X + 24, 36, X + 26, 42], shade(coat, -0.2));
  poly(g, [X - 18, 60, X + 16, 60, X + 14, 74, X - 16, 74], lit(g, f, X - 18, X + 16));
  g.fillStyle = f.trim;
  g.fillRect(X - 17, 71, 31, 2.5);
};

const queen = (g: G, f: Faction): void => {
  disc(g, f);
  steed(g, f, "#f1ede4");
  poly(g, [X + 20, 44, X + 18, 40, X + 26, 34, X + 24, 42], "#f2c94c");
  poly(g, [X - 7, 60, X - 5, 42, X + 6, 42, X + 7, 60], metal(g, X - 7, X + 7));
  poly(g, [X - 6, 44, X - 20, 64, X - 8, 60], lit(g, f, X - 20, X - 6));
  head(g, 35, "wing", f);
  g.strokeStyle = "#7a5a10";
  g.lineWidth = 2;
  poly(g, [X + 8, 48, X + 11, 48, X + 12, 14, X + 9.5, 10, X + 7, 14], metal(g, X + 7, X + 12));
  poly(g, [X + 4, 48, X + 15, 48, X + 15, 50, X + 4, 50], f.trim);
};

const king = (g: G, f: Faction): void => {
  disc(g, f);
  g.strokeStyle = "#3a2414";
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(X - 15, 84);
  g.lineTo(X - 15, 6);
  g.stroke();
  poly(g, [X - 15, 6, X - 1, 10, X - 15, 22], f.base);
  ellipse(g, X - 15, 5, 2.5, 2.5, f.trim);
  poly(g, [X - 17, 84, X - 10, 48, X + 10, 48, X + 17, 84], lit(g, f, X - 17, X + 17));
  poly(g, [X - 9, 66, X - 8, 46, X + 8, 46, X + 9, 66], metal(g, X - 9, X + 9));
  ellipse(g, X, 56, 5, 5, "#f2c94c");
  g.beginPath();
  g.arc(X, 56, 5, Math.PI / 2, -Math.PI / 2);
  g.fillStyle = "#cfd8ff";
  g.fill();
  g.fillStyle = f.trim;
  g.fillRect(X - 10, 66, 20, 3);
  poly(g, [X - 12, 48, X - 13, 44, X - 6, 44, X - 6, 48], f.base);
  poly(g, [X + 12, 48, X + 13, 44, X + 6, 44, X + 6, 48], f.base);
  head(g, 38, "crown", f);
  poly(g, [X - 5, 42, X + 5, 42, X, 50], "#d9d2c5", "rgba(0,0,0,0.3)");
};

export const LEGION: Record<UnitType, (g: G, f: Faction) => void> = { pawn, knight, bishop, rook, queen, king };
