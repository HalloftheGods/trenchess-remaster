# Task: chibi vinyl-toy restyle of the Beasts chessmen

Owner handle: @beasts. Files you own: `src/render/art/styles/beastsArt.ts`,
`src/render/art/styles/beastsArtHelpers.ts`, `beastsArtSmall.ts`, `beastsArtLarge.ts`,
`beastsArtCats.ts` (split further if needed), and the label in `STYLE_LABELS` in
`src/render/art/unitArt.ts` (rename "Beasts" to "Toy Beasts" if you like).

Goal (Xopher): "make one of the chessmen styles look like Animal Crossing characters, not the
copyright, just more of the 3D molds" i.e. chibi vinyl figure toys. No copyrighted characters.

Look: big round head about 40% of the figure height, stubby body and limbs, no neck, dot eyes with a
white highlight, small blush circles, tiny smile; matte-plastic shading (soft radial gradient per
part, a single broad specular highlight, a slightly darker rim), parts read as separate moulded
pieces (visible seams at head/body/arm joints), standing on a small round display base. Army colour
(`f.base/light/dark/trim`) goes on a scarf/collar/cape/saddle and the base rim; fur colours stay
natural but pastel. Pieces: hare pawn (long ears), stag knight (little antlers), owl bishop
(round glasses or hood), bear rook (holding a tiny tower shield), lioness queen (tiara), lion king
(round mane, crown). Must read at ~48 px: silhouette first (ears/antlers/mane/crown).

Canvas: 64×100, centre X = 32, base ellipse at y ≈ 86–92, top no higher than y ≈ 6. See
`legionArt.ts` for the helper pattern (`ellipse`, `shade`, gradients). Keep files < 250 lines.

Done when: all six pieces for both players render in the new look (check with a quick Playwright
screenshot after `window.__tc.match().showcase(7)` with style "beasts" via localStorage
`trenchess-theme` = {"style":"beasts","palette":"royal"}), and the chemx gate passes.
