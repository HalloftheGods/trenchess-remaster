# Task: pixel-art duel cutscene on captures

Owner handle: @duel. Files you own: new `src/render/duel/*` (DuelScene "duel", sprites, timeline),
the capture hook in `src/game/Match.ts` (the smallest possible insertion where a capture resolves:
await the duel before the capture animation/removal; look for `sfx.capture` / the capture branch of
the order resolution), new options rows in `src/render/scenes/SetupScene.ts` ("Duels" segmented:
Off · Fast · Full, stored in `MatchOptions.duel?: "off" | "fast" | "full"`; add the field in
`src/game/Match.ts`'s `MatchOptions` and default "full" in `src/render/scenes/setup/choices.ts`).

Goal (Xopher): "I want a Fire Emblem type of animation when the pieces capture each other. Maybe we
can do a pixel art style animation of the battle between pieces." Coordinator added: skippable,
on/off plus a fast option.

Build: a `DuelScene` launched over the battle (transparent scene, letterboxed 16:9 strip across the
middle, pixel-art, `pixelArt` rendering: draw at 1/4 scale into a RenderTexture or use
`setScale(4)` on sprites with `texture.setFilter(NEAREST)`). Backdrop painted per terrain of the
defender's tile (plains / forest / swamp / mountain / desert) as a side-scrolling parallax strip
(2–3 layers), both chessmen as 32×40 pixel sprites generated procedurally from the existing 8-bit
style grids in `src/render/art/styles/pixelArtGrids.ts` (reuse them; add a 2–3 frame attack and a
hit/flinch frame by transforming the grids: lunge = shift + lean, hit = flash white + shake). Timeline
("full" ≈ 1.6 s, "fast" ≈ 0.7 s): slide in from both sides with name plates (unit lore names and
the player's colour), attacker lunges, impact flash + screen shake + particles, defender crumbles to
pixels, victor poses, fade out. Any key or click skips immediately (resolve the promise). Use
`sfx.capture(true)` for the hit. Respect `prefers-reduced-motion` (skip to the result).

Hook: `Match` awaits `duel.play({ attacker, defender, terrain, attackerOwner })` returned promise
when `options.duel !== "off"`, before the capture is shown on the board; AI turns use it too. Keep
the board input blocked while it plays (`busy` already exists). Expose `window.__tcDuel = { play }`
for a quick check.

Done when: a capture in a real match plays the duel, Off/Fast/Full work from setup, any key skips,
and the chemx gate passes.
