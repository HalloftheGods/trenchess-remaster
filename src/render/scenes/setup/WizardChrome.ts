import Phaser from "phaser";
import { COLOR, TEXT, motionMs } from "../../ui/fonts";
import { Button, heading } from "../../ui/widgets";
import { SUMMARY_STEP, WIZARD_STEPS } from "./wizard";

export interface ChromeLayout {
  pad: number;
  inner: number;
  bodyTop: number;
  footTop: number;
  back: () => void;
  next: () => void;
  quick: () => void;
}

const DOT_STEP = 18;

/** The wizard's frame: title, subtitle, step dots, Quick start, and the Back / Next footer. */
export class WizardChrome {
  private readonly title: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;
  private readonly counter: Phaser.GameObjects.Text;
  private readonly dots: Phaser.GameObjects.Image[] = [];
  private readonly quick: Button;
  private readonly back: Button;
  private readonly next: Button;

  constructor(scene: Phaser.Scene, root: Phaser.GameObjects.Container, l: ChromeLayout) {
    this.title = heading(scene, l.pad, l.pad - 6, "", "h2");
    this.subtitle = scene.add.text(l.pad, l.pad + 34, "", TEXT.small).setOrigin(0, 0);
    this.counter = scene.add.text(l.pad + l.inner, l.pad + 2, "", { ...TEXT.caps, fontSize: "11px" }).setOrigin(1, 0);
    const dotsX = l.pad + l.inner - (WIZARD_STEPS.length - 1) * DOT_STEP;
    WIZARD_STEPS.forEach((_, i) => this.dots.push(scene.add.image(dotsX + i * DOT_STEP, l.pad + 28, "ui-dot")));
    this.quick = new Button(scene, l.pad + l.inner - 118, l.pad + 42, "Quick start ›", l.quick, { small: true, w: 118 });
    const rule = scene.add.rectangle(l.pad, l.bodyTop - 12, l.inner, 1, COLOR.gold, 0.25).setOrigin(0, 0);
    this.back = new Button(scene, l.pad, l.footTop + 8, "Back  Esc", l.back, { w: 128 });
    this.next = new Button(scene, l.pad + 140, l.footTop + 8, "Next  ⏎", l.next, { primary: true, w: l.inner - 140 });
    root.add([this.title, this.subtitle, this.counter, ...this.dots, this.quick, rule, this.back, this.next]);
  }

  /** Reflects the current step in the header and footer. */
  update(step: number, online: boolean): void {
    const s = WIZARD_STEPS[step];
    this.title.setText(s.title);
    this.subtitle.setText(s.subtitle);
    this.counter.setText(`Step ${step + 1} of ${WIZARD_STEPS.length}`);
    this.dots.forEach((d, i) => d.setTexture(i <= step ? "ui-dot-on" : "ui-dot").setAlpha(i === step ? 1 : 0.7));
    const last = step === SUMMARY_STEP;
    this.quick.setVisible(!last);
    this.back.setLabel(step === 0 ? "Menu  Esc" : "Back  Esc");
    let nextLabel = "Next  ⏎";
    if (last) nextLabel = online ? "Online room ›" : "To battle  ⏎";
    this.next.setLabel(nextLabel);
    const scene = this.title.scene;
    scene.tweens.killTweensOf(this.next);
    this.next.setScale(0.97);
    scene.tweens.add({ targets: this.next, scale: 1, duration: motionMs(180), ease: "Back.Out" });
  }
}
