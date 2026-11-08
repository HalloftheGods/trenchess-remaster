import Phaser from "phaser";
import type { Unit } from "../../engine/types";
import { UNIT_LORE } from "../../game/lore";
import { FACTIONS } from "../art/unitArt";
import { COLOR, FONT } from "../ui/fonts";
import type { DuelRequest } from "./duel";
import { BG_H, GROUND_Y, LAYERS, PARALLAX, bgKey, paintDuelBackdrop } from "./duelBackdrop";
import { DUEL_H, type DuelFrame } from "./duelFrames";
import { PX_KEY, duelKey, paintDuelParticle, paintDuelUnit } from "./duelSprites";

export interface Fighter {
  unit: Unit;
  sprite: Phaser.GameObjects.Image;
  plate: Phaser.GameObjects.Container;
  /** +1 faces right (stands on the left), -1 faces left. */
  dir: 1 | -1;
  /** Resting x on the floor. */
  home: number;
}

const PLATE_W = 250;
const PLATE_H = 44;

/**
 * Everything the duel draws: the letterbox, the three parallax layers of the strip, both
 * chessmen with their name plates, the flash and the particle emitter. Positions are computed
 * from the screen size once, in logical units scaled by `k` (integer, for crisp pixels).
 */
export class DuelStage {
  readonly root: Phaser.GameObjects.Container;
  readonly attacker: Fighter;
  readonly defender: Fighter;
  readonly k: number;
  readonly top: number;
  readonly floor: number;
  private readonly layers: Phaser.GameObjects.TileSprite[] = [];
  private readonly flash: Phaser.GameObjects.Rectangle;
  private readonly particles: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private scene: Phaser.Scene, req: DuelRequest) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    this.k = Phaser.Math.Clamp(Math.floor(Math.min(h * 0.46, (w * 9) / 16) / BG_H), 3, 12);
    const stripH = BG_H * this.k;
    this.top = Math.round((h - stripH) / 2);
    this.floor = this.top + GROUND_Y * this.k;
    this.root = scene.add.container(0, 0).setDepth(1000);
    paintDuelBackdrop(scene, req.terrain);
    paintDuelUnit(scene, req.attacker);
    paintDuelUnit(scene, req.defender);
    paintDuelParticle(scene);
    this.letterbox(w, h, stripH);
    LAYERS.forEach((layer) => {
      const t = scene.add.tileSprite(0, this.top, w, stripH, bgKey(req.terrain, layer)).setOrigin(0, 0).setTileScale(this.k, this.k);
      this.layers.push(t);
      this.root.add(t);
    });
    const left = req.attackerOwner === 0;
    this.attacker = this.fighter(req.attacker, left ? 1 : -1, w);
    this.defender = this.fighter(req.defender, left ? -1 : 1, w);
    this.flash = scene.add.rectangle(0, this.top, w, stripH, 0xffffff).setOrigin(0, 0).setAlpha(0);
    this.particles = scene.add.particles(0, 0, PX_KEY, { emitting: false, lifespan: 700, gravityY: 900, speed: { min: 120, max: 420 }, angle: { min: 200, max: 340 }, scale: this.k / 4, rotate: { min: 0, max: 360 } });
    this.root.add([this.flash, this.particles]);
  }

  private letterbox(w: number, h: number, stripH: number): void {
    const bars = [this.scene.add.rectangle(0, 0, w, this.top, 0x000000, 0.6), this.scene.add.rectangle(0, this.top + stripH, w, h, 0x000000, 0.6)];
    const lines = [this.scene.add.rectangle(0, this.top - 2, w, 2, COLOR.gold), this.scene.add.rectangle(0, this.top + stripH, w, 2, COLOR.gold)];
    [...bars, ...lines].forEach((r) => this.root.add(r.setOrigin(0, 0)));
  }

  private fighter(unit: Unit, dir: 1 | -1, w: number): Fighter {
    const home = w / 2 - dir * w * 0.2;
    const sprite = this.scene.add.image(home, this.floor, duelKey(unit, "idle")).setOrigin(0.5, 1).setScale(this.k).setFlipX(dir < 0);
    const plate = this.plate(unit, dir, w);
    this.root.add([sprite, plate]);
    return { unit, sprite, plate, dir, home };
  }

  private plate(unit: Unit, dir: 1 | -1, w: number): Phaser.GameObjects.Container {
    const f = FACTIONS[unit.owner];
    const x = dir > 0 ? 24 : w - 24 - PLATE_W;
    const c = this.scene.add.container(x, this.top + 16);
    const bg = this.scene.add.rectangle(0, 0, PLATE_W, PLATE_H, COLOR.ink, 0.82).setOrigin(0, 0);
    const stripe = this.scene.add.rectangle(dir > 0 ? 0 : PLATE_W - 6, 0, 6, PLATE_H, Phaser.Display.Color.HexStringToColor(f.css).color).setOrigin(0, 0);
    const name = this.scene.add.text(dir > 0 ? 16 : PLATE_W - 16, 6, UNIT_LORE[unit.type].title, { fontFamily: FONT.display, fontSize: "17px", fontStyle: "600", color: COLOR.bone }).setOrigin(dir > 0 ? 0 : 1, 0);
    const who = this.scene.add.text(dir > 0 ? 16 : PLATE_W - 16, 27, `${f.name} · ${UNIT_LORE[unit.type].chess}`, { fontFamily: FONT.body, fontSize: "11px", color: f.css }).setOrigin(dir > 0 ? 0 : 1, 0);
    c.add([bg, stripe, name, who]);
    return c;
  }

  /** Scrolls the parallax by `dx` ground pixels; nearer layers move more. */
  scroll(dx: number): void {
    this.layers.forEach((t, i) => {
      t.tilePositionX += (dx * PARALLAX[LAYERS[i]]) / this.k;
    });
  }

  frame(f: Fighter, frame: DuelFrame): void {
    f.sprite.setTexture(duelKey(f.unit, frame));
  }

  /** Lunge target: most of the way to the defender's chest. */
  lungeX(): number {
    return this.defender.home - this.defender.dir * this.k * 10;
  }

  burst(x: number, y: number, tint: number, count: number): void {
    this.particles.setParticleTint(tint);
    this.particles.explode(count, x, y);
  }

  flashOnce(ms: number): void {
    this.flash.setAlpha(0.9);
    this.scene.tweens.add({ targets: this.flash, alpha: 0, duration: ms, ease: "Quad.Out" });
  }

  /** Where a hit lands on `f`: mid-torso, in screen pixels. */
  chest(f: Fighter): { x: number; y: number } {
    return { x: f.sprite.x, y: f.sprite.y - (DUEL_H * this.k) / 2 };
  }

  /** Stops every running tween on the stage's objects (a skip jumps to the end state). */
  freeze(): void {
    this.scene.tweens.killTweensOf(this.root.getAll());
    this.scene.tweens.killTweensOf(this.root);
  }

  destroy(): void {
    this.freeze();
    this.root.destroy(true);
  }
}
