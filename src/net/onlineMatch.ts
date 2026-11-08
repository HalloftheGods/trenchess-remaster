// The handshake before an online match: the host opens a room and, once a guest's channel is up, sends the
// options and seed; the guest waits for them. Either side then hands the DuelChannel to Match.startOnline.
import type { MatchOptions } from "../game/Match";
import { freshSeed } from "../game/fields";
import { DuelChannel, type DuelOptions } from "./duel";
import { TRENCHESS_PROTOCOL } from "./playApi";
import { hostRoom, joinRoom, type HostedRoom } from "./rtcLink";
import { normalizeRoomCode } from "./roomCode";

/** What both tabs start a match with. */
export interface OnlineStart {
  duel: DuelChannel;
  options: MatchOptions;
  seed: number;
}

export type Opened = { ok: true; code: string; started: Promise<OnlineStart>; cancel: () => void } | { ok: false; reason: string };

/** How long a guest waits for the host's setup once the channel is open. */
const SETUP_WAIT_MS = 15_000;

const duelOptionsOf = (o: MatchOptions): DuelOptions => ({ ordersPerTurn: o.ordersPerTurn, mode: o.mode, fog: o.fog, board: o.board, preset: o.preset });

/** Opens a room for these options. `started` resolves once a guest has joined and been sent the setup. */
export async function hostOnline(options: MatchOptions): Promise<Opened> {
  const hosting = await hostRoom();
  if (!hosting.ok) return hosting;
  const room: HostedRoom = hosting.room;
  const started = room.guest.then((link) => {
    const duel = new DuelChannel(link, 0);
    const seed = freshSeed();
    duel.send({ t: "hello", protocol: TRENCHESS_PROTOCOL, name: "" });
    duel.send({ t: "setup", options: duelOptionsOf(options), seed });
    return { duel, options: { ...options, opponent: "online" as const }, seed };
  });
  return { ok: true, code: room.code, started, cancel: () => room.close() };
}

/** Joins a host's room by typed code and waits for the host's setup. */
export async function joinOnline(typed: string, fallback: MatchOptions): Promise<{ ok: true; start: OnlineStart } | { ok: false; reason: string }> {
  const code = normalizeRoomCode(typed);
  if (!code.ok) return code;
  const joined = await joinRoom(code.code);
  if (!joined.ok) return joined;
  const duel = new DuelChannel(joined.link, 1);
  duel.send({ t: "hello", protocol: TRENCHESS_PROTOCOL, name: "" });
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      duel.close();
      resolve({ ok: false, reason: "The host did not start the game. Try again." });
    }, SETUP_WAIT_MS);
    duel.onClosed = (reason) => {
      clearTimeout(timer);
      resolve({ ok: false, reason });
    };
    duel.onPacket = (packet) => {
      if (packet.t !== "setup") return;
      clearTimeout(timer);
      resolve({ ok: true, start: { duel, options: { ...fallback, ...packet.options, opponent: "online" }, seed: packet.seed } });
    };
  });
}
