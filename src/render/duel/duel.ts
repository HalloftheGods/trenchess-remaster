import type { PlayerId, Terrain, Unit } from "../../engine/types";

/** How a capture is shown: no cutscene, a 0.7 s duel, or the full 1.6 s duel. */
export type DuelMode = "off" | "fast" | "full";

export interface DuelRequest {
  attacker: Unit;
  defender: Unit;
  /** Terrain under the defender: picks the backdrop. */
  terrain: Terrain;
  attackerOwner: PlayerId;
  mode?: DuelMode;
}

export interface DuelHost {
  play(req: DuelRequest): Promise<void>;
}

let host: DuelHost | null = null;

/**
 * The capture cutscene as the match sees it. The DuelScene attaches itself here when it is
 * created; without a scene (tests, headless) `play` resolves at once so the match never stalls.
 */
export const duels = {
  attach(h: DuelHost | null): void {
    host = h;
    if (typeof window === "undefined") return;
    Object.assign(window, { __tcDuel: h ? { play: (req: DuelRequest) => h.play(req) } : undefined });
  },
  play(req: DuelRequest): Promise<void> {
    if (!host || req.mode === "off") return Promise.resolve();
    return host.play(req);
  },
};
