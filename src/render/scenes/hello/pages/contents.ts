import Phaser from "phaser";
import { showcaseDemo } from "../../../../game/tutorial/showcase";
import { COLOR, FONT } from "../../../ui/fonts";
import { hitZone, hoverSfx, nine, pressSfx } from "../../../ui/widgets/common";
import { BODY_TOP, INK, INNER, PAD, PAGE_TEXT, headline, type PageBuilder } from "../pageKit";

export interface ChapterLink {
  index: number;
  number: number;
  title: string;
  kicker: string;
}

const ROW_H = 58;

const row = (ctx: Parameters<PageBuilder>[0], link: ChapterLink, y: number): void => {
  const s = ctx.scene;
  const plate = ctx.add(nine(s, "ui-seg", 40, 40, "segment").setPosition(PAD, y + 4));
  const num = ctx.add(s.add.text(PAD + 20, y + 24, String(link.number), { fontFamily: FONT.display, fontSize: "18px", fontStyle: "700", color: COLOR.bone }).setOrigin(0.5, 0.5));
  const title = ctx.add(s.add.text(PAD + 54, y + 4, link.title, PAGE_TEXT.h3).setOrigin(0, 0));
  const kicker = ctx.add(s.add.text(PAD + 54, y + 28, link.kicker, PAGE_TEXT.small).setOrigin(0, 0));
  const page = ctx.add(s.add.text(PAD + INNER, y + 14, String(link.index + 1), { ...PAGE_TEXT.small, color: INK.faint }).setOrigin(1, 0));
  const dots = ctx.add(s.add.graphics());
  dots.lineStyle(1, Phaser.Display.Color.HexStringToColor(INK.faint).color, 0.5);
  for (let x = PAD + 54 + title.width + 10; x < PAD + INNER - 24; x += 6) dots.lineBetween(x, y + 20, x + 2, y + 20);
  const zone = ctx.add(hitZone(s, PAD, y, INNER, ROW_H - 6));
  const parts = [plate, num, title, kicker, page];
  zone.on("pointerover", () => {
    hoverSfx();
    plate.setTexture("ui-seg-on");
    num.setColor("#2a1d06");
    title.setColor(INK.accent);
  });
  zone.on("pointerout", () => {
    plate.setTexture("ui-seg");
    num.setColor(COLOR.bone);
    title.setColor(INK.dark);
  });
  zone.on("pointerup", () => {
    pressSfx();
    ctx.go(link.index);
  });
  ctx.objects.push(...parts);
};

/** Page 2, the contents: every chapter with its number, title and kicker; click one to turn to it. */
export const contentsPage = (chapters: ChapterLink[]): PageBuilder => (ctx) => {
  headline(ctx, "In this tome", "Contents");
  chapters.forEach((link, i) => row(ctx, link, BODY_TOP + i * ROW_H));
  const foot = BODY_TOP + chapters.length * ROW_H + 10;
  ctx.add(ctx.scene.add.text(PAD, foot, "Arrow keys and a swipe on the page turn the leaves. Esc closes the tome.", { ...PAGE_TEXT.small, wordWrap: { width: INNER } }).setOrigin(0, 0));
  const demo = showcaseDemo(ctx.tutorial, 11);
  return { destroy: () => demo.stop() };
};
