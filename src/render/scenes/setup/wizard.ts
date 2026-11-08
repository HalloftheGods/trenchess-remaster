import type Phaser from "phaser";
import type { MatchOptions } from "../../../game/Match";
import type { PaletteId, PieceStyle } from "../../art/unitArt";
import type { CardChoice } from "../../ui/widgets/ChoiceCards";
import { BOARDS, MODES, OPPONENTS } from "./choices";

/** The wizard's pages, in order. The last one is the summary. */
export interface WizardStep {
  id: "battle" | "board" | "commanders" | "look" | "summary";
  title: string;
  subtitle: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: "battle", title: "The Battle", subtitle: "How the Trench is set." },
  { id: "board", title: "The Board", subtitle: "Where the battle is fought." },
  { id: "commanders", title: "Commanders", subtitle: "Who gives the orders." },
  { id: "look", title: "The Look", subtitle: "Chessmen, colors and spectacle." },
  { id: "summary", title: "To Battle", subtitle: "Everything is set." },
];

export const SUMMARY_STEP = WIZARD_STEPS.length - 1;

/** What a step builder can reach: the live options and the ways to change them. */
export interface WizardCtx {
  scene: Phaser.Scene;
  options: MatchOptions;
  inner: number;
  set: (patch: Partial<MatchOptions>) => void;
  setTheme: (style: PieceStyle, palette: PaletteId) => void;
  emit: (event: string, payload: unknown) => void;
  goTo: (step: number) => void;
  /** Rebuild the current step (a choice revealed or hid a row). */
  refresh: () => void;
  /** Slide the wizard out, then run `then` (used when a match starts). */
  leave: (then: () => void) => void;
}

/** Cards carry a glyph and a hint short enough for two lines. */
const cards = (choices: typeof MODES, glyphs: string[], hints: Record<string, string>): CardChoice[] =>
  choices.map((c, i) => ({ ...c, glyph: glyphs[i] ?? "•", hint: hints[c.id] ?? c.hint ?? "" }));

export const MODE_CARDS: CardChoice[] = cards(MODES, ["Ω", "χ", "π", "α", "τ"], {
  omega: "Lay every tile and place every chessman.",
  chi: "Pick a named battlefield, then arrange your army.",
  pi: "Classic formation, random battlefield.",
  alpha: "Random terrain, random formations.",
  tau: "Pure classic chess, 8×8 board.",
}).map((c) => ({ ...c, label: c.label.replace(/^[Ωχπατ] /, "") }));
export const BOARD_CARDS: CardChoice[] = cards(BOARDS, ["XII", "VIII"], {
  extended: "The full Trench, 16 tiles a side.",
  classic: "The classic chessboard, 8 a side.",
});
export const OPPONENT_CARDS: CardChoice[] = cards(OPPONENTS, ["⚙", "⚔", "✶"], {
  ai: "Play the computer.",
  hotseat: "Two players, one screen.",
  online: "Host or join by room code.",
});
