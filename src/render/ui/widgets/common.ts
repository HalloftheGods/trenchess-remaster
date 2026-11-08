import Phaser from "phaser";
import { sfx } from "../../../audio/sfx";
import { UI_CORNER } from "../uiArt";
import { TEXT } from "../fonts";

export interface Choice {
  id: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export const hoverSfx = (): void => sfx.hover();
export const pressSfx = (): void => sfx.select();

type CornerKind = keyof typeof UI_CORNER;

/** A top-left anchored nine-slice of one of the UI kit textures. */
export const nine = (scene: Phaser.Scene, key: string, w: number, h: number, kind: CornerKind): Phaser.GameObjects.NineSlice => {
  const c = UI_CORNER[kind];
  return scene.add.nineslice(0, 0, key, undefined, w, h, c, c, c, c).setOrigin(0, 0);
};

/** Text with one of the kit styles; origin top-left. */
export const label = (scene: Phaser.Scene, x: number, y: number, text: string, kind: keyof typeof TEXT): Phaser.GameObjects.Text =>
  scene.add.text(x, y, text, TEXT[kind]).setOrigin(0, 0);

/** An invisible interactive zone with a hand cursor, top-left anchored. */
export const hitZone = (scene: Phaser.Scene, x: number, y: number, w: number, h: number): Phaser.GameObjects.Zone =>
  scene.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });

export type KeyHandler = (e: KeyboardEvent) => void;

/** Binds a keydown listener on the scene keyboard and returns the unbind function. */
export const bindKeys = (scene: Phaser.Scene, handler: KeyHandler): (() => void) => {
  const kb = scene.input.keyboard;
  if (!kb) return () => undefined;
  kb.on("keydown", handler);
  return () => kb.off("keydown", handler);
};

export const wrapIndex = (i: number, n: number): number => ((i % n) + n) % n;
