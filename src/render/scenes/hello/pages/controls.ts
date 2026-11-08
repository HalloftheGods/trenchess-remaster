import type Phaser from "phaser";
import { showcaseDemo } from "../../../../game/tutorial/showcase";
import { music } from "../../../../audio/music";
import { Keyboard, type KeyPlate, type KeyRow } from "../Keyboard";
import { Flow, INK, INNER, PAD, PAGE_TEXT, headline, type PageBuilder } from "../pageKit";

/** The classic wording, kept word for word. */
const CONTROLS = "Click a unit, then a highlighted tile. Right-click cancels. Q/E rotate the board, T switches piece style, scroll zooms, right-drag pans, Space ends your turn.";

const KEYS: KeyRow[] = [
  {
    plates: [
      { id: "esc", label: "Esc", codes: ["Escape"], what: "Esc: cancel the selection. In this tome, back to the title." },
      { id: "q", label: "Q", codes: ["KeyQ"], what: "Q: rotate the board left." },
      { id: "e", label: "E", codes: ["KeyE"], what: "E: rotate the board right." },
      { id: "v", label: "V", codes: ["KeyV"], what: "V: switch between the isometric diorama and the straight-on top-down board." },
      { id: "t", label: "T", codes: ["KeyT"], what: "T: switch the chessmen style." },
      { id: "m", label: "M", codes: ["KeyM"], what: "M: music on or off." },
    ],
  },
  {
    plates: [
      { id: "home", label: "Home", codes: ["Home"], what: "Home: reset the view.", w: 72 },
      { id: "plus", label: "+", codes: ["Equal", "NumpadAdd"], what: "+: zoom in." },
      { id: "minus", label: "−", codes: ["Minus", "NumpadSubtract"], what: "−: zoom out." },
      { id: "space", label: "Space", codes: ["Space"], what: "Space: end your turn.", w: 128 },
    ],
  },
  {
    plates: [
      { id: "left", label: "←", codes: ["ArrowLeft"], what: "Arrows: pan the board." },
      { id: "up", label: "↑", codes: ["ArrowUp"], what: "Arrows: pan the board." },
      { id: "down", label: "↓", codes: ["ArrowDown"], what: "Arrows: pan the board." },
      { id: "right", label: "→", codes: ["ArrowRight"], what: "Arrows: pan the board." },
    ],
  },
];

const MOUSE: KeyRow[] = [
  {
    plates: [
      { id: "click", label: "Click", codes: [], what: "Click a unit, then a highlighted tile.", w: 104 },
      { id: "rclick", label: "Right-click", codes: [], what: "Right-click cancels.", w: 104 },
      { id: "wheel", label: "Scroll", codes: [], what: "Scroll zooms.", w: 104 },
      { id: "rdrag", label: "Right-drag", codes: [], what: "Right-drag pans.", w: 104 },
    ],
  },
];

/**
 * Page 8, Controls: the keyboard and mouse strips. A key pressed on this page lights its plate; the
 * real action happens through the game's own bindings (Q/E/V/Home/±/arrows/T), M toggles the music.
 */
export const controlsPage: PageBuilder = (ctx) => {
  const s = ctx.scene;
  headline(ctx, "Chapter 7 · Controls", "At your command");
  const flow = new Flow(ctx);
  flow.text(CONTROLS, "body");
  flow.rule();
  const caption = ctx.add(s.add.text(PAD, 0, "", { ...PAGE_TEXT.body, fontSize: "15px", color: INK.accent, wordWrap: { width: INNER } }).setOrigin(0, 0));
  const idle = "Press a key, or hover a plate, to see what it does. Every key works right now on the board beside you.";
  const show = (plate: KeyPlate | null): void => {
    caption.setText(plate ? plate.what : idle);
  };
  flow.text("Keyboard", "h3");
  const keys = ctx.add(new Keyboard(s, PAD, flow.y, KEYS, show));
  flow.gap(keys.height + 16);
  flow.text("Mouse", "h3");
  const mouse = ctx.add(new Keyboard(s, PAD, flow.y, MOUSE, show));
  flow.gap(mouse.height + 14);
  caption.setY(flow.y);
  show(null);
  const demo = showcaseDemo(ctx.tutorial, 42);
  const onDown = (p: Phaser.Input.Pointer): void => mouse.light(p.rightButtonDown() ? "rclick" : "click");
  const onMove = (p: Phaser.Input.Pointer): void => {
    if (p.rightButtonDown() && p.isDown) mouse.light("rdrag");
  };
  const onWheel = (): void => mouse.light("wheel");
  s.input.on("pointerdown", onDown);
  s.input.on("pointermove", onMove);
  s.input.on("wheel", onWheel);
  return {
    onKey: (e) => {
      const plate = keys.plateFor(e.code);
      if (!plate) return false;
      keys.light(plate.id);
      if (plate.id === "m") music.playing ? music.stop() : music.start();
      if (plate.id === "esc") {
        s.time.delayedCall(220, () => ctx.back());
        return true;
      }
      return plate.id === "left" || plate.id === "right";
    },
    destroy: () => {
      s.input.off("pointerdown", onDown);
      s.input.off("pointermove", onMove);
      s.input.off("wheel", onWheel);
      demo.stop();
    },
  };
};
