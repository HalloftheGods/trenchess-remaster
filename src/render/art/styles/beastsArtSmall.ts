import type { Faction } from "../unitArt";
import { ellipse } from "../canvas";
import { FUR, INK, NOSE, X, blob, collar, eye, furGrad, groundShadow, poly, stroke, type G } from "./beastsArtHelpers";

const PINK = "#e9a2a2";

const hareEar = (g: G, cx: number, tilt: number): void => {
  const fur = FUR.hare;
  blob(g, cx, 28, 4.2, 14, furGrad(g, fur, cx - 4, 14, cx + 4, 42), tilt);
  blob(g, cx, 29, 2, 10.5, PINK, tilt, null);
};

/** Pawn: a sitting hare, ears tall, army collar with a trim tag. */
export const hare = (g: G, f: Faction): void => {
  const fur = FUR.hare;
  groundShadow(g, 18);
  hareEar(g, X - 6, -0.14);
  hareEar(g, X + 6, 0.14);
  blob(g, X - 11, 78, 9, 8, furGrad(g, fur, X - 20, 70, X - 2, 86));
  blob(g, X + 11, 78, 9, 8, furGrad(g, fur, X + 2, 70, X + 20, 86));
  blob(g, X, 66, 12.5, 17, furGrad(g, fur, X - 12, 50, X + 12, 84));
  ellipse(g, X, 71, 7, 11, fur.light);
  for (const px of [X - 5, X + 5]) {
    blob(g, px, 85, 4.2, 2.6, fur.light);
    stroke(g, [px - 2, 85, px - 2, 87, px, 85, px, 87.5, px + 2, 85, px + 2, 87], INK, 0.8);
  }
  blob(g, X, 45, 10, 9, furGrad(g, fur, X - 10, 36, X + 10, 54));
  ellipse(g, X, 49, 5.5, 4.5, fur.light);
  eye(g, f, X - 4.5, 43, 2.1);
  eye(g, f, X + 4.5, 43, 2.1);
  poly(g, [X - 1.6, 47.5, X + 1.6, 47.5, X, 49.6], PINK, NOSE, 0.6);
  stroke(g, [X - 4, 49, X - 13, 47.5], INK, 0.6);
  stroke(g, [X - 4, 50, X - 13, 51.5], INK, 0.6);
  stroke(g, [X + 4, 49, X + 13, 47.5], INK, 0.6);
  stroke(g, [X + 4, 50, X + 13, 51.5], INK, 0.6);
  collar(g, f, X, 53, 9.5, 3.5);
  g.fillStyle = f.trim;
  g.fillRect(X - 10, 50, 1.4, 4);
};

const owlFeathers = (g: G, cx: number, y0: number, y1: number): void => {
  g.strokeStyle = "rgba(60,45,30,0.55)";
  g.lineWidth = 1;
  for (let y = y0; y < y1; y += 5) {
    const off = ((y - y0) / 5) % 2 === 0 ? 0 : 3;
    for (let x = -6 + off; x <= 6; x += 6) {
      g.beginPath();
      g.arc(cx + x, y, 2.6, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();
    }
  }
};

/** Bishop: an upright owl with ear tufts, huge army-colored eyes and a stole, standing on a perch. */
export const owl = (g: G, f: Faction): void => {
  const fur = FUR.owl;
  groundShadow(g, 19);
  blob(g, X, 86, 20, 3.2, "#6a4426");
  ellipse(g, X, 85, 18, 1.4, "#9a6a3c");
  blob(g, X - 13, 60, 6.5, 20, furGrad(g, fur, X - 20, 40, X - 6, 80), 0.08);
  blob(g, X + 13, 60, 6.5, 20, furGrad(g, fur, X + 6, 40, X + 20, 80), -0.08);
  blob(g, X, 60, 14.5, 23, furGrad(g, fur, X - 14, 36, X + 14, 84));
  ellipse(g, X, 64, 9.5, 16, fur.light);
  owlFeathers(g, X, 52, 78);
  const stoleFill = f.base;
  poly(g, [X - 7, 44, X - 3, 44, X - 3.5, 78, X - 8, 78], stoleFill, f.dark, 1);
  poly(g, [X + 7, 44, X + 3, 44, X + 3.5, 78, X + 8, 78], stoleFill, f.dark, 1);
  g.fillStyle = f.trim;
  for (const sx of [X - 5.8, X + 5.8]) {
    g.fillRect(sx - 1.6, 56, 3.2, 1.3);
    g.fillRect(sx - 0.65, 54.8, 1.3, 3.6);
    g.fillRect(sx - 2.4, 75.5, 4.8, 1.6);
  }
  for (const tx of [X - 7, X + 7]) {
    stroke(g, [tx - 4, 83.5, tx - 4, 86, tx, 82.5, tx, 86.5, tx + 4, 83.5, tx + 4, 86], "#3b2a1a", 1.8);
  }
  poly(g, [X - 13, 30, X - 11, 14, X - 3, 25], furGrad(g, fur, X - 13, 14, X - 3, 30));
  poly(g, [X + 13, 30, X + 11, 14, X + 3, 25], furGrad(g, fur, X + 3, 14, X + 13, 30));
  blob(g, X, 33, 15, 12.5, furGrad(g, fur, X - 15, 20, X + 15, 46));
  for (const dx of [-6.5, 6.5]) {
    ellipse(g, X + dx, 35, 8, 8, fur.light);
    g.strokeStyle = "rgba(60,45,30,0.5)";
    g.lineWidth = 1;
    g.beginPath();
    g.arc(X + dx, 35, 8, 0, Math.PI * 2);
    g.stroke();
  }
  eye(g, f, X - 6.5, 35, 4.6);
  eye(g, f, X + 6.5, 35, 4.6);
  poly(g, [X - 2.4, 40, X + 2.4, 40, X, 45.5], "#4a3522", NOSE, 0.8);
};
