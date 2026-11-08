import type { Pos, Terrain, UnitType } from "../../engine/types";
import { emptyGrid } from "../../engine/game";
import { blockedUnits } from "../../engine/rules";
import { createArmies } from "../../engine/setup";
import { rect } from "../../engine/presets";
import { sfx } from "../../audio/sfx";
import type { Demo, Tutorial } from "../tutorial";

/** The patch of the field the chosen terrain fills: the open middle, clear of both formations. */
const PATCH: Pos[] = rect(4, 7, 2, 9);

/**
 * Chapter 4, Terrain: the chosen terrain fills the middle of the field and every chessman it stops
 * is greyed out on the board. Returns the blocked unit types for the page to list.
 */
export class TerrainDemo implements Demo {
  constructor(private t: Tutorial) {
    t.begin();
    t.show(createArmies(), emptyGrid<Terrain>("flat"));
  }

  /** Fill the patch; a quick ripple of pops from the near edge. Returns who cannot enter. */
  pick(terrain: Terrain): UnitType[] {
    const t = this.t;
    t.boardView.clearMarkers();
    const rows = [...new Set(PATCH.map(([r]) => r))].sort((a, b) => b - a);
    rows.forEach((row, i) => {
      const cells = PATCH.filter(([r]) => r === row);
      const apply = (): void => {
        for (const [r, c] of cells) {
          t.paint(r, c, terrain);
          if (terrain !== "flat") t.boardView.pop(r, c);
        }
      };
      if (t.still || i === 0) apply();
      else t.delay(i * 70, apply);
    });
    if (terrain !== "flat") sfx.terrain();
    const blocked = blockedUnits(terrain);
    const ids: number[] = [];
    t.board.forEach((row) => row.forEach((u) => u && blocked.includes(u.type) && ids.push(u.id)));
    t.units.setSpent(ids);
    if (terrain === "desert") t.boardView.showMarkers(PATCH, "danger");
    return blocked;
  }

  stop(): void {
    this.t.stop();
  }
}
