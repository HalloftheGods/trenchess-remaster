import Phaser from "phaser";
import { UNIT_LORE } from "../../game/lore";
import type { DuelMode } from "./duel";
import { ABILITIES, moveTo, pose, type Ctx } from "./duelAbilities";
import { duelSound } from "./duelSound";
import { factionTint, type DuelStage } from "./DuelStage";

/** Tempo of each mode: "full" plays every beat (≈ 4 s), "fast" the attack alone at speed (≈ 1.5 s). */
const TEMPO: Record<DuelMode, number> = { off: 0, fast: 0.6, full: 1 };

export const tempoOf = (mode: DuelMode): number => TEMPO[mode];

const lerp = (a: number, b: number, p: number): number => a + (b - a) * p;

/** A plain scene tween as a promise: for the curtain, which must play even after a skip. */
const animate = (scene: Phaser.Scene, ms: number, fn: (p: number) => void, ease = "Cubic.Out"): Promise<void> =>
  new Promise((resolve) => {
    scene.tweens.addCounter({ from: 0, to: 1, duration: ms, ease, onUpdate: (t) => fn(t.getValue() ?? 0), onComplete: () => resolve() });
  });

/** The letterbox closes over the board, opens on the arena, and both chessmen take the field. */
const entrance = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  const full = r.full;
  s.world.setAlpha(0);
  duelSound.open();
  await r.counter(full ? 200 : 110, (p) => s.hud.setBars(p, p), "Quad.In");
  s.world.setAlpha(1);
  const open = s.hud.open;
  if (full) {
    s.hud.caption(s.req.terrain, 1400);
    const off = s.w * 0.34;
    s.a.root.x = s.aHome - s.dir * off;
    s.d.root.x = s.dHome + s.dir * off;
    [s.a, s.d].forEach((rig) => {
      rig.j.run = rig.kit.mount ? 0 : 1;
      rig.j.gait = rig.kit.mount ? 1 : 0;
      moveTo(c, rig, rig === s.a ? s.aHome : s.dHome, 560, "Quad.Out");
    });
    s.cam.setZoom(1.14);
    r.tween({ targets: s.cam, zoom: 1, duration: 900, ease: "Sine.Out" });
    s.backdrop.push(-s.dir * 30 * s.k);
  }
  s.hud.showPlates(full ? 320 : 160);
  await r.counter(full ? 360 : 180, (p) => s.hud.setBars(lerp(1, open.top, p), lerp(1, open.bot, p)), "Cubic.Out");
  if (full) {
    await r.wait(260);
    [s.a, s.d].forEach((rig) => pose(c, rig, "idle", 220, "Quad.Out"));
    await r.wait(260);
  }
};

/** The defender flashes, breaks apart into its painted pieces and scatters as shards. */
const fall = async (c: Ctx): Promise<void> => {
  const { s, r } = c;
  const d = s.d;
  const king = d.unit.type === "king";
  if (king) r.slow(0.35);
  await r.wait(80);
  d.flash(0xffffff);
  await r.wait(50);
  d.flash(null);
  const p = d.chest();
  duelSound.shatter(king);
  d.shatter(king ? 1.4 : 1.1, king ? 1100 : 850);
  s.fx.shardsAt(p.x, p.y, factionTint(d.unit), king ? 60 : 36);
  s.fx.shardsAt(p.x, p.y, 0xffffff, king ? 24 : 12);
  s.fx.dustAt(d.root.x, s.floor, 0xd8d0c0, 10);
  s.fx.star(p.x, p.y, factionTint(d.unit), king ? 260 : 150, 480);
  s.hud.fallen(s.dSide);
  if (king) {
    s.hud.flash(0xffffff, 0.75, 700);
    s.shake(600, 1);
    s.fx.ring(p.x, p.y, 0xffe08a, 300, false);
  }
  await r.wait(king ? 520 : 380);
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
  const away = s.aHome - a.root.x;
  if (Math.abs(away) > 6 * s.k) {
    const back = Math.sign(away) !== s.dir;
    if (back) r.tween({ targets: a.j, face: -s.dir, duration: 140, ease: "Sine.InOut" });
    pose(c, a, "idle", 160, "Quad.Out", a.kit.mount ? { gait: 1 } : { run: 1 });
    const ms = Phaser.Math.Clamp(Math.abs(away) / s.k * 3.4, 260, 620);
    moveTo(c, a, s.aHome, ms, "Sine.InOut");
    await r.wait(ms - 120);
    if (back) r.tween({ targets: a.j, face: s.dir, duration: 140, ease: "Sine.InOut" });
    await r.wait(120);
  }
  pose(c, a, "victory", 260, "Back.Out");
  duelSound.fanfare(r.full);
  await r.wait(220);
  const tip = a.tip();
  s.fx.star(tip.x, tip.y, 0xffffff, 70, 500);
  duelSound.glint();
  if (r.full) {
    const [title, sub] = outcomeText(s);
    s.hud.outcome(title, sub);
    s.outcomeShown = true;
  }
  await r.wait(r.full ? 1000 : 260);
};

/** The final picture of a duel after a skip: the victor alone. */
export const showResult = (s: DuelStage): void => {
  s.setSpeed(1);
  s.stopTrails();
  s.fx.clear();
  s.cam.resetFX();
  s.cam.setZoom(1);
  s.scene.tweens.killTweensOf(s.cam);
  s.world.setAlpha(1);
  const open = s.hud.open;
  s.hud.setBars(open.top, open.bot);
  s.hud.platesNow();
  s.hud.clearTransient();
  s.hud.hpNow(s.dSide, 0);
  s.scene.tweens.killTweensOf([s.a.root, s.a.j]);
  s.a.root.setX(s.aHome).setAlpha(1);
  Object.assign(s.a.j, s.a.pose("idle"), s.a.pose("victory"), { face: s.dir });
  s.a.flash(null);
  s.a.tick(0);
  s.d.root.setVisible(false);
  if (!s.outcomeShown) {
    const [title, sub] = outcomeText(s);
    s.hud.outcome(title, sub, true);
    s.outcomeShown = true;
  }
};

/** Bars close over the arena, the arena goes, and the bars draw back to show the board. */
const curtain = async (s: DuelStage, ms: number): Promise<void> => {
  duelSound.close();
  const from = s.hud.barState;
  await animate(s.scene, ms * 0.45, (p) => s.hud.setBars(lerp(from.top, 1, p), lerp(from.bot, 1, p)), "Quad.In");
  s.world.setAlpha(0);
  s.hud.barsOnly();
  await animate(s.scene, ms * 0.55, (p) => s.hud.setBars(1 - p, 1 - p), "Quad.Out");
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
    await new Promise<void>((resolve) => s.scene.time.delayedCall(260, resolve));
  }
  const ms = r.full ? 420 : 280;
  await curtain(s, r.isSkipped ? 260 : ms);
};
