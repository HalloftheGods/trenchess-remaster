# Task: reskin the remaining HTML to the in-game look

Owner handle: @reskin. Files you own: `src/style.css` (split into `src/styles/*.css` imported from
`style.css` if it helps staying readable), `index.html`, `src/ui/Hud.ts`, `src/ui/Chessmen.ts`,
`src/ui/movePreview.ts`.

Goal (Xopher): "I want the menus to feel more in-game, not some old-school HTML elements." The
title, menu and setup are already Phaser scenes. What remains in DOM is the battle HUD (top bar,
inspector cards, battle log, deploy tray, action buttons), the banner, the game-over card, and the
two panels (`#panels` → `hello`, `educate`).

Build: make them look like the engine's UI kit (see `src/render/ui/art/*.ts` for the exact palette:
dark lacquered steel plates, gold rims `#f2c94c`, riveted corners, inner bevel, subtle scanline
overlay, Cinzel headings with letter-spacing, Inter body, gold hover glow, panel slide/fade
transitions, buttons shaped like `ui-btn` with a brass primary). Pure CSS (gradients, box-shadows,
pseudo-elements), no images. Delete the dead `#title`/`.menu`/`.card`/`#setup` CSS. Keep every
`data-act` and the `[data-back]` contract and all class names `Hud.ts` queries. Make the deploy
tray and action bar not overlap the compass (bottom-left, 270×268 + 20 px margin) nor the media
player (bottom-right, ~320×88 + 20 px margin): move the action bar to bottom-centre. Keep the HUD
readable at 1280×720. The game-over card gets the same steel/gold treatment with the winner's
faction colour as an accent.

Done when: battle HUD, banner, panels and game-over all match the engine look, nothing overlaps the
compass or the media player, the `#hud` still works for deploy and battle, and the chemx gate passes.
