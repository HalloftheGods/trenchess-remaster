import type { Battlefield } from "../field";
import { FLOOR_Y } from "../painter";

/** Placeholder battlefield; replaced by the authored one. */
const field: Battlefield = {
  terrain: "mountain",
  ambient: "none",
  ambientColors: ["#ffffff"],
  layers: [
    { parallax: 0.05, paint: (p) => p.bands(0, FLOOR_Y - 20, ["#3a6ad0", "#6a9ae8", "#a8c8f0"]) },
    { parallax: 1, paint: (p) => p.bands(FLOOR_Y - 22, p.h, ["#6ab04c", "#4a8a38", "#2e6024"]) },
  ],
};

export default field;
