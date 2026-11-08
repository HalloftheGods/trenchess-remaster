import Phaser from "phaser";
import type { Pos } from "../../engine/types";
import { inBounds } from "../../engine/rules";
import { Tutorial } from "../../game/tutorial";
import { sfx } from "../../audio/sfx";
import { toCell } from "../iso";
import { paintUi } from "../ui/uiArt";
import { motionMs } from "../ui/fonts";
import { Panel, slideIn } from "../ui/widgets";
import { bindKeys } from "../ui/widgets/common";
import type { BattleScene } from "./BattleScene";
import { Nav } from "./hello/Nav";
import { CONTENTS_PAGE, buildBook, type Leaf } from "./hello/book";
import { PANEL_H, PANEL_W, type PageCtx, type PageView } from "./hello/pageKit";

const MARGIN = 24;
const SWIPE = 48;
/** `bindViewControls` pans the board this far on an arrow key; a page turn gives it back. */
const ARROW_PAN = 48;

interface HelloHook {
  go: (index: number) => void;
  back: () => void;
  readonly page: number;
}

declare global {
  interface Window {
    __tcHello?: HelloHook;
  }
}

/**
 * Hello Trenchess as a page-turning parchment tome over the live board. One leaf per chapter; each
 * leaf's demo drives the board through a `Tutorial` and is stopped on the next turn. Prev/Next,
 * ArrowLeft/Right, a swipe on the page and the chapter dots turn pages; Esc or Back emits `ui:back`.
 */
export class HelloScene extends Phaser.Scene {
  private root!: Phaser.GameObjects.Container;
  private panel!: Panel;
  private nav!: Nav;
  private tutorial!: Tutorial;
  private leaves: Leaf[] = [];
  private index = -1;
  private view: PageView | null = null;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private unbindKeys: () => void = () => undefined;
  private swipeFrom: number | null = null;
  private leaving = false;

  constructor() {
    super("hello");
  }

  create(): void {
    paintUi(this);
    this.leaving = false;
    this.index = -1;
    this.tutorial = new Tutorial(this.battle);
    this.leaves = buildBook();
    this.root = this.add.container(0, 0);
    this.panel = new Panel(this, 0, 0, PANEL_W, PANEL_H, "parchment");
    this.nav = new Nav(this, this.leaves.length, {
      back: () => this.back(),
      contents: () => this.go(CONTENTS_PAGE),
      prev: () => this.go(this.index - 1),
      next: () => this.go(this.index + 1),
      go: (i) => this.go(i),
    });
    this.root.add([this.panel, this.nav]);
    this.layout();
    this.scale.on("resize", this.layout, this);
    this.unbindKeys = bindKeys(this, (e) => this.onKey(e));
    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointerup", this.onPointerUp, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.enter();
    this.go(0);
    window.__tcHello = { go: (i) => this.go(i), back: () => this.back(), page: 0 };
  }

  private get battle(): BattleScene {
    return this.scene.get("battle") as BattleScene;
  }

  private get k(): number {
    return this.root.scaleX;
  }

  private layout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const k = Phaser.Math.Clamp((h - MARGIN * 2) / PANEL_H, 0.5, 1);
    this.root.setScale(k).setPosition(w - MARGIN - PANEL_W * k, (h - PANEL_H * k) / 2);
  }

  /** Screen-space left edge of the tome. */
  private get panelLeft(): number {
    return this.root.x;
  }

  private overPanel(x: number, y: number): boolean {
    return x >= this.panelLeft && y >= this.root.y && y <= this.root.y + PANEL_H * this.k;
  }

  /** Turn to a leaf: stop the demo, destroy the page, build the next and slide it in. */
  go(target: number): void {
    const i = Phaser.Math.Clamp(target, 0, this.leaves.length - 1);
    if (i === this.index || this.leaving) return;
    const dir = i > this.index ? 1 : -1;
    const first = this.index < 0;
    this.closePage();
    this.index = i;
    const leaf = this.leaves[i];
    this.view = leaf.build(this.pageCtx());
    this.nav.setPage(i, this.leaves.length, leaf.caption);
    if (window.__tcHello) window.__tcHello = { ...window.__tcHello, page: i };
    slideIn(this, this.objects, dir > 0 ? "right" : "left", first ? 120 : 0, 36);
    if (!first) sfx.select();
  }

  private pageCtx(): PageCtx {
    return {
      scene: this,
      tutorial: this.tutorial,
      objects: this.objects,
      add: (o) => {
        this.root.add(o);
        this.objects.push(o);
        return o;
      },
      go: (i) => this.go(i),
      back: () => this.back(),
    };
  }

  private closePage(): void {
    this.view?.destroy();
    this.view = null;
    this.tutorial.stop();
    this.objects.forEach((o) => o.destroy());
    this.objects.length = 0;
  }

  private onKey(e: KeyboardEvent): void {
    if (this.leaving) return;
    if (this.view?.onKey?.(e)) return;
    if (e.code === "Escape") this.back();
    if (e.code === "ArrowRight" || e.code === "PageDown") this.turnByKey(1, e.code === "ArrowRight");
    if (e.code === "ArrowLeft" || e.code === "PageUp") this.turnByKey(-1, e.code === "ArrowLeft");
  }

  private turnByKey(dir: 1 | -1, arrow: boolean): void {
    this.go(this.index + dir);
    if (arrow) this.battle.view.panBy(-dir * ARROW_PAN, 0);
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (this.leaving) return;
    if (this.overPanel(p.x, p.y)) {
      this.swipeFrom = p.x;
      return;
    }
    this.swipeFrom = null;
    if (p.rightButtonDown()) return;
    const cell = this.cellAt(p);
    if (cell) this.tutorial.click(cell);
  }

  private onPointerUp(p: Phaser.Input.Pointer): void {
    if (this.swipeFrom === null) return;
    const dx = p.x - this.swipeFrom;
    this.swipeFrom = null;
    if (Math.abs(dx) >= SWIPE) this.go(this.index + (dx < 0 ? 1 : -1));
  }

  private cellAt(p: Phaser.Input.Pointer): Pos | null {
    const world = this.battle.cameras.main.getWorldPoint(p.x, p.y);
    const [r, c] = toCell(world.x, world.y);
    return inBounds(r, c) ? [r, c] : null;
  }

  private enter(): void {
    const x = this.root.x;
    this.root.setX(x + 80).setAlpha(0);
    this.tweens.add({ targets: this.root, x, alpha: 1, duration: motionMs(420), ease: "Cubic.Out" });
  }

  back(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.closePage();
    this.tweens.add({
      targets: this.root,
      x: this.root.x + 80,
      alpha: 0,
      duration: motionMs(260),
      ease: "Cubic.In",
      onComplete: () => {
        this.scene.stop();
        this.game.events.emit("ui:back");
      },
    });
  }

  private teardown(): void {
    this.closePage();
    this.scale.off("resize", this.layout, this);
    this.input.off("pointerdown", this.onPointerDown, this);
    this.input.off("pointerup", this.onPointerUp, this);
    this.unbindKeys();
    this.tutorial.drift(false);
    if (window.__tcHello) delete window.__tcHello;
  }
}
