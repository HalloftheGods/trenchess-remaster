import type { Cell, Pos, Terrain, UnitType } from "../../engine/types";
import { emptyGrid } from "../../engine/game";
import { pseudoMovesFor } from "../../engine/moves";
import { CLASSIC } from "../../ui/movePreview";
import { sfx } from "../../audio/sfx";
import type { Demo, Tutorial } from "../tutorial";

/** The lone chessman stands here: dead centre, so every leap has room to show. */
const CENTRE: Pos = [5, 5];

export interface Reach {
  classic: Pos[];
  upgrade: Pos[];
}

/** Where a chessman standing alone at the centre can go, split into chess moves and Trenchess moves. */
export const reachOf = (type: UnitType): Reach => {
  const board = emptyGrid<Cell>(null);
  board[CENTRE[0]][CENTRE[1]] = { id: 1, type, owner: 0 };
  const out: Reach = { classic: [], upgrade: [] };
  for (const o of pseudoMovesFor(board, emptyGrid<Terrain>("flat"), CENTRE, false)) {
    const rel: [number, number] = [o.to[0] - CENTRE[0], o.to[1] - CENTRE[1]];
    (CLASSIC[type](rel[0], rel[1]) ? out.classic : out.upgrade).push(o.to);
  }
  return out;
};

/**
 * Chapter 5, The Chessmen grow stronger: one piece alone at the centre, its classic moves in green
 * ("deploy" markers) and its new Trenchess moves in gold ("select" markers), as in the HUD legend.
 */
export class ChessmenDemo implements Demo {
  constructor(private t: Tutorial) {
    t.begin();
  }

  pick(type: UnitType): Reach {
    const t = this.t;
    const board = emptyGrid<Cell>(null);
    board[CENTRE[0]][CENTRE[1]] = { id: 1, type, owner: 0 };
    t.show(board, emptyGrid<Terrain>("flat"));
    sfx.select();
    t.units.highlight(1);
    t.units.pulse(1);
    const reach = reachOf(type);
    t.boardView.showMarkers(reach.classic, "deploy");
    t.boardView.showMarkers(reach.upgrade, "select");
    return reach;
  }

  stop(): void {
    this.t.stop();
  }
}
