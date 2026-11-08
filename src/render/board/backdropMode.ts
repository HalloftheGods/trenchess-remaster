import type { Choice } from "../ui/widgets";

/** What sits behind the board. "dusk" is the default: sky and stars, no peaks, a light haze. */
export type BackdropMode = "dusk" | "peaks" | "stars" | "void";

export const BACKDROP_CHOICES: Choice[] = [
  { id: "dusk", label: "Dusk sky", hint: "The dusk sky and drifting stars. Calm and clean." },
  { id: "peaks", label: "Peaks", hint: "Dusk sky with the distant mountain range and horizon haze." },
  { id: "stars", label: "Starfield", hint: "Only the stars in the dark." },
  { id: "void", label: "Plain", hint: "Nothing behind the plinth but the music backdrop." },
];

const KEY = "trenchess-backdrop";

export const backdrop = { mode: "dusk" as BackdropMode };

export const loadBackdropMode = (): BackdropMode => {
  try {
    const saved = localStorage.getItem(KEY);
    if (BACKDROP_CHOICES.some((c) => c.id === saved)) backdrop.mode = saved as BackdropMode;
  } catch {
    return backdrop.mode;
  }
  return backdrop.mode;
};

export const saveBackdropMode = (mode: BackdropMode): void => {
  backdrop.mode = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    return;
  }
};
