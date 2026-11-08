import Phaser from "phaser";
import { boardBounds, getProjection, getRotation, setProjection, setRotation, type Projection } from "../../iso";
import type { BattleScene } from "../BattleScene";

export type Framing = "center" | "setup";

/** The View API from docs/OVERHAUL.md: rotation, projection, camera framing and the title drift. */
export interface ViewApi {
  rotate(delta: 1 | -1): Promise<void>;
  setProjection(p: Projection): Promise<void>;
  readonly projection: Projection;
  zoomBy(factor: number): void;
  panBy(dx: number, dy: number): void;
  reset(): void;
  frame(where: Framing): void;
  setDrift(on: boolean): void;
  setDiorama(on: boolean): void;
}

const ROTATE_MS = 420;
const PROJECT_MS = 500;
const FRAME_MS = 450;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.2;
/** The setup panel plus its margins; the board centres in what is left of the screen. */
const SETUP_PANEL = 470;
/** Vertical padding and camera lift per projection when framing the board. */
const PAD_H: Record<Projection, number> = { iso: 300, front: 220, top: 160 };
const LIFT: Record<Projection, number> = { iso: 50, front: 30, top: 0 };

interface Framed {
  x: number;
  y: number;
  zoom: number;
}

export class BattleView implements ViewApi {
  private where: Framing = "center";
  private drift = true;
  private orbit = 0;
  private home: Framed = { x: 0, y: 0, zoom: 1 };
  private tilt: Phaser.FX.Bokeh | null = null;
  private busy: Promise<void> = Promise.resolve();

  constructor(private scene: BattleScene) {}

  get projection(): Projection {
    return getProjection();
  }

  private get cam(): Phaser.Cameras.Scene2D.Camera {
    return this.scene.cameras.main;
  }

  /** Serialise view morphs so a rotate during a projection swap cannot interleave tweens. */
  private queue(run: () => Promise<void>): Promise<void> {
    this.busy = this.busy.then(run, run);
    return this.busy;
  }

  rotate(delta: 1 | -1): Promise<void> {
    return this.queue(() => {
      setRotation(getRotation() + delta);
      return this.morph(ROTATE_MS, false);
    });
  }

  setProjection(p: Projection): Promise<void> {
    return this.queue(() => {
      if (p === getProjection()) return Promise.resolve();
      setProjection(p);
      return this.morph(PROJECT_MS, true);
    });
  }

  private morph(duration: number, reframe: boolean): Promise<void> {
    const s = this.scene;
    s.board.clearMarkers();
    s.board.clearPreview();
    s.board.relayout(duration);
    s.units.relayoutAll(duration);
    if (reframe) this.frame(this.where, duration);
    return new Promise((resolve) => s.time.delayedCall(duration, resolve));
  }

  zoomBy(factor: number): void {
    this.cam.setZoom(Phaser.Math.Clamp(this.cam.zoom * factor, ZOOM_MIN, ZOOM_MAX));
  }

  panBy(dx: number, dy: number): void {
    this.cam.scrollX += dx / this.cam.zoom;
    this.cam.scrollY += dy / this.cam.zoom;
  }

  reset(): void {
    this.frame(this.where, FRAME_MS);
  }

  /** Compute where the camera rests for a framing: the board filling the usable width, left 60% for "setup". */
  private framed(where: Framing): Framed {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const b = boardBounds();
    const usable = where === "setup" ? Math.max(w - SETUP_PANEL, w * 0.5) : w;
    const p = getProjection();
    const top = p !== "iso";
    const padW = top ? 140 : 120;
    const padH = PAD_H[p];
    const setup = where === "setup";
    const zoom = Phaser.Math.Clamp(Math.min(usable / (b.width + padW), h / (b.height + padH + (setup ? 80 : 0))), ZOOM_MIN, setup ? 1.2 : 1.6);
    const shift = (w / 2 - usable / 2 - (setup ? 110 : 0)) / zoom;
    const lift = LIFT[p] + (setup ? 90 / zoom : 0);
    return { x: b.centerX + shift, y: b.centerY - lift, zoom };
  }

  frame(where: Framing, duration = FRAME_MS): void {
    this.where = where;
    this.home = this.framed(where);
    if (duration <= 0) {
      this.cam.setZoom(this.home.zoom);
      this.cam.centerOn(this.home.x, this.home.y);
      return;
    }
    this.cam.pan(this.home.x, this.home.y, duration, "Cubic.easeInOut", true);
    this.cam.zoomTo(this.home.zoom, duration, "Cubic.easeInOut", true);
  }

  /** Instant re-fit for the current framing (window resize). */
  refit(): void {
    this.frame(this.where, 0);
  }

  setDrift(on: boolean): void {
    this.drift = on;
    if (!on) this.refit();
  }

  /** Tilt-shift for the diorama look on the title; off during play for readability. WebGL only. */
  setDiorama(on: boolean): void {
    const fx = this.cam.postFX;
    if (!fx || !this.scene.webgl) return;
    if (on && !this.tilt) this.tilt = fx.addTiltShift(0.6, 0.8, 0.15, 1, 1, 1);
    if (!on && this.tilt) {
      fx.remove(this.tilt);
      this.tilt = null;
    }
  }

  /** Slow orbit around the home framing; allocation-free. */
  update(dt: number): void {
    if (!this.drift || this.cam.panEffect.isRunning) return;
    this.orbit += dt / 4000;
    this.cam.centerOn(this.home.x + Math.sin(this.orbit) * 60, this.home.y + Math.cos(this.orbit * 0.7) * 25);
  }
}
