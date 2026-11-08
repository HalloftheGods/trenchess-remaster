import Phaser from "phaser";
import type { Unit } from "../../engine/types";
import { FACTIONS } from "../art/unitArt";
import type { DuelRequest } from "./duel";
import { DuelBackdrop, lightOf } from "./duelBackdrop";
import { DuelFx } from "./duelFx";
import { DuelHud } from "./duelHud";
import { DuelRig } from "./DuelRig";
import type { Clocked } from "./duelRun";

export const factionTint = (u: Unit): number => Phaser.Display.Color.HexStringToColor(FACTIONS[u.owner].css).color;

/**
 * Everything one duel draws. The world (backdrop, fighters, effects) sits on the scene's main
 * camera, which zooms, pans and shakes; the HUD sits on a steady UI camera. Sizes come from the
 * screen: `k` is pixels per rig unit, so a footman stands about a third of the screen tall.
 */
export class DuelStage implements Clocked {
  readonly w: number;
  readonly h: number;
  readonly k: number;
  readonly floor: number;
  /** +1 when the attacker stands on the left and faces right. */
  readonly dir: 1 | -1;
  readonly a: DuelRig;
  readonly d: DuelRig;
  readonly aHome: number;
  readonly dHome: number;
  /** Plate index of each side (plates are ordered left, right). */
  readonly aSide: 0 | 1;
  readonly dSide: 0 | 1;
  readonly fx: DuelFx;
  readonly hud: DuelHud;
  readonly backdrop: DuelBackdrop;
  readonly cam: Phaser.Cameras.Scene2D.Camera;
  readonly back: Phaser.GameObjects.Container;
  readonly actors: Phaser.GameObjects.Container;
  readonly front: Phaser.GameObjects.Container;
  speed = 1;
  private trails: Phaser.Time.TimerEvent[] = [];
  /** Health left on the defender's plate. */
  hp = 1;
  outcomeShown = false;

  constructor(readonly scene: Phaser.Scene, readonly world: Phaser.GameObjects.Container, readonly ui: Phaser.GameObjects.Container, readonly req: DuelRequest) {
    this.w = scene.scale.width;
    this.h = scene.scale.height;
    this.k = Math.max(1, Math.min(this.h * 0.0042, this.w * 0.003));
    this.cam = scene.cameras.main;
    this.cam.setZoom(1).setScroll(0, 0);
    this.back = scene.add.container(0, 0);
    this.actors = scene.add.container(0, 0);
    this.front = scene.add.container(0, 0);
    world.add([this.back, this.actors, this.front]);
    this.backdrop = new DuelBackdrop(scene, this.back, this.front, req.terrain, this.w, this.h, this.k);
    this.floor = this.backdrop.floorY;
    this.dir = req.attackerOwner === 0 ? 1 : -1;
    const gap = (u: Unit): number => Math.max(this.w * 0.16, 64 * this.k) + (u.type === "knight" || u.type === "queen" ? 26 * this.k : 0);
    this.aHome = this.w / 2 - this.dir * gap(req.attacker);
    this.dHome = this.w / 2 + this.dir * gap(req.defender);
    this.d = new DuelRig(scene, this.actors, req.defender, this.k, this.dHome, this.floor, (-this.dir) as 1 | -1);
    this.a = new DuelRig(scene, this.actors, req.attacker, this.k, this.aHome, this.floor, this.dir);
    const light = lightOf(req.terrain);
    this.a.setAmbient(light);
    this.d.setAmbient(light);
    this.fx = new DuelFx(scene, this.actors, this.k);
    this.aSide = this.dir > 0 ? 0 : 1;
    this.dSide = this.dir > 0 ? 1 : 0;
    const [left, right] = this.dir > 0 ? [req.attacker, req.defender] : [req.defender, req.attacker];
    this.hud = new DuelHud(scene, ui, this.w, this.h, left, right);
    if (scene.sys.renderer.type === Phaser.WEBGL && this.cam.postFX) this.cam.postFX.addVignette(0.5, 0.5, 0.92, 0.38);
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
    this.hud.tick(dtMs / 1000);
  }

  /** Ghost copies of `rig` dropped every `every` ms until `stopTrails`. */
  trail(rig: DuelRig, color: number, every = 50): void {
    this.trails.push(this.scene.time.addEvent({ delay: every, loop: true, callback: () => rig.ghost(color, 0.22, 200) }));
  }

  stopTrails(): void {
    this.trails.splice(0).forEach((t) => t.remove(false));
  }

  /** Shakes the world camera; `power` 0..1. */
  shake(ms: number, power: number): void {
    this.cam.shake(ms, 0.003 + power * 0.014, true);
  }

  destroy(): void {
    this.stopTrails();
    this.setSpeed(1);
    this.fx.clear();
    this.cam.resetFX();
    this.cam.postFX?.clear();
    this.cam.setZoom(1).setScroll(0, 0);
    this.scene.tweens.killAll();
    this.scene.time.removeAllEvents();
    this.world.removeAll(true);
    this.ui.removeAll(true);
    this.world.setAlpha(1);
  }
}
