import Phaser from "phaser";
import type { Pos } from "../../engine/types";
import { inBounds } from "../../engine/rules";
import { BoardView } from "../board/BoardView";
import { UnitView } from "../board/UnitView";
import { Fx } from "../board/Fx";
import { TILE_H, TOP_LAYER, toCell, toScreen } from "../iso";
import { paintTerrain } from "../art/terrainArt";
import { paintDecor } from "../art/decorArt";
import { paintUnits } from "../art/unitArt";
import { paintFx } from "../art/fxArt";

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
  private hooks!: BattleHooks;
  private lastCell = "";
  private dragging = false;
  private orbit = 0;
  private drift = true;

  constructor() {
    super("battle");
  }

  init(hooks: BattleHooks): void {
    this.hooks = hooks;
  }

  create(): void {
    paintTerrain(this);
    paintDecor(this);
    paintUnits(this);
    paintFx(this);
    this.plinth();
    this.fx = new Fx(this);
    this.board = new BoardView(this);
    this.units = new UnitView(this, this.board, this.fx);
    this.clouds();
    this.time.addEvent({ delay: 450, loop: true, callback: () => this.desertHeat() });
    this.fit();
    this.scale.on("resize", () => this.fit());
    this.bindInput();
    this.hooks.ready(this);
  }

  private plinth(): void {
    const top = toScreen(0, 0);
    const bottom = toScreen(11, 11);
    const g = this.add.graphics().setDepth(-10);
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(0, (top.y + bottom.y) / 2 + 40, 1250, 640);
    const rim = this.add.graphics().setDepth(-5);
    const l = toScreen(11, 0);
    const r = toScreen(0, 11);
    const pad = 10;
    rim.fillStyle(0x3b2a1c, 1);
    rim.fillPoints(
      [
        new Phaser.Math.Vector2(top.x, top.y - TILE_H / 2 - pad),
        new Phaser.Math.Vector2(r.x + 42 + pad * 2, r.y),
        new Phaser.Math.Vector2(bottom.x, bottom.y + TILE_H / 2 + pad + 30),
        new Phaser.Math.Vector2(l.x - 42 - pad * 2, l.y),
      ],
      true,
    );
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

  fit(): void {
    const cam = this.cameras.main;
    const w = this.scale.width;
    const h = this.scale.height;
    const zoom = Math.min(w / 1180, h / 760);
    cam.setZoom(Phaser.Math.Clamp(zoom, 0.4, 1.6));
    cam.centerOn(0, toScreen(5.5, 5.5).y + 10);
  }

  setDrift(on: boolean): void {
    this.drift = on;
    if (!on) this.fit();
  }

  update(_t: number, dt: number): void {
    if (!this.drift) return;
    this.orbit += dt / 4000;
    const cam = this.cameras.main;
    cam.centerOn(Math.sin(this.orbit) * 60, toScreen(5.5, 5.5).y + Math.cos(this.orbit * 0.7) * 25);
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
        const cam = this.cameras.main;
        cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
        cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
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
      const cam = this.cameras.main;
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.4, 2.2));
    });
  }
}
