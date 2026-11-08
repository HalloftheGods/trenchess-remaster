import type { PageBuilder } from "./pageKit";
import { coverPage } from "./pages/cover";
import { contentsPage, type ChapterLink } from "./pages/contents";
import { deployPage } from "./pages/deploy";
import { ordersPage } from "./pages/orders";
import { terrainPage } from "./pages/terrain";
import { chessmenPage } from "./pages/chessmen";
import { victoryPage } from "./pages/victory";
import { controlsPage } from "./pages/controls";

export interface Leaf {
  id: string;
  /** Short label for the nav bar. */
  caption: string;
  build: PageBuilder;
}

/** Where the contents page sits in the tome. */
export const CONTENTS_PAGE = 1;

interface Chapter {
  id: string;
  caption: string;
  title: string;
  kicker: string;
  build: PageBuilder;
}

const CHAPTERS: Chapter[] = [
  { id: "prophecy", caption: "The Prophecy", title: "The Prophecy", kicker: "From the trench, the Chessmen grow stronger.", build: coverPage },
  { id: "deploy", caption: "Deploy", title: "Deploy", kicker: "Shape the battlefield and place your army.", build: deployPage },
  { id: "orders", caption: "Orders", title: "Orders", kicker: "Two orders a turn, and the check that ends it.", build: ordersPage },
  { id: "terrain", caption: "Terrain", title: "Terrain", kicker: "The four lands and who they stop.", build: terrainPage },
  { id: "chessmen", caption: "The Chessmen", title: "The Chessmen grow stronger", kicker: "Six pieces, six new moves.", build: chessmenPage },
  { id: "victory", caption: "Victory", title: "Victory", kicker: "Capture or checkmate the enemy King.", build: victoryPage },
  { id: "controls", caption: "Controls", title: "Controls", kicker: "Keyboard and mouse.", build: controlsPage },
];

/** The cover, then the contents, then the chapters: one leaf per page. */
export const buildBook = (): Leaf[] => {
  const indexOf = (chapter: number): number => (chapter === 0 ? 0 : chapter + 1);
  const links: ChapterLink[] = CHAPTERS.map((ch, i) => ({ index: indexOf(i), number: i + 1, title: ch.title, kicker: ch.kicker }));
  const leaves: Leaf[] = CHAPTERS.map((ch) => ({ id: ch.id, caption: ch.caption, build: ch.build }));
  leaves.splice(CONTENTS_PAGE, 0, { id: "contents", caption: "Contents", build: contentsPage(links) });
  return leaves;
};
