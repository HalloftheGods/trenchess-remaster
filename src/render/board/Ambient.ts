import Phaser from "phaser";
import type { Terrain } from "../../engine/types";
import { TOP_LAYER, getProjection } from "../iso";
import type { BoardView } from "./BoardView";

/** Random emit zone over a fixed set of world points, with per-point jitter; allocation-free at emit time. */
class CellZone {
  constructor(private xs: Float32Array, private ys: Float32Array, private jx: number, private jy: number) {}

  getRandomPoint(point: Phaser.Types.Math.Vector2Like): void {
    const i = Math.floor(Math.random() * this.xs.length);
    point.x = this.xs[i] + (Math.random() - 0.5) * this.jx;
    point.y = this.ys[i] + (Math.random() - 0.5) * this.jy;
  }
}

interface AmbientSpec {
  terrain: Terrain;
  texture: string;
  /** Hard ceiling of alive particles for this effect; the four specs sum to 59. */
  maxAlive: number;
  lifespan: number;
  /** World-space offset above the cell centre in iso (0 in top view). */
  rise: number;
  config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
}

const SPECS: AmbientSpec[] = [
  {
    terrain: "forest",
    texture: "spark",
    maxAlive: 20,
    lifespan: 2600,
    rise: 34,
    config: { speed: { min: 3, max: 12 }, scale: { start: 0.55, end: 0 }, alpha: { start: 0, end: 0.9, ease: "Sine.InOut" }, tint: [0xd4ff6a, 0xfff3a0], blendMode: "ADD", gravityY: -3 },
  },
  {
    terrain: "swamp",
    texture: "bubble",
    maxAlive: 15,
    lifespan: 1700,
    rise: 0,
    config: { speedY: { min: -16, max: -7 }, speedX: { min: -3, max: 3 }, scale: { start: 0.3, end: 0.75 }, alpha: { start: 0.75, end: 0 } },
  },
  {
    terrain: "desert",
    texture: "wisp",
    maxAlive: 12,
    lifespan: 1900,
    rise: 4,
    config: { speedX: { min: 22, max: 48 }, speedY: { min: -6, max: 2 }, scale: { start: 0.6, end: 1.3 }, alpha: { start: 0.5, end: 0 }, tint: 0xffe8b8 },
  },
  {
    terrain: "mountain",
    texture: "mist",
    maxAlive: 12,
    lifespan: 3200,
    rise: 26,
    config: { speedX: { min: 4, max: 12 }, speedY: { min: -4, max: -1 }, scale: { start: 0.5, end: 1.1 }, alpha: { start: 0.3, end: 0 }, blendMode: "ADD" },
  },
];

/** Low-density ambient particles per terrain; rebuilt when the terrain changes, paused while the tab is hidden. */
export class Ambient {
  private emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private lifetime = new AbortController();

  constructor(private scene: Phaser.Scene) {
    document.addEventListener("visibilitychange", () => this.setPaused(document.hidden), { signal: this.lifetime.signal });
    scene.events.once(Phaser.Scenes.Events.DESTROY, () => this.lifetime.abort());
  }

  rebuild(board: BoardView): void {
    this.emitters.forEach((e) => e.destroy());
    this.emitters = [];
    const top = getProjection() === "top";
    for (const spec of SPECS) {
      const cells = board.cellsOf(spec.terrain);
      if (!cells.length) continue;
      const xs = new Float32Array(cells.length);
      const ys = new Float32Array(cells.length);
      cells.forEach(([r, c], i) => {
        const { x, y } = board.center(r, c);
        xs[i] = x;
        ys[i] = y - (top ? 0 : spec.rise);
      });
      const maxAlive = Math.min(spec.maxAlive, cells.length * 3);
      const emitter = this.scene.add.particles(0, 0, spec.texture, {
        ...spec.config,
        lifespan: spec.lifespan,
        frequency: spec.lifespan / maxAlive,
        maxAliveParticles: maxAlive,
        emitZone: { type: "random", source: new CellZone(xs, ys, top ? 44 : 50, top ? 44 : 24) },
      });
      emitter.setDepth(TOP_LAYER - 15);
      this.emitters.push(emitter);
    }
    if (document.hidden) this.setPaused(true);
  }

  private setPaused(paused: boolean): void {
    for (const e of this.emitters) {
      if (paused) e.pause();
      else e.resume();
    }
  }

  /** Alive particles across all emitters (for the budget check on `window.__tc`). */
  get alive(): number {
    let n = 0;
    for (const e of this.emitters) n += e.getAliveParticleCount();
    return n;
  }
}
