/** Listener settings kept in localStorage; every access is guarded for private mode. */
export const VOLUME_KEY = "trenchess-volume";
export const SHUFFLE_KEY = "trenchess-shuffle";

export const stored = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const store = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode: the setting lives for this session only */
  }
};

export const storedVolume = (): number => {
  const v = Number(stored(VOLUME_KEY));
  return Number.isFinite(v) && stored(VOLUME_KEY) !== null ? Math.min(1, Math.max(0, v)) : 0.8;
};
