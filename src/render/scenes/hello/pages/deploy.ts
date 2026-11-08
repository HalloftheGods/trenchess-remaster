import { deployDemo } from "../../../../game/tutorial/deploy";
import { Flow, INK, headline, type PageBuilder } from "../pageKit";

/** The classic wording, kept word for word. */
const DEPLOY = "Place up to 16 terrain tiles in your half and arrange your army in your back four rows.";

/** Page 3, Deploy: the back rows glow, tiles drop in, then the reader plants forests of their own. */
export const deployPage: PageBuilder = (ctx) => {
  headline(ctx, "Chapter 2 · Deploy", "Shape the battlefield");
  const flow = new Flow(ctx);
  flow.text(DEPLOY, "body");
  flow.gap(4);
  flow.text("Your back four rows glow green: that is where your chessmen may stand. Your whole half is yours to shape with Forests, Swamps, Mountains and Deserts.", "small");
  flow.rule();
  flow.text("Try it", "h3");
  flow.text("Click a glowing cell in your half to plant a Forest. The real rules apply: a tile cannot go under a chessman that could never enter it, and never a Desert under anyone.", "small");
  flow.gap(6);
  const counter = flow.text("Laying the Trench…", "h3");
  counter.setColor(INK.green);
  flow.gap(8);
  flow.sticky("Each side lays 16 tiles. In Ω Omega you lay every one yourself; π Pi and α Alpha roll the field for you; χ Chi hands you a named battlefield.");
  const demo = deployDemo(ctx.tutorial, { progress: (text) => counter.active && counter.setText(text) }, 23);
  return { destroy: () => demo.stop() };
};
