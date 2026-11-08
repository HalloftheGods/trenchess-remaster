import Phaser from "phaser";
import "./style.css";
import logoUrl from "./assets/trenchess-logo.webp";
import { Chessmen } from "./ui/Chessmen";
import { BattleScene } from "./render/scenes/BattleScene";
import { Match, type MatchOptions } from "./game/Match";
import { Hud } from "./ui/Hud";
import { applyTheme, paintUnits, theme, unitKey, type PaletteId, type PieceStyle } from "./render/art/unitArt";
import { getRotation, setRotation } from "./render/iso";
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
    mode: data.get("mode") as MatchOptions["mode"],
    fog: data.get("fog") === "on",
  };
};

const STYLE_ORDER: PieceStyle[] = ["legion", "classic", "crystal", "glyph"];

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
  const form = document.querySelector<HTMLFormElement>("#setup");
  form?.querySelector<HTMLInputElement>(`input[name=style][value=${style}]`)?.click();
  form?.querySelector<HTMLInputElement>(`input[name=palette][value=${palette}]`)?.click();
};

const rotateView = (delta: number): void => {
  setRotation(getRotation() + delta);
  scene.board.clearMarkers();
  scene.board.clearPreview();
  scene.board.relayout(420);
  scene.units.relayout(match.liveBoard, 420);
  window.setTimeout(() => match.refresh(), 440);
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
  if (match.phase === "deploy") hud.banner("Deployment", match.terrainLocked ? "The Trench is laid. Position your army." : "Shape the battlefield and position your army");
};

const openPanel = (name: string | null): void => {
  $("#menu").classList.toggle("hidden", name !== null);
  document.querySelectorAll<HTMLElement>(".panel").forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== name));
  if (name === "educate") chessmen.render();
};

const PREVIEWS: Record<string, () => void> = {
  terrain: () => match.showcase(Math.floor(Math.random() * 1e6)),
  open: () => match.showcaseOpen(),
  land: () => match.showcaseLand(Math.floor(Math.random() * 1e6)),
};

const bindMenu = (): void => {
  const form = $<HTMLFormElement>("#setup");
  document.querySelectorAll<HTMLElement>(".card").forEach((card) => {
    card.addEventListener("click", () => {
      sfx.select();
      const panel = card.dataset.panel ?? null;
      if (panel === "lay") {
        form.querySelector<HTMLInputElement>("input[name=mode][value=omega]")!.checked = true;
        return openPanel("play");
      }
      openPanel(panel);
    }, { signal: lifetime.signal });
    card.addEventListener("mouseenter", () => PREVIEWS[card.dataset.preview ?? ""]?.(), { signal: lifetime.signal });
  });
  document.querySelectorAll<HTMLElement>("[data-back]").forEach((b) =>
    b.addEventListener("click", () => openPanel(null), { signal: lifetime.signal }),
  );
};

const toMenu = (): void => {
  match.quit();
  hud.show(false);
  showScreen("title");
  openPanel(null);
  match.showcase(Math.floor(Math.random() * 1e6));
  scene.setDrift(true);
};

let hud: Hud;
let chessmen: Chessmen;

const lifetime = new AbortController();

const bindUi = (): void => {
  const form = $<HTMLFormElement>("#setup");
  const syncDifficulty = () => $("#difficulty-set").classList.toggle("dim", readOptions(form).opponent === "hotseat");
  form.addEventListener("change", syncDifficulty, { signal: lifetime.signal });
  form.addEventListener("change", () => {
    const data = new FormData(form);
    const style = data.get("style") as PieceStyle;
    const palette = data.get("palette") as PaletteId;
    if (style !== theme.style || palette !== theme.palette) setTheme(style, palette);
  }, { signal: lifetime.signal });
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
    "rotate-left": () => rotateView(-1),
    "rotate-right": () => rotateView(1),
    style: () => setTheme(STYLE_ORDER[(STYLE_ORDER.indexOf(theme.style) + 1) % STYLE_ORDER.length], theme.palette),
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
    if (e.code === "KeyQ") rotateView(-1);
    if (e.code === "KeyE") rotateView(1);
    if (e.code === "KeyT") setTheme(STYLE_ORDER[(STYLE_ORDER.indexOf(theme.style) + 1) % STYLE_ORDER.length], theme.palette);
  }, { signal: lifetime.signal });
};

const boot = (s: BattleScene): void => {
  scene = s;
  loadTheme();
  paintUnits(s);
  hud = new Hud((type, owner) => s.textures.getBase64(unitKey(type, owner)));
  match = new Match(s.board, s.units, hud);
  chessmen = new Chessmen($(".panel[data-panel=educate] .chessmen"), (type, owner) => s.textures.getBase64(unitKey(type, owner)));
  $<HTMLImageElement>(".brand-icon").src = logoUrl;
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
  bindMenu();
  setTheme(theme.style, theme.palette);
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
