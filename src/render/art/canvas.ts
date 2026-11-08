import Phaser from "phaser";

export type Painter = (g: CanvasRenderingContext2D, w: number, h: number) => void;

export const paint = (scene: Phaser.Scene, key: string, w: number, h: number, painter: Painter): void => {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d")!;
  painter(g, w, h);
  addPainted(scene, key, canvas);
};

/**
 * Registers a finished canvas as a plain image texture. `textures.addCanvas` would wrap it in a
 * CanvasTexture, whose constructor reads every pixel back with getImageData (a GPU→CPU stall per
 * texture, two hundred of them at boot) and keeps the copy; nothing here reads texture pixels.
 * Phaser's runtime accepts a canvas where its types ask for an image.
 */
export const addPainted = (scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void => {
  scene.textures.addImage(key, canvas as unknown as HTMLImageElement);
};

export const rand = (seed: number): (() => number) => {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

export const shade = (hex: string, amt: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `rgb(${r},${g},${b})`;
};

export const diamondPath = (g: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number): void => {
  g.beginPath();
  g.moveTo(cx, cy - h / 2);
  g.lineTo(cx + w / 2, cy);
  g.lineTo(cx, cy + h / 2);
  g.lineTo(cx - w / 2, cy);
  g.closePath();
};

export const ellipse = (g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient): void => {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
};

export const radial = (g: CanvasRenderingContext2D, x: number, y: number, r: number, stops: [number, string][]): CanvasGradient => {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach(([o, c]) => grad.addColorStop(o, c));
  return grad;
};
