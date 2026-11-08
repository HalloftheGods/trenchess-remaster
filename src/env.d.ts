declare const __APP_VERSION__: string;
declare const __BUILD_YEAR__: number;

interface Window {
  /** The inline boot cover in index.html: a progress bar and status line shown while the game loads. */
  __boot?: { step: (fraction: number, label: string) => void };
}
