import type { MenuItem } from "../../ui/widgets";

export type PreviewKind = "terrain" | "open" | "land";
export type Page = "hello" | "play" | "lay" | "educate";

/** The main menu, with the one-line hints of the classic cards. */
export const MENU_ITEMS: MenuItem[] = [
  { id: "hello", label: "Hello Trenchess", hint: "Understand the fundamentals and prophecy.", preview: "terrain" },
  { id: "play", label: "Play Trenchess", hint: "Master a whole new way to play chess.", preview: "open" },
  { id: "lay", label: "Lay Trenchess", hint: "Shape your own battlefield, then fight on it.", preview: "land" },
  { id: "lead", label: "Lead Trenchess", hint: "Leaderboards are coming soon.", preview: "terrain", disabled: true },
  { id: "educate", label: "Educate Trenchess", hint: "The codex of every unit and terrain.", preview: "terrain" },
  { id: "study", label: "Study Trenchess", hint: "Battle statistics are coming soon.", preview: "land", disabled: true },
];

export const previewOf = (id: string): PreviewKind => (MENU_ITEMS.find((m) => m.id === id)?.preview ?? "terrain") as PreviewKind;
