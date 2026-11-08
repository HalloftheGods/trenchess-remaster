import Phaser from "phaser";
import type { MatchOptions } from "../../game/Match";
import type { PaletteId, PieceStyle } from "../art/unitArt";
import { paintUi } from "../ui/uiArt";
import { motionMs } from "../ui/fonts";
import { Panel } from "../ui/widgets";
import { bindKeys } from "../ui/widgets/common";
import { loadOptions, saveOptions } from "./setup/choices";
import { buildStep, type BuiltStep } from "./setup/steps";
import { WizardChrome } from "./setup/WizardChrome";
import { SUMMARY_STEP, WIZARD_STEPS, type WizardCtx } from "./setup/wizard";

export const PANEL_W = 440;
const MARGIN = 24;
const PAD = 28;
const INNER = PANEL_W - PAD * 2;
const HEAD_H = 92;
const BODY_H = 400;
const FOOT_H = 64;
const PANEL_H = PAD + HEAD_H + BODY_H + FOOT_H + PAD;

export interface SetupData {
  /** Pre-select a mode (Lay Trenchess opens on Omega). */
  mode?: MatchOptions["mode"];
}

/**
 * Match setup as a stepped wizard over the live board: The Battle, The Board, Commanders, The Look,
 * then a summary with To battle. Every change emits `ui:setup-changed` so the board behind it shows
 * exactly the field the match would start on; chessmen style and colors emit `ui:theme`.
 * `ui:start`, `ui:start-online` and `ui:back` leave the scene. Quick start skips to the summary.
 */
export class SetupScene extends Phaser.Scene {
  private options!: MatchOptions;
  private root!: Phaser.GameObjects.Container;
  private panel!: Panel;
  private chrome!: WizardChrome;
  private body: Phaser.GameObjects.Container | null = null;
  private built: BuiltStep | null = null;
  private step = 0;
  private unbindKeys: () => void = () => undefined;
  private leaving = false;

  constructor() {
    super("setup");
  }

  init(data: SetupData): void {
    this.options = loadOptions();
    if (data?.mode) this.options.mode = data.mode;
    this.step = 0;
    this.leaving = false;
    this.body = null;
    this.built = null;
  }

  create(): void {
    paintUi(this);
    this.root = this.add.container(0, 0);
    this.panel = new Panel(this, 0, 0, PANEL_W, PANEL_H);
    this.root.add(this.panel);
    this.chrome = new WizardChrome(this, this.root, {
      pad: PAD,
      inner: INNER,
      bodyTop: PAD + HEAD_H,
      footTop: PAD + HEAD_H + BODY_H,
      back: () => this.prev(),
      next: () => this.next(),
      quick: () => this.goTo(SUMMARY_STEP, 1),
    });
    this.show(0, 0);
    this.layout();
    this.scale.on("resize", this.layout, this);
    this.unbindKeys = bindKeys(this, (e) => this.onKey(e));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.enter();
    this.changed();
  }

  private ctx(): WizardCtx {
    return {
      scene: this,
      options: this.options,
      inner: INNER,
      set: (patch) => this.set(patch),
      setTheme: (style, palette) => this.setTheme(style, palette),
      emit: (event, payload) => this.game.events.emit(event, payload),
      goTo: (step) => this.goTo(step, step < this.step ? -1 : 1),
      refresh: () => this.show(this.step, 0),
      leave: (then) => this.leave(then),
    };
  }

  /** Replaces the page; `dir` slides the new page in from that side (0 = no motion). */
  private show(step: number, dir: -1 | 0 | 1): void {
    this.built?.online?.cancel();
    this.body?.destroy();
    this.step = step;
    this.body = this.add.container(PAD, PAD + HEAD_H);
    this.root.add(this.body);
    this.built = buildStep(step, this.ctx(), this.body);
    this.chrome.update(step, this.options.opponent === "online");
    if (dir === 0) return;
    const x = this.body.x;
    this.body.setX(x + 60 * dir).setAlpha(0);
    this.tweens.add({ targets: this.body, x, alpha: 1, duration: motionMs(260), ease: "Cubic.Out" });
  }

  private goTo(step: number, dir: -1 | 1): void {
    const to = Phaser.Math.Clamp(step, 0, SUMMARY_STEP);
    if (to === this.step) return;
    this.show(to, dir);
  }

  private next(): void {
    if (this.step === SUMMARY_STEP) return this.start();
    this.goTo(this.step + 1, 1);
  }

  private prev(): void {
    if (this.step === 0) return this.back();
    this.goTo(this.step - 1, -1);
  }

  private layout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const k = Phaser.Math.Clamp((h - MARGIN * 2) / PANEL_H, 0.6, 1);
    this.root.setScale(k).setPosition(w - MARGIN - PANEL_W * k, (h - PANEL_H * k) / 2);
  }

  private set(patch: Partial<MatchOptions>): void {
    Object.assign(this.options, patch);
    this.changed();
  }

  private setTheme(style: PieceStyle, palette: PaletteId): void {
    this.game.events.emit("ui:theme", { style, palette });
  }

  private changed(): void {
    saveOptions(this.options);
    this.game.events.emit("ui:setup-changed", { ...this.options });
  }

  private onKey(e: KeyboardEvent): void {
    if (this.built?.online?.key(e)) return;
    if (e.code === "Escape") this.prev();
    if (e.code === "Enter" || e.code === "NumpadEnter") this.next();
  }

  private enter(): void {
    const x = this.root.x;
    this.root.setX(x + 80).setAlpha(0);
    this.tweens.add({ targets: this.root, x, alpha: 1, duration: motionMs(420), ease: "Cubic.Out" });
  }

  private leave(then: () => void): void {
    if (this.leaving) return;
    this.leaving = true;
    this.tweens.add({
      targets: this.root,
      x: this.root.x + 80,
      alpha: 0,
      duration: motionMs(260),
      ease: "Cubic.In",
      onComplete: () => {
        then();
        this.scene.stop();
      },
    });
  }

  private start(): void {
    const online = this.built?.online;
    if (this.options.opponent === "online") {
      if (online) return void online.go({ ...this.options });
      return this.goTo(2, -1);
    }
    this.leave(() => this.game.events.emit("ui:start", { ...this.options }));
  }

  private back(): void {
    this.built?.online?.cancel();
    this.leave(() => this.game.events.emit("ui:back"));
  }

  private teardown(): void {
    this.scale.off("resize", this.layout, this);
    this.unbindKeys();
  }
}

export { WIZARD_STEPS };
