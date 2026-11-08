import Phaser from "phaser";
import omegaUrl from "../../assets/brand/hall-of-the-gods.webp";
import { paintUi } from "../ui/uiArt";
import { COLOR, FONT, fontsReady, reducedMotion } from "../ui/fonts";

export const OMEGA_KEY = "brand-omega";

const FADE_IN = 400;
const HOLD = 1600;
const FADE_OUT = 500;
const HOLD_REDUCED = 1000;

interface Timings {
  fadeIn: number;
  hold: number;
  fadeOut: number;
}

const timings = (): Timings => (reducedMotion() ? { fadeIn: 0, hold: HOLD_REDUCED, fadeOut: 0 } : { fadeIn: FADE_IN, hold: HOLD, fadeOut: FADE_OUT });

/**
 * Hall of the Gods, Inc. studio splash: black, the gold Omega, "PRESENTED BY", the studio name
 * with a glow, scanlines and a vignette. Any key or pointer skips it; `?nosplash` skips it entirely.
 * Emits `ui:splash-done` on the game events and stops itself.
 */
export class SplashScene extends Phaser.Scene {
  private content!: Phaser.GameObjects.Container;
  private backdrop!: Phaser.GameObjects.Rectangle;
  private scan!: Phaser.GameObjects.TileSprite;
  private vignette!: Phaser.GameObjects.Image;
  private done = false;

  constructor() {
    super("splash");
  }

  preload(): void {
    if (!this.textures.exists(OMEGA_KEY)) this.load.image(OMEGA_KEY, omegaUrl);
  }

  create(): void {
    if (new URLSearchParams(window.location.search).has("nosplash")) {
      this.finish();
      return;
    }
    paintUi(this);
    this.backdrop = this.add.rectangle(0, 0, 10, 10, 0x000000).setOrigin(0, 0);
    this.content = this.add.container(0, 0).setAlpha(0);
    this.scan = this.add.tileSprite(0, 0, 10, 10, "ui-scanlines").setOrigin(0, 0).setAlpha(0.55);
    this.vignette = this.add.image(0, 0, "ui-vignette").setOrigin(0, 0);
    this.layout();
    this.scale.on("resize", this.layout, this);
    this.input.keyboard?.on("keydown", this.skip, this);
    this.input.on("pointerdown", this.skip, this);
    void fontsReady().then(() => this.play());
  }

  private layout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.backdrop.setSize(w, h);
    this.scan.setSize(w, h);
    this.vignette.setDisplaySize(w, h);
    this.content.setPosition(w / 2, h / 2);
  }

  private build(): void {
    const k = Phaser.Math.Clamp(this.scale.height / 900, 0.6, 1);
    const glow = this.add.image(0, -70 * k, "ui-glow").setTint(COLOR.gold).setAlpha(0.35).setScale(3.2 * k).setBlendMode(Phaser.BlendModes.ADD);
    const omega = this.add.image(0, -70 * k, OMEGA_KEY).setDisplaySize(190 * k, 190 * k);
    const presented = this.add
      .text(0, 60 * k, "PRESENTED BY", { fontFamily: FONT.display, fontSize: `${Math.round(15 * k)}px`, fontStyle: "600", color: COLOR.goldHex, letterSpacing: 6 })
      .setOrigin(0.5, 0)
      .setAlpha(0.85);
    const studio = this.add
      .text(0, 92 * k, "Hall of the Gods, Inc.", { fontFamily: FONT.display, fontSize: `${Math.round(44 * k)}px`, fontStyle: "800", color: COLOR.goldHex })
      .setOrigin(0.5, 0)
      .setShadow(0, 0, "rgba(242,201,76,0.85)", 22, false, true);
    this.content.add([glow, omega, presented, studio]);
    if (reducedMotion()) return;
    this.tweens.add({ targets: glow, alpha: 0.55, scale: 3.5 * k, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    this.tweens.add({ targets: omega, y: omega.y - 4, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.InOut" });
  }

  private play(): void {
    if (this.done) return;
    this.build();
    const t = timings();
    this.content.setAlpha(t.fadeIn ? 0 : 1);
    this.tweens.add({ targets: this.content, alpha: 1, duration: t.fadeIn, ease: "Sine.Out" });
    this.time.delayedCall(t.fadeIn + t.hold, () => this.leave(t.fadeOut));
  }

  private leave(duration: number): void {
    if (this.done) return;
    this.done = true;
    if (!duration) {
      this.finish();
      return;
    }
    this.tweens.add({ targets: [this.content, this.backdrop, this.scan, this.vignette], alpha: 0, duration, ease: "Sine.In", onComplete: () => this.finish() });
  }

  private skip(): void {
    this.leave(reducedMotion() ? 0 : 180);
  }

  private finish(): void {
    this.done = true;
    this.scale.off("resize", this.layout, this);
    this.game.events.emit("ui:splash-done");
    this.scene.stop();
  }
}
