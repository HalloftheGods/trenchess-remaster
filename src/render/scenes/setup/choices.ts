import type { Choice } from "../../ui/widgets";
import { PRESETS } from "../../../engine/presets";
import { PALETTES, STYLE_LABELS, STYLE_ORDER, type PaletteId } from "../../art/unitArt";
import type { MatchOptions } from "../../../game/Match";

/** The four classic setup modes with their taglines. */
export const MODES: Choice[] = [
  { id: "omega", label: "Ω Omega", hint: "Lay every tile and place every chessman yourself." },
  { id: "chi", label: "χ Chi", hint: "Pick a named battlefield, then arrange your army." },
  { id: "pi", label: "π Pi", hint: "Classic formation on a randomly shaped battlefield." },
  { id: "alpha", label: "α Alpha", hint: "Random terrain and random formations. Chaos reigns." },
];

export const BOARDS: Choice[] = [
  { id: "extended", label: "Extended 12×12", hint: "The full Trench: 16 terrain tiles a side." },
  { id: "classic", label: "Classic 8×8", hint: "The classic chessboard, 8 terrain tiles a side (arriving soon).", disabled: true },
];

export const OPPONENTS: Choice[] = [
  { id: "ai", label: "Computer" },
  { id: "hotseat", label: "Hotseat" },
  { id: "online", label: "Online" },
];

export const COMMANDERS: Choice[] = [
  { id: "recruit", label: "Recruit", hint: "A green commander who looks two moves ahead." },
  { id: "veteran", label: "Veteran", hint: "A seasoned commander who plans deeper." },
  { id: "warlord", label: "Warlord", hint: "The Trench's finest. Expect no mercy." },
];

export const ORDERS: Choice[] = [
  { id: "2", label: "Command (2)", hint: "Two orders a turn, each to a different chessman." },
  { id: "1", label: "Classic (1)", hint: "One move a turn, as in chess." },
];

export const PRESET_CHOICES: Choice[] = PRESETS.map((p) => ({ id: p.id, label: p.name, hint: p.tagline }));

export const STYLE_CHOICES: Choice[] = STYLE_ORDER.map((s) => ({ id: s, label: STYLE_LABELS[s] }));

const paletteLabel = (id: PaletteId): string => `${PALETTES[id][0].name} · ${PALETTES[id][1].name}`;

export const PALETTE_CHOICES: Choice[] = (Object.keys(PALETTES) as PaletteId[]).map((id) => ({ id, label: paletteLabel(id) }));

/** The options the setup opens with when nothing was saved. */
export const DEFAULT_OPTIONS: MatchOptions = {
  opponent: "ai",
  difficulty: "veteran",
  ordersPerTurn: 2,
  mode: "pi",
  fog: false,
  board: "extended",
  preset: PRESETS[0].id,
};

const KEY = "trenchess-setup";

export const loadOptions = (): MatchOptions => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<MatchOptions> | null;
    return { ...DEFAULT_OPTIONS, ...(saved ?? {}), board: "extended" };
  } catch {
    return { ...DEFAULT_OPTIONS };
  }
};

export const saveOptions = (options: MatchOptions): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(options));
  } catch {
    return;
  }
};
