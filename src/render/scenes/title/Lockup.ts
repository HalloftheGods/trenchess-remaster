import Phaser from "phaser";
import { COLOR, FONT, reducedMotion } from "../../ui/fonts";
import type { Sequence } from "./sequence";

export const LOGO_KEY = "trenchess-logo";
const LOGO_H = 150;
/** Vertical extent of the lockup relative to the logo's center (y = 0). */
export const LOCKUP_TOP = -LOGO_H / 2;
export const LOCKUP_BOTTOM = 272;
const TERRAINS = ["forest", "swamp", "mountain", "desert"];
const BADGE = 40;
const GAP = 8;
const TREN = "#ef4444";
const CHESS = "#3b82f6";
const DISPLAY = (size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT.display,
  fontSize: `${size}px`,
  fontStyle: "800",
  color,
});

const pop = (seq: Sequence, target: Phaser.GameObjects.Image | Phaser.GameObjects.Text, instant: boolean, duration = 260): void => {
  if (instant) {
    target.setScale(1).setAlpha(1);
    return;
  }
  target.setScale(0).setAlpha(0);
  seq.tween({ targets: target, scale: 1, alpha: 1, duration, ease: "Back.Out" });
};

const slide = (seq: Sequence, target: Phaser.GameObjects.Text, fromDx: number, instant: boolean): void => {
  const x = target.x;
  if (instant) {
    target.setX(x).setAlpha(1);
    return;
  }
  target.setX(x + fromDx).setAlpha(0);
  seq.tween({ targets: target, x, alpha: 1, duration: 420, ease: "Cubic.Out" });
};

/**
 * The title lockup: logo with a glint, then "CHESS + [four terrains]" over a gold rule,
 * TRENCHESS (red + blue with a gold edge glow) and REMASTERED. Centered on x = 0, the logo's
 * center at y = 0; registers its intro beats on the given sequence.
 */
export class Lockup extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, seq: Sequence) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.buildLogo(seq);
    this.buildEquation(seq);
    this.buildName(seq);
    this.hideAll();
  }

  /** Everything starts invisible; each beat reveals its part (instantly when skipped). */
  private hideAll(): void {
    this.list.forEach((o) => {
      if (o instanceof Phaser.GameObjects.Image || o instanceof Phaser.GameObjects.Text) o.setAlpha(0);
    });
  }

  private buildLogo(seq: Sequence): void {
    const logo = this.scene.add.image(0, 0, LOGO_KEY);
    logo.setScale(LOGO_H / logo.height);
    const flash = this.scene.add.image(0, 0, LOGO_KEY).setScale(logo.scale).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    const star = this.scene.add.image(0, 0, "ui-spark").setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.add([logo, flash, star]);
    seq.add(0, (instant) => {
      if (instant) {
        logo.setY(0).setAlpha(1);
        return;
      }
      logo.setY(-140).setAlpha(0);
      seq.tween({ targets: logo, y: 0, alpha: 1, duration: 720, ease: "Bounce.Out" });
    });
    seq.add(700, (instant) => {
      flash.setAlpha(0);
      star.setAlpha(0);
      if (instant) return;
      seq.tween({ targets: flash, alpha: 0.55, duration: 180, yoyo: true, ease: "Sine.InOut" });
      const w = logo.displayWidth;
      const h = logo.displayHeight;
      star.setPosition(-w / 2, -h / 2 + 6).setScale(0.4).setAlpha(1);
      seq.tween({ targets: star, x: w / 2 - 4, y: -h / 2 + 2, scale: 2.6, duration: 520, ease: "Sine.InOut", onComplete: () => star.setAlpha(0) });
      seq.tween({ targets: star, angle: 90, duration: 520 });
    });
  }

  private buildEquation(seq: Sequence): void {
    const y = LOGO_H / 2 + 36;
    const chess = this.scene.add.text(0, y, "CHESS", DISPLAY(32, COLOR.bone)).setOrigin(0, 0.5).setShadow(0, 2, "rgba(0,0,0,0.9)", 6, false, true);
    const plus = this.scene.add.text(0, y - 1, "+", DISPLAY(30, COLOR.goldHex)).setOrigin(0.5, 0.5).setShadow(0, 2, "rgba(0,0,0,0.9)", 6, false, true);
    const badges = TERRAINS.map((t) => this.scene.add.image(0, y, `ui-badge-${t}`));
    const total = chess.width + 14 + plus.width + 14 + TERRAINS.length * BADGE + (TERRAINS.length - 1) * GAP;
    let x = -total / 2;
    chess.setX(x);
    x += chess.width + 14 + plus.width / 2;
    plus.setX(x);
    x += plus.width / 2 + 14 + BADGE / 2;
    badges.forEach((b, i) => b.setX(x + i * (BADGE + GAP)));
    const rule = this.scene.add.image(0, y + 34, "ui-rule").setDisplaySize(Math.max(total + 60, 360), 4);
    this.add([chess, plus, ...badges, rule]);
    seq.add(900, (instant) => slide(seq, chess, -60, instant));
    seq.add(1200, (instant) => pop(seq, plus, instant));
    badges.forEach((b, i) => seq.add(1350 + i * 140, (instant) => pop(seq, b, instant)));
    seq.add(1950, (instant) => {
      if (instant) {
        rule.setScale(1).setAlpha(1);
        return;
      }
      rule.setScale(0, 1).setAlpha(1);
      seq.tween({ targets: rule, scaleX: 1, duration: 380, ease: "Cubic.Out" });
    });
  }

  private buildName(seq: Sequence): void {
    const y = LOGO_H / 2 + 36 + 34 + 48;
    const glow = this.scene.add.image(0, y, "ui-glow").setTint(COLOR.gold).setScale(4.2, 1.3).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    const tren = this.scene.add.text(0, y, "TREN", DISPLAY(76, TREN)).setOrigin(1, 0.5);
    const chess = this.scene.add.text(0, y, "CHESS", DISPLAY(76, CHESS)).setOrigin(0, 0.5);
    const half = (tren.width + chess.width) / 2;
    tren.setX(-half + tren.width);
    chess.setX(-half + tren.width);
    [tren, chess].forEach((t) => t.setStroke("#ffe08a", 2).setShadow(0, 0, "rgba(242,201,76,0.75)", 18, true, true));
    const sub = this.scene.add
      .text(0, y + 62, "REMASTERED", { fontFamily: FONT.display, fontSize: "17px", fontStyle: "600", color: COLOR.bone, letterSpacing: 12 })
      .setOrigin(0.5, 0.5)
      .setShadow(0, 1, "rgba(0,0,0,0.9)", 4, false, true)
      .setAlpha(0);
    this.add([glow, tren, chess, sub]);
    seq.add(2200, (instant) => {
      slide(seq, tren, -80, instant);
      slide(seq, chess, 80, instant);
      glow.setAlpha(0.32);
      if (instant || reducedMotion()) return;
      glow.setAlpha(0);
      seq.tween({ targets: glow, alpha: 0.32, duration: 500 });
    });
    seq.add(2650, (instant) => {
      if (instant) {
        sub.setAlpha(1);
        return;
      }
      sub.setAlpha(0).setY(y + 70);
      seq.tween({ targets: sub, alpha: 1, y: y + 62, duration: 420, ease: "Cubic.Out" });
    });
    if (!reducedMotion()) this.scene.tweens.add({ targets: glow, scaleX: 4.6, duration: 2600, yoyo: true, repeat: -1, ease: "Sine.InOut" });
  }
}
