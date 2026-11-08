import Phaser from "phaser";
import type { Terrain } from "../../engine/types";
import type { AmbientKind } from "./pixel/field";
import { FIELDS } from "./pixel/fields";
import { SCREEN_H } from "./pixel/painter";
import { layerKey, paintField } from "./pixel/textures";

const hex = (css: string): number => Phaser.Display.Color.HexStringToColor(css).color;

/** Ambient particles per kind, in low-res pixels per second. */
const AMBIENT: Record<Exclude<AmbientKind, "none">, (w: number) => Phaser.Types.GameObjects.Particles.ParticleEmitterConfig & { key: string }> = {
  pollen: (w) => ({ key: "px-dot", lifespan: 6000, frequency: 260, speedX: { min: 2, max: 7 }, speedY: { min: -3, max: 2 }, alpha: { start: 1, end: 0 }, emitZone: zone(w, 20, 130) }),
  leaves: (w) => ({ key: "px-leaf", lifespan: 7000, frequency: 340, speedX: { min: -6, max: 4 }, speedY: { min: 8, max: 16 }, alpha: { start: 1, end: 0.3 }, emitZone: zone(w, 0, 20) }),
  fireflies: (w) => ({ key: "px-dot", lifespan: 3000, frequency: 220, speedX: { min: -4, max: 4 }, speedY: { min: -5, max: 2 }, alpha: { start: 1, end: 0 }, blendMode: Phaser.BlendModes.ADD, emitZone: zone(w, 60, 140) }),
  snow: (w) => ({ key: "px-dot", lifespan: 7000, frequency: 70, speedX: { min: -14, max: -5 }, speedY: { min: 10, max: 22 }, alpha: { start: 1, end: 0.4 }, emitZone: zone(w, 0, 10) }),
  sand: (w) => ({ key: "px-dot", lifespan: 2600, frequency: 40, speedX: { min: -90, max: -50 }, speedY: { min: -3, max: 3 }, alpha: { start: 0.9, end: 0 }, emitZone: zone(w, 90, 150) }),
};

const zone = (w: number, y0: number, y1: number): Phaser.Types.GameObjects.Particles.EmitZoneData =>
  ({ type: "random", source: new Phaser.Geom.Rectangle(-20, y0, w + 40, y1 - y0) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource, quantity: 1 }) as Phaser.Types.GameObjects.Particles.EmitZoneData;

/**
 * The battlefield behind a duel: the terrain's hand-painted pixel layers as tiling sprites at
 * native resolution, each scrolling at its own parallax rate, plus drifting ambient pixels.
 */
export class DuelBackdrop {
  private readonly layers: { sprite: Phaser.GameObjects.TileSprite; parallax: number; drift: number }[] = [];
  private readonly emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private scroll = 0;

  constructor(scene: Phaser.Scene, back: Phaser.GameObjects.Container, front: Phaser.GameObjects.Container, terrain: Terrain, w: number) {
    const field = FIELDS[terrain];
    paintField(scene, terrain);
    const start = Math.floor(Math.random() * 320);
    field.layers.forEach((layer, i) => {
      const sprite = scene.add.tileSprite(0, 0, w, SCREEN_H, layerKey(terrain, i)).setOrigin(0, 0);
      sprite.tilePositionX = Math.round(start * layer.parallax);
      this.layers.push({ sprite, parallax: layer.parallax, drift: layer.drift ?? 0 });
      (layer.front ? front : back).add(sprite);
      if (i === Math.min(2, field.layers.length - 1) && field.ambient !== "none") this.ambient(scene, back, field.ambient, field.ambientColors, w);
    });
    this.scroll = start;
  }

  private ambient(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, kind: Exclude<AmbientKind, "none">, colors: string[], w: number): void {
    const { key, ...config } = AMBIENT[kind](w);
    const e = scene.add.particles(0, 0, key, { ...config, tint: colors.map(hex) });
    this.emitters.push(e);
    layer.add(e);
    e.fastForward(5000);
  }

  /** Moves the scenery as if the view travelled `dx` pixels along the floor. */
  push(dx: number): void {
    this.scroll += dx;
  }

  setSpeed(s: number): void {
    this.emitters.forEach((e) => (e.timeScale = s));
  }

  tick(dt: number): void {
    this.layers.forEach((l) => {
      l.sprite.tilePositionX = Math.round(this.scroll * l.parallax + (l.sprite.getData("d") ?? 0));
      if (l.drift) l.sprite.setData("d", (l.sprite.getData("d") ?? 0) + l.drift * dt);
    });
  }
}
