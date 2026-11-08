import Phaser from "phaser";
import { music } from "../../../audio/music";
import { COLOR } from "../fonts";

const BARS = 5;
const GAP = 3;

/**
 * A row of gold bars that dance to `music.levels()`: bass on the left, highs on the right, the
 * in-between bars blended. Reads the levels on the scene update; no per-frame allocation.
 */
export class LevelMeter extends Phaser.GameObjects.Container {
  private readonly bars: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
    super(scene, x, y);
    const barW = (w - GAP * (BARS - 1)) / BARS;
    for (let i = 0; i < BARS; i++) {
      const bar = scene.add.rectangle(i * (barW + GAP), h, barW, h, COLOR.gold).setOrigin(0, 1).setScale(1, 0.08);
      this.bars.push(bar);
    }
    this.add(this.bars);
    this.setSize(w, h);
    scene.add.existing(this);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.dance, this);
  }

  private dance(): void {
    if (!this.visible) return;
    const lv = music.levels();
    const values = [lv.bass, (lv.bass + lv.mid) / 2, lv.mid, (lv.mid + lv.high) / 2, lv.high];
    for (let i = 0; i < BARS; i++) {
      const target = Math.max(0.08, Math.min(1, values[i] * 1.25));
      const bar = this.bars[i];
      const eased = bar.scaleY + (target - bar.scaleY) * 0.35;
      bar.setScale(1, eased);
      bar.setAlpha(0.45 + eased * 0.55);
    }
    this.bars[0].setFillStyle(lv.beat ? 0xfff1b8 : COLOR.gold);
  }

  destroy(fromScene?: boolean): void {
    this.scene?.events.off(Phaser.Scenes.Events.UPDATE, this.dance, this);
    super.destroy(fromScene);
  }
}
