/** Where a track plays: the title and menus, or the battle itself. */
export type Mood = "title" | "battle";

export interface Track {
  title: string;
  /** File under public/music/, e.g. "march-of-the-chessmen.mp3". */
  file: string;
  mood: Mood;
}

/**
 * The soundtrack. Drop MP3s into public/music/ and list them here; the player picks a random
 * track of the mood it needs and plays the rest of that mood in turn. Empty means silence
 * (the backdrop then drifts on its own).
 */
export const TRACKS: Track[] = [
  { title: "Nocturnal Drift", file: "nocturnal-drift.mp3", mood: "title" },
  { title: "Deep Drift", file: "deep-drift.mp3", mood: "title" },
  { title: "Low Orbit", file: "low-orbit.mp3", mood: "battle" },
  { title: "Dusty Keys", file: "dusty-keys.mp3", mood: "battle" },
  { title: "Dusty Keys II", file: "dusty-keys-ii.mp3", mood: "battle" },
];

export const tracksFor = (mood: Mood): Track[] => TRACKS.filter((t) => t.mood === mood);

const HISTORY_MAX = 32;

/**
 * Walks one mood's tracks forward and back: shuffled or in playlist order, with a history
 * stack so "previous" really goes back. Stays silent (null) when the mood has no tracks.
 */
export class Deck {
  private queue: Track[] = [];
  private history: Track[] = [];
  private current: Track | null = null;

  constructor(
    private where: Mood,
    public shuffle: boolean,
    private readonly pool: (mood: Mood) => Track[] = tracksFor,
  ) {}

  get mood(): Mood {
    return this.where;
  }

  get track(): Track | null {
    return this.current;
  }

  /** Switches pools; the history is kept per deck, so prev/next stay within one mood. */
  setMood(mood: Mood): void {
    if (mood === this.where) return;
    this.where = mood;
    this.queue = [];
    this.history = [];
    this.current = null;
  }

  next(): Track | null {
    if (this.queue.length === 0) this.refill();
    if (this.current) this.history.push(this.current);
    if (this.history.length > HISTORY_MAX) this.history.shift();
    this.current = this.queue.shift() ?? null;
    return this.current;
  }

  /** The previous track, or the current one again when the history is empty. */
  prev(): Track | null {
    const back = this.history.pop();
    if (!back) return this.current;
    if (this.current) this.queue.unshift(this.current);
    this.current = back;
    return back;
  }

  private refill(): void {
    const pool = this.pool(this.where).slice();
    if (this.shuffle) {
      pool.sort(() => Math.random() - 0.5);
      if (pool.length > 1 && pool[0] === this.current) pool.push(pool.shift()!);
    } else if (this.current) {
      const at = pool.findIndex((t) => t.file === this.current!.file);
      if (at >= 0) this.queue = pool.slice(at + 1).concat(pool.slice(0, at + 1));
    }
    if (this.queue.length === 0) this.queue = pool;
  }
}
