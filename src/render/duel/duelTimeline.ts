import Phaser from "phaser";
import { UNIT_LORE } from "../../game/lore";
import type { DuelMode } from "./duel";
import { ABILITIES, moveTo, type Ctx } from "./duelAbilities";
import { duelSound } from "./duelSound";
import { factionTint, type DuelStage } from "./DuelStage";

/** Tempo of each mode: "full" plays every beat (≈ 4 s), "fast" the attack alone at speed (≈ 1.5 s). */
const TEMPO: Record<DuelMode, number> = { off: 0, fast: 0.6, full: 1 };

export const tempoOf = (mode: DuelMode): number => TEMPO[mode];

/** A plain scene tween as a promise: for the curtain, which must play even after a skip. */
const animate = (scene: Phaser.Scene, ms: number, fn: (p: number) => void, ease = "Cubic.Out"): Promise<void> =>
  new Promise((resolve) => {
    scene.tweens.addCounter({ from: 0, to: 1, duration: ms, ease, onUpdate: (t) => fn(t.getValue() ?? 0), onComplete: () => resolve() });
  });

/** The curtain closes over the board, opens on the arena, and both chessmen take the field. */
const entrance = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  const full = r.full;
  duelSound.open();
  await r.counter(full ? 220 : 120, (p) => s.curtain(p), "Quad.In");
  s.curtain(1);
  s.reveal(true);
  if (full) {
    s.hud.caption(s.req.terrain, 1400);
    const off = Math.round(s.w * 0.36);
    s.a.x = s.aHome - s.dir * off;
    s.d.x = s.dHome + s.dir * off;
    [s.a, s.d].forEach((sp) => {
      sp.run(sp.mounted ? 14 : 10);
      moveTo(c, sp, sp === s.a ? s.aHome : s.dHome, 620, "Quad.Out");
    });
    s.backdrop.push(-s.dir * 24);
    if (s.a.mounted || s.d.mounted) duelSound.gallop(6, 600);
  }
  s.hud.showPlates(full ? 320 : 160);
  await r.counter(full ? 360 : 180, (p) => s.curtain(1 - p), "Cubic.Out");
  s.curtain(0);
  if (full) {
    await r.wait(300);
    s.a.idle();
    s.d.idle();
    await r.wait(260);
  }
};

/** The defender flashes white, then breaks down pixel by pixel and scatters as fragments. */
const fall = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  const d = s.d;
  const king = d.unit.type === "king";
  if (king) r.slow(0.35);
  await r.wait(80);
  d.flash(0xffffff);
  await r.wait(60);
  d.flash(null);
  const p = d.chest();
  duelSound.shatter(king);
  d.dissolve(king ? 900 : 640);
  s.fx.chunksAt(p.x, p.y, factionTint(d.unit), king ? 40 : 24);
  s.fx.chunksAt(p.x, p.y - 8, 0xffffff, king ? 16 : 8);
  s.fx.bitsAt(p.x, p.y, [0xffffff, factionTint(d.unit)], king ? 40 : 22);
  s.fx.dust(d.x, king);
  s.fx.play("glint", p.x, p.y, { fps: 16 });
  s.hud.fallen(s.dSide);
  if (king) {
    s.hud.flash(0xffffff, 0.8, 700);
    s.shake(600, 1);
    s.fx.play("ring", p.x, p.y, { fps: 14, tint: 0xffe08a });
  }
  await r.wait(king ? 620 : 460);
  r.normal();
};

const outcomeText = (s: DuelStage): [string, string] => {
  const atk = UNIT_LORE[s.a.unit.type].title;
  const def = UNIT_LORE[s.d.unit.type].title;
  if (s.d.unit.type === "king") return ["Captured", `The ${def} has fallen`];
  return ["Captured", `The ${atk} takes the ${def}`];
};

/** The victor walks back to its mark, raises its weapon and catches the light. */
const triumph = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  const a = s.a;
  a.flash(null);
  a.air = 0;
  a.img.setRotation(0);
  const away = s.aHome - a.x;
  if (Math.abs(away) > 6) {
    const back = Math.sign(away) !== s.dir;
    if (back) a.face = (-s.dir) as 1 | -1;
    a.run(a.mounted ? 12 : 9);
    const ms = Phaser.Math.Clamp(Math.abs(away) * 4.5, 260, 640);
    moveTo(c, a, s.aHome, ms, "Sine.InOut");
    await r.wait(ms);
    a.face = s.dir;
  }
  a.set("victory0");
  await r.wait(160);
  a.set("victory1");
  duelSound.fanfare(r.full);
  await r.wait(160);
  const tip = a.tip();
  s.fx.play("glint", tip.x, tip.y, { fps: 16 });
  duelSound.glint();
  if (r.full) {
    const [title, sub] = outcomeText(s);
    s.hud.outcome(title, sub);
    s.outcomeShown = true;
  }
  await r.wait(r.full ? 1000 : 280);
};

/** The final picture of a duel after a skip: the victor alone. */
export const showResult = (s: DuelStage): void => {
  s.setSpeed(1);
  s.stopTrails();
  s.fx.clear();
  s.curtain(0);
  s.reveal(true);
  s.hud.platesNow();
  s.hud.clearTransient();
  s.hud.hpNow(s.dSide, 0);
  s.hud.fallen(s.dSide);
  s.scene.tweens.killTweensOf([s.a, s.d]);
  const a = s.a;
  a.x = s.aHome;
  a.air = 0;
  a.dx = 0;
  a.face = s.dir;
  a.img.setRotation(0).setAlpha(1);
  a.flash(null);
  a.set("victory1");
  a.sync();
  s.d.hide();
  if (!s.outcomeShown) {
    const [title, sub] = outcomeText(s);
    s.hud.outcome(title, sub, true);
    s.outcomeShown = true;
  }
};

/** The curtain closes over the arena, the arena goes, and it draws back to show the board. */
const curtain = async (s: DuelStage, ms: number): Promise<void> => {
  duelSound.close();
  await animate(s.scene, ms * 0.45, (p) => s.curtain(p), "Quad.In");
  s.curtain(1);
  s.reveal(false);
  await animate(s.scene, ms * 0.55, (p) => s.curtain(1 - p), "Quad.Out");
  s.curtain(0);
};

/** Plays the whole duel on `stage` and resolves once the board is back in view. */
export const playDuel = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  await entrance(c);
  s.hud.ability(UNIT_LORE[s.a.unit.type].ability, s.dir, r.full ? 1200 : 700);
  await r.wait(r.full ? 160 : 60);
  await ABILITIES[s.a.unit.type](c);
  await fall(c);
  await triumph(c);
  if (r.isSkipped) {
    showResult(s);
    await new Promise<void>((resolve) => s.scene.time.delayedCall(320, resolve));
  }
  const ms = r.full ? 420 : 280;
  await curtain(s, r.isSkipped ? 260 : ms);
};
