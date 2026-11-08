import Phaser from "phaser";
import type { UnitType } from "../../engine/types";
import { duelSound } from "./duelSound";
import type { DuelRun } from "./duelRun";
import type { DuelSprite } from "./DuelSprite";
import { FLOOR_Y } from "./pixel/painter";
import type { FrameId } from "./pixel/sheet";
import { factionTint, type DuelStage } from "./DuelStage";

export interface Ctx {
  s: DuelStage;
  r: DuelRun;
}

const GOLD = 0xffe08a;
const WHITE = 0xffffff;
const HOLY = 0xfff4c8;
const TAU = Math.PI * 2;

export const moveTo = (c: Ctx, sp: DuelSprite, x: number, ms: number, ease = "Sine.InOut"): void => {
  c.r.tween({ targets: sp, x: Math.round(x), duration: ms, ease });
};

/** A ballistic hop of `sp` to `toX`, `peak` pixels high; the shadow stays on the floor. */
const arc = (c: Ctx, sp: DuelSprite, toX: number, peak: number, ms: number): Promise<void> => {
  const x0 = sp.x;
  return c.r.counter(ms, (p) => {
    sp.x = x0 + (toX - x0) * p;
    sp.air = 4 * peak * p * (1 - p);
  });
};

/** Shows `frames` one after another, `ms` apart (a hand-timed sprite sequence). */
const seq = async (c: Ctx, sp: DuelSprite, frames: FrameId[], ms: number): Promise<void> => {
  for (const f of frames) {
    sp.set(f);
    await c.r.wait(ms);
  }
};

/** Where the attacker stands to land a blow on the defender. */
const contact = (c: Ctx, scale = 1): number => Math.round(c.s.d.x - c.s.dir * c.s.a.reach() * scale);

/**
 * A blow landing on the defender: white flash, hit sparks and burst, slash, shake, screen flash,
 * health drain, hit-stop, then the defender's hit frame and knockback. `power` 0..1.
 */
export const impact = async (c: Ctx, power: number, final: boolean, slash: boolean, at?: Phaser.Math.Vector2): Promise<void> => {
  const { s, r } = c;
  const d = s.d;
  const p = at ?? d.chest();
  d.flash(WHITE);
  d.set("hit");
  s.fx.play("impact", p.x, p.y, { fps: 20 });
  s.fx.play("spark", p.x + s.dir * 4, p.y - 3, { fps: 20 });
  if (slash) s.fx.play("slash", p.x - s.dir * 6, p.y - 4, { fps: 22, flipX: s.dir < 0 });
  s.fx.bitsAt(p.x, p.y, [0xfff0c0, factionTint(d.unit)], Math.round(8 + power * 18));
  duelSound.hit(power);
  s.shake(120 + power * 260, power);
  s.hud.flash(WHITE, 0.15 + power * 0.4, 140);
  s.hp = final ? 0 : Math.max(0.12, s.hp - (0.18 + power * 0.25));
  s.hud.damage(s.dSide, s.hp, 420);
  await r.hitStop(40 + power * 110);
  d.flash(final ? 0xff5a5a : null);
  r.tween({ targets: d, x: d.x + s.dir * Math.round(3 + power * 8), duration: 140, ease: "Quad.Out" });
  if (!final) {
    await r.wait(90);
    d.flash(null);
    d.set("guard");
  }
};

const land = (c: Ctx, sp: DuelSprite, heavy: boolean): void => {
  c.s.fx.dust(sp.x, heavy);
  duelSound.step(heavy);
  if (heavy) c.s.shake(140, 0.5);
};

/** Equinox King: crouch, a forward somersault through the air, and a crashing overhead slam. */
const somersaultAssault = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  const a = s.a;
  s.d.set("guard");
  a.set("crouch");
  const ch = a.chest();
  s.fx.gather(ch.x, ch.y, GOLD, 14, r.ms(400));
  duelSound.charge(r.ms(400));
  await r.wait(400);
  duelSound.whoosh(0.3, 0.4);
  duelSound.spin();
  s.trail(a, GOLD);
  a.set("special");
  r.tween({ targets: a.img, rotation: s.dir * TAU, duration: 380, ease: "Sine.InOut" });
  const hop = arc(c, a, contact(c, 0.8), 46, 520);
  await r.wait(380);
  a.img.setRotation(0);
  a.set("windup");
  await r.wait(90);
  r.slow(0.3);
  a.set("attack0");
  await hop;
  a.set("attack1");
  s.stopTrails();
  land(c, a, true);
  await impact(c, 1, true, true);
  r.normal();
  await r.wait(160);
};

/** Sacred Queen: the eight-legged steed rears, then gallops through the foe with three cuts on the pass. */
const eightLeggedGallop = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  const a = s.a;
  s.d.set("guard");
  a.set("special");
  duelSound.neigh();
  s.fx.dust(a.x, false);
  await r.wait(420);
  a.run(14);
  duelSound.gallop(12, r.ms(640));
  s.hud.speed(true, s.dir);
  s.trail(a, 0xd8c8ff, 40);
  moveTo(c, a, s.d.x + s.dir * Math.round(s.w * 0.24), 640, "Sine.In");
  s.backdrop.push(s.dir * 30);
  await r.wait(230);
  const cuts: FrameId[] = ["attack0", "windup", "attack1"];
  for (let i = 0; i < cuts.length; i++) {
    a.set(cuts[i]);
    duelSound.slash();
    const last = i === cuts.length - 1;
    if (last) r.slow(0.3);
    await impact(c, last ? 1 : 0.4, last, true);
    a.run(14);
    if (!last) await r.wait(50);
  }
  r.normal();
  s.hud.speed(false);
  s.stopTrails();
  await r.wait(160);
  a.set("crouch");
  s.fx.dust(a.x, false);
  await r.wait(160);
};

/** Twilight Fortress: three heavy strides, a rune stamped round the foe, a pillar from each corner, then the hammer. */
const fourCornersFortnight = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  const a = s.a;
  s.d.set("guard");
  const start = a.x;
  const end = contact(c, 1);
  for (let i = 0; i < 3; i++) {
    a.set(i % 2 ? "walk2" : "walk0");
    moveTo(c, a, start + ((end - start) * (i + 1)) / 3, 170, "Sine.InOut");
    await r.wait(120);
    a.set(i % 2 ? "walk3" : "walk1");
    await r.wait(60);
    land(c, a, false);
    s.shake(80, 0.2);
    await r.wait(70);
  }
  a.set("windup");
  const ch = a.chest();
  s.fx.gather(ch.x, ch.y - 10, 0xffd27a, 14, r.ms(380));
  duelSound.charge(r.ms(380));
  const dx = s.d.x;
  const rune = s.fx.stay("rune", dx, FLOOR_Y + 1, { fps: 10, depthBehind: s.d.img });
  await r.wait(320);
  const corners = [-34, 34, -18, 18];
  const pillars = [];
  for (const off of corners) {
    pillars.push(s.fx.stay("pillar", dx + off, FLOOR_Y + (Math.abs(off) < 30 ? -3 : 2), { anchor: "bottom", fps: 24, depthBehind: Math.abs(off) < 30 ? s.d.img : undefined }));
    s.fx.dust(dx + off, false);
    s.shake(100, 0.35);
    duelSound.step(true);
    await impact(c, 0.25, false, false);
    await r.wait(60);
  }
  r.slow(0.35);
  a.set("attack0");
  await r.wait(60);
  a.set("special");
  duelSound.quake();
  s.fx.play("ring", dx, FLOOR_Y, { fps: 14 });
  s.fx.dust(dx, true);
  await impact(c, 1, true, false);
  r.normal();
  pillars.forEach((p) => s.fx.fadeOut(p, 300));
  s.fx.fadeOut(rune, 300);
  await r.wait(160);
};

/** Light Seer: the staff raised in prayer, a leap into the sky, a pillar of light, and the Seer falls with it. */
const leapOfFaith = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  const a = s.a;
  s.d.set("guard");
  a.set("special");
  duelSound.choir();
  await r.wait(160);
  const tip = a.tip();
  s.fx.gather(tip.x, tip.y, HOLY, 16, r.ms(420));
  s.fx.play("glint", tip.x, tip.y, { fps: 8, hold: 200 });
  await r.wait(380);
  a.set("crouch");
  await r.wait(110);
  duelSound.whoosh(0.3, 0.4);
  s.trail(a, HOLY, 35);
  a.set("air");
  s.fx.dust(a.x, false);
  r.tween({ targets: a, air: 200, duration: 300, ease: "Quad.In" });
  await r.wait(300);
  s.stopTrails();
  a.x = contact(c, 0.5);
  duelSound.beam();
  s.fx.beam(s.d.x, r.ms(1000));
  s.hud.flash(HOLY, 0.3, 300);
  await r.wait(160);
  await impact(c, 0.3, false, false);
  await r.wait(150);
  a.set("windup");
  s.trail(a, HOLY, 35);
  r.tween({ targets: a, air: 0, duration: 220, ease: "Quad.In" });
  await r.wait(150);
  r.slow(0.3);
  a.set("attack0");
  await r.wait(70);
  a.set("attack1");
  s.stopTrails();
  land(c, a, true);
  s.fx.play("impact", s.d.x, FLOOR_Y - 20, { fps: 14, tint: HOLY });
  await impact(c, 1, true, true);
  r.normal();
  await r.wait(180);
};

/**
 * Shadow Knight: wheels round for a run-up, then clears three separate bars one after another
 * (gallop, leap, land) and comes down the last stretch lance-first on the foe.
 */
const tripleBarJump = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  const a = s.a;
  const dir = s.dir;
  s.d.set("guard");
  const end = contact(c, 1);
  const x0 = Math.round(dir > 0 ? Math.max(16, a.x - 70) : Math.min(s.w - 16, a.x + 70));
  a.face = (-dir) as 1 | -1;
  a.run(12);
  duelSound.gallop(4, r.ms(320));
  moveTo(c, a, x0, 320, "Sine.InOut");
  await r.wait(320);
  a.face = dir;
  const span = end - x0;
  const bars = [0.22, 0.48, 0.74].map((f) => Math.round(x0 + span * f));
  const fences = bars.map((x) => s.fx.stay("fence", x, FLOOR_Y + 1, { anchor: "bottom", depthBehind: a.img }));
  bars.forEach((x) => s.fx.dust(x, false));
  duelSound.step(true);
  duelSound.neigh();
  a.set("crouch");
  await r.wait(280);
  s.hud.speed(true, dir);
  s.trail(a, 0x8a7aff, 45);
  const half = Phaser.Math.Clamp(Math.round(Math.abs(span) * 0.09), 10, 18);
  for (let i = 0; i < bars.length; i++) {
    const take = bars[i] - dir * half;
    const runMs = Math.max(60, Math.round(Math.abs(take - a.x) * 3));
    a.run(14);
    duelSound.gallop(3, r.ms(runMs));
    moveTo(c, a, take, runMs, "Linear");
    await r.wait(runMs);
    a.set("air");
    duelSound.whoosh(0.22, 0.3);
    await arc(c, a, bars[i] + dir * half, 32 + i * 3, 320);
    a.set("crouch");
    land(c, a, false);
    duelSound.hoof(i);
    await r.wait(60);
  }
  const homeMs = Math.max(120, Math.round(Math.abs(end - a.x) * 3));
  a.run(14);
  moveTo(c, a, end, homeMs, "Quad.In");
  await r.wait(Math.round(homeMs * 0.6));
  a.set("windup");
  await r.wait(Math.round(homeMs * 0.4));
  r.slow(0.3);
  a.set("attack0");
  await r.wait(60);
  a.set("attack1");
  s.stopTrails();
  s.hud.speed(false);
  await impact(c, 1, true, false, a.tip());
  fences.forEach((f) => s.fx.fadeOut(f, 260));
  r.normal();
  await r.wait(180);
};

/** Nimbus Jumper: two backflips away on puffs of cloud, then a spring forward and a spear thrust. */
const doubleBackFlip = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  const a = s.a;
  s.d.set("guard");
  a.set("crouch");
  await r.wait(120);
  for (let i = 0; i < 2; i++) {
    duelSound.whoosh(0.25, 0.32);
    a.set("special");
    r.tween({ targets: a.img, rotation: -s.dir * TAU, duration: 300, ease: "Sine.InOut" });
    await arc(c, a, a.x - s.dir * 22, 26, 320);
    a.img.setRotation(0);
    a.set("crouch");
    s.fx.play("cloud", a.x, FLOOR_Y - 3, { fps: 10 });
    land(c, a, false);
    await r.wait(90);
  }
  a.set("windup");
  s.fx.gather(a.chest().x, a.chest().y, 0xcfe8ff, 12, r.ms(260));
  duelSound.charge(r.ms(260));
  await r.wait(260);
  duelSound.whoosh(0.2, 0.45);
  s.hud.speed(true, s.dir);
  s.trail(a, 0xbfe0ff, 35);
  a.set("attack0");
  moveTo(c, a, contact(c, 1), 200, "Quad.In");
  await r.wait(170);
  r.slow(0.3);
  a.set("attack1");
  await r.wait(30);
  s.stopTrails();
  s.hud.speed(false);
  await impact(c, 0.9, true, false, a.tip());
  r.normal();
  await r.wait(160);
};

interface ClassicStyle {
  /** Run (mounted, nimble) or march (armoured) to the foe. */
  running: boolean;
  /** Height of a short hop into the blow (0: none). */
  hop: number;
  strikes: number;
  heavy: boolean;
}

/** How each chessman makes its plain chess capture. */
const CLASSIC: Record<UnitType, ClassicStyle> = {
  king: { running: false, hop: 0, strikes: 2, heavy: false },
  queen: { running: true, hop: 0, strikes: 1, heavy: false },
  rook: { running: false, hop: 0, strikes: 1, heavy: true },
  bishop: { running: false, hop: 0, strikes: 2, heavy: false },
  knight: { running: true, hop: 16, strikes: 1, heavy: false },
  pawn: { running: true, hop: 10, strikes: 2, heavy: false },
};

/**
 * The classic chess capture, for orders that used the plain move rather than the upgraded one:
 * the chessman closes in (the pawn's forward-diagonal joust, the knight's trot, the rook's march)
 * and strikes, without the ability's showpiece.
 */
export const classicAttack = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  const a = s.a;
  const st = CLASSIC[a.unit.type];
  s.d.set("guard");
  const end = contact(c, 1);
  const pace = st.running ? 3.4 : 6;
  const ms = Phaser.Math.Clamp(Math.round(Math.abs(end - a.x) * pace), 200, 720);
  a.run(st.running ? 13 : 8);
  if (a.mounted) duelSound.gallop(5, r.ms(ms));
  if (st.hop > 0) {
    const ground = Math.round(ms * 0.7);
    moveTo(c, a, end - s.dir * 22, ground, "Linear");
    await r.wait(ground);
    a.set("air");
    duelSound.whoosh(0.2, 0.3);
    await arc(c, a, end, st.hop, 240);
    a.set("crouch");
    land(c, a, false);
    await r.wait(70);
  } else {
    moveTo(c, a, end, ms, "Sine.InOut");
    for (let i = 0; i < 3; i++) {
      await r.wait(Math.round(ms / 3));
      if (!st.running) duelSound.step(st.heavy);
    }
  }
  for (let i = 0; i < st.strikes; i++) {
    const last = i === st.strikes - 1;
    a.set("windup");
    await r.wait(st.heavy ? 220 : 140);
    if (last) r.slow(0.4);
    a.set("attack0");
    duelSound.slash();
    await r.wait(50);
    a.set("attack1");
    if (st.heavy) s.fx.dust(s.d.x, true);
    await impact(c, last ? 0.9 : 0.4, last, !st.heavy, a.tip());
    if (!last) await r.wait(120);
  }
  r.normal();
  await r.wait(160);
};

/** Each chessman's named Trenchess ability, played when the capture used its upgraded move. */
export const ABILITIES: Record<UnitType, (c: Ctx) => Promise<void>> = {
  king: somersaultAssault,
  queen: eightLeggedGallop,
  rook: fourCornersFortnight,
  bishop: leapOfFaith,
  knight: tripleBarJump,
  pawn: doubleBackFlip,
};

/** Plays a frame list once at a fixed pace (used by the entrance and victory). */
export const sequence = seq;
