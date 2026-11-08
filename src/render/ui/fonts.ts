import type Phaser from "phaser";

export const FONT = {
  display: "Cinzel, Georgia, serif",
  body: "Inter, system-ui, sans-serif",
};

export const COLOR = {
  gold: 0xf2c94c,
  goldHex: "#f2c94c",
  bone: "#e9e2cf",
  dim: "#9aa3b5",
  ink: 0x0b0f1a,
  p0: "#5aa2ff",
  p1: "#ff5a5a",
};

type TextKind = "h1" | "h2" | "h3" | "body" | "small" | "caps" | "button";
type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

export const TEXT: Record<TextKind, TextStyle> = {
  h1: { fontFamily: FONT.display, fontSize: "56px", fontStyle: "800", color: COLOR.goldHex },
  h2: { fontFamily: FONT.display, fontSize: "30px", fontStyle: "800", color: COLOR.goldHex },
  h3: { fontFamily: FONT.display, fontSize: "20px", fontStyle: "600", color: COLOR.bone },
  body: { fontFamily: FONT.body, fontSize: "16px", color: COLOR.bone },
  small: { fontFamily: FONT.body, fontSize: "13px", color: COLOR.dim },
  caps: { fontFamily: FONT.display, fontSize: "14px", fontStyle: "600", color: COLOR.goldHex, letterSpacing: 4 },
  button: { fontFamily: FONT.display, fontSize: "18px", fontStyle: "600", color: COLOR.bone },
};

const FONT_FACES = ["600 20px Cinzel", "800 40px Cinzel", "400 16px Inter", "600 16px Inter"];

/** Resolves once the web fonts are usable by the canvas, or after 800 ms at most. */
export const fontsReady = (): Promise<void> => {
  const fonts = typeof document === "undefined" ? undefined : document.fonts;
  if (!fonts) return Promise.resolve();
  const loaded = Promise.all(FONT_FACES.map((f) => fonts.load(f).catch(() => [])))
    .then(() => fonts.ready)
    .then(() => undefined);
  const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, 800));
  return Promise.race([loaded, timeout]);
};

/** True when the viewer asked the OS for less motion: keep every tween short. */
export const reducedMotion = (): boolean => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

/** Clamps a tween duration for reduced-motion viewers. */
export const motionMs = (ms: number): number => (reducedMotion() ? Math.min(ms, 120) : ms);
