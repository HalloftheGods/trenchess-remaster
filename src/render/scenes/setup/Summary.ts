import { STYLE_LABELS, theme } from "../../art/unitArt";
import { WORLD_LABELS, world } from "../../art/worlds/registry";
import { BACKDROP_CHOICES, backdrop } from "../../board/backdropMode";
import { COLOR, TEXT } from "../../ui/fonts";
import { hitZone, hoverSfx, pressSfx } from "../../ui/widgets/common";
import { BOARDS, COMMANDERS, DUELS, OPPONENTS, ORDERS, PALETTE_CHOICES, PRESET_CHOICES } from "./choices";
import type { SetupRows } from "./SetupRows";
import { MODE_CARDS, type WizardCtx } from "./wizard";

const ROW_H = 30;

interface Line {
  label: string;
  value: string;
  step: number;
}

const labelOf = (choices: { id: string; label: string }[], id: string): string => choices.find((c) => c.id === id)?.label ?? id;

const lines = (ctx: WizardCtx): Line[] => {
  const o = ctx.options;
  const out: Line[] = [{ label: "Mode", value: labelOf(MODE_CARDS, o.mode), step: 0 }];
  if (o.mode === "chi") out.push({ label: "Battlefield", value: labelOf(PRESET_CHOICES, o.preset ?? ""), step: 0 });
  out.push({ label: "Board", value: `${labelOf(BOARDS, o.board)} · ${WORLD_LABELS[world.id]}`, step: 1 });
  out.push({ label: "Backdrop", value: labelOf(BACKDROP_CHOICES, backdrop.mode), step: 1 });
  const who = o.opponent === "ai" ? `${labelOf(OPPONENTS, o.opponent)} · ${labelOf(COMMANDERS, o.difficulty)}` : labelOf(OPPONENTS, o.opponent);
  out.push({ label: "Opponent", value: who, step: 2 });
  out.push({ label: "Orders", value: labelOf(ORDERS, String(o.ordersPerTurn)), step: 2 });
  out.push({ label: "Chessmen", value: `${STYLE_LABELS[theme.style]} · ${labelOf(PALETTE_CHOICES, theme.palette)}`, step: 3 });
  out.push({ label: "Duels", value: labelOf(DUELS, o.duel ?? "full"), step: 3 });
  out.push({ label: "Fog of war", value: o.fog ? "On" : "Off", step: 3 });
  return out;
};

/** The last page: every choice on one line each; clicking a line jumps back to its step. */
export const buildSummary = (ctx: WizardCtx, rows: SetupRows): void => {
  const { scene, inner } = ctx;
  const list = scene.add.container(0, 0);
  const items = lines(ctx);
  items.forEach((line, i) => {
    const y = i * ROW_H;
    const rule = scene.add.rectangle(0, y + ROW_H - 1, inner, 1, COLOR.gold, 0.12).setOrigin(0, 0);
    const label = scene.add.text(0, y + 6, line.label.toUpperCase(), { ...TEXT.caps, fontSize: "12px" }).setOrigin(0, 0);
    const value = scene.add.text(inner - 22, y + 5, line.value, { ...TEXT.body, fontSize: "15px" }).setOrigin(1, 0);
    const edit = scene.add.text(inner, y + 5, "›", { ...TEXT.body, color: COLOR.goldHex }).setOrigin(1, 0);
    const zone = hitZone(scene, 0, y, inner, ROW_H);
    zone.on("pointerover", () => {
      hoverSfx();
      value.setColor(COLOR.goldHex);
    });
    zone.on("pointerout", () => value.setColor(COLOR.bone));
    zone.on("pointerup", () => {
      pressSfx();
      ctx.goTo(line.step);
    });
    list.add([rule, label, value, edit, zone]);
  });
  list.setSize(inner, items.length * ROW_H);
  rows.add(list, items.length * ROW_H);
  const note = scene.add.text(0, 0, "Click a line to change it. Everything here is remembered for next time.", { ...TEXT.small, wordWrap: { width: inner } });
  rows.add(note, 36);
};
