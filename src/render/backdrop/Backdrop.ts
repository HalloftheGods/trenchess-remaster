import type { Levels } from "../../audio/music";

export type LevelSource = () => Levels;

interface Blob {
  phase: number;
  speed: number;
  hue: number;
  size: number;
  band: keyof Omit<Levels, "beat">;
}

const SCALE = 3;
const BLOBS: Blob[] = [
  { phase: 0.0, speed: 0.11, hue: 222, size: 0.42, band: "bass" },
  { phase: 1.9, speed: 0.07, hue: 265, size: 0.36, band: "mid" },
  { phase: 3.6, speed: 0.13, hue: 190, size: 0.3, band: "high" },
  { phase: 2.4, speed: 0.05, hue: 340, size: 0.34, band: "mid" },
  { phase: 5.1, speed: 0.09, hue: 160, size: 0.26, band: "high" },
];

const reducedMotion = (): boolean => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/**
 * A MilkDrop-flavoured backdrop: a low-resolution canvas fed back into itself with a slow zoom
 * and twist, with soft additive blobs that swell to the music. Falls back to slow internal LFOs
 * when there is no music, and to a still gradient under reduced motion.
 */
export class Backdrop {
  private g: CanvasRenderingContext2D;
  private raf = 0;
  private t = 0;
  private last = 0;
  private flash = 0;
  private hueShift = 0;

  constructor(private canvas: HTMLCanvasElement, private levels: LevelSource, lifetime: AbortSignal) {
    this.g = canvas.getContext("2d", { alpha: false })!;
    this.resize();
    window.addEventListener("resize", () => this.resize(), { signal: lifetime });
    document.addEventListener("visibilitychange", () => this.sync(), { signal: lifetime });
    lifetime.addEventListener("abort", () => cancelAnimationFrame(this.raf), { once: true });
    this.sync();
  }

  private resize(): void {
    this.canvas.width = Math.max(160, Math.floor(window.innerWidth / SCALE));
    this.canvas.height = Math.max(90, Math.floor(window.innerHeight / SCALE));
    this.g.fillStyle = "#0b0d14";
    this.g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (reducedMotion()) this.still();
  }

  private sync(): void {
    cancelAnimationFrame(this.raf);
    if (document.hidden || reducedMotion()) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame((now) => this.frame(now));
  }

  private still(): void {
    const { width: w, height: h } = this.canvas;
    const grad = this.g.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h * 0.4, w * 0.7);
    grad.addColorStop(0, "#273347");
    grad.addColorStop(0.6, "#141a26");
    grad.addColorStop(1, "#0b0d14");
    this.g.fillStyle = grad;
    this.g.fillRect(0, 0, w, h);
  }

  private frame(now: number): void {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    const lv = this.levels();
    this.feedback(dt, lv);
    this.paintBlobs(lv);
    this.raf = requestAnimationFrame((n) => this.frame(n));
  }

  /** Redraw the previous frame slightly zoomed and twisted, then dim it: the classic trail. */
  private feedback(dt: number, lv: Levels): void {
    const { width: w, height: h } = this.canvas;
    const g = this.g;
    const zoom = 1.003 + lv.bass * 0.012;
    const twist = 0.0007 + lv.mid * 0.0025;
    g.save();
    g.globalAlpha = 0.985;
    g.translate(w / 2, h / 2);
    g.rotate(twist);
    g.scale(zoom, zoom);
    g.drawImage(this.canvas, -w / 2, -h / 2);
    g.restore();
    g.fillStyle = `rgba(11, 13, 20, ${0.05 + dt * 0.4})`;
    g.fillRect(0, 0, w, h);
  }

  private paintBlobs(lv: Levels): void {
    const { width: w, height: h } = this.canvas;
    const g = this.g;
    const live = lv.bass + lv.mid + lv.high > 0.01;
    this.flash = lv.beat ? 1 : this.flash * 0.9;
    this.hueShift += 0.08 + lv.high * 0.6;
    g.globalCompositeOperation = "lighter";
    for (const b of BLOBS) {
      const a = this.t * b.speed + b.phase;
      const x = w / 2 + Math.sin(a) * w * 0.34 + Math.sin(a * 2.3) * w * 0.08;
      const y = h * 0.45 + Math.cos(a * 0.8) * h * 0.3;
      const idle = 0.5 + 0.5 * Math.sin(this.t * 0.6 + b.phase);
      const level = live ? lv[b.band] : idle * 0.35;
      const r = Math.max(6, Math.min(w, h) * b.size * (0.55 + level * 0.9));
      const hue = (b.hue + this.hueShift) % 360;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `hsla(${hue}, 70%, 58%, ${0.07 + level * 0.16})`);
      grad.addColorStop(0.5, `hsla(${hue}, 70%, 45%, ${0.025 + level * 0.05})`);
      grad.addColorStop(1, "hsla(0, 0%, 0%, 0)");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    if (this.flash > 0.05) {
      const grad = g.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, w * 0.5);
      grad.addColorStop(0, `rgba(242, 201, 76, ${0.05 * this.flash})`);
      grad.addColorStop(1, "rgba(242, 201, 76, 0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }
    g.globalCompositeOperation = "source-over";
  }
}
