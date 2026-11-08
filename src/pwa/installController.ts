/** Holds the browser's install prompt and tells the title screen when the Install Game cartridge may show. */
import { guideKindFor, installPath, isIosSafari, isStandaloneDisplay, STANDALONE_QUERY } from "./installOffer";
import type { GuideKind, InstallFacts, InstallPath } from "./installOffer";

/** Chrome, Edge and Android's install prompt event. It is not in lib.dom. */
export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: "accepted" | "dismissed" }>;
}

/** Everything the controller needs from the page, so a test can stand in for it. */
export interface InstallEnv {
  listen(type: string, handler: (event: Event) => void): () => void;
  matches(query: string): boolean;
  /** Called when the display mode may have changed, for instance after the player installs and opens the app. */
  onDisplayModeChange(handler: () => void): () => void;
  iosStandalone(): boolean | undefined;
  iosSafari: boolean;
}

export interface InstallState {
  readonly path: InstallPath;
  readonly guideKind: GuideKind;
  readonly guideOpen: boolean;
}

const isInstallPrompt = (event: Event): event is InstallPromptEvent => typeof (event as Partial<InstallPromptEvent>).prompt === "function";

export const createInstallController = (env: InstallEnv) => {
  let standalone = isStandaloneDisplay(env.matches, env.iosStandalone());
  let installedNow = false;
  let held: InstallPromptEvent | null = null;
  let promptSpent = false;
  let guideOpen = false;
  const watchers = new Set<(state: InstallState) => void>();

  const facts = (): InstallFacts => ({ standalone, installedNow, promptReady: held !== null, promptSpent, iosSafari: env.iosSafari });
  const state = (): InstallState => ({ path: installPath(facts()), guideKind: guideKindFor(facts()), guideOpen });
  const changed = (): void => {
    const now = state();
    for (const watch of watchers) watch(now);
  };

  const stops = [
    env.listen("beforeinstallprompt", (event) => {
      if (!isInstallPrompt(event)) return;
      // Hold it, so the cartridge decides when the dialog opens instead of the browser's own banner.
      event.preventDefault();
      held = event;
      promptSpent = false;
      changed();
    }),
    env.listen("appinstalled", () => {
      installedNow = true;
      held = null;
      guideOpen = false;
      changed();
    }),
    env.onDisplayModeChange(() => {
      standalone = isStandaloneDisplay(env.matches, env.iosStandalone());
      changed();
    }),
  ];

  const showNativePrompt = async (event: InstallPromptEvent): Promise<void> => {
    // The browser lets an event open its dialog once, so it is spent whatever the answer.
    held = null;
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "dismissed") promptSpent = true;
    } catch {
      promptSpent = true;
      guideOpen = true;
    }
    changed();
  };

  const press = async (): Promise<void> => {
    const way = installPath(facts());
    if (way === "none") return;
    if (way === "prompt" && held) {
      await showNativePrompt(held);
      return;
    }
    guideOpen = true;
    changed();
  };

  const closeGuide = (): void => {
    guideOpen = false;
    changed();
  };

  /** Calls `watch` now and on every change; returns the unsubscribe. */
  const subscribe = (watch: (state: InstallState) => void): (() => void) => {
    watchers.add(watch);
    watch(state());
    return () => watchers.delete(watch);
  };

  const dispose = (): void => {
    for (const stop of stops) stop();
    watchers.clear();
  };

  return { state, press, closeGuide, subscribe, dispose };
};

export type InstallController = ReturnType<typeof createInstallController>;

interface IosNavigator extends Navigator {
  readonly standalone?: boolean;
}

export const browserInstallEnv = (win: Window): InstallEnv => {
  const nav = win.navigator as IosNavigator;
  return {
    listen(type, handler) {
      win.addEventListener(type, handler);
      return () => win.removeEventListener(type, handler);
    },
    matches: (query) => win.matchMedia(query).matches,
    onDisplayModeChange(handler) {
      const list = win.matchMedia(STANDALONE_QUERY);
      list.addEventListener("change", handler);
      return () => list.removeEventListener("change", handler);
    },
    iosStandalone: () => nav.standalone,
    iosSafari: isIosSafari(nav.userAgent, nav.platform, nav.maxTouchPoints),
  };
};
