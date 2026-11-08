import type Phaser from "phaser";
import type { UnitType } from "../../../../engine/types";
import { ChessmenDemo } from "../../../../game/tutorial/chessmen";
import { UNIT_LORE } from "../../../../game/lore";
import { UNIT_TYPES, unitKey } from "../../../art/unitArt";
import { hitZone, hoverSfx, nine } from "../../../ui/widgets/common";
import { Flow, INK, INNER, PAD, PAGE_TEXT, headline, type PageBuilder, type PageCtx } from "../pageKit";

const PLATE_W = 70;
const PLATE_H = 90;
const GAP = (INNER - PLATE_W * UNIT_TYPES.length) / (UNIT_TYPES.length - 1);

interface Tile {
  type: UnitType;
  bg: Phaser.GameObjects.NineSlice;
  name: Phaser.GameObjects.Text;
}

const tile = (ctx: PageCtx, type: UnitType, i: number, y: number, pick: (t: UnitType) => void): Tile => {
  const s = ctx.scene;
  const x = PAD + i * (PLATE_W + GAP);
  const bg = ctx.add(nine(s, "ui-seg", PLATE_W, PLATE_H, "segment").setPosition(x, y));
  ctx.add(s.add.image(x + PLATE_W / 2, y + 6, unitKey(type, 0)).setOrigin(0.5, 0).setScale(0.62));
  const name = ctx.add(s.add.text(x + PLATE_W / 2, y + PLATE_H + 4, UNIT_LORE[type].chess, { ...PAGE_TEXT.small, color: INK.dark }).setOrigin(0.5, 0));
  const zone = ctx.add(hitZone(s, x, y, PLATE_W, PLATE_H + 20));
  zone.on("pointerover", () => {
    hoverSfx();
    bg.setAlpha(0.8);
  });
  zone.on("pointerout", () => bg.setAlpha(1));
  zone.on("pointerup", () => pick(type));
  return { type, bg, name };
};

const legend = (ctx: PageCtx, x: number, y: number, key: string, text: string, color: string): void => {
  ctx.add(ctx.scene.add.image(x + 12, y + 9, key).setScale(0.3));
  ctx.add(ctx.scene.add.text(x + 30, y, text, { ...PAGE_TEXT.small, color }).setOrigin(0, 0));
};

/** Page 6, the Chessmen: pick a piece; it stands alone at the centre showing chess moves in green and Trenchess moves in gold. */
export const chessmenPage: PageBuilder = (ctx) => {
  const s = ctx.scene;
  headline(ctx, "Chapter 5 · The Chessmen", "The Chessmen grow stronger");
  const flow = new Flow(ctx);
  flow.text("Every chessman keeps its chess moves and learns one more. Pick one.", "small");
  const demo = new ChessmenDemo(ctx.tutorial);
  const tiles: Tile[] = [];
  const title = ctx.add(s.add.text(PAD, 0, "", PAGE_TEXT.title).setOrigin(0, 0));
  const motto = ctx.add(s.add.text(PAD, 0, "", { ...PAGE_TEXT.quote, fontSize: "16px" }).setOrigin(0, 0));
  const classic = ctx.add(s.add.text(PAD, 0, "", { ...PAGE_TEXT.h3, color: INK.green }).setOrigin(0, 0));
  const ability = ctx.add(s.add.text(PAD, 0, "", { ...PAGE_TEXT.h3, color: INK.gold }).setOrigin(0, 0));
  const moves = ctx.add(s.add.text(PAD, 0, "", { ...PAGE_TEXT.body, fontSize: "15px", wordWrap: { width: INNER } }).setOrigin(0, 0));
  const pick = (type: UnitType): void => {
    demo.pick(type);
    const lore = UNIT_LORE[type];
    tiles.forEach((t) => {
      t.bg.setTexture(t.type === type ? "ui-seg-on" : "ui-seg");
      t.name.setColor(t.type === type ? INK.accent : INK.dark);
    });
    title.setText(lore.title);
    motto.setText(lore.motto);
    classic.setText(`Classic: ${lore.classicMove}`);
    ability.setText(`New: ${lore.ability}`);
    moves.setText(lore.moves);
  };
  UNIT_TYPES.forEach((type, i) => tiles.push(tile(ctx, type, i, flow.y, pick)));
  flow.gap(PLATE_H + 30);
  flow.rule();
  title.setY(flow.y);
  flow.gap(40);
  motto.setY(flow.y);
  flow.gap(28);
  classic.setY(flow.y);
  flow.gap(26);
  ability.setY(flow.y);
  flow.gap(32);
  moves.setY(flow.y);
  flow.gap(96);
  legend(ctx, PAD, flow.y, "mk-deploy", "Classic move", INK.green);
  legend(ctx, PAD + INNER / 2, flow.y, "mk-select", "New move", INK.gold);
  pick("king");
  return { destroy: () => demo.stop() };
};
