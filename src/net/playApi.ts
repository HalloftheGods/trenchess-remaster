// The browser's side of play-api.forthexp.com, the Hall of the Gods lobby and WebRTC signaling Worker
// (it lives in the undead-of-night repo, play-api/). It never sees game packets: two browsers find each
// other through a room code, then talk over one WebRTC data channel.
//
// The Lobby speaks Undead of Night's room schema, so Trenchess fills the fields it does not use with fixed
// values and keeps to its own protocol number, which keeps its rooms apart from Undead's.

/** The API origin, without a trailing slash. Set VITE_PLAY_API to '' at build time to turn online play off. */
export const PLAY_API: string = (import.meta.env.VITE_PLAY_API ?? "https://play-api.forthexp.com").replace(/\/+$/, "");

export const onlineLive = (api: string = PLAY_API): boolean => api !== "";

/** Trenchess's protocol number on the Lobby. Bump it whenever DuelPacket changes shape. */
export const TRENCHESS_PROTOCOL = 7001;

/** The Undead-shaped fields the Lobby insists on; Trenchess ignores them. */
const LOBBY_FILLER = { style: "arcade", difficulty: "stay_close", device: "desktop" } as const;

/** A call slower than this counts as unreachable. */
export const API_TIMEOUT_MS = 10_000;

const OFFLINE = "Could not reach the online rooms. Check your connection.";

export interface RoomCard {
  code: string;
  protocol: number;
  seats: number;
  maxSeats: number;
  phase: "muster" | "playing" | "over";
  locked: boolean;
  hostLabel?: string;
}

export type Created = { ok: true; code: string; hostKey: string } | { ok: false; reason: string };
export type Lookup = { ok: true; card: RoomCard } | { ok: false; reason: string };

const LOOKUP_TEXT: Readonly<Record<number, string>> = {
  400: "That is not a room code.",
  404: "No game has that code. Check the letters.",
  410: "That game has ended.",
  429: "Too many tries. Wait a moment and try again.",
};

async function call(fetcher: typeof fetch, url: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetcher(url, { ...init, signal: AbortSignal.timeout(API_TIMEOUT_MS) });
  } catch {
    return null;
  }
}

/** Opens a private room with this tab as host. The hostKey is shown once, here; keep it out of URLs. */
export async function createRoom(label = "", api: string = PLAY_API, fetcher: typeof fetch = fetch): Promise<Created> {
  const body = { protocol: TRENCHESS_PROTOCOL, visibility: "private", ...LOBBY_FILLER, ...(label ? { label } : {}) };
  const response = await call(fetcher, `${api}/v1/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response) return { ok: false, reason: OFFLINE };
  if (response.status === 429) return { ok: false, reason: "You have opened too many games. Wait a while and try again." };
  const busy = { ok: false, reason: "The online rooms are busy. Try again in a moment." } as const;
  if (!response.ok) return busy;
  try {
    const room = (await response.json()) as { code?: unknown; hostKey?: unknown };
    const isWellFormed = typeof room.code === "string" && typeof room.hostKey === "string";
    return isWellFormed ? { ok: true, code: room.code as string, hostKey: room.hostKey as string } : busy;
  } catch {
    return busy;
  }
}

/** The room card for a code, or what to tell the player. */
export async function lookupRoom(code: string, api: string = PLAY_API, fetcher: typeof fetch = fetch): Promise<Lookup> {
  const response = await call(fetcher, `${api}/v1/rooms/${encodeURIComponent(code)}`);
  if (!response) return { ok: false, reason: OFFLINE };
  if (!response.ok) return { ok: false, reason: LOOKUP_TEXT[response.status] ?? OFFLINE };
  const card = (await response.json()) as RoomCard;
  const isOtherGame = card.protocol !== TRENCHESS_PROTOCOL;
  if (isOtherGame) return { ok: false, reason: "That code belongs to a different game." };
  return { ok: true, card };
}

/** The socket URL for a path on the API: https becomes wss. */
export function socketUrl(api: string, path: string): string {
  const url = new URL(path, `${api}/`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

/** True when the API answers its health check. */
export async function apiHealthy(api: string = PLAY_API, fetcher: typeof fetch = fetch): Promise<boolean> {
  const response = await call(fetcher, `${api}/health`);
  return response?.ok ?? false;
}
