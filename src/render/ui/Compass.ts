import Phaser from "phaser";
import { getProjection, getRotation, type Projection } from "../iso";
import { COLOR, FONT } from "./fonts";
import { Button, Segmented } from "./widgets";
import { hoverSfx, pressSfx } from "./widgets/common";

export type ViewAction =
  | { action: "rotate"; delta: 1 | -1 }
  | { action: "projection"; value: Projection }
  | { action: "zoom"; factor: number }
  | { action: "reset" };

export const COMPASS_W = 270;
export const COMPASS_H = 268;
const RING = 160;
const DRAG_PER_SNAP = 60;
const LETTERS = ["N", "E", "S", "W"];

/**
 * The board view controls: a compass ring whose N follows row 0 as the board turns (drag it to
 * rotate in 90° snaps), rotate / zoom / reset buttons and the Iso / Top toggle. Emits `ui:view`.
 */
export class Compass extends Phaser.GameObjects.Container {
  private readonly ring: Phaser.GameObjects.Container;
  private readonly projection: Segmented;
  private dragFrom: number | null = null;
  private dragged = 0;
  private shown: Projection = getProjection();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const cx = COMPASS_W / 2;
    const cy = RING / 2 + 8;
    this.ring = scene.add.container(cx, cy);
    const face = scene.add.image(0, 0, "ui-ring");
    this.ring.add(face);
    LETTERS.forEach((letter, i) => {
      const a = (i * Math.PI) / 2;
      const r = RING / 2 - 24;
      const t = scene.add
        .text(Math.sin(a) * r, -Math.cos(a) * r, letter, { fontFamily: FONT.display, fontSize: i === 0 ? "20px" : "15px", fontStyle: "700", color: i === 0 ? COLOR.goldHex : COLOR.bone })
        .setOrigin(0.5, 0.5);
      this.ring.add(t);
    });
    this.add(this.ring);
    this.wireRing(face);
    const small = { small: true, w: 44 };
    const left = new Button(scene, cx - RING / 2 - 52, cy - 18, "⟲", () => this.emitView({ action: "rotate", delta: -1 }), small);
    const right = new Button(scene, cx + RING / 2 + 8, cy - 18, "⟳", () => this.emitView({ action: "rotate", delta: 1 }), small);
    const zoomIn = new Button(scene, cx - 70, RING + 18, "+", () => this.emitView({ action: "zoom", factor: 1.15 }), small);
    const home = new Button(scene, cx - 22, RING + 18, "⌂", () => this.emitView({ action: "reset" }), small);
    const zoomOut = new Button(scene, cx + 26, RING + 18, "−", () => this.emitView({ action: "zoom", factor: 1 / 1.15 }), small);
    this.projection = new Segmented(
      scene,
      cx - 80,
      RING + 64,
      160,
      [
        { id: "iso", label: "Iso" },
        { id: "top", label: "Top" },
      ],
      getProjection(),
      (id) => this.emitView({ action: "projection", value: id as Projection }),
    );
    this.add([left, right, zoomIn, home, zoomOut, this.projection]);
    this.setSize(COMPASS_W, COMPASS_H);
    scene.add.existing(this);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.follow, this);
  }

  private emitView(payload: ViewAction): void {
    this.scene.game.events.emit("ui:view", payload);
  }

  private wireRing(face: Phaser.GameObjects.Image): void {
    face.setInteractive({ useHandCursor: true, pixelPerfect: false });
    face.on("pointerover", () => {
      hoverSfx();
      face.setAlpha(0.85);
    });
    face.on("pointerout", () => {
      face.setAlpha(1);
      this.dragFrom = null;
    });
    face.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.dragFrom = p.x;
      this.dragged = 0;
    });
    face.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.dragFrom === null) return;
      const dx = p.x - this.dragFrom;
      if (Math.abs(dx) < DRAG_PER_SNAP) return;
      this.dragFrom = p.x;
      this.dragged++;
      this.emitView({ action: "rotate", delta: dx > 0 ? 1 : -1 });
    });
    face.on("pointerup", () => {
      if (this.dragFrom !== null && this.dragged === 0) {
        pressSfx();
        this.emitView({ action: "rotate", delta: 1 });
      }
      this.dragFrom = null;
    });
  }

  /** Eases the ring toward the board's rotation every frame; letters stay upright. */
  private follow(): void {
    const target = -getRotation() * (Math.PI / 2);
    const diff = Phaser.Math.Angle.Wrap(target - this.ring.rotation);
    this.ring.rotation += diff * 0.15;
    this.ring.each((child: Phaser.GameObjects.GameObject) => {
      if (child instanceof Phaser.GameObjects.Text) child.setRotation(-this.ring.rotation);
    });
    const p = getProjection();
    if (p !== this.shown) {
      this.shown = p;
      this.projection.setValue(p);
    }
  }

  destroy(fromScene?: boolean): void {
    this.scene?.events.off(Phaser.Scenes.Events.UPDATE, this.follow, this);
    super.destroy(fromScene);
  }
}
