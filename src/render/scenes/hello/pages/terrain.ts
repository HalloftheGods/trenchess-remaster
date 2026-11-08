import type Phaser from "phaser";
import type { Terrain, UnitType } from "../../../../engine/types";
import { TerrainDemo } from "../../../../game/tutorial/terrain";
import { TERRAIN_LORE, UNIT_LORE } from "../../../../game/lore";
import { unitKey } from "../../../art/unitArt";
import { Segmented, type Choice } from "../../../ui/widgets";
import { Flow, INK, INNER, PAD, PAGE_TEXT, headline, type PageBuilder } from "../pageKit";

/** The classic wording, kept word for word. */
const TERRAIN = "Forests stop rooks and knights, swamps stop bishops and knights, mountains stop rooks and bishops. Deserts let anyone in but stop sliders, and units left idle there at the end of your turn perish.";

const KINDS: Terrain[] = ["forest", "swamp", "mountain", "desert"];

const CHOICES: Choice[] = KINDS.map((t) => ({ id: t, label: TERRAIN_LORE[t].name }));

const PORTRAIT = 0.5;

/** Page 5, Terrain: pick one of the four lands; the field fills with it and the blocked chessmen grey out. */
export const terrainPage: PageBuilder = (ctx) => {
  const s = ctx.scene;
  headline(ctx, "Chapter 4 · Terrain", "The four lands");
  const flow = new Flow(ctx);
  flow.text(TERRAIN, "body");
  flow.gap(2);
  const demo = new TerrainDemo(ctx.tutorial);
  let shown: Phaser.GameObjects.GameObject[] = [];
  const subtitle = ctx.add(s.add.text(PAD, 0, "", { ...PAGE_TEXT.h3, color: INK.accent }).setOrigin(0, 0));
  const blockedTitle = ctx.add(s.add.text(PAD, 0, "", PAGE_TEXT.small).setOrigin(0, 0));
  const rule = ctx.add(s.add.text(PAD, 0, "", { ...PAGE_TEXT.body, fontSize: "15px", wordWrap: { width: INNER } }).setOrigin(0, 0));
  const listTop = { y: 0 };
  const pick = (id: string): void => {
    const t = id as Terrain;
    const blocked = demo.pick(t);
    subtitle.setText(TERRAIN_LORE[t].subtitle);
    shown.forEach((o) => o.destroy());
    shown = [];
    blockedTitle.setText(blocked.length ? "Impassable for:" : "Home to all, but none can stay.");
    blocked.forEach((type: UnitType, i) => {
      const x = PAD + 10 + i * 150;
      const img = ctx.add(s.add.image(x + 16, listTop.y, unitKey(type, 0)).setOrigin(0.5, 0).setScale(PORTRAIT).setTint(0x9a9a9a));
      const name = ctx.add(s.add.text(x + 40, listTop.y + 8, `${UNIT_LORE[type].title}\n${UNIT_LORE[type].chess}`, { ...PAGE_TEXT.small, color: INK.dark }).setOrigin(0, 0));
      shown.push(img, name);
    });
    rule.setText(t === "desert" ? "Deserts let anyone in but stop sliders, and units left idle there at the end of your turn perish." : TERRAIN_LORE[t].text);
  };
  ctx.add(new Segmented(s, PAD, flow.y, INNER, CHOICES, "forest", pick));
  flow.gap(52);
  subtitle.setY(flow.y);
  flow.gap(30);
  blockedTitle.setY(flow.y);
  flow.gap(22);
  listTop.y = flow.y;
  flow.gap(62);
  rule.setY(flow.y);
  flow.gap(70);
  flow.sticky("Sanctuary: a chessman that may enter a land it names is hidden there in fog of war unless an enemy stands adjacent.", INNER - 60, -2);
  pick("forest");
  return { destroy: () => demo.stop() };
};
