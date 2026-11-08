// What two Trenchess tabs say to each other over a Link. The host picks the options and the seed, so both
// build the same field; after that each side sends only its own deploy and its own orders, and the
// receiver re-checks every order against its own copy of the rules before playing it.
import type { Cell, Order, PlayerId, Terrain } from "../engine/types";
import type { BoardKind } from "../engine/rules";
import type { GameMode } from "../game/fields";
import type { Link } from "./rtcLink";

/** The match settings the host shares. Opponent and AI difficulty do not travel. */
export interface DuelOptions {
  ordersPerTurn: number;
  mode: GameMode;
  fog: boolean;
  board: BoardKind;
  preset?: string;
}

export type DuelPacket =
  | { t: "hello"; protocol: number; name: string }
  | { t: "setup"; options: DuelOptions; seed: number }
  /** A player's finished deployment: the board and terrain as that player left them. */
  | { t: "deploy"; player: PlayerId; board: Cell[][]; terrain: Terrain[][] }
  | { t: "order"; order: Order }
  | { t: "end-turn" }
  | { t: "resign" }
  | { t: "rematch" };

const MAX_PACKET_BYTES = 64 * 1024;
const MODES: readonly GameMode[] = ["omega", "chi", "pi", "alpha"];
const BOARDS: readonly BoardKind[] = ["classic", "extended"];
const TERRAINS: readonly Terrain[] = ["flat", "forest", "swamp", "mountain", "desert"];

type Raw = Record<string, unknown>;
const isRaw = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const isWhole = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isPlayer = (v: unknown): v is PlayerId => v === 0 || v === 1;
const isPos = (v: unknown): boolean => Array.isArray(v) && v.length === 2 && v.every((n) => isWhole(n, 0, 63));
const isGrid = (v: unknown, cell: (c: unknown) => boolean): boolean =>
  Array.isArray(v) && v.length <= 64 && v.every((row) => Array.isArray(row) && row.length <= 64 && row.every(cell));
const isUnitCell = (c: unknown): boolean => c === null || (isRaw(c) && Number.isInteger(c.id) && typeof c.type === "string" && isPlayer(c.owner));

export function isDuelOptions(v: unknown): v is DuelOptions {
  if (!isRaw(v)) return false;
  const isShapeOk = isWhole(v.ordersPerTurn, 1, 4) && MODES.includes(v.mode as GameMode) && BOARDS.includes(v.board as BoardKind);
  return isShapeOk && typeof v.fog === "boolean" && (v.preset === undefined || typeof v.preset === "string");
}

/** A rough shape check only: the receiver still matches it against its own legal orders. */
export function isOrderShape(v: unknown): v is Order {
  if (!isRaw(v)) return false;
  const isListsOk = Array.isArray(v.captures) && v.captures.every(isPos) && Array.isArray(v.path) && v.path.every(isPos);
  return Number.isInteger(v.unitId) && isPos(v.from) && isPos(v.to) && typeof v.style === "string" && isListsOk;
}

export function parseDuelPacket(text: unknown): DuelPacket | null {
  const isUnreadable = typeof text !== "string" || text.length > MAX_PACKET_BYTES;
  if (isUnreadable) return null;
  let m: unknown;
  try {
    m = JSON.parse(text as string);
  } catch {
    return null;
  }
  if (!isRaw(m)) return null;
  switch (m.t) {
    case "hello":
      return isWhole(m.protocol, 1, 9999) && typeof m.name === "string" ? { t: "hello", protocol: m.protocol, name: m.name.slice(0, 24) } : null;
    case "setup":
      return isDuelOptions(m.options) && isWhole(m.seed, 0, 2 ** 31) ? { t: "setup", options: m.options, seed: m.seed } : null;
    case "deploy": {
      const isTerrainOk = isGrid(m.terrain, (c) => TERRAINS.includes(c as Terrain));
      const isOk = isPlayer(m.player) && isGrid(m.board, isUnitCell) && isTerrainOk;
      return isOk ? { t: "deploy", player: m.player as PlayerId, board: m.board as Cell[][], terrain: m.terrain as Terrain[][] } : null;
    }
    case "order":
      return isOrderShape(m.order) ? { t: "order", order: m.order } : null;
    case "end-turn":
    case "resign":
    case "rematch":
      return { t: m.t };
    default:
      return null;
  }
}

/** A Link that speaks DuelPackets and drops anything malformed. */
export class DuelChannel {
  onPacket: (packet: DuelPacket) => void = () => {};
  onClosed: (reason: string) => void = () => {};

  constructor(
    private readonly link: Link,
    /** 0 for the host (Azure Legion), 1 for the guest (Crimson Host). */
    readonly seat: PlayerId,
  ) {
    link.onMessage = (text) => {
      const packet = parseDuelPacket(text);
      if (packet) this.onPacket(packet);
    };
    link.onClosed = (reason) => this.onClosed(reason);
  }

  send(packet: DuelPacket): void {
    this.link.send(JSON.stringify(packet));
  }

  close(): void {
    this.link.close();
  }
}
