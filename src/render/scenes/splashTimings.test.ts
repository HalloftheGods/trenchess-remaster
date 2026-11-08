import { describe, expect, it } from "vitest";
import { HOLD, HOLD_REDUCED, MIN_HOLD, splashTimings } from "./splashTimings";

describe("splashTimings", () => {
  it("plays the full fade-in and hold when nothing was shown before it", () => {
    expect(splashTimings({ shownFor: 0, handoff: false, reduced: false })).toEqual({ fadeIn: 400, hold: HOLD, fadeOut: 500 });
  });

  it("skips the fade-in when the boot cover already showed the same card", () => {
    expect(splashTimings({ shownFor: 0, handoff: true, reduced: false }).fadeIn).toBe(0);
  });

  it("credits the time the card was already on screen against the hold", () => {
    expect(splashTimings({ shownFor: 1000, handoff: true, reduced: false }).hold).toBe(HOLD - 1000);
  });

  it("keeps a short minimum hold after a long load", () => {
    expect(splashTimings({ shownFor: 60_000, handoff: true, reduced: false }).hold).toBe(MIN_HOLD);
  });

  it("does not credit time against the hold without a handoff", () => {
    expect(splashTimings({ shownFor: 5000, handoff: false, reduced: false }).hold).toBe(HOLD);
  });

  it("uses the reduced-motion schedule with no fades", () => {
    expect(splashTimings({ shownFor: 0, handoff: false, reduced: true })).toEqual({ fadeIn: 0, hold: HOLD_REDUCED, fadeOut: 0 });
    expect(splashTimings({ shownFor: 60_000, handoff: true, reduced: true }).hold).toBe(MIN_HOLD);
  });
});
