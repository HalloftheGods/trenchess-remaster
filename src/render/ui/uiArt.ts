import type Phaser from "phaser";
import { paintPlates } from "./art/plates";
import { paintControls } from "./art/controls";
import { paintEffects } from "./art/effects";
import { paintBadges } from "./art/badges";

export { LORE_COLORS } from "./art/badges";

/** Corner sizes of the nine-slice textures painted here. */
export const UI_CORNER = { panel: 18, button: 14, segment: 10 };

/**
 * Paints every UI texture once (idempotent: `paint()` skips keys that already exist).
 * Keys: ui-panel, ui-panel-parchment, ui-btn[-hover|-down|-primary|-primary-hover|-disabled],
 * ui-seg, ui-seg-on, ui-marker, ui-dot, ui-dot-on, ui-check, ui-check-on, ui-knob, ui-track,
 * ui-scanlines, ui-vignette, ui-spark, ui-ring, ui-chevron, plus the extras ui-glow, ui-glint,
 * ui-rule and the four lore badges ui-badge-forest/swamp/mountain/desert.
 */
export const paintUi = (scene: Phaser.Scene): void => {
  paintPlates(scene);
  paintControls(scene);
  paintEffects(scene);
  paintBadges(scene);
};
