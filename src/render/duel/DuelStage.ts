import Phaser from "phaser";
import type { Unit } from "../../engine/types";
import { COLOR } from "../ui/fonts";
import { FACTIONS } from "../art/unitArt";
import type { DuelRequest } from "./duel";
import { DuelBackdrop } from "./duelBackdrop";
import { DuelFx } from "./duelFx";
import { DuelHud } from "./duelHud";
import { DuelSprite } from "./DuelSprite";
import type { Clocked } from "./duelRun";
import { FLOOR_Y, SCREEN_H } from "./pixel/painter";

export const factionTint = (u: Unit): number => Phaser.Display.Color.HexStringToColor(FACTIONS[u.owner].css).color;

/** Integer scale and low-res width of the duel screen for a window of w x h. */
export const pixelScale = (w: number, h: number): { p: number; lw: number } => {
  const p = Math.max(1, Math.floor(Math.min(h / SCREEN_H, w / 256)));
  return { p, lw: Math.ceil(w / p) };
};

/**
 * Everything one duel draws. The battle lives in a low-res world (`lw` x 180 pixels) that the
 * scene renders into a texture every frame and shows scaled up by an integer with nearest
 * sampling, so every sprite, effect, particle and letter sits on the same chunky pixel grid.
 * The curtain bars that close over the board are drawn at full resolution on top.
 */
export class DuelStage implements Clocked {
  readonly w: number;
  readonly p: number;
  readonly floor = FLOOR_Y;
  readonly dir: 1 | -1;
  readonly a: DuelSprite;
  readonly d: DuelSprite;
  readonly aHome: number;
  readonly dHome: number;
  readonly aSide: 0 | 1;
  readonly dSide: 0 | 1;
  readonly fx: DuelFx;
  readonly hud: DuelHud;
  readonly backdrop: DuelBackdrop;
  readonly back: Phaser.GameObjects.Container;
  readonly actors: Phaser.GameObjects.Container;
  readonly front: Phaser.GameObjects.Container;
  readonly ui: Phaser.GameObjects.Container;
  speed = 1;
  hp = 1;
  outcomeShown = false;
  private trails: Phaser.Time.TimerEvent[] = [];
  private shakeLeft = 0;
  private shakePower = 0;
  private readonly bars: Phaser.GameObjects.Rectangle[];

  constructor(readonly scene: Phaser.Scene, readonly world: Phaser.GameObjects.Container, readonly screen: Phaser.GameObjects.RenderTexture, readonly matte: Phaser.GameObjects.Rectangle, readonly req: DuelRequest) {
    const { p, lw } = pixelScale(scene.scale.width, scene.scale.height);
    this.p = p;
    this.w = lw;
    screen.setOrigin(0, 0).setScale(p).setPosition(Math.floor((scene.scale.width - lw * p) / 2), Math.floor((scene.scale.height - SCREEN_H * p) / 2)).setVisible(false);
    matte.setSize(scene.scale.width, scene.scale.height).setVisible(false);
    this.back = scene.add.container(0, 0);
    this.actors = scene.add.container(0, 0);
    this.front = scene.add.container(0, 0);
    this.ui = scene.add.container(0, 0);
    world.add([this.back, this.actors, this.front, this.ui]);
    this.backdrop = new DuelBackdrop(scene, this.back, this.front, req.terrain, lw);
    this.dir = req.attackerOwner === 0 ? 1 : -1;
    const gap = (u: Unit): number => Math.round(Math.max(lw * 0.17, 46) + (u.type === "knight" || u.type === "queen" ? 14 : 0));
    this.aHome = Math.round(lw / 2 - this.dir * gap(req.attacker));
    this.dHome = Math.round(lw / 2 + this.dir * gap(req.defender));
    this.d = new DuelSprite(scene, this.actors, req.defender, this.dHome, (-this.dir) as 1 | -1);
    this.a = new DuelSprite(scene, this.actors, req.attacker, this.aHome, this.dir);
    this.fx = new DuelFx(scene, this.actors);
    this.aSide = this.dir > 0 ? 0 : 1;
    this.dSide = this.dir > 0 ? 1 : 0;
    const [left, right] = this.dir > 0 ? [req.attacker, req.defender] : [req.defender, req.attacker];
    this.hud = new DuelHud(scene, this.ui, lw, left, right);
    const sw = scene.scale.width;
    const sh = scene.scale.height;
    this.bars = [
      scene.add.rectangle(0, 0, sw, sh / 2, 0x05060a).setOrigin(0, 0),
      scene.add.rectangle(0, sh, sw, sh / 2, 0x05060a).setOrigin(0, 1),
      scene.add.rectangle(0, 0, sw, 2, COLOR.gold).setOrigin(0, 1),
      scene.add.rectangle(0, sh, sw, 2, COLOR.gold).setOrigin(0, 0),
    ];
    this.curtain(0);
  }

  /** Curtain bars: 0 drawn back off screen, 1 closed (meeting in the middle). */
  curtain(t: number): void {
    const sh = this.scene.scale.height;
    const half = (sh / 2) * t;
    const [top, bot, topLine, botLine] = this.bars;
    top.setScale(1, Math.max(0.0001, t));
    bot.setScale(1, Math.max(0.0001, t));
    topLine.setY(half).setVisible(t > 0.001 && t < 0.999);
    botLine.setY(sh - half).setVisible(t > 0.001 && t < 0.999);
  }

  /** Shows or hides the pixel screen behind the curtain. */
  reveal(on: boolean): void {
    this.screen.setVisible(on);
    this.matte.setVisible(on);
  }

  setSpeed(s: number): void {
    this.speed = s;
    this.scene.tweens.timeScale = s;
    this.scene.time.timeScale = s;
    this.fx.setSpeed(s);
    this.backdrop.setSpeed(s);
  }

  tick(dtMs: number): void {
    const dt = (dtMs / 1000) * this.speed;
    this.a.tick(dt);
    this.d.tick(dt);
    this.backdrop.tick(dt);
    this.hud.tick(dt);
    let ox = 0;
    let oy = 0;
    if (this.shakeLeft > 0) {
      this.shakeLeft -= dtMs;
      const amp = Math.max(1, Math.round(this.shakePower * Math.min(1, this.shakeLeft / 120)));
      ox = Phaser.Math.Between(-amp, amp);
      oy = Phaser.Math.Between(-amp, amp);
    }
    this.world.setPosition(ox, oy);
    this.screen.clear();
    this.screen.fill(0x05060a);
    this.screen.draw(this.world);
  }

  /** Ghost afterimages of `sprite` every `every` ms until `stopTrails`. */
  trail(sprite: DuelSprite, color: number, every = 45): void {
    this.trails.push(this.scene.time.addEvent({ delay: every, loop: true, callback: () => sprite.ghost(color, 0.55, 200) }));
  }

  stopTrails(): void {
    this.trails.splice(0).forEach((t) => t.remove(false));
  }

  /** Whole-pixel screen shake; `power` 0..1 maps to 1..4 pixels. */
  shake(ms: number, power: number): void {
    this.shakeLeft = Math.max(this.shakeLeft, ms);
    this.shakePower = Math.max(1, Math.round(1 + power * 3));
  }

  destroy(): void {
    this.stopTrails();
    this.setSpeed(1);
    this.fx.clear();
    this.scene.tweens.killAll();
    this.scene.time.removeAllEvents();
    this.world.removeAll(true);
    this.world.setPosition(0, 0);
    this.bars.forEach((b) => b.destroy());
    this.reveal(false);
    this.screen.clear();
  }
}
