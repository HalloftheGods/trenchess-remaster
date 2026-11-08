import Phaser from "phaser";
import { motionMs } from "../../ui/fonts";
import { label } from "../../ui/widgets/common";

const LABEL_H = 22;
const GAP = 12;

type Widget = Phaser.GameObjects.Container | Phaser.GameObjects.Text;

interface Row {
  parts: Widget[];
  height: number;
  visible: boolean;
}

/** Stacks the setup panel's rows top to bottom and shifts them when one is shown or hidden. */
export class SetupRows {
  private rows: Row[] = [];
  height = 0;

  constructor(
    private scene: Phaser.Scene,
    private root: Phaser.GameObjects.Container,
    private pad: number,
  ) {}

  /** A single object of a known height. */
  add(widget: Widget, height: number, visible = true): void {
    this.push({ parts: [widget], height, visible });
  }

  /** A small caps label above a widget; the widget's own height sets the row. */
  row(caption: string, widget: Phaser.GameObjects.Container, visible = true): void {
    const cap = label(this.scene, 0, 0, caption.toUpperCase(), "caps");
    widget.setY(LABEL_H);
    this.push({ parts: [cap, widget], height: LABEL_H + widget.height, visible });
  }

  private push(row: Row): void {
    this.rows.push(row);
    row.parts.forEach((p) => {
      this.root.add(p);
      p.setVisible(row.visible);
    });
    this.place(false);
  }

  /** Shows or hides the row holding `widget`, sliding the rows below it. */
  show(widget: Widget, on: boolean): void {
    const row = this.rows.find((r) => r.parts.includes(widget));
    if (!row || row.visible === on) return;
    row.visible = on;
    row.parts.forEach((p) => {
      p.setVisible(on);
      p.setAlpha(on ? 0 : 1);
      if (on) this.scene.tweens.add({ targets: p, alpha: 1, duration: motionMs(220), delay: motionMs(120) });
    });
    this.place(true);
  }

  private place(animate: boolean): void {
    let y = this.pad;
    this.rows.forEach((row) => {
      if (!row.visible) return;
      row.parts.forEach((p, i) => {
        const toY = y + (i === 0 ? 0 : LABEL_H);
        p.setX(this.pad);
        if (animate) this.scene.tweens.add({ targets: p, y: toY, duration: motionMs(260), ease: "Cubic.Out" });
        else p.setY(toY);
      });
      y += row.height + GAP;
    });
    this.height = y - GAP;
  }
}
