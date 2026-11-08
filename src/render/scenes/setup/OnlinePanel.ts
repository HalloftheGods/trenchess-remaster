import Phaser from "phaser";
import type { MatchOptions } from "../../../game/Match";
import { label } from "../../ui/widgets/common";
import { hostOnline, joinOnline, type OnlineStart } from "../../../net/onlineMatch";
import { onlineLive } from "../../../net/playApi";
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "../../../net/roomCode";

const IDLE_HINT = "Type a friend's room code to join, or press To battle to host.";

/**
 * The Online row of the setup panel: a room code field and a status line. Hosting opens a room on
 * play-api and shows its code; joining dials the typed code. Either way `onStart` fires once both
 * tabs hold the same options and seed.
 */
export class OnlinePanel extends Phaser.GameObjects.Container {
  private code = "";
  private codeText: Phaser.GameObjects.Text;
  private status: Phaser.GameObjects.Text;
  private busy = false;
  private cancelHost: (() => void) | null = null;

  constructor(scene: Phaser.Scene, w: number, private onStart: (start: OnlineStart) => void) {
    super(scene, 0, 0);
    this.codeText = label(scene, 0, 0, "", "h3");
    this.status = label(scene, 0, 34, onlineLive() ? IDLE_HINT : "Online play is off in this build.", "small").setWordWrapWidth(w);
    this.add([this.codeText, this.status]);
    this.setSize(w, 72);
    this.drawCode();
  }

  /** Letters type the code, Backspace deletes. Returns true when the key was used. */
  key(e: KeyboardEvent): boolean {
    if (this.busy) return false;
    const letter = e.key.length === 1 ? e.key.toUpperCase() : "";
    const isCodeLetter = letter !== "" && ROOM_CODE_ALPHABET.includes(letter);
    if (isCodeLetter && this.code.length < ROOM_CODE_LENGTH) this.code += letter;
    else if (e.code === "Backspace") this.code = this.code.slice(0, -1);
    else return false;
    this.drawCode();
    return true;
  }

  /** To battle: join the typed code, or host when nothing is typed. */
  async go(options: MatchOptions): Promise<void> {
    if (this.busy || !onlineLive()) return;
    this.busy = true;
    if (this.code) await this.join(options);
    else await this.host(options);
  }

  /** Closes a room this tab is still waiting in. */
  cancel(): void {
    this.cancelHost?.();
    this.cancelHost = null;
  }

  private async host(options: MatchOptions): Promise<void> {
    this.say("Opening a room…");
    const opened = await hostOnline(options);
    if (!opened.ok) return this.fail(opened.reason);
    this.cancelHost = opened.cancel;
    this.code = opened.code;
    this.drawCode();
    this.say(`Room ${opened.code} is open. Tell your opponent the code. Waiting for them to join…`);
    try {
      const start = await opened.started;
      this.cancelHost = null;
      this.onStart(start);
    } catch (error) {
      const isCancelled = error instanceof Error && error.message === "closed";
      if (!isCancelled) this.fail(error instanceof Error ? error.message : "The room closed.");
    }
  }

  private async join(options: MatchOptions): Promise<void> {
    this.say(`Joining ${this.code}…`);
    const joined = await joinOnline(this.code, options);
    if (!joined.ok) return this.fail(joined.reason);
    this.onStart(joined.start);
  }

  private fail(reason: string): void {
    this.busy = false;
    this.say(reason);
  }

  private say(text: string): void {
    this.status.setText(text);
  }

  private drawCode(): void {
    const slots = Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => this.code[i] ?? "_");
    this.codeText.setText(`Room code  ${slots.join(" ")}`);
  }
}
