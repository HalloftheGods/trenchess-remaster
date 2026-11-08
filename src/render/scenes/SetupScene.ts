import Phaser from "phaser";
import type { MatchOptions } from "../../game/Match";
import type { Difficulty } from "../../engine/ai";
import { theme, type PaletteId, type PieceStyle } from "../art/unitArt";
import { paintUi } from "../ui/uiArt";
import { motionMs } from "../ui/fonts";
import { Button, Carousel, Panel, Segmented, Toggle, heading } from "../ui/widgets";
import { bindKeys } from "../ui/widgets/common";
import { SetupRows } from "./setup/SetupRows";
import { BOARDS, COMMANDERS, MODES, OPPONENTS, ORDERS, PALETTE_CHOICES, PRESET_CHOICES, STYLE_CHOICES, loadOptions, saveOptions } from "./setup/choices";

export const PANEL_W = 420;
const MARGIN = 24;
const PAD = 28;
const INNER = PANEL_W - PAD * 2;

export interface SetupData {
  /** Pre-select a mode (Lay Trenchess opens on Omega). */
  mode?: MatchOptions["mode"];
}

/**
 * Match setup as a steel panel over the live board. Every change emits `ui:setup-changed` so the
 * board behind it shows exactly the field the match would start on; chessmen style and colors
 * emit `ui:theme`. `ui:start` and `ui:back` leave the scene.
 */
export class SetupScene extends Phaser.Scene {
  private options!: MatchOptions;
  private root!: Phaser.GameObjects.Container;
  private panel!: Panel;
  private rows!: SetupRows;
  private battlefield!: Carousel;
  private commander!: Segmented;
  private unbindKeys: () => void = () => undefined;
  private leaving = false;

  constructor() {
    super("setup");
  }

  init(data: SetupData): void {
    this.options = loadOptions();
    if (data?.mode) this.options.mode = data.mode;
    this.leaving = false;
  }

  create(): void {
    paintUi(this);
    this.root = this.add.container(0, 0);
    this.panel = new Panel(this, 0, 0, PANEL_W, 100);
    this.root.add(this.panel);
    this.rows = new SetupRows(this, this.root, PAD);
    this.build();
    this.layout();
    this.scale.on("resize", this.layout, this);
    this.unbindKeys = bindKeys(this, (e) => this.onKey(e));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.enter();
    this.changed();
  }

  private build(): void {
    const title = this.options.mode === "omega" ? "Lay Trenchess" : "Play Trenchess";
    this.rows.add(heading(this, 0, 0, title, "h2"), 44);
    this.rows.row("Mode", new Segmented(this, 0, 0, INNER, MODES, this.options.mode, (id) => this.setMode(id as MatchOptions["mode"])));
    this.battlefield = new Carousel(this, 0, 0, INNER, PRESET_CHOICES, this.presetIndex(), (i) => this.set({ preset: PRESET_CHOICES[i].id }));
    this.rows.row("Battlefield", this.battlefield, this.options.mode === "chi");
    this.rows.row("Board", new Segmented(this, 0, 0, INNER, BOARDS, this.options.board, (id) => this.set({ board: id as MatchOptions["board"] })));
    this.rows.row("Opponent", new Segmented(this, 0, 0, INNER, OPPONENTS, this.options.opponent, (id) => this.setOpponent(id as MatchOptions["opponent"])));
    this.commander = new Segmented(this, 0, 0, INNER, COMMANDERS, this.options.difficulty, (id) => this.set({ difficulty: id as Difficulty }));
    this.rows.row("Commander", this.commander);
    this.commander.setAlpha(this.options.opponent === "hotseat" ? 0.4 : 1);
    this.rows.row("Orders", new Segmented(this, 0, 0, INNER, ORDERS, String(this.options.ordersPerTurn), (id) => this.set({ ordersPerTurn: Number(id) })));
    const styleAt = Math.max(0, STYLE_CHOICES.findIndex((c) => c.id === theme.style));
    this.rows.row("Chessmen", new Carousel(this, 0, 0, INNER, STYLE_CHOICES, styleAt, (i) => this.setTheme(STYLE_CHOICES[i].id as PieceStyle, theme.palette)));
    this.rows.row("Colors", new Segmented(this, 0, 0, INNER, PALETTE_CHOICES, theme.palette, (id) => this.setTheme(theme.style, id as PaletteId)));
    this.rows.add(new Toggle(this, 0, 0, "Fog of war (forests hide the enemy)", this.options.fog, (v) => this.set({ fog: v })), 40);
    this.buttons();
  }

  private buttons(): void {
    const row = this.add.container(0, 0);
    const start = new Button(this, 0, 0, "To battle  ⏎", () => this.start(), { primary: true, w: INNER - 130 });
    const back = new Button(this, INNER - 120, 0, "Back  Esc", () => this.back(), { w: 120 });
    row.add([start, back]);
    this.rows.add(row, 48);
  }

  private presetIndex(): number {
    return Math.max(0, PRESET_CHOICES.findIndex((c) => c.id === this.options.preset));
  }

  private layout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const contentH = this.rows.height + PAD * 2;
    const k = Phaser.Math.Clamp((h - MARGIN * 2) / contentH, 0.6, 1);
    this.panel.resize(PANEL_W, contentH);
    this.root.setScale(k).setPosition(w - MARGIN - PANEL_W * k, (h - contentH * k) / 2);
  }

  private set(patch: Partial<MatchOptions>): void {
    Object.assign(this.options, patch);
    this.changed();
  }

  private setMode(mode: MatchOptions["mode"]): void {
    this.options.mode = mode;
    this.rows.show(this.battlefield, mode === "chi");
    this.layout();
    this.changed();
  }

  private setOpponent(opponent: MatchOptions["opponent"]): void {
    this.options.opponent = opponent;
    this.tweens.add({ targets: this.commander, alpha: opponent === "hotseat" ? 0.4 : 1, duration: motionMs(200) });
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
    if (e.code === "Escape") this.back();
    if (e.code === "Enter" || e.code === "NumpadEnter") this.start();
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
    this.leave(() => this.game.events.emit("ui:start", { ...this.options }));
  }

  private back(): void {
    this.leave(() => this.game.events.emit("ui:back"));
  }

  private teardown(): void {
    this.scale.off("resize", this.layout, this);
    this.unbindKeys();
  }
}
