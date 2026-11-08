import { describe, expect, it } from "vitest";
import { normalizeRoomCode } from "./roomCode";
import { parseDuelPacket } from "./duel";
import { closeText, parseToGuest, parseToHost } from "./signal";
import { createRoom, lookupRoom, socketUrl, TRENCHESS_PROTOCOL } from "./playApi";

const fakeFetch = (status: number, body: unknown, seen: { url?: string; init?: RequestInit } = {}): typeof fetch =>
  (async (url: string, init?: RequestInit) => {
    seen.url = url;
    seen.init = init;
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;

describe("room codes", () => {
  it("accepts and uppercases a good code", () => {
    expect(normalizeRoomCode(" bcdfg ")).toEqual({ ok: true, code: "BCDFG" });
  });
  it("refuses vowels, digits and the wrong length", () => {
    expect(normalizeRoomCode("ABCDE").ok).toBe(false);
    expect(normalizeRoomCode("BCDF1").ok).toBe(false);
    expect(normalizeRoomCode("BCDF").ok).toBe(false);
  });
});

describe("play-api client", () => {
  it("creates a private room on the Trenchess protocol", async () => {
    const seen: { url?: string; init?: RequestInit } = {};
    const made = await createRoom("", "https://api.test", fakeFetch(201, { code: "BCDFG", hostKey: "k" }, seen));
    expect(made).toEqual({ ok: true, code: "BCDFG", hostKey: "k" });
    expect(seen.url).toBe("https://api.test/v1/rooms");
    const body = JSON.parse(String(seen.init?.body));
    expect(body).toMatchObject({ protocol: TRENCHESS_PROTOCOL, visibility: "private", style: "arcade", device: "desktop" });
  });
  it("explains a rate limit", async () => {
    const made = await createRoom("", "https://api.test", fakeFetch(429, {}));
    expect(made.ok).toBe(false);
  });
  it("refuses a code that belongs to another game", async () => {
    const card = { code: "BCDFG", protocol: 2, seats: 1, maxSeats: 4, phase: "muster", locked: false };
    expect((await lookupRoom("BCDFG", "https://api.test", fakeFetch(200, card))).ok).toBe(false);
    expect((await lookupRoom("BCDFG", "https://api.test", fakeFetch(200, { ...card, protocol: TRENCHESS_PROTOCOL }))).ok).toBe(true);
  });
  it("says why a lookup missed", async () => {
    const miss = await lookupRoom("BCDFG", "https://api.test", fakeFetch(404, { error: "not found" }));
    expect(miss).toEqual({ ok: false, reason: "No game has that code. Check the letters." });
  });
  it("turns https into wss", () => {
    expect(socketUrl("https://play-api.forthexp.com", "/v1/rooms/BCDFG/host")).toBe("wss://play-api.forthexp.com/v1/rooms/BCDFG/host");
  });
});

describe("signaling", () => {
  it("reads the Room's messages and drops junk", () => {
    expect(parseToHost(JSON.stringify({ type: "ready", iceServers: [], relayOnly: false }))).toEqual({ type: "ready", iceServers: [], relayOnly: false });
    expect(parseToGuest(JSON.stringify({ type: "answer", sdp: "v=0" }))).toEqual({ type: "answer", sdp: "v=0" });
    expect(parseToHost("pong")).toBeNull();
    expect(parseToGuest(JSON.stringify({ type: "answer" }))).toBeNull();
  });
  it("names close codes", () => {
    expect(closeText(4000)).toContain("two players");
    expect(closeText(1234)).toBe("The connection dropped.");
  });
});

describe("duel packets", () => {
  it("round-trips setup and order", () => {
    const setup = { t: "setup", options: { ordersPerTurn: 2, mode: "pi", fog: false, board: "extended" }, seed: 42 };
    expect(parseDuelPacket(JSON.stringify(setup))).toEqual(setup);
    const order = { t: "order", order: { unitId: 7, from: [10, 3], to: [8, 3], style: "step", captures: [], path: [[9, 3], [8, 3]], promotes: false } };
    expect(parseDuelPacket(JSON.stringify(order))).toEqual(order);
  });
  it("drops malformed packets", () => {
    expect(parseDuelPacket("{")).toBeNull();
    expect(parseDuelPacket(JSON.stringify({ t: "setup", options: { mode: "zeta" }, seed: 1 }))).toBeNull();
    expect(parseDuelPacket(JSON.stringify({ t: "order", order: { from: [1] } }))).toBeNull();
    expect(parseDuelPacket(JSON.stringify({ t: "nope" }))).toBeNull();
  });
});
