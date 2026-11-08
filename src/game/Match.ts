import type { Cell, GameState, Order, PlayerId, Pos, Terrain, TurnEvent } from "../engine/types";
import { applyOrder, cloneState, createGame, endTurn, legalOrders, unitsInDanger } from "../engine/game";
import { isInCheck, findKing } from "../engine/moves";
import { canDeployTo, canPlaceTerrain, createArmies, randomBattlefield, randomTerrainFor, seededRng, swapUnits, terrainCount } from "../engine/setup";
import { TERRAIN_QUOTA, deployRows, homeRows, inRows, opponent } from "../engine/rules";
import { emptyGrid } from "../engine/game";
import { canSee, visibleCells } from "../engine/vision";
import type { Difficulty } from "../engine/ai";
import type { BoardView } from "../render/board/BoardView";
import type { UnitView } from "../render/board/UnitView";
import type { Hud } from "../ui/Hud";
import { sfx } from "../audio/sfx";
import { AiClient } from "./AiClient";

export interface MatchOptions {
  opponent: "ai" | "hotseat";
  difficulty: Difficulty;
  ordersPerTurn: number;
  battlefield: "random" | "open";
  fog: boolean;
}

export type DeployTool = "units" | Terrain;

type Phase = "idle" | "deploy" | "battle" | "over";

const samePos = (a: Pos, b: Pos): boolean => a[0] === b[0] && a[1] === b[1];

export class Match {
  phase: Phase = "idle";
  options!: MatchOptions;
  board: Cell[][] = createArmies();
  terrain: Terrain[][] = emptyGrid<Terrain>("flat");
  state: GameState | null = null;
  deployer: PlayerId = 0;
  tool: DeployTool = "units";
  private selected: Pos | null = null;
  private legal: Order[] = [];
  private busy = false;
  private ai = new AiClient();

  constructor(private boardView: BoardView, private units: UnitView, private hud: Hud) {}

  showcase(seed: number): void {
    const field = randomBattlefield(seed);
    this.board = field.board;
    this.terrain = field.terrain;
    this.boardView.setTerrain(this.terrain);
    this.units.sync(this.board);
  }

  start(options: MatchOptions): void {
    this.options = options;
    const seed = Math.floor(Math.random() * 1e9);
    const field = options.battlefield === "random" ? randomBattlefield(seed) : { board: createArmies(), terrain: emptyGrid<Terrain>("flat") };
    this.board = field.board;
    this.terrain = field.terrain;
    this.state = null;
    this.phase = "deploy";
    this.deployer = 0;
    this.tool = "units";
    this.selected = null;
    this.boardView.setTerrain(this.terrain);
    this.units.sync(this.board);
    this.boardView.setFog(null);
    this.units.setVisibility(() => true, this.board);
    this.refreshDeploy();
  }

  isHuman(p: PlayerId): boolean {
    return p === 0 || this.options.opponent === "hotseat";
  }

  get viewer(): PlayerId {
    if (this.options?.opponent === "hotseat") return this.state?.current ?? this.deployer;
    return 0;
  }

  setTool(tool: DeployTool): void {
    this.tool = tool;
    this.selected = null;
    this.refreshDeploy();
  }

  terrainLeft(): number {
    return TERRAIN_QUOTA - terrainCount(this.terrain, this.deployer);
  }

  randomizeTerrain(): void {
    randomTerrainFor(this.board, this.terrain, this.deployer, seededRng(Math.floor(Math.random() * 1e9)));
    this.boardView.setTerrain(this.terrain);
    sfx.terrain();
    this.refreshDeploy();
  }

  clearTerrain(): void {
    const [lo, hi] = homeRows(this.deployer);
    for (let r = lo; r <= hi; r++) this.terrain[r].fill("flat");
    this.boardView.setTerrain(this.terrain);
    this.refreshDeploy();
  }

  ready(): void {
    if (this.phase !== "deploy") return;
    if (this.options.opponent === "hotseat" && this.deployer === 0) {
      this.deployer = 1;
      this.selected = null;
      this.hud.banner("Crimson Host deploys", "Shape your half of the battlefield");
      this.refreshDeploy();
      return;
    }
    this.beginBattle();
  }

  private beginBattle(): void {
    if (this.options.opponent === "ai" && this.options.battlefield === "open") {
      randomTerrainFor(this.board, this.terrain, 1, seededRng(Math.floor(Math.random() * 1e9)));
      this.boardView.setTerrain(this.terrain);
    }
    this.state = createGame(this.board, this.terrain, { ordersPerTurn: this.options.ordersPerTurn });
    this.phase = "battle";
    this.boardView.clearMarkers();
    this.hud.showDeploy(false);
    this.hud.banner("Battle!", "Azure Legion moves first. 1 order on the opening turn.");
    sfx.turn();
    this.refreshBattle();
  }

  click(cell: Pos): void {
    if (this.busy) return;
    if (this.phase === "deploy") this.deployClick(cell);
    if (this.phase === "battle") this.battleClick(cell);
  }

  cancel(): void {
    if (this.selected) sfx.deselect();
    this.selected = null;
    this.units.highlight(null);
    if (this.phase === "deploy") this.refreshDeploy();
    if (this.phase === "battle") this.refreshBattle();
  }

  hover(cell: Pos | null): void {
    this.boardView.setHover(cell);
    if (!cell) return;
    const u = this.board[cell[0]][cell[1]];
    const shown = u && this.unitVisible(cell) ? u : null;
    this.hud.inspect(shown, this.terrain[cell[0]][cell[1]]);
  }

  private unitVisible(pos: Pos): boolean {
    if (!this.state || !this.options.fog) return true;
    return canSee(this.state, this.viewer, visibleCells(this.state, this.viewer), pos);
  }

  private deployClick(cell: Pos): void {
    if (this.tool === "units") return this.deployUnitClick(cell);
    const [r, c] = cell;
    const t = this.tool;
    const current = this.terrain[r][c];
    const next = current === t ? "flat" : t;
    const growing = current === "flat" && next !== "flat";
    const allowed = next === "flat" || canPlaceTerrain(this.board, this.deployer, cell, next);
    if (!allowed || (growing && this.terrainLeft() <= 0)) {
      sfx.error();
      return;
    }
    this.terrain[r][c] = next;
    this.boardView.paintCell(r, c, next);
    this.boardView.pop(r, c);
    sfx.terrain();
    this.refreshDeploy();
  }

  private deployUnitClick(cell: Pos): void {
    const u = this.board[cell[0]][cell[1]];
    if (!this.selected) {
      if (u?.owner !== this.deployer) return;
      this.selected = cell;
      sfx.select();
      this.refreshDeploy();
      return;
    }
    if (samePos(this.selected, cell)) return this.cancel();
    if (!canDeployTo(this.board, this.terrain, this.deployer, this.selected, cell)) {
      if (u?.owner === this.deployer) {
        this.selected = cell;
        this.refreshDeploy();
      } else sfx.error();
      return;
    }
    swapUnits(this.board, this.selected, cell);
    this.units.sync(this.board);
    sfx.move(false);
    this.selected = null;
    this.refreshDeploy();
  }

  private refreshDeploy(): void {
    this.boardView.clearMarkers();
    const zone: Pos[] = [];
    const rows = this.tool === "units" ? deployRows(this.deployer) : homeRows(this.deployer);
    for (let r = 0; r < 12; r++) for (let c = 0; c < 12; c++) if (inRows(r, rows)) zone.push([r, c]);
    this.boardView.showMarkers(zone, "deploy");
    if (this.selected) {
      this.boardView.showMarkers([this.selected], "select");
      const targets = zone.filter((p) => canDeployTo(this.board, this.terrain, this.deployer, this.selected!, p));
      this.boardView.showMarkers(targets, "dot");
    }
    this.units.highlight(this.selected ? this.board[this.selected[0]][this.selected[1]]?.id ?? null : null);
    this.hud.showDeploy(true);
    this.hud.updateDeploy(this);
  }

  private battleClick(cell: Pos): void {
    const s = this.state!;
    if (!this.isHuman(s.current)) return;
    const order = this.selected && this.legal.find((o) => samePos(o.from, this.selected!) && samePos(o.to, cell));
    if (order) {
      void this.execute(order);
      return;
    }
    const u = s.board[cell[0]][cell[1]];
    const mine = u?.owner === s.current && !s.acted.includes(u.id);
    if (!mine) return this.cancel();
    this.selected = cell;
    sfx.select();
    this.units.pulse(u.id);
    this.refreshBattle();
  }

  private refreshBattle(): void {
    const s = this.state!;
    this.legal = legalOrders(s);
    this.boardView.clearMarkers();
    this.applyFog();
    this.boardView.showMarkers(unitsInDanger(s).filter(() => this.isHuman(s.current)), "danger");
    if (isInCheck(s, s.current)) {
      const k = findKing(s.board, s.current);
      if (k) this.boardView.showMarkers([k], "attack");
    }
    if (this.selected) {
      const mine = this.legal.filter((o) => samePos(o.from, this.selected!));
      this.boardView.showMarkers([this.selected], "select");
      this.boardView.showMarkers(mine.filter((o) => !o.captures.length).map((o) => o.to), "move");
      this.boardView.showMarkers(mine.filter((o) => o.captures.length).map((o) => o.to), "attack");
    }
    this.units.highlight(this.selected ? s.board[this.selected[0]][this.selected[1]]?.id ?? null : null);
    this.hud.updateBattle(s, this.options, this.isHuman(s.current));
  }

  private applyFog(): void {
    const s = this.state!;
    if (!this.options.fog) return;
    const grid = visibleCells(s, this.viewer);
    this.boardView.setFog(grid);
    this.units.setVisibility((pos) => canSee(s, this.viewer, grid, pos), s.board);
  }

  async endTurnNow(): Promise<void> {
    const s = this.state;
    if (!s || this.busy || this.phase !== "battle" || !this.isHuman(s.current)) return;
    this.selected = null;
    await this.play(endTurn(s), cloneState(s).board);
  }

  private async execute(order: Order): Promise<void> {
    const s = this.state!;
    const before = s.board.map((row) => row.slice());
    this.selected = null;
    this.boardView.clearMarkers();
    const events = applyOrder(s, order);
    await this.play(events, before);
  }

  private async play(events: TurnEvent[], before: Cell[][]): Promise<void> {
    const s = this.state!;
    this.busy = true;
    this.boardView.clearMarkers();
    for (const e of events) await this.animate(e, before);
    this.board = s.board;
    this.units.sync(s.board);
    this.busy = false;
    if (s.outcome) return this.finish();
    this.refreshBattle();
    if (!this.isHuman(s.current)) void this.aiTurn();
  }

  private async animate(e: TurnEvent, before: Cell[][]): Promise<void> {
    const s = this.state!;
    if (e.kind === "order" && e.order) {
      this.hud.log(e, before);
      await this.units.animateOrder(e.order, before);
    }
    if (e.kind === "promote" && e.at) await this.units.promote(e.at, s.board);
    if (e.kind === "perish" && e.at) {
      this.hud.log(e, before);
      await this.units.perish(e.victims[0], e.at);
    }
    if (e.kind === "turn" && !s.outcome) this.announceTurn();
  }

  private announceTurn(): void {
    const s = this.state!;
    const name = s.current === 0 ? "Azure Legion" : "Crimson Host";
    const orders = `${s.ordersLeft} order${s.ordersLeft > 1 ? "s" : ""}`;
    const check = isInCheck(s, s.current) ? " · KING IN CHECK!" : "";
    this.hud.banner(`${name}`, `Turn ${s.turn} · ${orders}${check}`);
    sfx.turn();
  }

  private async aiTurn(): Promise<void> {
    const s = this.state!;
    this.hud.thinking(true);
    const started = performance.now();
    const order = await this.ai.choose(s, this.options.difficulty);
    const wait = Math.max(0, 450 - (performance.now() - started));
    await new Promise((r) => setTimeout(r, wait));
    this.hud.thinking(false);
    if (this.phase !== "battle" || this.state !== s) return;
    if (order) return this.execute(order);
    await this.play(endTurn(s), s.board.map((row) => row.slice()));
  }

  private finish(): void {
    const s = this.state!;
    this.phase = "over";
    const outcome = s.outcome!;
    const humanWon = outcome.winner !== null && this.isHuman(outcome.winner);
    if (outcome.winner === null) sfx.defeat();
    else if (humanWon) sfx.victory();
    else sfx.defeat();
    this.boardView.setFog(null);
    this.units.setVisibility(() => true, s.board);
    this.hud.gameOver(outcome, this.options, s);
  }

  quit(): void {
    this.phase = "idle";
    this.state = null;
    this.ai.reset();
    this.boardView.clearMarkers();
    this.boardView.setFog(null);
  }

  otherSide(): PlayerId {
    return opponent(this.deployer);
  }
}
