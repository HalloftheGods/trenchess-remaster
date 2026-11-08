import Phaser from "phaser";
import { music } from "../../audio/music";
import { motionMs } from "./fonts";
import { Button } from "./widgets";
import { bindKeys, hitZone, hoverSfx, label, nine, pressSfx } from "./widgets/common";
import { IconToggle } from "./media/IconToggle";
import { LevelMeter } from "./media/LevelMeter";
import { Marquee } from "./media/Marquee";
import { VolumeSlider } from "./media/VolumeSlider";

export const PLAYER_W = 320;
export const PLAYER_H = 88;
const PILL_W = 210;
const PILL_H = 36;
const BTN = { small: true, w: 40 };
const PLAY = "▶";
const PAUSE = "❚❚";
const SILENT = "Silence";

/**
 * The in-engine music player: a steel plate with the track title (marquee), a level meter,
 * previous / play-pause / next, shuffle and a volume slider. Collapsed by default to a pill at
 * the bottom-right of its 320×88 box; click it or press M to expand. `,` / `.` skip tracks.
 * Top-left anchored; drives the `music` singleton and follows it through `music.onChange`.
 */
export class MediaPlayer extends Phaser.GameObjects.Container {
  private readonly pill: Phaser.GameObjects.Container;
  private readonly pillBg: Phaser.GameObjects.NineSlice;
  private readonly pillGlyph: Phaser.GameObjects.Text;
  private readonly pillTitle: Marquee;
  private readonly panel: Phaser.GameObjects.Container;
  private readonly title: Marquee;
  private readonly playBtn: Button;
  private readonly shuffleBtn: IconToggle;
  private readonly volume: VolumeSlider;
  private readonly unsubscribe: () => void;
  private readonly unbindKeys: () => void;
  private expanded = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.pill = scene.add.container(PLAYER_W - PILL_W, PLAYER_H - PILL_H);
    this.pillBg = nine(scene, "ui-btn", PILL_W, PILL_H, "button");
    this.pillGlyph = label(scene, 14, 0, PLAY, "button").setOrigin(0, 0.5).setY(PILL_H / 2);
    this.pillTitle = new Marquee(scene, 44, PILL_H / 2 - 10, PILL_W - 58, "h3");
    this.pill.add([this.pillBg, this.pillGlyph, this.pillTitle]);
    this.wirePill();

    this.panel = scene.add.container(0, 0).setVisible(false).setAlpha(0);
    const plate = nine(scene, "ui-panel", PLAYER_W, PLAYER_H, "panel");
    this.title = new Marquee(scene, 16, 10, 222, "h3");
    const meter = new LevelMeter(scene, 250, 12, 54, 20);
    const prev = new Button(scene, 12, 42, "◀◀", () => music.prev(), BTN);
    this.playBtn = new Button(scene, 56, 42, PLAY, () => music.toggle(), BTN);
    const next = new Button(scene, 100, 42, "▶▶", () => music.next(), BTN);
    this.shuffleBtn = new IconToggle(scene, 150, 42, 36, "⇄", music.shuffle, (on) => (music.shuffle = on));
    this.volume = new VolumeSlider(scene, 204, 46, 96, music.volume, (v) => (music.volume = v));
    const closer = hitZone(scene, 0, 0, PLAYER_W, 36);
    closer.on("pointerup", () => this.toggleExpanded());
    this.panel.add([plate, closer, this.title, meter, prev, this.playBtn, next, this.shuffleBtn, this.volume]);

    this.add([this.pill, this.panel]);
    this.setSize(PLAYER_W, PLAYER_H);
    scene.add.existing(this);
    this.unsubscribe = music.onChange(() => this.refresh());
    this.unbindKeys = bindKeys(scene, (e) => this.onKey(e));
    this.refresh();
  }

  private wirePill(): void {
    this.pillBg.setInteractive({ useHandCursor: true });
    this.pillBg.on("pointerover", () => {
      hoverSfx();
      this.pillBg.setTexture("ui-btn-hover");
    });
    this.pillBg.on("pointerout", () => this.pillBg.setTexture("ui-btn"));
    this.pillBg.on("pointerup", () => {
      pressSfx();
      this.toggleExpanded();
    });
  }

  private onKey(e: KeyboardEvent): void {
    if (e.repeat || !this.visible || this.alpha < 0.5) return;
    if (e.code === "KeyM") this.toggleExpanded();
    else if (e.code === "Comma") music.prev();
    else if (e.code === "Period") music.next();
  }

  /** Mirrors the music state into the labels; called through `music.onChange`. */
  private refresh(): void {
    const glyph = music.playing ? PAUSE : PLAY;
    const name = music.track?.title ?? SILENT;
    this.pillGlyph.setText(glyph);
    this.pillTitle.setText(name);
    this.title.setText(name);
    this.playBtn.setLabel(glyph);
    this.shuffleBtn.setValue(music.shuffle);
    this.volume.setValue(music.volume);
  }

  get isExpanded(): boolean {
    return this.expanded;
  }

  toggleExpanded(): void {
    this.setExpanded(!this.expanded);
  }

  setExpanded(on: boolean): void {
    if (on === this.expanded) return;
    this.expanded = on;
    const show = on ? this.panel : this.pill;
    const hide = on ? this.pill : this.panel;
    this.scene.tweens.killTweensOf([show, hide]);
    show.setVisible(true).setY(show.y + 12);
    this.scene.tweens.add({ targets: show, alpha: 1, y: show.y - 12, duration: motionMs(220), ease: "Cubic.easeOut" });
    this.scene.tweens.add({ targets: hide, alpha: 0, duration: motionMs(160), onComplete: () => hide.setVisible(false) });
  }

  destroy(fromScene?: boolean): void {
    this.unsubscribe();
    this.unbindKeys();
    super.destroy(fromScene);
  }
}
