import Phaser from "phaser";
import "./style.css";
import { Chessmen } from "./ui/Chessmen";
import { BattleScene } from "./render/scenes/BattleScene";
import { SplashScene } from "./render/scenes/SplashScene";
import { TitleScene } from "./render/scenes/TitleScene";
import { SetupScene } from "./render/scenes/SetupScene";
import { OverlayScene } from "./render/scenes/OverlayScene";
import { DuelScene } from "./render/duel/DuelScene";
import { HelloScene } from "./render/scenes/HelloScene";
import { Match, type MatchOptions } from "./game/Match";
import type { OnlineStart } from "./net/onlineMatch";
import { Hud } from "./ui/Hud";
import { STYLE_ORDER, applyTheme, paintUnits, theme, unitKey, type PaletteId, type PieceStyle } from "./render/art/unitArt";
import { sfx } from "./audio/sfx";
import { music } from "./audio/music";
import { Backdrop } from "./render/backdrop/Backdrop";
import { terrainStrip } from "./render/art/terrainStrip";
import { paintTerrain } from "./render/art/terrainArt";
import { paintDecor } from "./render/art/decorArt";
import { paintSky } from "./render/art/skyArt";
import { paintPlinth } from "./render/art/plinthArt";
import { applyWorld, isWorldId } from "./render/art/worlds/registry";
import { bindViewControls } from "./ui/viewControls";
import { loadBackdropMode, saveBackdropMode, type BackdropMode } from "./render/board/backdropMode";

const $ = <T extends HTMLElement>(sel: string): T => document.querySelector(sel) as T;

let game: Phaser.Game;
let match: Match;
let scene: BattleScene;
let hud: Hud;
let chessmen: Chessmen;
let lastOptions: MatchOptions | null = null;
const lifetime = new AbortController();

const title = (): TitleScene => game.scene.getScene("title") as TitleScene;
const overlay = (): OverlayScene => game.scene.getScene("overlay") as OverlayScene;

const saveTheme = (): void => {
  try {
    localStorage.setItem("trenchess-theme", JSON.stringify(theme));
  } catch {
    return;
  }
};

const loadTheme = (): void => {
  try {
    const saved = JSON.parse(localStorage.getItem("trenchess-theme") ?? "null");
    if (saved?.style && saved?.palette) applyTheme(saved.style, saved.palette);
  } catch {
    return;
  }
};

const setTheme = (style: PieceStyle, palette: PaletteId): void => {
  applyTheme(style, palette);
  paintUnits(scene);
  scene.units.retexture();
  hud.refreshTheme();
  match.refresh();
  saveTheme();
};

const nextStyle = (): void => setTheme(STYLE_ORDER[(STYLE_ORDER.indexOf(theme.style) + 1) % STYLE_ORDER.length], theme.palette);

/** Switch the terrain world: repaint every world-keyed texture, then redress the board and backdrop. */
const setWorld = (id: unknown): void => {
  if (!isWorldId(id)) return;
  applyWorld(id);
  paintTerrain(scene);
  paintDecor(scene);
  paintSky(scene);
  paintPlinth(scene);
  scene.backdrop.retexture();
  scene.board.setTerrain(scene.board.terrain);
  match.refresh();
};

const PREVIEWS: Record<string, () => void> = {
  terrain: () => match.showcase(Math.floor(Math.random() * 1e6)),
  open: () => match.showcaseOpen(),
  land: () => match.showcaseLand(Math.floor(Math.random() * 1e6)),
};

/** Back to the title menu from anywhere: the title scene wakes and replays its menu slide-in. */
const toTitle = (): void => {
  match.quit();
  music.setMood("title");
  hud.show(false);
  $("#over").classList.add("hidden");
  $("#panels").classList.add("hidden");
  overlay().setShown(false);
  scene.view.setDiorama(true);
  scene.view.frame("center");
  scene.setDrift(true);
  if (game.scene.isSleeping("title")) {
    game.scene.wake("title");
    title().reenter();
  } else if (!game.scene.isActive("title")) {
    game.scene.start("title");
  }
};

const openSetup = (mode?: MatchOptions["mode"]): void => {
  game.scene.sleep("title");
  scene.setDrift(false);
  scene.view.setDiorama(false);
  scene.view.frame("setup");
  overlay().setShown(true);
  game.scene.start("setup", { mode });
};

/** Hello Trenchess: the tome scene over the board, framed like setup. */
const openHello = (): void => {
  game.scene.sleep("title");
  scene.setDrift(false);
  scene.view.setDiorama(false);
  scene.view.frame("setup");
  overlay().setShown(true);
  game.scene.start("hello");
};

const openPanel = (name: "educate"): void => {
  game.scene.sleep("title");
  $("#panels").classList.remove("hidden");
  document.querySelectorAll<HTMLElement>(".panel").forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== name));
  chessmen.render();
};

const startMatch = (options: MatchOptions, online?: OnlineStart): void => {
  lastOptions = options;
  $("#over").classList.add("hidden");
  for (const key of ["setup", "hello"]) if (game.scene.isActive(key)) game.scene.stop(key);
  scene.setDrift(false);
  scene.view.setDiorama(false);
  scene.view.frame("center");
  overlay().setShown(true);
  hud.show(true);
  hud.clearLog();
  if (online) match.startOnline(online.options, online.duel, online.seed);
  else match.start(options);
  music.setMood("battle");
  if (match.phase === "deploy") hud.banner("Deployment", match.terrainLocked ? "The Trench is laid. Position your army." : "Shape the battlefield and position your army");
};

const bindFlow = (): void => {
  const ev = game.events;
  ev.on("ui:splash-done", () => {
    match.showcase(7);
    scene.view.setDiorama(true);
    scene.setDrift(true);
    game.scene.start("title");
  });
  ev.on("ui:preview", (kind: string) => PREVIEWS[kind]?.());
  ev.on("ui:open", (page: string) => {
    if (page === "play") openSetup();
    if (page === "lay") openSetup("omega");
    if (page === "hello") openHello();
    if (page === "educate") openPanel(page);
  });
  ev.on("ui:setup-changed", (options: MatchOptions) => match.preview(options));
  ev.on("ui:theme", ({ style, palette }: { style: PieceStyle; palette: PaletteId }) => setTheme(style, palette));
  ev.on("ui:world", (id: string) => setWorld(id));
  ev.on("ui:start", (options: MatchOptions) => startMatch(options));
  ev.on("ui:start-online", (start: OnlineStart) => startMatch(start.options, start));
  ev.on("ui:back", toTitle);
  ev.on("ui:backdrop", (mode: BackdropMode) => {
    saveBackdropMode(mode);
    scene.backdrop.setMode(mode);
  });
  bindViewControls(game, () => scene, () => match.refresh(), lifetime.signal);
};

const bindUi = (): void => {
  const actions: Record<string, () => void> = {
    randomize: () => match.randomizeTerrain(),
    clear: () => match.clearTerrain(),
    ready: () => match.ready(),
    "end-turn": () => void match.endTurnNow(),
    menu: toTitle,
    "to-menu": toTitle,
    // An online rematch needs a new room, so it goes back to setup.
    again: () => {
      if (lastOptions?.opponent === "online") openSetup();
      else if (lastOptions) startMatch(lastOptions);
    },
    "rotate-left": () => game.events.emit("ui:view", { action: "rotate", delta: -1 }),
    "rotate-right": () => game.events.emit("ui:view", { action: "rotate", delta: 1 }),
    style: nextStyle,
    sound: () => {
      sfx.muted = !sfx.muted;
      $("[data-act=sound]").textContent = sfx.muted ? "🔇" : "🔊";
      if (sfx.muted) music.stop();
      else music.start();
    },
  };
  document.addEventListener("click", (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>("[data-act]")?.dataset.act;
    if (act && actions[act]) actions[act]();
    if ((e.target as HTMLElement).closest("[data-back]")) toTitle();
  }, { signal: lifetime.signal });
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && match.phase === "battle") {
      e.preventDefault();
      void match.endTurnNow();
    }
    if (e.code === "Escape") {
      match.cancel();
      if (!$("#panels").classList.contains("hidden")) toTitle();
    }
    // T is a room code letter, so it only cycles styles outside the setup panel.
    if (e.code === "KeyT" && !game.scene.isActive("setup")) nextStyle();
  }, { signal: lifetime.signal });
};

const bindMusic = (): void => {
  const wake = () => {
    if (!sfx.muted) music.start();
  };
  document.addEventListener("pointerdown", wake, { signal: lifetime.signal });
  document.addEventListener("keydown", wake, { signal: lifetime.signal });
  new Backdrop($("#backdrop"), () => music.levels(), lifetime.signal);
};

/** The inline boot screen in index.html covers the page until the engine has painted and the splash is up. */
const liftBootScreen = (): void => {
  document.body.classList.remove("booting");
  const cover = document.getElementById("boot");
  if (!cover) return;
  cover.classList.add("out");
  window.setTimeout(() => cover.remove(), 500);
};

const boot = (s: BattleScene): void => {
  scene = s;
  loadTheme();
  s.backdrop.setMode(loadBackdropMode(), 0);
  paintUnits(s);
  hud = new Hud((type, owner) => s.textures.getBase64(unitKey(type, owner)), (t) => terrainStrip(s, t));
  match = new Match(s.board, s.units, hud);
  chessmen = new Chessmen($(".panel[data-panel=educate] .chessmen"), (type, owner) => s.textures.getBase64(unitKey(type, owner)));
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
  bindFlow();
  bindMusic();
  setTheme(theme.style, theme.palette);
  game.scene.add("overlay", OverlayScene, true);
  game.scene.add("duel", DuelScene, true);
  game.scene.add("title", TitleScene, false);
  game.scene.add("setup", SetupScene, false);
  game.scene.add("hello", HelloScene, false);
  game.scene.add("splash", SplashScene, true);
  liftBootScreen();
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("dev")) void import("./dev/devPanel").then((m) => m.mountDevPanel(game));
};

game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "stage",
  transparent: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: [],
  callbacks: {
    postBoot: (g) => {
      g.scene.add("battle", BattleScene, true, {
        ready: boot,
        click: (cell: [number, number]) => match?.click(cell),
        cancel: () => match?.cancel(),
        hover: (cell: [number, number] | null) => match?.hover(cell),
      });
    },
  },
});
