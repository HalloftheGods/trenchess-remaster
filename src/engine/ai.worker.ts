import { chooseOrder, type Difficulty } from "./ai";
import { setBoardSize } from "./rules";
import type { GameState } from "./types";

self.onmessage = (e: MessageEvent<{ state: GameState; difficulty: Difficulty }>) => {
  setBoardSize(e.data.state.board.length);
  const order = chooseOrder(e.data.state, e.data.difficulty);
  self.postMessage(order);
};
