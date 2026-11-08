import type { Kit } from "./duelArt";

/**
 * The joint table of a duel rig. Angles are degrees: limbs hang at 0 and positive swings them
 * backward (clockwise on a right-facing rig), so a forward reach is 270 and an overhead swing
 * runs from ~160 up through 180 and over to ~300. Body `lean` is positive forward.
 */
export interface Joints {
  x: number;
  y: number;
  /** Height off the floor in rig units (leaps); the shadow stays down. */
  air: number;
  lean: number;
  legF: number;
  legB: number;
  armF: number;
  armB: number;
  wpn: number;
  head: number;
  cape: number;
  /** 0..1: run cycle strength (footmen). */
  run: number;
  /** 0..1: gallop strength (steeds). */
  gait: number;
  /** Steed pitch: negative rears up. */
  rear: number;
  neck: number;
  breath: number;
  /** 1 = rest; below 1 squashes on a landing, above 1 stretches in a leap. */
  squash: number;
  /** +1 faces right, -1 faces left; tweening through 0 turns the rig around. */
  face: number;
}

export type PoseId = "idle" | "guard" | "windup" | "strike" | "followThrough" | "hit" | "crouch" | "tuck" | "raise" | "victory" | "thrustReady" | "thrust";

type Pose = Partial<Joints>;

export const POSES: Record<PoseId, Pose> = {
  idle: { x: 0, y: 0, air: 0, lean: 4, legF: -9, legB: 9, armF: 335, armB: 18, wpn: -70, head: 0, cape: 0, run: 0, gait: 0, rear: 0, neck: 0, breath: 1, squash: 1 },
  guard: { lean: -5, legF: -18, legB: 16, armF: 300, armB: -50, wpn: -40, head: 5, breath: 0.6 },
  windup: { lean: -12, legF: -22, legB: 20, armF: 158, armB: 34, wpn: -22, head: -8, breath: 0.2 },
  strike: { lean: 24, legF: -36, legB: 30, armF: 296, armB: 46, wpn: 2, head: 10, y: 3, breath: 0 },
  followThrough: { lean: 30, legF: -38, legB: 34, armF: 352, armB: 50, wpn: 10, head: 12, y: 4, breath: 0 },
  hit: { lean: -20, legF: -6, legB: 24, armF: 20, armB: 44, wpn: -30, head: -16, breath: 0 },
  crouch: { y: 7, lean: 16, legF: -44, legB: 34, armF: 30, armB: 44, wpn: -60, head: 6, squash: 0.86, breath: 0 },
  tuck: { legF: -78, legB: -56, armF: 250, armB: -40, wpn: -60, head: 14, squash: 1, breath: 0 },
  raise: { lean: -6, legF: -10, legB: 10, armF: 186, armB: 210, wpn: -6, head: -12, breath: 0.4 },
  victory: { lean: -4, legF: -14, legB: 14, armF: 196, armB: 26, wpn: -8, head: -9, breath: 1, run: 0, gait: 0, rear: 0, neck: 0, squash: 1, y: 0, x: 0, air: 0 },
  thrustReady: { lean: -6, legF: -24, legB: 22, armF: 318, armB: -30, wpn: -48, head: 2, breath: 0.2 },
  thrust: { lean: 20, legF: -40, legB: 34, armF: 272, armB: 40, wpn: -2, head: 8, y: 3, breath: 0 },
};

/** Spear and lance bearers hold the point forward at rest instead of the blade up. */
const POLEARM: Partial<Record<PoseId, Pose>> = {
  idle: { armF: 328, wpn: -58 },
  guard: { armF: 312, wpn: -42 },
  victory: { armF: 190, wpn: -2 },
};

/** Riders keep their seat: no crouch or tuck of the legs, and the steed rears instead. */
const RIDER: Partial<Record<PoseId, Pose>> = {
  idle: { lean: 2 },
  crouch: { y: 3, lean: 10, rear: 6, neck: 10, squash: 0.94 },
  tuck: { rear: -14, neck: -16, armF: 272, wpn: -2 },
  victory: { rear: -22, neck: -24 },
  hit: { rear: -12, neck: -18 },
};

export const poseFor = (kit: Kit, id: PoseId): Pose => ({ ...POSES[id], ...(kit.thrusts ? POLEARM[id] : undefined), ...(kit.mount ? RIDER[id] : undefined) });
