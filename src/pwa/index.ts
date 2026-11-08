/**
 * The page's single install controller and service worker updater. Imported first thing in main.ts,
 * so an early beforeinstallprompt is never missed.
 */
import { browserInstallEnv, createInstallController } from "./installController";
import { WORKER_URL, createWorkerUpdates, shouldRegisterWorker } from "./workerUpdates";

export const installController = createInstallController(browserInstallEnv(window));

let titleShowing = false;
let updates: ReturnType<typeof createWorkerUpdates> | null = null;

/** Does nothing on a dev server or where service workers are missing. */
export const startServiceWorker = (): void => {
  const supported = "serviceWorker" in navigator;
  if (!shouldRegisterWorker({ production: import.meta.env.PROD, secure: window.isSecureContext, supported })) return;
  updates = createWorkerUpdates(navigator.serviceWorker, new URL(WORKER_URL, document.baseURI).href, () => window.location.reload());
  updates.setTitleShowing(titleShowing);
  void updates.start();
};

/** The title scene calls this as it shows and hides: showing it is the moment a waiting version may take over. */
export const setTitleShowing = (showing: boolean): void => {
  titleShowing = showing;
  updates?.setTitleShowing(showing);
};
