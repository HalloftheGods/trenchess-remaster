// Signaling messages between a tab and its play-api Room. The Room relays SDP and ICE and never sees game packets.
// Shapes mirror undead-of-night's shared/lobby/lobby-protocol.ts.

export interface IceCandidate {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/** The listing the host keeps the Lobby told about. Trenchess rooms seat two. */
export interface RoomReport {
  seats: number;
  taken: number;
  level: number;
  highest: number;
  phase: "muster" | "playing" | "over";
  locked: boolean;
}

export type HostSignal =
  | { type: "auth"; hostKey: string }
  | { type: "answer"; peerId: string; sdp: string }
  | { type: "ice"; peerId: string; ice: IceCandidate }
  | { type: "report"; report: RoomReport }
  | { type: "end"; reason?: string };

export type GuestSignal = { type: "offer"; sdp: string } | { type: "ice"; ice: IceCandidate };

export type ToHostSignal =
  | { type: "ready"; iceServers: IceServer[]; relayOnly: boolean }
  | { type: "offer"; peerId: string; sdp: string }
  | { type: "ice"; peerId: string; ice: IceCandidate }
  | { type: "peer-left"; peerId: string };

export type ToGuestSignal =
  | { type: "admitted"; peerId: string; iceServers: IceServer[]; relayOnly: boolean }
  | { type: "answer"; sdp: string }
  | { type: "ice"; ice: IceCandidate }
  | { type: "peer-left" };

const MAX_SIGNAL_BYTES = 16 * 1024;

const parseObject = (raw: unknown): Record<string, unknown> | null => {
  const isUnreadable = typeof raw !== "string" || raw.length > MAX_SIGNAL_BYTES;
  if (isUnreadable) return null;
  try {
    const value: unknown = JSON.parse(raw as string);
    const isObject = typeof value === "object" && value !== null && !Array.isArray(value);
    return isObject ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const isText = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const isIce = (value: unknown): value is IceCandidate =>
  typeof value === "object" && value !== null && isText((value as IceCandidate).candidate);
const isServers = (value: unknown): value is IceServer[] => Array.isArray(value);

export function parseToHost(raw: unknown): ToHostSignal | null {
  const m = parseObject(raw);
  if (!m) return null;
  if (m.type === "ready" && isServers(m.iceServers)) return { type: "ready", iceServers: m.iceServers, relayOnly: m.relayOnly === true };
  if (m.type === "offer" && isText(m.peerId) && isText(m.sdp)) return { type: "offer", peerId: m.peerId, sdp: m.sdp };
  if (m.type === "ice" && isText(m.peerId) && isIce(m.ice)) return { type: "ice", peerId: m.peerId, ice: m.ice };
  if (m.type === "peer-left" && isText(m.peerId)) return { type: "peer-left", peerId: m.peerId };
  return null;
}

export function parseToGuest(raw: unknown): ToGuestSignal | null {
  const m = parseObject(raw);
  if (!m) return null;
  if (m.type === "admitted" && isText(m.peerId) && isServers(m.iceServers)) {
    return { type: "admitted", peerId: m.peerId, iceServers: m.iceServers, relayOnly: m.relayOnly === true };
  }
  if (m.type === "answer" && isText(m.sdp)) return { type: "answer", sdp: m.sdp };
  if (m.type === "ice" && isIce(m.ice)) return { type: "ice", ice: m.ice };
  if (m.type === "peer-left") return { type: "peer-left" };
  return null;
}

/** The Room's close codes (undead-of-night shared/close-codes.ts), in the player's words. */
const CLOSE_TEXT: Readonly<Record<number, string>> = {
  4000: "That game already has two players.",
  4001: "The host is not answering. Try again in a moment.",
  4002: "The room did not hear from you in time. Try again.",
  4010: "That room is not open any more.",
  4011: "The host left.",
  4013: "That game has already started.",
  4014: "Your opponent is on a different version of Trenchess. Both of you reload.",
  4015: "Too many tries. Wait a moment and try again.",
  4016: "The host stepped away.",
};

export const closeText = (code: number): string => CLOSE_TEXT[code] ?? "The connection dropped.";
