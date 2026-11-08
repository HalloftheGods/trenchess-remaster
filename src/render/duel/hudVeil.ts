/**
 * Fades the page's HTML HUD (banners, cards, battle log, action bar, media player: everything
 * outside the game canvas and the sky backdrop) out while a duel plays, and back in after.
 */
const FADE_MS = 250;
const CSS = `
body.tc-duel-fade > :not(#stage):not(#backdrop):not(script):not(style){transition:opacity ${FADE_MS}ms ease}
body.tc-duel > :not(#stage):not(#backdrop):not(script):not(style){opacity:0 !important;pointer-events:none !important}
`;

let fadeTimer = 0;

const ensureStyle = (): void => {
  if (document.getElementById("tc-duel-veil")) return;
  const style = document.createElement("style");
  style.id = "tc-duel-veil";
  style.textContent = CSS;
  document.head.append(style);
};

/** Hides (`on`) or restores the HUD with a short fade. */
export const veilHud = (on: boolean): void => {
  ensureStyle();
  const body = document.body;
  window.clearTimeout(fadeTimer);
  body.classList.add("tc-duel-fade");
  body.classList.toggle("tc-duel", on);
  if (!on) fadeTimer = window.setTimeout(() => body.classList.remove("tc-duel-fade"), FADE_MS + 50);
};
