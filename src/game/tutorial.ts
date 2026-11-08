import type Phaser from "phaser";
import type { Cell, Order, Pos, Terrain } from "../engine/types";
import { emptyGrid } from "../engine/game";
import { pseudoMovesFor } from "../engine/moves";
import type { BattleScene } from "../render/scenes/BattleScene";
import type { BoardView } from "../render/board/BoardView";
import type { UnitView } from "../render/board/UnitView";
import type { Fx } from "../render/board/Fx";
import { reducedMotion } from "../render/ui/fonts";

export type { Cell, Pos, Terrain } from "../engine/types";

/** What a chapter's board demo reports back to its page while it runs. */
export interface DemoHooks {
  /** A progress line for the page ("Order 1 of 2", "12 of 16 tiles"). */
  progress?: (text: string) => void;
}

/** Something a demo started that must die with the page. */
export interface Demo {
  stop(): void;
}

const samePos = (a: Pos, b: Pos): boolean => a[0] === b[0] && a[1] === b[1];

/**
 * Drives the live board for the Hello Trenchess tome. Owns a scratch board and terrain that never
 * touch `Match`; every timer goes through `scene.time` and every loop checks `alive()` so a page
 * turn (or the scene shutting down) stops the demo mid-sequence with `stop()`.
 */
export class Tutorial {
  board: Cell[][] = emptyGrid<Cell>(null);
  terrain: Terrain[][] = emptyGrid<Terrain>("flat");
  private timers: Phaser.Time.TimerEvent[] = [];
  private gen = 0;
  private moving = false;
  private onClick: ((cell: Pos) => void) | null = null;

  constructor(private scene: BattleScene) {}

  get boardView(): BoardView {
    return this.scene.board;
  }

  get units(): UnitView {
    return this.scene.units;
  }

  get fx(): Fx {
    return this.scene.fx;
  }

  get phaserScene(): Phaser.Scene {
    return this.scene;
  }

  /** The slow camera orbit (the cover page only). */
  drift(on: boolean): void {
    this.scene.setDrift(on);
  }

  /** True when the viewer asked for less motion: demos skip their loops and show end states. */
  get still(): boolean {
    return reducedMotion();
  }

  /** A token for one run of a demo; `alive(token)` turns false once `stop()` is called. */
  begin(): number {
    return this.gen;
  }

  alive(token: number): boolean {
    return token === this.gen && this.scene.sys.isActive();
  }

  /** Put a field on the board: scratch copies, every unit visible, no fog, no leftover markers. */
  show(board: Cell[][], terrain: Terrain[][]): void {
    this.board = board.map((row) => row.slice());
    this.terrain = terrain.map((row) => row.slice());
    this.boardView.clearMarkers();
    this.boardView.clearPreview();
    this.boardView.setTerrain(this.terrain);
    if (this.moving) this.units.sync(emptyGrid<Cell>(null));
    this.moving = false;
    this.units.sync(this.board);
    this.boardView.setFog(null);
    this.units.setVisibility(() => true, this.board);
    this.units.setSpent([]);
    this.units.highlight(null);
  }

  /** Re-place every token after the scratch board changed. */
  sync(): void {
    this.units.sync(this.board);
  }

  paint(r: number, c: number, t: Terrain): void {
    this.terrain[r][c] = t;
    this.boardView.paintCell(r, c, t);
  }

  /** A timer that dies with the current demo. */
  delay(ms: number, fn: () => void): void {
    const token = this.gen;
    const ev = this.scene.time.delayedCall(ms, () => {
      if (this.alive(token)) fn();
    });
    this.timers.push(ev);
  }

  wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.delay(ms, resolve));
  }

  /** The real order for `from` → `to` on the scratch board, or a plain step when the rules have none. */
  orderFor(from: Pos, to: Pos): Order | null {
    const unit = this.board[from[0]][from[1]];
    if (!unit) return null;
    const real = pseudoMovesFor(this.board, this.terrain, from, false).find((o) => samePos(o.to, to));
    if (real) return real;
    const captures: Pos[] = this.board[to[0]][to[1]] ? [to] : [];
    return { unitId: unit.id, from, to, style: "step", captures, path: [to], promotes: false };
  }

  /** Move a unit on the scratch board with the real move animation and capture effects. */
  async move(from: Pos, to: Pos): Promise<void> {
    const order = this.orderFor(from, to);
    if (!order) return;
    const before = this.board.map((row) => row.slice());
    const mover = this.board[from[0]][from[1]]!;
    for (const [r, c] of order.captures) this.board[r][c] = null;
    this.board[from[0]][from[1]] = null;
    this.board[to[0]][to[1]] = { ...mover, moved: true };
    this.moving = true;
    await this.units.animateOrder(order, before);
    this.moving = false;
    this.units.sync(this.board);
  }

  /** Board clicks (from the Hello scene) go to the running demo's handler, if it set one. */
  setClickHandler(handler: ((cell: Pos) => void) | null): void {
    this.onClick = handler;
  }

  click(cell: Pos): void {
    this.onClick?.(cell);
  }

  /** Ends the running demo: timers, markers, highlights and the click handler. */
  stop(): void {
    this.gen += 1;
    this.timers.forEach((t) => t.remove(false));
    this.timers = [];
    this.onClick = null;
    this.boardView.clearMarkers();
    this.boardView.clearPreview();
    this.boardView.setHover(null);
    this.units.setSpent([]);
    this.units.highlight(null);
    this.units.ghost(null, null);
  }
}
