/**
 * Studio card timings. The boot cover in index.html shows the same card while the game loads, so
 * the scene credits that time against its hold instead of making the viewer sit through it twice.
 */
export const FADE_IN = 400;
export const HOLD = 1600;
export const FADE_OUT = 500;
export const HOLD_REDUCED = 1000;
/** The scene always shows the card at least this long once it has taken over from the cover. */
export const MIN_HOLD = 600;

export interface SplashTimings {
  fadeIn: number;
  hold: number;
  fadeOut: number;
}

export interface SplashContext {
  /** How long the boot cover has already shown the card, in ms. */
  shownFor: number;
  /** True when the cover hands the card over in place, so the scene need not fade it in again. */
  handoff: boolean;
  reduced: boolean;
}

export const splashTimings = ({ shownFor, handoff, reduced }: SplashContext): SplashTimings => {
  const full = reduced ? HOLD_REDUCED : HOLD;
  const hold = handoff ? Math.max(MIN_HOLD, full - shownFor) : full;
  if (reduced) return { fadeIn: 0, hold, fadeOut: 0 };
  return { fadeIn: handoff ? 0 : FADE_IN, hold, fadeOut: FADE_OUT };
};
