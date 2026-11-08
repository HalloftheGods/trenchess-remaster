import { showcaseDemo } from "../../../../game/tutorial/showcase";
import { motionMs, reducedMotion } from "../../../ui/fonts";
import { LOGO_KEY } from "../../title/Lockup";
import { Flow, INK, INNER, PAD, PAGE_TEXT, PANEL_W, type PageBuilder } from "../pageKit";

export const PROPHECY = "From the trench, the Chessmen grow stronger.";
const PROPHECY_TEXT = "The world cracks into terrain, and every piece learns a new way to fight.";

/** Page 1, the cover: the prophecy over a random battlefield, with the board slowly drifting. */
export const coverPage: PageBuilder = (ctx) => {
  const s = ctx.scene;
  const flow = new Flow(ctx);
  flow.y = 54;
  if (s.textures.exists(LOGO_KEY)) {
    const logo = ctx.add(s.add.image(PANEL_W / 2, flow.y, LOGO_KEY).setOrigin(0.5, 0));
    const k = Math.min(1, (INNER - 40) / logo.width);
    logo.setScale(k);
    flow.y += logo.displayHeight + 24;
  }
  ctx.add(s.add.text(PANEL_W / 2, flow.y, "HELLO TRENCHESS", PAGE_TEXT.kicker).setOrigin(0.5, 0));
  flow.y += 26;
  ctx.add(s.add.text(PANEL_W / 2, flow.y, "The Prophecy", PAGE_TEXT.title).setOrigin(0.5, 0));
  flow.y += 56;
  flow.rule();
  flow.gap(6);
  const quote = ctx.add(s.add.text(PANEL_W / 2, flow.y, `“${PROPHECY}”`, { ...PAGE_TEXT.quote, align: "center", wordWrap: { width: INNER - 30 } }).setOrigin(0.5, 0));
  flow.y += quote.height + 18;
  const body = ctx.add(s.add.text(PANEL_W / 2, flow.y, PROPHECY_TEXT, { ...PAGE_TEXT.body, align: "center", wordWrap: { width: INNER - 30 } }).setOrigin(0.5, 0));
  flow.y += body.height + 16;
  flow.rule();
  flow.gap(10);
  flow.text(
    "This tome turns one page at a time. Watch the battlefield to your left: every chapter plays out on it while you read, and some pages ask you to join in.",
    "small",
    INNER - 10,
    PAD + 5,
  );
  const hint = ctx.add(s.add.text(PANEL_W - PAD, flow.y + 26, "Turn the page  ›", { ...PAGE_TEXT.h3, color: INK.gold }).setOrigin(1, 0));
  if (!reducedMotion()) s.tweens.add({ targets: hint, x: hint.x + 6, duration: motionMs(700), yoyo: true, repeat: -1, ease: "Sine.InOut" });
  const demo = showcaseDemo(ctx.tutorial, 7);
  ctx.tutorial.drift(true);
  return {
    destroy: () => {
      ctx.tutorial.drift(false);
      demo.stop();
    },
  };
};
