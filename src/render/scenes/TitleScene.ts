import Phaser from "phaser";
import logoUrl from "../../assets/trenchess-logo.webp";
import omegaUrl from "../../assets/brand/hall-of-the-gods.webp";
import { paintUi } from "../ui/uiArt";
import { COLOR, fontsReady, reducedMotion } from "../ui/fonts";
import { MenuList, MENU_ROW, slideIn } from "../ui/widgets";
import { OMEGA_KEY } from "./SplashScene";
import { Lockup, LOCKUP_BOTTOM, LOCKUP_TOP, LOGO_KEY } from "./title/Lockup";
import { Footer } from "./title/Footer";
import { Sequence } from "./title/sequence";
import { MENU_ITEMS, previewOf } from "./title/menuItems";

const TOP = 90;
const MENU_GAP = 26;
const MENU_AT = 2950;

interface TitleHook {
  open: (id: string) => void;
  select: (id: string) => void;
  skip: () => void;
  reenter: () => void;
}

declare global {
  interface Window {
    __tcTitle?: TitleHook;
  }
}

/**
 * The title: transparent over the battle scene. Plays the logo/lockup intro, then slides the
 * main menu in. Any key or click skips to the end state. Emits `ui:preview` while an item is
 * selected and `ui:open` when one is opened. `reenter()` replays only the menu slide-in.
 */
export class TitleScene extends Phaser.Scene {
  private root!: Phaser.GameObjects.Container;
  private scrim!: Phaser.GameObjects.Rectangle;
  private pillar!: Phaser.GameObjects.Image;
  private vignette!: Phaser.GameObjects.Image;
  private footer!: Footer;
  private lockup!: Lockup;
  private menu: MenuList | null = null;
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private seq!: Sequence;

  constructor() {
    super("title");
  }

  preload(): void {
    if (!this.textures.exists(LOGO_KEY)) this.load.image(LOGO_KEY, logoUrl);
    if (!this.textures.exists(OMEGA_KEY)) this.load.image(OMEGA_KEY, omegaUrl);
  }

  create(): void {
    paintUi(this);
    this.scrim = this.add.rectangle(0, 0, 10, 10, COLOR.ink, 0.32).setOrigin(0, 0);
    this.vignette = this.add.image(0, 0, "ui-vignette").setOrigin(0, 0).setAlpha(0.85);
    this.pillar = this.add.image(0, 0, "ui-pillar").setOrigin(0.5, 0).setAlpha(0.8);
    this.root = this.add.container(0, 0);
    this.seq = new Sequence(this);
    this.lockup = new Lockup(this, this.seq);
    this.footer = new Footer(this).setAlpha(0);
    this.root.add(this.lockup);
    this.sparks = this.addSparks();
    this.seq.add(MENU_AT, (instant) => this.showMenu(instant));
    this.layout();
    this.scale.on("resize", this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.input.keyboard?.on("keydown", this.skip, this);
    this.input.on("pointerdown", this.skip, this);
    void fontsReady().then(() => {
      if (!this.sys.isActive()) return;
      this.seq.play(() => this.ready());
    });
  }

  private layout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.scrim.setSize(w, h);
    this.vignette.setDisplaySize(w, h);
    const menuH = MENU_ITEMS.length * MENU_ROW;
    const needed = TOP + (LOCKUP_BOTTOM - LOCKUP_TOP) + MENU_GAP + menuH + 70;
    const k = Phaser.Math.Clamp(Math.min(h / needed, w / 760), 0.55, 1);
    const top = Math.max(TOP * k, (h - needed * k) / 2 + TOP * k);
    this.root.setScale(k).setPosition(w / 2, top - LOCKUP_TOP * k);
    this.pillar.setPosition(w / 2, 0).setDisplaySize(Math.min(w, 760 * k + 160), h);
    this.footer.layout(w, h);
  }

  private addSparks(): Phaser.GameObjects.Particles.ParticleEmitter {
    const emitter = this.add.particles(0, 0, "ui-spark", {
      x: { min: -300, max: 300 },
      y: { min: LOCKUP_BOTTOM - 40, max: LOCKUP_BOTTOM + 30 },
      lifespan: { min: 3200, max: 5200 },
      speedY: { min: -46, max: -22 },
      speedX: { min: -9, max: 9 },
      scale: { start: 0.75, end: 0.1 },
      alpha: { start: 0.9, end: 0, ease: "Quad.In" },
      tint: [0xf2c94c, 0xffe9a8, 0xffffff],
      frequency: reducedMotion() ? 600 : 230,
      blendMode: Phaser.BlendModes.ADD,
      rotate: { start: 0, end: 90 },
    });
    this.root.addAt(emitter, 0);
    return emitter;
  }

  private showMenu(instant: boolean): void {
    if (!this.menu) this.menu = this.buildMenu();
    this.menu.setAlpha(1);
    this.footer.setAlpha(1);
    if (instant) return;
    slideIn(this, this.menu.rowObjects.flat(), "left", 0, 50);
    this.footer.setAlpha(0);
    this.tweens.add({ targets: this.footer, alpha: 1, duration: 500, delay: 200 });
  }

  private buildMenu(): MenuList {
    const menu = new MenuList(
      this,
      0,
      LOCKUP_BOTTOM + MENU_GAP,
      MENU_ITEMS,
      (id) => this.open(id),
      (id) => this.preview(id),
    );
    menu.setX(-menu.width / 2);
    this.root.add(menu);
    return menu;
  }

  private preview(id: string): void {
    this.game.events.emit("ui:preview", previewOf(id));
  }

  private open(id: string): void {
    this.game.events.emit("ui:open", id);
  }

  private skip(): void {
    this.seq.skip();
  }

  private ready(): void {
    this.input.keyboard?.off("keydown", this.skip, this);
    this.input.off("pointerdown", this.skip, this);
    this.preview(MENU_ITEMS[this.menu?.selected ?? 0].id);
    window.__tcTitle = {
      open: (id) => this.open(id),
      select: (id) => this.menu?.select(Math.max(0, MENU_ITEMS.findIndex((m) => m.id === id))),
      skip: () => this.skip(),
      reenter: () => this.reenter(),
    };
  }

  /** Replays only the menu slide-in, for coming back from setup. */
  reenter(): void {
    if (!this.seq.done) {
      this.skip();
      return;
    }
    this.showMenu(false);
    this.preview(MENU_ITEMS[this.menu?.selected ?? 0].id);
  }

  private teardown(): void {
    this.scale.off("resize", this.layout, this);
    this.input.keyboard?.off("keydown", this.skip, this);
    this.sparks?.destroy();
    this.sparks = null;
    this.menu = null;
    if (window.__tcTitle) delete window.__tcTitle;
  }
}
