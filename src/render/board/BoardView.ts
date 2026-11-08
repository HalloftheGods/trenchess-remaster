import Phaser from "phaser";
import type { Pos, Terrain } from "../../engine/types";
import { BOARD_SIZE } from "../../engine/rules";
import { ELEVATION, LAYER, depthOf, toScreen } from "../iso";
import { TILE_ORIGIN_Y, VARIANTS, tileKey } from "../art/terrainArt";
import { decorKey } from "../art/decorArt";

export type MarkerKind = "move" | "dot" | "attack" | "select" | "hover" | "last" | "deploy" | "danger";

interface TileSprites {
  tile: Phaser.GameObjects.Image;
  back: Phaser.GameObjects.Image;
  front: Phaser.GameObjects.Image;
  fog: Phaser.GameObjects.Image;
  shimmer: Phaser.Tweens.Tween | null;
  glint: Phaser.GameObjects.Image;
}

const variantOf = (r: number, c: number): number => (r * 7 + c * 13) % VARIANTS;

export class BoardView {
  private tiles: TileSprites[][] = [];
  private markers: Phaser.GameObjects.Image[] = [];
  private preview: Phaser.GameObjects.Image[] = [];
  private hover: Phaser.GameObjects.Image;
  private terrain: Terrain[][] = [];

  constructor(private scene: Phaser.Scene, private onResize: () => void = () => {}) {
    this.buildTiles();
    this.hover = scene.add.image(0, 0, "mk-hover").setVisible(false);
  }

  get size(): number {
    return this.tiles.length;
  }

  private buildTiles(): void {
    for (const row of this.tiles) {
      for (const s of row) {
        s.shimmer?.remove();
        [s.tile, s.back, s.front, s.fog, s.glint].forEach((o) => o.destroy());
      }
    }
    this.tiles = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      this.tiles.push([]);
      for (let c = 0; c < BOARD_SIZE; c++) this.tiles[r].push(this.createTile(r, c));
    }
  }

  private createTile(r: number, c: number): TileSprites {
    const { x, y } = toScreen(r, c);
    const tile = this.scene.add.image(x, y, tileKey("flat", true, 0)).setOrigin(0.5, TILE_ORIGIN_Y).setDepth(depthOf(r, c, LAYER.tile));
    const back = this.scene.add.image(x, y, "__DEFAULT").setOrigin(0.5, TILE_ORIGIN_Y).setDepth(depthOf(r, c, LAYER.backDecor)).setVisible(false);
    const front = this.scene.add.image(x, y, "__DEFAULT").setOrigin(0.5, TILE_ORIGIN_Y).setDepth(depthOf(r, c, LAYER.frontDecor)).setVisible(false);
    const fog = this.scene.add.image(x, y, "fog").setDepth(depthOf(r, c, LAYER.fx)).setVisible(false);
    const glint = this.scene.add.image(x, y, "glow").setBlendMode("ADD").setTint(0x9fffe0).setScale(1, 0.35).setAlpha(0).setDepth(depthOf(r, c, LAYER.marker)).setVisible(false);
    return { tile, back, front, fog, glint, shimmer: null };
  }

  setTerrain(terrain: Terrain[][]): void {
    if (terrain.length !== this.tiles.length) {
      this.clearMarkers();
      this.clearPreview();
      this.buildTiles();
      this.onResize();
    }
    this.terrain = terrain;
    terrain.forEach((row, r) => row.forEach((t, c) => this.paintCell(r, c, t)));
  }

  paintCell(r: number, c: number, t: Terrain): void {
    const s = this.tiles[r][c];
    const v = variantOf(r, c);
    const { y } = toScreen(r, c);
    const lift = ELEVATION[t];
    s.tile.setTexture(tileKey(t, (r + c) % 2 === 0, v));
    const decorated = t !== "flat";
    s.back.setVisible(decorated).setY(y - lift);
    s.front.setVisible(decorated).setY(y - lift);
    if (decorated) {
      s.back.setTexture(decorKey("back", t, v));
      s.front.setTexture(decorKey("front", t, v));
    }
    this.setShimmer(s, t === "swamp", y - lift);
  }

  private setShimmer(s: TileSprites, on: boolean, y: number): void {
    s.shimmer?.remove();
    s.shimmer = null;
    s.glint.setVisible(on).setY(y).setAlpha(0);
    if (!on) return;
    s.shimmer = this.scene.tweens.add({ targets: s.glint, alpha: 0.22, duration: 1400 + Math.random() * 900, yoyo: true, repeat: -1, delay: Math.random() * 1500, ease: "Sine.InOut" });
  }

  relayout(duration: number): void {
    this.tiles.forEach((row, r) =>
      row.forEach((s, c) => {
        const { x, y } = toScreen(r, c);
        const lift = ELEVATION[this.terrain[r]?.[c] ?? "flat"];
        const moves: [Phaser.GameObjects.Image, number, number][] = [
          [s.tile, y, LAYER.tile],
          [s.back, y - lift, LAYER.backDecor],
          [s.front, y - lift, LAYER.frontDecor],
          [s.fog, y - lift, LAYER.fx],
          [s.glint, y - lift, LAYER.marker],
        ];
        for (const [obj, ty, layer] of moves) {
          obj.setDepth(depthOf(r, c, layer));
          if (duration > 0) this.scene.tweens.add({ targets: obj, x, y: ty, duration, ease: "Cubic.InOut" });
          else obj.setPosition(x, ty);
        }
      }),
    );
  }

  pop(r: number, c: number): void {
    const s = this.tiles[r][c];
    const targets = [s.tile, s.back, s.front];
    targets.forEach((o) => o.setScale(0.6));
    this.scene.tweens.add({ targets, scale: 1, duration: 320, ease: "Back.Out" });
  }

  center(r: number, c: number): { x: number; y: number } {
    const { x, y } = toScreen(r, c);
    const t = this.terrain[r]?.[c] ?? "flat";
    return { x, y: y - ELEVATION[t] };
  }

  showMarkers(cells: Pos[], kind: MarkerKind): void {
    for (const [r, c] of cells) {
      const { x, y } = this.center(r, c);
      const m = this.scene.add.image(x, y, `mk-${kind}`).setDepth(depthOf(r, c, LAYER.marker)).setAlpha(0);
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
      this.preview.push(this.scene.add.image(x, y, `mk-${kind}`).setDepth(depthOf(r, c, LAYER.marker)).setAlpha(alpha));
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
