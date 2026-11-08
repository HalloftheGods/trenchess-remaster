import Phaser from "phaser";
import type { UnitType } from "../../engine/types";
import { duelSound } from "./duelSound";
import type { DuelRig } from "./DuelRig";
import type { DuelRun } from "./duelRun";
import type { PoseId } from "./duelPoses";
import { factionTint, type DuelStage } from "./DuelStage";

export interface Ctx {
  s: DuelStage;
  r: DuelRun;
}

const GOLD = 0xffe08a;
const WHITE = 0xffffff;
const HOLY = 0xfff4c8;

const ANGLES = ["armF", "armB", "legF", "legB", "wpn", "head"] as const;
const wrap180 = (d: number): number => ((((d + 180) % 360) + 360) % 360) - 180;

/** Tweens `rig` into pose `id`; every limb takes the short way round to its new angle. */
export const pose = (c: Ctx, rig: DuelRig, id: PoseId, ms: number, ease = "Sine.InOut", extra: Record<string, number> = {}): void => {
  const target: Record<string, number> = { ...rig.pose(id), ...extra } as Record<string, number>;
  for (const a of ANGLES) if (a in target) target[a] = rig.j[a] + wrap180(target[a] - rig.j[a]);
  c.r.tween({ targets: rig.j, ...target, duration: ms, ease });
};

export const moveTo = (c: Ctx, rig: DuelRig, x: number, ms: number, ease = "Sine.InOut"): void => {
  c.r.tween({ targets: rig.root, x, duration: ms, ease });
};

/** A ballistic hop of `rig` to `toX`, `peak` rig units high; the shadow stays on the floor. */
const arc = (c: Ctx, rig: DuelRig, toX: number, peak: number, ms: number, onP?: (p: number) => void): Promise<void> => {
  const x0 = rig.root.x;
  return c.r.counter(ms, (p) => {
    rig.root.x = x0 + (toX - x0) * p;
    rig.lift = 4 * peak * p * (1 - p);
    onP?.(p);
  });
};

/** Where the attacker stands to land a blow on the defender. */
const contact = (c: Ctx, scale = 1): number => c.s.d.root.x - c.s.dir * c.s.a.reach() * scale;

/**
 * A blow landing on the defender: flash, sparks, slash arc, shake, zoom punch, health drain,
 * hit-stop, then the flinch. `power` 0..1 scales everything; `final` empties the health bar.
 */
export const impact = async (c: Ctx, power: number, final: boolean, slashAngle: number | null, at?: Phaser.Math.Vector2): Promise<void> => {
  const { s, r } = c;
  const d = s.d;
  const p = at ?? d.chest();
  d.flash(WHITE);
  s.fx.star(p.x, p.y, WHITE, 40 + power * 60);
  s.fx.sparksAt(p.x, p.y, 0xfff0c0, Math.round(10 + power * 26));
  s.fx.sparksAt(p.x, p.y, factionTint(d.unit), 8);
  if (slashAngle !== null) s.fx.slash(p.x, p.y, slashAngle, s.dir < 0, WHITE, 90 + power * 70);
  if (power > 0.6) s.fx.ring(p.x, p.y, WHITE, 70 + power * 50, false);
  duelSound.hit(power);
  s.shake(140 + power * 240, power);
  s.hud.flash(WHITE, 0.12 + power * 0.3, 180);
  s.hp = final ? 0 : Math.max(0.12, s.hp - (0.18 + power * 0.25));
  s.hud.damage(s.dSide, s.hp, 420);
  const z = 1.04 + power * 0.08;
  s.cam.setZoom(z);
  r.tween({ targets: s.cam, zoom: 1, duration: 260 + power * 200, ease: "Quad.Out" });
  await r.hitStop(36 + power * 100);
  d.flash(final ? 0xff6060 : null);
  pose(c, d, "hit", 90, "Quad.Out");
  c.r.tween({ targets: d.root, x: d.root.x + s.dir * (5 + power * 16) * s.k, duration: 160, ease: "Quad.Out" });
  if (!final) {
    await r.wait(60);
    pose(c, d, "guard", 200);
  }
};

const landing = (c: Ctx, rig: DuelRig, heavy: boolean): void => {
  const { s, r } = c;
  s.fx.dustAt(rig.root.x, s.floor, 0xd8d0c0, heavy ? 12 : 6);
  if (heavy) s.fx.ring(rig.root.x, s.floor, WHITE, 120, true);
  duelSound.step(heavy);
  rig.j.squash = heavy ? 0.82 : 0.9;
  r.tween({ targets: rig.j, squash: 1, duration: 200, ease: "Back.Out" });
};

/** Equinox King: a crouch, a forward somersault through the air and a crashing two-handed slam. */
const somersaultAssault = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  const a = s.a;
  pose(c, s.d, "guard", 200);
  pose(c, a, "crouch", 200, "Quad.Out");
  const ch = a.chest();
  s.fx.gather(ch.x, ch.y, GOLD, 16, r.ms(420));
  duelSound.charge(r.ms(420));
  await r.wait(400);
  duelSound.whoosh(0.3, 0.4);
  duelSound.spin();
  s.trail(a, GOLD, 40);
  pose(c, a, "tuck", 140, "Quad.Out");
  const lean0 = a.j.lean;
  r.tween({ targets: a.j, lean: lean0 + 360, duration: 380, ease: "Sine.InOut" });
  const hop = arc(c, a, contact(c, 0.85), 72, 520);
  await r.wait(380);
  a.j.lean -= 360;
  pose(c, a, "windup", 100, "Quad.Out");
  await r.wait(100);
  r.slow(0.3);
  pose(c, a, "strike", 60, "Quad.In");
  await hop;
  s.stopTrails();
  landing(c, a, true);
  const tip = a.tip();
  s.fx.slash(tip.x, tip.y - 30 * s.k, s.dir > 0 ? 40 : -40, s.dir < 0, GOLD, 170);
  await impact(c, 1, true, null);
  r.normal();
  pose(c, a, "followThrough", 160, "Quad.Out");
  await r.wait(160);
};

/** Sacred Queen: the eight-legged steed rears, then gallops straight through the foe, three cuts on the pass. */
const eightLeggedGallop = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  const a = s.a;
  pose(c, s.d, "guard", 200);
  r.tween({ targets: a.j, rear: -26, neck: -28, armF: 186, wpn: -10, duration: 240, ease: "Quad.Out" });
  duelSound.neigh();
  s.fx.dustAt(a.root.x, s.floor, 0xe8e0d0, 6);
  await r.wait(380);
  r.tween({ targets: a.j, rear: 6, neck: 10, gait: 1, lean: 16, armF: 160, wpn: -22, duration: 160, ease: "Quad.In" });
  duelSound.gallop(12, r.ms(640));
  s.hud.speed(true, s.dir);
  s.trail(a, 0xd8c8ff, 34);
  moveTo(c, a, s.d.root.x + s.dir * s.w * 0.24, 640, "Sine.In");
  s.backdrop.push(s.dir * 40 * s.k);
  await r.wait(250);
  const cuts: [number, number][] = [[296, -30], [170, 25], [300, -40]];
  for (let i = 0; i < cuts.length; i++) {
    const [arm, ang] = cuts[i];
    r.tween({ targets: a.j, armF: arm, wpn: arm > 200 ? 0 : -20, duration: 50, ease: "Quad.In" });
    duelSound.slash();
    const last = i === cuts.length - 1;
    if (last) r.slow(0.3);
    await impact(c, last ? 1 : 0.4, last, ang);
    if (!last) await r.wait(40);
  }
  r.normal();
  s.hud.speed(false);
  s.stopTrails();
  r.tween({ targets: a.j, gait: 0.2, rear: -12, neck: -14, armF: 300, duration: 300, ease: "Quad.Out" });
  s.fx.dustAt(a.root.x, s.floor, 0xe8e0d0, 10);
  await r.wait(200);
};

/** Twilight Fortress: three heavy strides, a rune stamped round the foe, a pillar from each corner, then the hammer. */
const fourCornersFortnight = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  const a = s.a;
  pose(c, s.d, "guard", 200);
  const start = a.root.x;
  const end = contact(c, 1);
  for (let i = 0; i < 3; i++) {
    const fwd = i % 2 === 0;
    r.tween({ targets: a.j, legF: fwd ? -32 : 10, legB: fwd ? 18 : -26, lean: 10, y: -3, duration: 150, ease: "Sine.Out" });
    moveTo(c, a, start + ((end - start) * (i + 1)) / 3, 180, "Sine.InOut");
    await r.wait(170);
    a.j.y = 0;
    landing(c, a, false);
    s.shake(90, 0.25);
    await r.wait(60);
  }
  pose(c, a, "windup", 240, "Quad.Out");
  const ch = a.chest();
  s.fx.gather(ch.x, ch.y, 0xffd27a, 14, r.ms(380));
  duelSound.charge(r.ms(380));
  const dx = s.d.root.x;
  s.fx.rune(dx, s.floor, GOLD, 300, r.ms(1300));
  await r.wait(320);
  const corners = [-1, 1, -0.45, 0.45];
  for (const f of corners) {
    s.fx.pillar(dx + f * 64 * s.k, s.floor + (Math.abs(f) < 1 ? -6 : 4) * s.k, WHITE, Math.abs(f) < 1 ? 92 : 120, r.ms(640));
    s.shake(110, 0.4);
    duelSound.step(true);
    await impact(c, 0.25, false, null);
    await r.wait(70);
  }
  r.slow(0.35);
  pose(c, a, "strike", 70, "Quad.In");
  await r.wait(70);
  duelSound.quake();
  s.fx.ring(dx, s.floor, GOLD, 240, true);
  s.fx.dustAt(dx, s.floor, 0xc8c0b0, 16);
  await impact(c, 1, true, null);
  r.normal();
  pose(c, a, "followThrough", 160, "Quad.Out");
  await r.wait(160);
};

/** Light Seer: the staff raised in prayer, a leap into the sky, a pillar of light, and the Seer falls with it. */
const leapOfFaith = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  const a = s.a;
  pose(c, s.d, "guard", 200);
  pose(c, a, "raise", 280, "Quad.Out");
  duelSound.choir();
  await r.wait(200);
  const tip = a.tip();
  s.fx.glow(tip.x, tip.y, HOLY, 120, r.ms(900));
  s.fx.gather(tip.x, tip.y, HOLY, 18, r.ms(420));
  await r.wait(320);
  pose(c, a, "crouch", 110, "Quad.Out");
  await r.wait(110);
  duelSound.whoosh(0.3, 0.4);
  s.trail(a, HOLY, 30);
  pose(c, a, "tuck", 120);
  r.tween({ targets: a.j, air: 320, duration: 300, ease: "Quad.In" });
  landing(c, a, false);
  await r.wait(300);
  s.stopTrails();
  a.root.x = contact(c, 0.55);
  duelSound.beam();
  s.fx.beam(s.d.root.x, s.floor, HOLY, 80, r.ms(1000));
  s.hud.flash(HOLY, 0.25, 360);
  await r.wait(160);
  await impact(c, 0.3, false, null);
  await r.wait(160);
  pose(c, a, "windup", 1);
  s.trail(a, HOLY, 30);
  r.tween({ targets: a.j, air: 0, duration: 220, ease: "Quad.In" });
  await r.wait(150);
  r.slow(0.3);
  pose(c, a, "strike", 70, "Quad.In");
  await r.wait(70);
  s.stopTrails();
  landing(c, a, true);
  s.fx.star(s.d.root.x, s.floor - 30 * s.k, HOLY, 200, 520);
  await impact(c, 1, true, 30);
  r.normal();
  pose(c, a, "followThrough", 160, "Quad.Out");
  await r.wait(180);
};

/** Shadow Knight: three bounding leaps over a triple bar, the last one coming down lance-first on the foe. */
const tripleBarJump = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  const a = s.a;
  pose(c, s.d, "guard", 200);
  const x0 = a.root.x;
  const end = contact(c, 0.9);
  const span = end - x0;
  const fences = [0.2, 0.52, 0.84].map((f) => s.fx.fence(x0 + span * f, s.floor + 2 * s.k, 34 + f * 16, s.dir < 0));
  duelSound.neigh();
  pose(c, a, "thrustReady", 220);
  r.tween({ targets: a.j, gait: 1, rear: 4, duration: 200 });
  await r.wait(260);
  s.hud.speed(true, s.dir);
  s.trail(a, 0x8a7aff, 40);
  const stops = [0.36, 0.68, 1];
  for (let i = 0; i < 3; i++) {
    const to = x0 + span * stops[i];
    duelSound.whoosh(0.22, 0.3);
    r.tween({ targets: a.j, rear: -18, neck: -16, duration: 110, ease: "Quad.Out" });
    r.tween({ targets: a.j, rear: 12, neck: 10, delay: 170, duration: 140, ease: "Quad.In" });
    const last = i === 2;
    if (last) {
      r.tween({ targets: a.j, ...a.pose("thrust"), delay: 160, duration: 90, ease: "Quad.In" });
    }
    const hop = arc(c, a, to, 44 + i * 18, last ? 360 : 300);
    if (last) {
      await r.wait(220);
      r.slow(0.3);
    }
    await hop;
    s.fx.dropFence(fences[i]);
    landing(c, a, last);
    duelSound.hoof(i);
  }
  s.stopTrails();
  s.hud.speed(false);
  await impact(c, 1, true, null);
  r.normal();
  r.tween({ targets: a.j, gait: 0, rear: -10, duration: 260 });
  await r.wait(180);
};

/** Nimbus Jumper: two backflips away on puffs of cloud, then a spring forward and a spear thrust. */
const doubleBackFlip = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  const a = s.a;
  pose(c, s.d, "guard", 200);
  pose(c, a, "crouch", 120, "Quad.Out");
  await r.wait(120);
  for (let i = 0; i < 2; i++) {
    duelSound.whoosh(0.25, 0.32);
    pose(c, a, "tuck", 120, "Quad.Out");
    const lean0 = a.j.lean;
    r.tween({ targets: a.j, lean: lean0 - 360, duration: 300, ease: "Sine.InOut" });
    await arc(c, a, a.root.x - s.dir * 30 * s.k, 50, 320);
    a.j.lean += 360;
    pose(c, a, "crouch", 80, "Quad.Out");
    s.fx.dustAt(a.root.x, s.floor, 0xffffff, 8);
    landing(c, a, false);
    await r.wait(80);
  }
  pose(c, a, "thrustReady", 160, "Quad.Out");
  s.fx.gather(a.chest().x, a.chest().y, 0xcfe8ff, 12, r.ms(260));
  duelSound.charge(r.ms(260));
  await r.wait(260);
  duelSound.whoosh(0.2, 0.45);
  s.hud.speed(true, s.dir);
  s.trail(a, 0xbfe0ff, 30);
  r.tween({ targets: a.j, ...a.pose("thrust"), run: 0.4, duration: 180, ease: "Quad.In" });
  moveTo(c, a, contact(c, 1), 200, "Quad.In");
  await r.wait(170);
  r.slow(0.3);
  await r.wait(30);
  s.stopTrails();
  s.hud.speed(false);
  const tip = a.tip();
  await impact(c, 0.9, true, null, tip);
  r.normal();
  r.tween({ targets: a.j, run: 0, duration: 120 });
  pose(c, a, "followThrough", 140, "Quad.Out");
  await r.wait(160);
};

/** Each chessman's classic ability, played as its attack. */
export const ABILITIES: Record<UnitType, (c: Ctx) => Promise<void>> = {
  king: somersaultAssault,
  queen: eightLeggedGallop,
  rook: fourCornersFortnight,
  bishop: leapOfFaith,
  knight: tripleBarJump,
  pawn: doubleBackFlip,
};
