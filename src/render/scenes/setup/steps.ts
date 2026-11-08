import type Phaser from "phaser";
import type { Difficulty } from "../../../engine/ai";
import type { MatchOptions } from "../../../game/Match";
import { theme, type PaletteId, type PieceStyle } from "../../art/unitArt";
import { WORLD_LABELS, WORLD_ORDER, WORLD_TAGLINES, world } from "../../art/worlds/registry";
import { BACKDROP_CHOICES, backdrop, type BackdropMode } from "../../board/backdropMode";
import type { DuelMode } from "../../duel/duel";
import { Carousel, Segmented, Toggle } from "../../ui/widgets";
import { ChoiceCards } from "../../ui/widgets/ChoiceCards";
import { COMMANDERS, DUELS, ORDERS, PALETTE_CHOICES, PRESET_CHOICES, STYLE_CHOICES } from "./choices";
import { OnlinePanel } from "./OnlinePanel";
import { SetupRows } from "./SetupRows";
import { buildSummary } from "./Summary";
import { BOARD_CARDS, MODE_CARDS, OPPONENT_CARDS, SUMMARY_STEP, type WizardCtx } from "./wizard";

export const WORLD_CHOICES = WORLD_ORDER.map((id) => ({ id, label: WORLD_LABELS[id], hint: WORLD_TAGLINES[id] }));

const CARD_H = 84;

/** What a built step hands back: its rows (for the height) and the online panel when it has one. */
export interface BuiltStep {
  rows: SetupRows;
  online: OnlinePanel | null;
}

const presetIndex = (options: MatchOptions): number => Math.max(0, PRESET_CHOICES.findIndex((c) => c.id === options.preset));

const battle = (ctx: WizardCtx, rows: SetupRows): void => {
  const { scene, options, inner } = ctx;
  rows.row("Mode", new ChoiceCards(scene, 0, 0, inner, MODE_CARDS, options.mode, 2, CARD_H, (id) => {
    ctx.set({ mode: id as MatchOptions["mode"] });
    ctx.refresh();
  }));
  if (options.mode === "chi") {
    rows.row("Battlefield", new Carousel(scene, 0, 0, inner, PRESET_CHOICES, presetIndex(options), (i) => ctx.set({ preset: PRESET_CHOICES[i].id })));
  }
};

const board = (ctx: WizardCtx, rows: SetupRows): void => {
  const { scene, options, inner } = ctx;
  rows.row("Board", new ChoiceCards(scene, 0, 0, inner, BOARD_CARDS, options.board, 2, CARD_H, (id) => ctx.set({ board: id as MatchOptions["board"] })));
  const worldAt = Math.max(0, WORLD_ORDER.indexOf(world.id));
  rows.row("World", new Carousel(scene, 0, 0, inner, WORLD_CHOICES, worldAt, (i) => ctx.emit("ui:world", WORLD_CHOICES[i].id)));
  rows.row("Backdrop", new Segmented(scene, 0, 0, inner, BACKDROP_CHOICES, backdrop.mode, (id) => ctx.emit("ui:backdrop", id as BackdropMode)));
};

const commanders = (ctx: WizardCtx, rows: SetupRows, onOnline: (panel: OnlinePanel) => void): void => {
  const { scene, options, inner } = ctx;
  rows.row("Opponent", new ChoiceCards(scene, 0, 0, inner, OPPONENT_CARDS, options.opponent, 3, CARD_H, (id) => {
    ctx.set({ opponent: id as MatchOptions["opponent"] });
    ctx.refresh();
  }));
  if (options.opponent === "ai") {
    rows.row("Commander", new Segmented(scene, 0, 0, inner, COMMANDERS, options.difficulty, (id) => ctx.set({ difficulty: id as Difficulty })));
  }
  if (options.opponent === "online") {
    const panel = new OnlinePanel(scene, inner, (start) => ctx.leave(() => ctx.emit("ui:start-online", start)));
    rows.row("Online", panel);
    onOnline(panel);
  }
  rows.row("Orders", new Segmented(scene, 0, 0, inner, ORDERS, String(options.ordersPerTurn), (id) => ctx.set({ ordersPerTurn: Number(id) })));
};

const look = (ctx: WizardCtx, rows: SetupRows): void => {
  const { scene, options, inner } = ctx;
  const styleAt = Math.max(0, STYLE_CHOICES.findIndex((c) => c.id === theme.style));
  rows.row("Chessmen", new Carousel(scene, 0, 0, inner, STYLE_CHOICES, styleAt, (i) => ctx.setTheme(STYLE_CHOICES[i].id as PieceStyle, theme.palette)));
  rows.row("Colors", new Segmented(scene, 0, 0, inner, PALETTE_CHOICES, theme.palette, (id) => ctx.setTheme(theme.style, id as PaletteId)));
  rows.row("Duels", new Segmented(scene, 0, 0, inner, DUELS, options.duel ?? "full", (id) => ctx.set({ duel: id as DuelMode })));
  rows.add(new Toggle(scene, 0, 0, "Fog of war (forests hide the enemy)", options.fog, (v) => ctx.set({ fog: v })), 40);
};

/** Builds one wizard page into `root`, top-left at (0, 0). */
export const buildStep = (step: number, ctx: WizardCtx, root: Phaser.GameObjects.Container): BuiltStep => {
  const rows = new SetupRows(ctx.scene, root, 0);
  let online: OnlinePanel | null = null;
  if (step === 0) battle(ctx, rows);
  if (step === 1) board(ctx, rows);
  if (step === 2) commanders(ctx, rows, (p) => (online = p));
  if (step === 3) look(ctx, rows);
  if (step === SUMMARY_STEP) buildSummary(ctx, rows);
  return { rows, online };
};
