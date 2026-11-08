import Phaser from "phaser";
import cartridgeUrl from "../../../assets/pwa/install-cartridge.png";
import { installController } from "../../../pwa";
import type { InstallState } from "../../../pwa/installController";
import { guideFor, type GuideKind } from "../../../pwa/installOffer";
import { COLOR, TEXT, reducedMotion } from "../../ui/fonts";
import { Button, Panel } from "../../ui/widgets";
import { hoverSfx, pressSfx } from "../../ui/widgets/common";

export const CARTRIDGE_KEY = "pwa-install-cartridge";
export const CARTRIDGE_URL = cartridgeUrl;

/** Display height of the cartridge in title-root units (the root scales with the screen). */
const HEIGHT = 128;
const LIFT = 6;

/**
 * The Install Game cartridge, as in Undead of Night: shown on the title beside the menu only while
 * the browser can install the game (or on iOS Safari, where a card explains Add to Home Screen).
 * Hidden once the game runs installed.
 */
export class InstallCartridge extends Phaser.GameObjects.Container {
  private readonly art: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private offered = false;
  private wanted = false;
  private guide: InstallGuide | null = null;
  private readonly unsubscribe: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.shadow = scene.add.image(0, 4, CARTRIDGE_KEY).setTint(0x000000).setAlpha(0.45);
    this.art = scene.add.image(0, 0, CARTRIDGE_KEY);
    const s = HEIGHT / this.art.height;
    this.art.setScale(s);
    this.shadow.setScale(s);
    this.add([this.shadow, this.art]);
    this.setSize(this.art.displayWidth, this.art.displayHeight);
    this.art.setInteractive({ useHandCursor: true });
    this.art.on("pointerover", () => this.hover(true));
    this.art.on("pointerout", () => this.hover(false));
    this.art.on("pointerup", () => {
      pressSfx();
      void installController.press();
    });
    this.setVisible(false);
    scene.add.existing(this);
    this.unsubscribe = installController.subscribe((state) => this.sync(state));
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.unsubscribe();
      this.guide?.destroy();
      this.guide = null;
    });
  }

  get displayW(): number {
    return this.art.displayWidth;
  }

  /** The menu has arrived: the cartridge may show now, if there is anything to install. */
  reveal(instant: boolean): void {
    this.wanted = true;
    this.apply(instant);
  }

  private sync(state: InstallState): void {
    this.offered = state.path !== "none";
    this.apply(false);
    if (state.guideOpen && !this.guide) this.guide = new InstallGuide(this.scene, state.guideKind, () => installController.closeGuide());
    if (!state.guideOpen && this.guide) {
      this.guide.destroy();
      this.guide = null;
    }
  }

  private apply(instant: boolean): void {
    const show = this.wanted && this.offered;
    if (show === this.visible) return;
    this.scene.tweens.killTweensOf(this);
    this.setVisible(show);
    if (!show) return;
    if (instant || reducedMotion()) {
      this.setAlpha(1);
      return;
    }
    this.setAlpha(0);
    this.scene.tweens.add({ targets: this, alpha: 1, duration: 450, delay: 250 });
  }

  private hover(on: boolean): void {
    if (on) hoverSfx();
    const y = on ? -LIFT : 0;
    this.scene.tweens.killTweensOf(this.art);
    if (reducedMotion()) this.art.setY(y);
    else this.scene.tweens.add({ targets: this.art, y, duration: 120, ease: "Stepped", easeParams: [3] });
  }
}

/** The "how to install" card for browsers that give no install dialog. Drawn in-engine over the title. */
class InstallGuide extends Phaser.GameObjects.Container {
  private readonly scrim: Phaser.GameObjects.Rectangle;
  private readonly panel: Panel;
  private readonly onKey: (e: KeyboardEvent) => void;

  constructor(scene: Phaser.Scene, kind: GuideKind, close: () => void) {
    super(scene, 0, 0);
    const guide = guideFor(kind);
    const W = 460;
    this.scrim = scene.add.rectangle(0, 0, 10, 10, COLOR.ink, 0.72).setOrigin(0, 0).setInteractive();
    this.scrim.on("pointerup", close);
    this.panel = new Panel(scene, 0, 0, W, 10);
    const kicker = scene.add.text(W / 2, 28, "INSTALL GAME", TEXT.caps).setOrigin(0.5, 0);
    const heading = scene.add
      .text(W / 2, 54, guide.heading, { ...TEXT.h3, align: "center", wordWrap: { width: W - 60 } })
      .setOrigin(0.5, 0);
    this.panel.add([kicker, heading]);
    let y = heading.y + heading.height + 22;
    guide.steps.forEach((step, i) => {
      const num = scene.add.text(36, y, String(i + 1), { ...TEXT.h2, fontSize: "26px" }).setOrigin(0.5, 0);
      const title = scene.add.text(64, y, step.title, { ...TEXT.body, fontStyle: "600" });
      const line = scene.add.text(64, y + 24, step.line, { ...TEXT.small, wordWrap: { width: W - 96 } });
      this.panel.add([num, title, line]);
      y += 24 + line.height + 18;
    });
    const ok = new Button(scene, W / 2 - 60, y + 6, "Got it", close, { w: 120, primary: true });
    this.panel.add(ok);
    this.panel.resize(W, y + 6 + ok.height + 28);
    this.panel.setInteractive(new Phaser.Geom.Rectangle(0, 0, W, this.panel.height), Phaser.Geom.Rectangle.Contains);
    this.add([this.scrim, this.panel]);
    this.setDepth(1000);
    scene.add.existing(this);
    this.layout();
    scene.scale.on("resize", this.layout, this);
    this.onKey = (e) => {
      if (e.key === "Escape") close();
    };
    scene.input.keyboard?.on("keydown", this.onKey);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.scale.off("resize", this.layout, this);
      scene.input.keyboard?.off("keydown", this.onKey);
    });
    if (!reducedMotion()) {
      this.setAlpha(0);
      scene.tweens.add({ targets: this, alpha: 1, duration: 200 });
    }
  }

  private layout(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    this.scrim.setSize(w, h);
    const k = Math.min(1, (w - 32) / this.panel.width, (h - 32) / this.panel.height);
    this.panel.setScale(k).setPosition((w - this.panel.width * k) / 2, (h - this.panel.height * k) / 2);
  }
}
