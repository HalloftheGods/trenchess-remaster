import Phaser from "phaser";
import type { Pos, Terrain } from "../../engine/types";
import { BOARD_SIZE } from "../../engine/rules";
import { LAYER, depthOf, getProjection, liftOf, toScreen, type Projection } from "../iso";
import { MOVE_SLOTS, createTile, dress, movesFor, type TileMove, type TileSprites } from "./tileSprites";

export type MarkerKind = "move" | "dot" | "attack" | "select" | "hover" | "last" | "deploy" | "danger";

const markerKey = (kind: MarkerKind): string => (getProjection() === "top" ? `mk-${kind}-top` : `mk-${kind}`);

export class BoardView {
  private tiles: TileSprites[][] = [];
  private markers: Phaser.GameObjects.Image[] = [];
  private preview: Phaser.GameObjects.Image[] = [];
  private hover: Phaser.GameObjects.Image;
  private terrain: Terrain[][] = [];
  /** The projection the tiles are currently dressed for. */
  private dressed: Projection = getProjection();
  private scratch: TileMove[] = Array.from({ length: MOVE_SLOTS }, () => ({ obj: null as unknown as Phaser.GameObjects.Image, y: 0, layer: 0 }));
  /** Called after any terrain change (whole board or one cell) so dependents can rebuild. */
  onTerrainChanged: (() => void) | null = null;
  /** Called at the start of every relayout with its duration, so lighting, particles and backdrop can follow. */
  onRelayout: ((duration: number) => void) | null = null;

  constructor(private scene: Phaser.Scene) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      this.tiles.push([]);
      for (let c = 0; c < BOARD_SIZE; c++) this.tiles[r].push(createTile(scene, r, c));
    }
    this.hover = scene.add.image(0, 0, markerKey("hover")).setVisible(false);
  }

  setTerrain(terrain: Terrain[][]): void {
    this.terrain = terrain;
    terrain.forEach((row, r) => row.forEach((t, c) => this.applyCell(r, c, t)));
    this.onTerrainChanged?.();
  }

  paintCell(r: number, c: number, t: Terrain): void {
    if (this.terrain[r]) this.terrain[r][c] = t;
    this.applyCell(r, c, t);
    this.onTerrainChanged?.();
  }

  private applyCell(r: number, c: number, t: Terrain): void {
    const s = this.tiles[r][c];
    s.terrain = t;
    dress(s, r, c, this.dressed);
    const y = toScreen(r, c).y - liftOf(t);
    s.back.setY(y);
    s.front.setY(y);
    s.fog.setY(y);
    this.setShimmer(s, t === "swamp", y);
  }

  private setShimmer(s: TileSprites, on: boolean, y: number): void {
    s.shimmer?.remove();
    s.shimmer = null;
    s.glint.setVisible(on).setY(y).setAlpha(0);
    if (!on) return;
    s.shimmer = this.scene.tweens.add({ targets: s.glint, alpha: 0.22, duration: 1400 + Math.random() * 900, yoyo: true, repeat: -1, delay: Math.random() * 1500, ease: "Sine.InOut" });
  }

  /** Move every cell to its place for the current rotation/projection; swaps tile art mid-way when the projection changed. */
  relayout(duration: number): void {
    const target = getProjection();
    const swap = target !== this.dressed;
    this.clearPreview();
    this.setHover(null);
    this.onRelayout?.(duration);
    this.tiles.forEach((row, r) =>
      row.forEach((s, c) => {
        const x = movesFor(s, r, c, this.scratch);
        for (const m of this.scratch) {
          m.obj.setDepth(depthOf(r, c, m.layer));
          if (duration > 0) this.scene.tweens.add({ targets: m.obj, x, y: m.y, duration, ease: "Cubic.InOut" });
          else m.obj.setPosition(x, m.y);
        }
        if (swap && duration > 0) this.scene.tweens.add({ targets: s.tile, alpha: 0.35, duration: duration / 2, yoyo: true, ease: "Sine.InOut" });
      }),
    );
    if (!swap) return;
    const apply = () => {
      this.dressed = target;
      this.tiles.forEach((row, r) => row.forEach((s, c) => dress(s, r, c, target)));
      this.hover.setTexture(markerKey("hover"));
    };
    if (duration > 0) this.scene.time.delayedCall(duration / 2, apply);
    else apply();
  }

  pop(r: number, c: number): void {
    const s = this.tiles[r][c];
    const targets = [s.tile, s.back, s.front];
    targets.forEach((o) => o.setScale(0.6));
    this.scene.tweens.add({ targets, scale: 1, duration: 320, ease: "Back.Out" });
  }

  /** Surface centre of a cell in world space (lifted by its terrain in iso). */
  center(r: number, c: number): { x: number; y: number } {
    const { x, y } = toScreen(r, c);
    const t = this.terrain[r]?.[c] ?? "flat";
    return { x, y: y - liftOf(t) };
  }

  terrainAt(r: number, c: number): Terrain {
    return this.terrain[r]?.[c] ?? "flat";
  }

  showMarkers(cells: Pos[], kind: MarkerKind): void {
    for (const [r, c] of cells) {
      const { x, y } = this.center(r, c);
      const m = this.scene.add.image(x, y, markerKey(kind)).setDepth(depthOf(r, c, LAYER.marker)).setAlpha(0);
      this.scene.tweens.add({ targets: m, alpha: 1, duration: 140 });
      if (kind === "move" || kind === "attack" || kind === "danger") {
        this.scene.tweens.add({ targets: m, scale: 0.9, duration: 650, yoyo: true, repeat: -1, ease: "Sine.InOut" });
      }
      this.markers.push(m);
    }
  }

  showPreview(cells: Pos[], kind: MarkerKind, alpha: number): void {
    this.clearPreview();
    for (const [r, c] of cells) {
      const { x, y } = this.center(r, c);
      this.preview.push(this.scene.add.image(x, y, markerKey(kind)).setDepth(depthOf(r, c, LAYER.marker)).setAlpha(alpha));
    }
  }

  clearPreview(): void {
    this.preview.forEach((m) => m.destroy());
    this.preview = [];
  }

  clearMarkers(): void {
    this.markers.forEach((m) => m.destroy());
    this.markers = [];
  }

  setHover(cell: Pos | null): void {
    if (!cell) {
      this.hover.setVisible(false);
      return;
    }
    const { x, y } = this.center(cell[0], cell[1]);
    this.hover.setPosition(x, y).setDepth(depthOf(cell[0], cell[1], LAYER.marker) + 0.5).setVisible(true);
  }

  setFog(visible: boolean[][] | null): void {
    this.tiles.forEach((row, r) => row.forEach((s, c) => s.fog.setVisible(visible !== null && !visible[r][c])));
  }

  cellsOf(kind: Terrain): Pos[] {
    const out: Pos[] = [];
    this.terrain.forEach((row, r) => row.forEach((t, c) => t === kind && out.push([r, c])));
    return out;
  }
}
