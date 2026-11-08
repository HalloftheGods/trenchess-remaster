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
