import { victoryDemo } from "../../../../game/tutorial/victory";
import { Flow, INK, INNER, PAD, PAGE_TEXT, headline, type PageBuilder } from "../pageKit";

/** The classic wording, kept word for word. */
const VICTORY = "Capture or checkmate the enemy King.";

/** Page 7, Victory: a staged three-move finish that captures the King, with the real effects, on a loop. */
export const victoryPage: PageBuilder = (ctx) => {
  headline(ctx, "Chapter 6 · Victory", "How the war ends");
  const flow = new Flow(ctx);
  const line = ctx.add(ctx.scene.add.text(PAD, flow.y, VICTORY, { ...PAGE_TEXT.quote, fontSize: "24px", wordWrap: { width: INNER } }).setOrigin(0, 0));
  flow.y += line.height + 14;
  flow.text("In Trenchess the King can fall in battle. Checkmate still wins, as in chess, but so does walking straight through the King: a capture ends the war on the spot.", "body");
  flow.rule();
  flow.text("On the field", "h3");
  const caption = flow.text("The enemy King is cornered…", "body");
  caption.setColor(INK.accent);
  flow.gap(12);
  flow.rule();
  flow.sticky("A King left idle in the Endless Sands at the end of your turn is lost to the desert, and the war with it.", INNER - 50, 2);
  flow.tip("Neither side able to make a legal move? Stalemate: the war ends in a draw.");
  const demo = victoryDemo(ctx.tutorial, { progress: (text) => caption.active && caption.setText(text) });
  return { destroy: () => demo.stop() };
};
