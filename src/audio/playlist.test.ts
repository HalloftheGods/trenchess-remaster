import { describe, expect, it } from "vitest";
import { Deck, TRACKS, tracksFor, type Mood, type Track } from "./playlist";

const pool = (mood: Mood): Track[] => tracksFor(mood);
const titles = (xs: (Track | null)[]): (string | null)[] => xs.map((t) => t?.title ?? null);

describe("Deck", () => {
  it("plays a mood in playlist order when shuffle is off and wraps", () => {
    const deck = new Deck("battle", false, pool);
    const battle = tracksFor("battle").map((t) => t.title);
    const seen = [deck.next(), deck.next(), deck.next(), deck.next()];
    expect(titles(seen)).toEqual([...battle, battle[0]]);
  });

  it("goes back through its history and forward again", () => {
    const deck = new Deck("battle", false, pool);
    const a = deck.next();
    const b = deck.next();
    expect(deck.prev()).toBe(a);
    expect(deck.next()).toBe(b);
  });

  it("repeats the current track when there is no history", () => {
    const deck = new Deck("title", true, pool);
    const a = deck.next();
    expect(deck.prev()).toBe(a);
  });

  it("stays within the mood and forgets history on a mood switch", () => {
    const deck = new Deck("title", true, pool);
    deck.next();
    deck.setMood("battle");
    expect(deck.track).toBeNull();
    for (let i = 0; i < 6; i++) expect(deck.next()?.mood).toBe("battle");
    expect(deck.mood).toBe("battle");
  });

  it("shuffles every track of the mood before repeating one", () => {
    const deck = new Deck("battle", true, pool);
    const n = tracksFor("battle").length;
    const round = new Set(Array.from({ length: n }, () => deck.next()?.file));
    expect(round.size).toBe(n);
  });

  it("is silent for a mood with no tracks", () => {
    const deck = new Deck("title", false, () => []);
    expect(deck.next()).toBeNull();
    expect(deck.prev()).toBeNull();
  });

  it("lists only existing moods", () => {
    expect(TRACKS.every((t) => t.mood === "title" || t.mood === "battle")).toBe(true);
  });
});
