import type { UnitType } from "../../../../engine/types";
import type { SpriteSheet } from "../sheet";
import king from "./king";
import queen from "./queen";
import rook from "./rook";
import bishop from "./bishop";
import knight from "./knight";
import pawn from "./pawn";

export const SHEETS: Record<UnitType, SpriteSheet> = { king, queen, rook, bishop, knight, pawn };
