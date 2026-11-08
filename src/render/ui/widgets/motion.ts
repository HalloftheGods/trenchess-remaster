import Phaser from "phaser";
import { TEXT, motionMs } from "../fonts";

export type HeadingKind = "h1" | "h2" | "h3" | "caps";
export type SlideFrom = "left" | "right" | "up" | "down";

type Movable = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.AlphaSingle;

const isMovable = (o: Phaser.GameObjects.GameObject): o is Movable =>
  typeof (o as Partial<Movable>).setPosition === "function" && typeof (o as Partial<Movable>).setAlpha === "function";

const OFFSET: Record<SlideFrom, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

/** A heading text in one of the display styles; origin top-left. */
export const heading = (scene: Phaser.Scene, x: number, y: number, text: string, kind: HeadingKind = "h2"): Phaser.GameObjects.Text =>
  scene.add.text(x, y, text, TEXT[kind]).setOrigin(0, 0);

/** Slides targets in from a direction to their current position, staggered 40 ms apart. */
export const slideIn = (scene: Phaser.Scene, targets: Phaser.GameObjects.GameObject[], from: SlideFrom, delay = 0, distance = 40): void => {
  const [ox, oy] = OFFSET[from];
  targets.filter(isMovable).forEach((t, i) => {
    const toX = t.x;
    const toY = t.y;
    const toAlpha = t.alpha;
    scene.tweens.killTweensOf(t);
    t.setPosition(toX + ox * distance, toY + oy * distance);
    t.setAlpha(0);
    scene.tweens.add({ targets: t, x: toX, y: toY, alpha: toAlpha, duration: motionMs(380), delay: motionMs(delay + i * 40), ease: "Cubic.Out" });
  });
};

/** Fades targets out; resolves when the tween completes (immediately for no targets). */
export const fadeOut = (scene: Phaser.Scene, targets: Phaser.GameObjects.GameObject[], duration = 250): Promise<void> => {
  const list = targets.filter(isMovable);
  if (!list.length) return Promise.resolve();
  return new Promise((resolve) => {
    scene.tweens.add({ targets: list, alpha: 0, duration: motionMs(duration), ease: "Sine.In", onComplete: () => resolve() });
  });
};
