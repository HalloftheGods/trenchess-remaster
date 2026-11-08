# Task: "Hello Trenchess" as an interactive in-engine tutorial

Owner handle: @hello. Files you own: new `src/render/scenes/HelloScene.ts` (scene key "hello") and
`src/render/scenes/hello/*` (pages, nav, data), new `src/game/tutorial.ts` (+ `src/game/tutorial/*`:
the live board demos), the `"hello"` branch of `ui:open` in `src/main.ts` (open the scene instead of
the DOM panel, mirror `openSetup`: sleep the title, frame the board for "setup", `scene.start("hello")`;
`ui:back` already returns to the title), and removing the `hello` DOM panel from `index.html`
(another agent is restyling `index.html`/`style.css` at the same time: when you merge origin/main,
keep their styling and only drop the hello panel markup; the `educate` panel stays).

Goal (Xopher, with a screenshot of today's static text wall): "we need to make the Hello Trenchess
more interactive like the How to Play does it in Undead Of Night." That game's How to Play
(`/home/claude/hallofthegods/undead-of-night/src/game/how-to-play.ts`, `magazine-pages.ts`,
`magazine-types.ts`, `src/components/magazine/*`) is a page-turning magazine: a cover, a contents
page, numbered chapters, one topic per spread with short points, pictures with marker-pen circles
and arrows, galleries of sprite cards, sticky notes and tips, and a nav bar Back · Contents · page
label · Prev · Next; arrow keys and swipes turn pages. Read it before designing.

Build the Trenchess equivalent as a Phaser scene over the live board: a parchment tome
(`ui-panel-parchment` nine-slice, Cinzel headings, the UI kit's `Button`, `Segmented`, `heading`,
`slideIn`) on the right ~520 px, the board on the left as the living illustration. Chapters, one
per page, with the classic wording kept word for word where it exists (lore names from
`src/engine/lore.ts` or wherever the HUD texts live; never invent names):

1. **Cover / The Prophecy**: "From the trench, the Chessmen grow stronger." Logo, one paragraph,
   "Turn the page" hint. Board: a random battlefield with both armies, slow drift.
2. **Deploy**: back four rows glow (use `BoardView` markers/preview API) while terrain tiles drop in
   one by one up to 16 a side; a "Place a tile" mini-exercise: clicking a glowing cell in your half
   paints a forest (use the real `canPlaceTerrain` rules).
3. **Orders**: Command mode. Two chessmen light up in turn and move (animate through `UnitView`);
   a counter "Order 1 of 2 / Order 2 of 2" on the page; a sticky note: "An order that puts the
   enemy king in check ends your turn." (that is the current rule text in index.html).
4. **Terrain**: a `Segmented` of the four terrains (Whispering Woods, Sunken Realm, Iron Peaks,
   Endless Sands). Picking one fills a patch of the board with it and shows which chessmen are
   blocked (grey them out on the board, list them on the page with their portraits from
   `scene.textures.getBase64(unitKey(type, owner))` → use Phaser images of the unit textures), and
   the desert rule ("units left idle there at the end of your turn perish").
5. **The Chessmen grow stronger**: a carousel/row of the six pieces. Selecting one puts it alone at
   the board's centre and shows its classic moves in green and its new Trenchess moves in gold with
   the ability's lore name and description (reuse the move-preview logic: `src/ui/movePreview.ts`
   CLASSIC predicate and `pseudoMovesFor` from the engine; same colours as the HUD legend:
   green = Classic move, gold = New move). Pieces: Equinox King (Somersault Assault), Sacred Queen
   (8 Legged Gallop), Twilight Fortress (Four-Corners Fortnight), Light Seer (Leap of Faith),
   Shadow Knight (Triple-Bar Jump), Nimbus Jumper (Double-back Flip, plus the two-square first step).
6. **Victory**: a staged checkmate: the board plays a 3-move sequence ending in a capture of the
   king with the real capture effects (`Fx`), then resets and loops; the page says "capture or
   checkmate the enemy King".
7. **Controls**: a drawn keyboard strip (keys as small `ui-seg` plates) highlighting Q/E rotate,
   V iso/top, Home, +/-, arrows, Space end turn, Esc cancel, T style, M music, and mouse: click,
   right-click cancel, scroll zoom, right-drag pan. Pressing a key on this page lights its plate
   and performs the real action (`game.events.emit("ui:view", …)`).
8. **Contents** reachable from the nav; chapter dots along the panel edge; Prev/Next buttons,
   ArrowLeft/Right and swipe on the panel turn pages; Esc or Back emits `ui:back`. Page turns slide
   the parchment content (`slideIn`) and play `sfx.select()`.

The demos drive `scene.board` (`BoardView`: `setTerrain`, `paintCell`, markers/preview methods),
`scene.units` (`UnitView`: `sync`, move animations) and `scene.fx` directly through a `Tutorial`
class in `src/game/tutorial.ts` that owns a scratch `Cell[][]`/`Terrain[][]` and cleans up
(`stop()`) when the page changes or the scene shuts down. Do not touch `Match`; the HelloScene is
opened only from the title, when no match is running. All timers via `scene.time` so they die with
the scene. Reduced motion: no loops, show end states.

Done when: Hello Trenchess opens from the title into the tome, every chapter's board demo runs and
cleans up, the Chessmen page is clickable per piece, Back/Esc returns to the title, and the chemx
gate passes. Report any UI-kit or BoardView API you had to add.
