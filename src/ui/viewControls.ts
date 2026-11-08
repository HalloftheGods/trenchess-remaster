import type Phaser from "phaser";
import type { BattleScene } from "../render/scenes/BattleScene";
import type { ViewAction } from "../render/ui/Compass";
import type { Projection } from "../render/iso";

const PAN = 48;

/** V cycles the views: diorama, front table, straight-on. */
const NEXT_PROJECTION: Record<Projection, Projection> = { iso: "front", front: "top", top: "iso" };

/**
 * Maps `ui:view` events (from the compass) and the view keys to the battle scene's View API, and
 * calls `after` once a morph has settled so the match can redraw its markers.
 */
export const bindViewControls = (game: Phaser.Game, scene: () => BattleScene, after: () => void, signal: AbortSignal): void => {
  const run = (a: ViewAction): void => {
    const view = scene().view;
    if (a.action === "rotate") void view.rotate(a.delta).then(after);
    if (a.action === "projection") void view.setProjection(a.value).then(after);
    if (a.action === "zoom") view.zoomBy(a.factor);
    if (a.action === "reset") view.reset();
  };
  game.events.on("ui:view", run);
  signal.addEventListener("abort", () => game.events.off("ui:view", run), { once: true });
  const keys: Record<string, ViewAction> = {
    KeyQ: { action: "rotate", delta: -1 },
    KeyE: { action: "rotate", delta: 1 },
    Home: { action: "reset" },
    Equal: { action: "zoom", factor: 1.15 },
    NumpadAdd: { action: "zoom", factor: 1.15 },
    Minus: { action: "zoom", factor: 1 / 1.15 },
    NumpadSubtract: { action: "zoom", factor: 1 / 1.15 },
  };
  const pans: Record<string, [number, number]> = { ArrowLeft: [-PAN, 0], ArrowRight: [PAN, 0], ArrowUp: [0, -PAN], ArrowDown: [0, PAN] };
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = keys[e.code];
      if (key) run(key);
      if (e.code === "KeyV") run({ action: "projection", value: NEXT_PROJECTION[scene().view.projection] });
      const pan = pans[e.code];
      if (pan) scene().view.panBy(pan[0], pan[1]);
    },
    { signal },
  );
};
