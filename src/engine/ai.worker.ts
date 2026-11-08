import { chooseOrder, type Difficulty } from "./ai";
import type { GameState } from "./types";

self.onmessage = (e: MessageEvent<{ state: GameState; difficulty: Difficulty }>) => {
  const order = chooseOrder(e.data.state, e.data.difficulty);
  self.postMessage(order);
};
