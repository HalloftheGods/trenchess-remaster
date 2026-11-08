import type { GameState, Order } from "../engine/types";
import type { Difficulty } from "../engine/ai";

export class AiClient {
  private worker: Worker | null = null;

  private ensure(): Worker {
    if (!this.worker) this.worker = new Worker(new URL("../engine/ai.worker.ts", import.meta.url), { type: "module" });
    return this.worker;
  }

  choose(state: GameState, difficulty: Difficulty): Promise<Order | null> {
    const worker = this.ensure();
    return new Promise((resolve) => {
      worker.onmessage = (e: MessageEvent<Order | null>) => resolve(e.data);
      worker.postMessage({ state, difficulty });
    });
  }

  reset(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
