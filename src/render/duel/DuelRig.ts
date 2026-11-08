import Phaser from "phaser";
import type { Unit } from "../../engine/types";
import { KITS, RES, type Kit, type PartId, paintRig, partKey, partSpec } from "./duelArt";
import { POSES, type Joints, type PoseId, poseFor } from "./duelPoses";

const rad = Phaser.Math.DegToRad;

/** Hip height of a footman, and the steed's barrel centre, in rig units above the feet. */
const HIP = 44;
const BARREL = 52;
const SHOULDER = -31;
const NECK = -37;

interface SteedLeg {
  img: Phaser.GameObjects.Image;
  base: number;
  phase: number;
}

const FOUR = { far: [17, -21], near: [24, -15] };
const EIGHT = { far: [27, 18, -12, -22], near: [23, 13, -17, -27] };

/**
 * One chessman in the duel: a puppet of painted parts hinged at hip, shoulders, neck and grip
 * (and for the Shadow Knight and Sacred Queen, a steed under a seated rider). Poses tween the
 * joint table `j`; `tick` adds breathing, the run cycle and the gallop on top every frame.
 * The rig is drawn facing right in rig units; `face` mirrors it and `k` scales units to pixels.
 */
export class DuelRig {
  readonly root: Phaser.GameObjects.Container;
  readonly j: Joints;
  readonly kit: Kit;
  readonly imgs: Phaser.GameObjects.Image[] = [];
  private readonly shadow: Phaser.GameObjects.Image;
  private body!: Phaser.GameObjects.Container;
  private steed: Phaser.GameObjects.Container | null = null;
  private legF: Phaser.GameObjects.Image | null = null;
  private legB: Phaser.GameObjects.Image | null = null;
  private armF!: Phaser.GameObjects.Container;
  private armB!: Phaser.GameObjects.Container;
  private grip!: Phaser.GameObjects.Container;
  private weapon!: Phaser.GameObjects.Image;
  private head!: Phaser.GameObjects.Image;
  private cape: Phaser.GameObjects.Image | null = null;
  private neck: Phaser.GameObjects.Image | null = null;
  private tail: Phaser.GameObjects.Image | null = null;
  private sLegs: SteedLeg[] = [];
  private t = Math.random() * 10;
  private tint = 0xffffff;
  private ghosts = 0;
  /** Set once the rig has shattered: its parts fly free and `tick` stops posing them. */
  broken = false;

  constructor(private scene: Phaser.Scene, parent: Phaser.GameObjects.Container, readonly unit: Unit, readonly k: number, x: number, y: number, face: 1 | -1) {
    this.kit = KITS[unit.type];
    paintRig(scene, unit);
    this.j = { ...POSES.idle, face } as Joints;
    Object.assign(this.j, poseFor(this.kit, "idle"));
    this.j.face = face;
    this.root = scene.add.container(x, y);
    this.shadow = scene.add.image(0, 0, "dfx-shadow").setScale(this.kit.mount ? 1.25 : 0.62, 0.32);
    this.root.add(this.shadow);
    if (this.kit.mount) this.buildMounted();
    else this.buildFoot();
    parent.add(this.root);
    this.tick(0);
  }

  private part(id: PartId, x: number, y: number): Phaser.GameObjects.Image {
    const spec = partSpec(id, this.kit);
    const img = this.scene.add.image(x, y, partKey(this.unit, id)).setOrigin(spec.ox / spec.w, spec.oy / spec.h).setScale(1 / RES);
    this.imgs.push(img);
    return img;
  }

  private buildArms(): void {
    this.armB = this.scene.add.container(-3, SHOULDER);
    this.armB.add(this.part("armB", 0, 0));
    if (this.kit.offhand !== "none") this.armB.add(this.part("offhand", 0, 26));
    this.armF = this.scene.add.container(4, SHOULDER);
    this.grip = this.scene.add.container(0, 26);
    this.weapon = this.part("weapon", 0, 0);
    this.grip.add(this.weapon);
    this.armF.add([this.part("armF", 0, 0), this.grip]);
  }

  private buildUpper(legs: Phaser.GameObjects.GameObject[]): Phaser.GameObjects.GameObject[] {
    this.buildArms();
    this.cape = this.kit.cape ? this.part("cape", -4, SHOULDER - 1) : null;
    this.head = this.part("head", 0, NECK);
    const back: Phaser.GameObjects.GameObject[] = this.cape ? [this.cape, this.armB] : [this.armB];
    return [...back, ...legs, this.part("torso", 0, 0), this.head, this.armF];
  }

  private buildFoot(): void {
    this.body = this.scene.add.container(0, -HIP);
    this.legB = this.part("legB", -3, 0);
    this.legF = this.part("legF", 3, 0);
    this.body.add(this.buildUpper([this.legB, this.legF]));
    this.root.add(this.body);
  }

  private buildMounted(): void {
    const steed = this.scene.add.container(0, -BARREL);
    const layout = this.kit.mount === 8 ? EIGHT : FOUR;
    const leg = (id: "sLegF" | "sLegB", x: number, i: number): Phaser.GameObjects.Image => {
      const img = this.part(id, x, 10);
      this.sLegs.push({ img, base: x > 0 ? -6 : 6, phase: i * (this.kit.mount === 8 ? 0.8 : 1.6) + (x > 0 ? 0 : Math.PI) });
      return img;
    };
    const far = layout.far.map((x, i) => leg("sLegB", x, i * 2));
    this.tail = this.part("tail", -34, -8);
    this.neck = this.part("neck", 31, -8);
    this.body = this.scene.add.container(-3, -15);
    const riderLeg = this.part("legF", 2, 0).setRotation(rad(-58));
    this.body.add(this.buildUpper([riderLeg]));
    const near = layout.near.map((x, i) => leg("sLegF", x, i * 2 + 1));
    steed.add([...far, this.tail, this.part("steed", 0, 0), this.neck, this.body, ...near]);
    this.steed = steed;
    this.root.add(steed);
  }

  /** Advances breathing, run and gallop by `dt` seconds of duel time and re-poses every joint. */
  tick(dt: number): void {
    if (this.broken) return;
    this.t += dt;
    const { j, t } = this;
    const lift = j.y - j.air;
    const br = Math.sin(t * 2.4) * j.breath;
    const s = this.k * this.kit.scale;
    this.root.setScale(j.face * s * (1 + (1 - j.squash) * 0.6), s * j.squash);
    const moving = j.run + j.gait;
    if (this.steed) {
      const ph = t * 17;
      this.steed.setPosition(j.x, -BARREL + lift - Math.abs(Math.sin(ph)) * 5 * j.gait + br * 0.4).setRotation(rad(j.rear + Math.sin(ph) * 2.5 * j.gait));
      this.sLegs.forEach((l) => l.img.setRotation(rad(l.base + Math.sin(ph + l.phase) * 44 * j.gait + j.legF * 0.4)));
      this.neck!.setRotation(rad(j.neck + Math.sin(ph) * 6 * j.gait + br * 1.6));
      this.tail!.setRotation(rad(Math.sin(t * 3) * 6 - j.gait * 22));
      this.body.setPosition(-3, -15 + br * 0.5 + Math.abs(Math.sin(ph + 0.6)) * 2.5 * j.gait).setRotation(rad(j.lean));
    } else {
      const sw = Math.sin(t * 15) * j.run;
      this.body.setPosition(j.x, -HIP + lift + br * 0.7 - Math.abs(sw) * 3).setRotation(rad(j.lean));
      this.legF!.setRotation(rad(j.legF + sw * 38));
      this.legB!.setRotation(rad(j.legB - sw * 38));
    }
    this.armF.setRotation(rad(j.armF + br * 2));
    this.armB.setRotation(rad(j.armB - br * 1.5 + (this.steed ? 0 : Math.sin(t * 15) * 18 * j.run)));
    this.grip.setRotation(rad(j.wpn));
    this.head.setRotation(rad(j.head + br * 1.2));
    this.cape?.setRotation(rad(j.cape + Math.sin(t * 3.1) * 4 + moving * 34 + Math.sin(t * 19) * 5 * moving));
    this.shadow.setPosition(j.x * 0.5, 0).setAlpha(Phaser.Math.Clamp(0.55 - j.air / 160, 0.12, 0.55)).setScale((this.kit.mount ? 1.25 : 0.62) * (1 - Math.min(j.air, 120) / 240), 0.32);
  }

  /** The joint values of `pose` for this chessman (polearms and riders hold their weapons differently). */
  pose(id: PoseId): Partial<Joints> {
    return poseFor(this.kit, id);
  }

  /** Lifts the rig off the floor: the shadow stays down, the body rises by `units`. */
  set lift(units: number) {
    this.j.air = units;
  }

  get facing(): 1 | -1 {
    return this.j.face >= 0 ? 1 : -1;
  }

  /** Tints the whole rig (terrain light) or fills it with a flash colour; null restores the tint. */
  setAmbient(tint: number): void {
    this.tint = tint;
    this.imgs.forEach((i) => i.setTint(tint));
  }

  flash(color: number | null): void {
    this.imgs.forEach((i) => (color === null ? i.setTint(this.tint) : i.setTintFill(color)));
  }

  /** World position of the weapon's far end (blade tip, spear point, orb). */
  tip(): Phaser.Math.Vector2 {
    const spec = partSpec("weapon", this.kit);
    const m = this.weapon.getWorldTransformMatrix();
    const p = m.transformPoint(0, (spec.h - spec.oy) * RES * 0.92);
    return new Phaser.Math.Vector2(p.x, p.y);
  }

  /** World position of the chest: where blows land. */
  chest(): Phaser.Math.Vector2 {
    const up = (this.kit.mount ? 84 : 62) * this.kit.scale * this.k;
    return new Phaser.Math.Vector2(this.root.x, this.root.y + (this.j.y - this.j.air) * this.k * this.kit.scale - up);
  }

  /** Distance from the rig's feet at which it reaches the foe with its weapon, in pixels. */
  reach(): number {
    const onFoot = this.kit.thrusts ? 74 : 58;
    const units = this.kit.mount ? 96 : onFoot;
    return units * this.kit.scale * this.k;
  }

  /** A frozen, tinted copy of the rig as it stands now, fading out behind it: motion trails. */
  ghost(color: number, alpha: number, ms: number): void {
    const parent = this.root.parentContainer;
    if (!parent || this.ghosts >= 5) return;
    this.ghosts++;
    const g = new DuelRig(this.scene, parent, this.unit, this.k, this.root.x, this.root.y, this.facing);
    Object.assign(g.j, this.j);
    g.t = this.t;
    g.tick(0);
    g.root.setRotation(this.root.rotation);
    g.shadow.setVisible(false);
    g.imgs.forEach((i) => i.setTintFill(color));
    g.root.setAlpha(alpha).setBlendMode(Phaser.BlendModes.ADD);
    parent.moveBelow(g.root, this.root);
    this.scene.tweens.add({ targets: g.root, alpha: 0, duration: ms, ease: "Quad.Out", onComplete: () => {
        this.ghosts--;
        g.root.destroy(true);
      },
    });
  }

  /**
   * Breaks the rig apart: every painted part flies off on its own arc and spins out, in the
   * part's own local space, so a mirrored rig scatters the right way round. `power` scales it.
   */
  shatter(power: number, ms: number): void {
    this.broken = true;
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: ms * 0.6 });
    this.imgs.forEach((img) => {
      const x0 = img.x;
      const y0 = img.y;
      const r0 = img.rotation;
      const vx = Phaser.Math.Between(-110, 40) * power;
      const vy = -Phaser.Math.Between(30, 120) * power;
      const spin = rad(Phaser.Math.Between(-620, 620));
      const g = 300 * power;
      this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: ms * Phaser.Math.FloatBetween(0.75, 1.1),
        onUpdate: (tw) => {
          const p = tw.getValue() ?? 0;
          img.setPosition(x0 + vx * p, y0 + vy * p + g * p * p).setRotation(r0 + spin * p).setAlpha(1 - p * p);
        },
      });
    });
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.j);
    this.root.destroy(true);
  }
}
