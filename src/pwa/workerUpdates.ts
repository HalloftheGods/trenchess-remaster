/**
 * Registers the service worker in production and applies a new version only while the title shows,
 * so a match is never reloaded under the players. A waiting worker sits until the title is up, or the next launch.
 */

export const WORKER_URL = "sw.js";
export const SKIP_WAITING_MESSAGE = { type: "SKIP_WAITING" } as const;

export interface RegisterFacts {
  readonly production: boolean;
  readonly secure: boolean;
  readonly supported: boolean;
}

/** Never on a dev server, where a cached shell would fight hot reload. */
export const shouldRegisterWorker = (facts: RegisterFacts): boolean => facts.production && facts.secure && facts.supported;

export const createWorkerUpdates = (container: ServiceWorkerContainer, workerUrl: string, reload: () => void) => {
  let titleShowing = false;
  let waiting: ServiceWorker | null = null;
  let applying = false;

  const applyIfReady = (): void => {
    if (!waiting || !titleShowing || applying) return;
    applying = true;
    waiting.postMessage(SKIP_WAITING_MESSAGE);
  };

  const watch = (registration: ServiceWorkerRegistration): void => {
    waiting = registration.waiting;
    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        // Only an update counts: a first install has no worker in charge yet and needs no reload.
        if (installing.state !== "installed" || !container.controller) return;
        waiting = installing;
        applyIfReady();
      });
    });
    applyIfReady();
  };

  container.addEventListener("controllerchange", () => {
    // Only a swap we asked for reloads, and only while the title is still up.
    if (applying && titleShowing) reload();
  });

  const start = async (): Promise<void> => {
    try {
      watch(await container.register(workerUrl));
    } catch {
      return;
    }
  };

  const setTitleShowing = (showing: boolean): void => {
    titleShowing = showing;
    applyIfReady();
  };

  return { start, setTitleShowing };
};
