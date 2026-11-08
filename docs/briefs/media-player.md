# Task: in-engine media player for the music

Owner handle: @media. Files you own: `src/audio/music.ts`, `src/audio/playlist.ts`,
new `src/render/ui/MediaPlayer.ts` (+ helpers under `src/render/ui/media/`),
`src/render/scenes/OverlayScene.ts` (add the player next to the compass; keep the compass code).

Goal (Xopher): "add a media player to the UI so we can control the music". Play/pause, previous,
next, the track title (scrolling marquee if long), a volume slider, shuffle on/off, and a tiny
level meter that dances to `music.levels()`. It must look like the rest of the UI kit (steel plate,
gold accents, `ui-btn*`, `ui-knob`/`ui-track`, Cinzel/Inter via `TEXT`), not HTML.

Music API (`src/audio/music.ts`, singleton `music`): today it has `start()`, `stop()`,
`setMood(mood)`, `playing`, `nowPlaying`, `levels()`. Add: `toggle()` (pause/resume without
fading the bus to zero forever), `next()`, `prev()` (history stack), `volume` get/set (0..1, persist
in localStorage `trenchess-volume`, default 0.8, applied to the `out` gain), `shuffle` get/set
(persist; when off, play the mood's tracks in playlist order), `track` (current `Track | null`,
"Trench Ambience" when the generative score plays), and an `onChange(cb)` subscription (fires on
track change / play state change) so the widget updates without polling. Keep the backdrop reactive
(`levels()` must keep working through pause/volume). Keep the per-mood behaviour: `setMood` still
switches pools; prev/next stay within the current mood.

Widget: `MediaPlayer` extends `Phaser.GameObjects.Container`, top-left anchored, about 320×88,
placed bottom-right by `OverlayScene` (mirror of the compass margin). Collapsed by default to a
small pill (▶/❚❚ + title); click the pill or press M to expand. `OverlayScene.setShown` already fades
the compass; make it fade the player too, but the player must also be reachable on the title
(so `setShown(false)` hides the compass only; add `setPlayerShown`/keep the player visible on the
title — your call, document it in the report). The player must never steal the keys the game uses
(Q/E/V/Home/+/-/arrows/Space/Esc/T); M toggles expand, `,`/`.` prev/next are fine.

Done when: the widget controls the real playback on the title and in battle, the title shows the
right track name, volume persists across reloads, and the chemx gate passes.
