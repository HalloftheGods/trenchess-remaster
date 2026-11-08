import { ordersDemo } from "../../../../game/tutorial/orders";
import { Flow, INK, INNER, PAD, PAGE_TEXT, headline, penCircle, type PageBuilder } from "../pageKit";

/** The classic wording, kept word for word. */
const ORDERS = "In Command mode you give 2 orders a turn, each to a different unit. An order that puts the enemy king in check ends your turn, so you can't check and then capture the king.";
const STICKY = "An order that puts the enemy king in check ends your turn.";

/** Page 4, Orders: two chessmen light up in turn and move while the counter ticks. */
export const ordersPage: PageBuilder = (ctx) => {
  headline(ctx, "Chapter 3 · Orders", "Two orders a turn");
  const flow = new Flow(ctx);
  flow.text(ORDERS, "body");
  flow.gap(4);
  flow.text("Watch the field: the first chessman glows, takes its order and greys out as spent. Then the second. Spent chessmen rest until your next turn.", "small");
  flow.rule();
  const counter = ctx.add(ctx.scene.add.text(PAD + INNER / 2, flow.y + 14, "Order 1 of 2", { ...PAGE_TEXT.title, fontSize: "34px", color: INK.green }).setOrigin(0.5, 0.5));
  penCircle(ctx, PAD + INNER / 2, flow.y + 14, 150, 36);
  flow.gap(56);
  flow.rule();
  flow.sticky(STICKY, INNER - 60, 2);
  flow.tip("The opening turn is one order only. Classic (1) mode plays as chess does: one move a turn.");
  const demo = ordersDemo(ctx.tutorial, { progress: (text) => counter.active && counter.setText(text) });
  return { destroy: () => demo.stop() };
};
