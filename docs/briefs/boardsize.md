# Task: render the Classic 8×8 board — ALREADY LANDED, verify only

Owner handle: @board. The 8×8 renderer landed on main (iso.ts reads BOARD_SIZE at call time,
BoardView rebuilds its tiles on a size change and fires `onResized`, plinths are painted per size
(`plinthIso(n)`/`plinthTop(n)`, sizes 8 and 12), Backdrop swaps the plinth, BattleView frames from
`boardBounds()`, `fields.ts` falls back to a random battlefield for Chi on Classic, presets use a
local 12 constant, and the Classic choice is enabled in `setup/choices.ts`).

Your job is now a short verification pass, not a rebuild: start the dev server, open Play, switch
Board to Classic, check iso and top views, start a match on 8×8 (deploy zones, terrain quota 8,
fog, AI turn), rotate the board, switch back to Extended mid-setup, and resize the window. Fix only
real defects you find (keep diffs tiny, in the files listed in COMMON.md's ownership for this task:
`src/render/iso.ts`, `src/render/board/*`, `src/render/art/plinthArt.ts`,
`src/render/scenes/battle/BattleView.ts`, `src/game/fields.ts`). If nothing is wrong, mark chemx
task #5 done with a comment saying what you checked and land nothing.
