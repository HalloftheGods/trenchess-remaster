// Room codes as play-api hands them out: five letters from a vowel-free, look-alike-free alphabet.
// Mirrors undead-of-night's shared/lobby/room-code.ts, which the Lobby uses to mint and check them.

export const ROOM_CODE_ALPHABET = "BCDFGHJKMNPRTVWX";
export const ROOM_CODE_LENGTH = 5;

export type RoomCodeCheck = { ok: true; code: string } | { ok: false; reason: string };

/** Uppercases and trims typed input, then checks it against the Lobby's alphabet and length. */
export function normalizeRoomCode(raw: unknown): RoomCodeCheck {
  if (typeof raw !== "string") return { ok: false, reason: "Enter a room code." };
  const code = raw.trim().toUpperCase();
  if (!code) return { ok: false, reason: "Enter a room code." };
  const hasStrangeLetters = [...code].some((letter) => !ROOM_CODE_ALPHABET.includes(letter));
  if (hasStrangeLetters) return { ok: false, reason: "Room codes use these letters only: " + ROOM_CODE_ALPHABET };
  const isWrongLength = code.length !== ROOM_CODE_LENGTH;
  if (isWrongLength) return { ok: false, reason: `Room codes are ${ROOM_CODE_LENGTH} letters.` };
  return { ok: true, code };
}
