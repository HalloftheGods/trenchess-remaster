import type { Faction } from "../unitArt";
import { ellipse } from "../canvas";
import { HEAD_R, HEAD_Y, X, displayBase, scarf, vinyl, type Fur, type G } from "./beastsArtHelpers";

export interface BodyOptions {
  /** Torso half-width; stubby by default. */
  rx?: number;
  /** Torso half-height. */
  ry?: number;
  /** Belly patch colour (defaults to the fur light). */
  belly?: string;
  /** Skip the right arm (a prop such as a shield takes its place). */
  noRightArm?: boolean;
  /** Skip the left arm. */
  noLeftArm?: boolean;
  /** Draw the army scarf at the neck seam. */
  scarf?: boolean;
  /** Feet colour (defaults to the fur). */
  feet?: Fur;
}

export const BODY_Y = 64;

/**
 * The shared chibi figure under the head: display base, stubby feet, a round torso with a
 * belly patch, two ball-jointed arms and the army scarf at the (absent) neck.
 * The head is drawn afterwards by the caller so it overlaps the torso: no neck.
 */
export const figure = (g: G, f: Faction, fur: Fur, o: BodyOptions = {}): void => {
  const rx = o.rx ?? 12.5;
  const ry = o.ry ?? 16;
  displayBase(g, f);
  const feet = o.feet ?? fur;
  vinyl(g, X - 6.5, 82.5, 6, 3.6, feet, 0.1);
  vinyl(g, X + 6.5, 82.5, 6, 3.6, feet, -0.1);
  for (const fx of [X - 6.5, X + 6.5]) {
    g.strokeStyle = "rgba(60,40,25,0.35)";
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(fx - 2, 81.5);
    g.lineTo(fx - 2, 84);
    g.moveTo(fx + 2, 81.5);
    g.lineTo(fx + 2, 84);
    g.stroke();
  }
  vinyl(g, X, BODY_Y, rx, ry, fur);
  ellipse(g, X, BODY_Y + 4, rx * 0.55, ry * 0.6, o.belly ?? fur.light);
  if (!o.noLeftArm) vinyl(g, X - rx - 2, BODY_Y - 2, 4.4, 7.5, fur, 0.3);
  if (!o.noRightArm) vinyl(g, X + rx + 2, BODY_Y - 2, 4.4, 7.5, fur, -0.3);
  if (o.scarf ?? true) scarf(g, f, HEAD_Y + HEAD_R - 2, rx - 1);
};

/** Round chibi head at the shared position. Ears and props draw before/after it. */
export const head = (g: G, fur: Fur, r = HEAD_R): void => {
  vinyl(g, X, HEAD_Y, r, r - 0.5, fur);
};

/** Round ear: an outer vinyl disc with a pastel inner. */
export const roundEar = (g: G, x: number, y: number, r: number, fur: Fur, inner: string): void => {
  vinyl(g, x, y, r, r, fur);
  ellipse(g, x, y + 0.4, r * 0.55, r * 0.55, inner);
};

/** Small muzzle bump with a bead nose. */
export const muzzle = (g: G, y: number, rx: number, ry: number, fur: Fur, nose: string): void => {
  vinyl(g, X, y, rx, ry, { light: "#ffffff", base: fur.light, dark: fur.base }, 0, false);
  ellipse(g, X, y - ry * 0.45, rx * 0.3, ry * 0.3, nose);
  ellipse(g, X - rx * 0.1, y - ry * 0.55, rx * 0.1, ry * 0.1, "#ffffff");
};
