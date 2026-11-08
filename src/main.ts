import Phaser from "phaser";
import "./style.css";
import { BattleScene } from "./render/scenes/BattleScene";
import { Match, type MatchOptions } from "./game/Match";
import { Hud } from "./ui/Hud";
import { unitKey } from "./render/art/unitArt";
import { sfx } from "./audio/sfx";
import type { Difficulty } from "./engine/ai";

const $ = <T extends HTMLElement>(sel: string): T => document.querySelector(sel) as T;

let match: Match;
let scene: BattleScene;
let lastOptions: MatchOptions | null = null;

const readOptions = (form: HTMLFormElement): MatchOptions => {
  const data = new FormData(form);
  return {
    opponent: data.get("opponent") as MatchOptions["opponent"],
    difficulty: data.get("difficulty") as Difficulty,
    ordersPerTurn: Number(data.get("orders")),
    battlefield: data.get("battlefield") as MatchOptions["battlefield"],
    fog: data.get("fog") === "on",
  };
};

const showScreen = (id: "title" | "over" | null): void => {
  $("#title").classList.toggle("hidden", id !== "title");
  $("#over").classList.toggle("hidden", id !== "over");
};

const startMatch = (options: MatchOptions): void => {
  lastOptions = options;
  showScreen(null);
  scene.setDrift(false);
  hud.show(true);
  hud.clearLog();
  match.start(options);
  hud.banner("Deployment", "Shape the battlefield and position your army");
};

const toMenu = (): void => {
  match.quit();
  hud.show(false);
  showScreen("title");
  match.showcase(Math.floor(Math.random() * 1e6));
  scene.setDrift(true);
};

let hud: Hud;

const lifetime = new AbortController();

const bindUi = (): void => {
  const form = $<HTMLFormElement>("#setup");
  const syncDifficulty = () => $("#difficulty-set").classList.toggle("dim", readOptions(form).opponent === "hotseat");
  form.addEventListener("change", syncDifficulty, { signal: lifetime.signal });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    sfx.select();
    startMatch(readOptions(form));
  }, { signal: lifetime.signal });
  const actions: Record<string, () => void> = {
    randomize: () => match.randomizeTerrain(),
    clear: () => match.clearTerrain(),
    ready: () => match.ready(),
    "end-turn": () => void match.endTurnNow(),
    menu: toMenu,
    "to-menu": toMenu,
    again: () => lastOptions && startMatch(lastOptions),
    sound: () => {
      sfx.muted = !sfx.muted;
      $("[data-act=sound]").textContent = sfx.muted ? "🔇" : "🔊";
    },
  };
  document.addEventListener("click", (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>("[data-act]")?.dataset.act;
    if (act && actions[act]) actions[act]();
  }, { signal: lifetime.signal });
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && match.phase === "battle") {
      e.preventDefault();
      void match.endTurnNow();
    }
    if (e.code === "Escape") match.cancel();
  }, { signal: lifetime.signal });
};

const boot = (s: BattleScene): void => {
  scene = s;
  hud = new Hud((type, owner) => s.textures.getBase64(unitKey(type, owner)));
  match = new Match(s.board, s.units, hud);
  hud.bindDeploy(match, () => undefined);
  match.showcase(7);
  Object.assign(window, {
    __tc: {
      match: () => match,
      cellToScreen: (r: number, c: number) => {
        const cam = s.cameras.main;
        const { x, y } = s.board.center(r, c);
        return { x: (x - cam.worldView.x) * cam.zoom, y: (y - cam.worldView.y) * cam.zoom };
      },
    },
  });
  bindUi();
  showScreen("title");
};

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "stage",
  transparent: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: [],
  callbacks: {
    postBoot: (game) => {
      game.scene.add("battle", BattleScene, true, {
        ready: boot,
        click: (cell: [number, number]) => match?.click(cell),
        cancel: () => match?.cancel(),
        hover: (cell: [number, number] | null) => match?.hover(cell),
      });
    },
  },
});
