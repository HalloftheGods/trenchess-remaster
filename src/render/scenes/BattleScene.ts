import Phaser from "phaser";
import type { Pos } from "../../engine/types";
import { inBounds } from "../../engine/rules";
import { BoardView } from "../board/BoardView";
import { UnitView } from "../board/UnitView";
import { Fx } from "../board/Fx";
import { Lighting } from "../board/Lighting";
import { Ambient } from "../board/Ambient";
import { Backdrop } from "../board/Backdrop";
import { TOP_LAYER, toCell } from "../iso";
import { paintTerrain } from "../art/terrainArt";
import { paintDecor } from "../art/decorArt";
import { paintUnits } from "../art/unitArt";
import { paintFx } from "../art/fxArt";
import { paintSky } from "../art/skyArt";
import { paintPlinth } from "../art/plinthArt";
import { BattleView } from "./battle/BattleView";

export type { Projection } from "../iso";
export type { ViewApi, Framing } from "./battle/BattleView";

export interface BattleHooks {
  ready: (scene: BattleScene) => void;
  click: (cell: Pos) => void;
  cancel: () => void;
  hover: (cell: Pos | null) => void;
}

export class BattleScene extends Phaser.Scene {
  board!: BoardView;
  units!: UnitView;
  fx!: Fx;
  lighting!: Lighting;
  ambient!: Ambient;
  backdrop!: Backdrop;
  view!: BattleView;
  webgl = false;
  private hooks!: BattleHooks;
  private lastCell = "";
  private dragging = false;

  constructor() {
    super("battle");
  }

  init(hooks: BattleHooks): void {
    this.hooks = hooks;
  }

  create(): void {
    this.webgl = this.sys.renderer.type === Phaser.WEBGL;
    paintTerrain(this);
    paintDecor(this);
    paintUnits(this);
    paintFx(this);
    paintSky(this);
    paintPlinth(this);
    this.backdrop = new Backdrop(this);
    this.fx = new Fx(this, this.fxLayer());
    this.board = new BoardView(this);
    this.lighting = new Lighting(this);
    this.ambient = new Ambient(this);
    this.board.onTerrainChanged = () => this.rebuildAmbience();
    this.board.onResized = () => {
      this.backdrop.relayout(0);
      this.view.refit();
    };
    this.board.onRelayout = (duration) => {
      this.backdrop.relayout(duration);
      this.lighting.dim(duration);
      if (duration > 0) this.time.delayedCall(duration, () => this.rebuildAmbience());
      else this.rebuildAmbience();
    };
    this.units = new UnitView(this, this.board, this.fx);
    this.view = new BattleView(this);
    this.clouds();
    this.postFx();
    this.time.addEvent({ delay: 450, loop: true, callback: () => this.desertHeat() });
    this.fit();
    this.scale.on("resize", () => this.fit());
    this.bindInput();
    this.hooks.ready(this);
    this.exposeTestHook();
  }

  /** `window.__tc.scene` for Playwright checks (the only sanctioned place for test hooks). */
  private exposeTestHook(): void {
    const w = window as unknown as { __tc?: Record<string, unknown> };
    w.__tc = Object.assign(w.__tc ?? {}, { scene: this });
  }

  private rebuildAmbience(): void {
    this.lighting.rebuild(this.board);
    this.ambient.rebuild(this.board);
  }

  /** A layer for the hit effects so one mild bloom lights them all (WebGL only). */
  private fxLayer(): Phaser.GameObjects.Layer | null {
    if (!this.webgl) return null;
    const layer = this.add.layer().setDepth(TOP_LAYER);
    layer.postFX.addBloom(0xffffff, 1, 1, 0.9, 1.15, 4);
    return layer;
  }

  private postFx(): void {
    const cam = this.cameras.main;
    if (!this.webgl || !cam.postFX) return;
    cam.postFX.addVignette(0.5, 0.5, 0.72, 0.45);
  }

  private clouds(): void {
    for (let i = 0; i < 4; i++) {
      const c = this.add.image(-900 + i * 500, -100 + i * 140, "cloud").setScale(3.2, 2).setAlpha(0.14).setDepth(TOP_LAYER - 20);
      this.tweens.add({ targets: c, x: c.x + 1800, duration: 60000 + i * 9000, repeat: -1, onRepeat: () => c.setX(-1100) });
    }
  }

  private desertHeat(): void {
    const sands = this.board.cellsOf("desert");
    if (!sands.length) return;
    const [r, c] = Phaser.Utils.Array.GetRandom(sands);
    const { x, y } = this.board.center(r, c);
    this.fx.heat(x + Phaser.Math.Between(-18, 18), y);
  }

  /** Instant re-fit of the camera for the current framing. */
  fit(): void {
    this.view.refit();
  }

  setDrift(on: boolean): void {
    this.view.setDrift(on);
  }

  update(_t: number, dt: number): void {
    this.backdrop.update(dt);
    this.view.update(dt);
  }

  private cellAt(p: Phaser.Input.Pointer): Pos | null {
    const world = this.cameras.main.getWorldPoint(p.x, p.y);
    const [r, c] = toCell(world.x, world.y);
    return inBounds(r, c) ? [r, c] : null;
  }

  private bindInput(): void {
    this.input.mouse?.disableContextMenu();
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown() || p.middleButtonDown()) {
        this.view.panBy(p.prevPosition.x - p.x, p.prevPosition.y - p.y);
        this.dragging = true;
        return;
      }
      const cell = this.cellAt(p);
      const key = cell ? cell.join(",") : "";
      if (key === this.lastCell) return;
      this.lastCell = key;
      this.hooks.hover(cell);
    });
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.dragging = false;
      if (p.rightButtonDown()) return;
      const cell = this.cellAt(p);
      if (cell) this.hooks.click(cell);
      else this.hooks.cancel();
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (p.rightButtonReleased() && !this.dragging) this.hooks.cancel();
    });
    this.input.on("wheel", (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.view.zoomBy(dy > 0 ? 0.9 : 1.1);
    });
  }
}
