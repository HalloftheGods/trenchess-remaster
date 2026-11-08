# Common rules for every phase-2 task

You work in your own git worktree (your current directory) on your own branch. The main repo is
`/home/claude/trenchess-remaster` (branch `main`); never check out or edit files there.

Read `docs/OVERHAUL.md` first (spec, APIs, scene flow, UI kit). Edit only the files your task owns;
build against the APIs of other areas. If an API you need is missing, add the smallest possible
addition and say so in your report.

Quality gate before every commit: `npx tsc --noEmit`, `npx vitest run`, `npx chemx audit` (gate must
pass: no nested ternaries, keep files under ~250 lines by splitting, DOM `addEventListener` only
with an `AbortController` signal or `{ once: true }`, prefer `on*` handlers on elements).

Commits: small, descriptive, no model names anywhere. End every commit message with exactly:

```
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Mwfkdr7bVGErqXWqBmMfXa
```

Landing (the owner wants each piece on main as soon as it works, and tests it live himself):
1. `git fetch origin main && git merge origin/main` on your branch; resolve conflicts keeping both
   sides' intent; re-run tsc + vitest.
2. `git push origin HEAD:main`. If rejected (someone else landed first), repeat step 1 and push again.
3. Report the landed commit hash, what you built, and anything left undone.

Coordination board (chemx): run these from the main repo directory so they hit the shared DB:
`cd /home/claude/trenchess-remaster && npx chemx team task claim <id> --as=@<handle>` when you start,
`npx chemx team task comment <id> "<status>" --as=@<handle>` at milestones, and
`npx chemx team task done <id> --as=@<handle> --no-target-confirm` when landed.
Verification: a quick Playwright smoke is fine (chromium preinstalled; args
`--use-gl=swiftshader --enable-webgl --ignore-gpu-blocklist`; dev server `npx vite --port <free>`;
set `window.__tc.scene.game.loop.smoothStep = false` for timed sequences; `?nosplash` skips the
splash; `window.__tcTitle.skip()/open('play')` drive the title; `window.__tc.match()` the match).
Do not spend long on screenshots; the owner tests live.
