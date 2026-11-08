/**
 * Decides whether the title screen may offer the Install Game cartridge, and which way the install goes.
 * Ported from Undead of Night (src/game/pwa/install-offer.ts) so the studio's games behave the same.
 */

/** prompt: the browser hands us an install dialog. guide: the player installs by hand, and a card shows how. none: no cartridge. */
export type InstallPath = "prompt" | "guide" | "none";

/** Which card the guide path shows: Safari's Share sheet, or the menu of any other browser. */
export type GuideKind = "ios" | "menu";

export interface InstallFacts {
  /** Running as an installed app already (display-mode standalone/fullscreen, or iOS navigator.standalone). */
  readonly standalone: boolean;
  /** appinstalled fired during this visit. */
  readonly installedNow: boolean;
  /** A beforeinstallprompt event is held and has not been spent. */
  readonly promptReady: boolean;
  /** The player already said no to the native dialog, so the held event is spent. */
  readonly promptSpent: boolean;
  /** iPhone or iPad Safari, which never fires beforeinstallprompt. */
  readonly iosSafari: boolean;
}

export const installPath = (facts: InstallFacts): InstallPath => {
  if (facts.standalone || facts.installedNow) return "none";
  if (facts.promptReady) return "prompt";
  if (facts.iosSafari) return "guide";
  // A dismissed prompt cannot be shown twice, but the cartridge stays and points at the browser menu.
  if (facts.promptSpent) return "guide";
  return "none";
};

export const guideKindFor = (facts: InstallFacts): GuideKind => (facts.iosSafari ? "ios" : "menu");

/** iPadOS Safari reports a Mac, so a touch screen on a Mac platform counts as an iPad. */
export const isIosSafari = (userAgent: string, platform: string, touchPoints: number): boolean => {
  const iPhoneOrPod = /iPhone|iPod/.test(userAgent);
  const iPad = /iPad/.test(userAgent) || (platform === "MacIntel" && touchPoints > 1);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(userAgent);
  const isSafari = /Safari\//.test(userAgent) || /Version\//.test(userAgent);
  return (iPhoneOrPod || iPad) && isSafari && !otherBrowser;
};

export const STANDALONE_QUERY = "(display-mode: standalone)";
export const FULLSCREEN_QUERY = "(display-mode: fullscreen)";

export const isStandaloneDisplay = (matches: (query: string) => boolean, iosStandalone: boolean | undefined): boolean =>
  matches(STANDALONE_QUERY) || matches(FULLSCREEN_QUERY) || iosStandalone === true;

export interface GuideStep {
  readonly title: string;
  readonly line: string;
}

export interface Guide {
  readonly heading: string;
  readonly steps: readonly GuideStep[];
}

const GUIDES: Record<GuideKind, Guide> = {
  ios: {
    heading: "Keep Trenchess on your home screen",
    steps: [
      { title: "Tap Share", line: "The square with an arrow, in the Safari toolbar." },
      { title: "Add to Home Screen", line: "Scroll the sheet up, tap it, then tap Add." },
    ],
  },
  menu: {
    heading: "Keep Trenchess on your device",
    steps: [
      { title: "Open the browser menu", line: "Usually three dots or lines, near the address bar." },
      { title: "Install app", line: "Look for Install app or Add to Home Screen." },
    ],
  },
};

export const guideFor = (kind: GuideKind): Guide => GUIDES[kind];
