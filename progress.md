# Gene Ranch — progress

## 2026-10-25 / 26 (night)

- Read COMMON.md, BUILD_HANDOFF.md, curriculum snapshots. Wrote GAME_IDENTITY.md.
- Visual helper (Chrome): 4 ChatGPT gameplay mockups in `docs/visual-targets/` + 6 Tripo models in `public/models/` (rigged Gnoomie with idle/walk/jump/cheer, rigged villager with idle/cheer/frustrated, barn, nest, net gun, board). 6/6 generations, 2/2 rigs, 220 displayed credits. Details in ASSETS.md.
- Pure-TS genetics model + deduction engine + six authored days; vitest suite (distributions, solvability within egg budgets, failing guess/constant strategies). Tests found that babies overflowing the 6-slot belt had to be re-caught; Day 5 budget raised 12 → 14.
- Three.js scene: floating island, sky, Tripo props with procedural fallbacks, Gnoomies (Tripo body + procedural ears/tail/antenna/patterns), 3D Punnett lens, egg + hatch sequence, net gun, particles, WebAudio SFX, Hebrew RTL HUD and overlays.
- Port 5201 is held by another project's Vite server (goblin-kitchen, not ours). Dev server temporarily on 5221 (`.claude/launch.json` → `gene-ranch-alt`); reported to the lead session.
- Honesty fix: after a hatch the lens lights every cell matching the baby's phenotype instead of the single "true" cell, so an upright baby's EE/Ee stays hidden.

- 26 Oct, ~01:00–03:00: headless Playwright playthroughs (`scripts/play.mjs`, `scripts/playall.mjs`, real mouse clicks + advanceTime) against the static build on :4221. They found and I fixed: belt-overflow trap (the wanted baby hopped into the meadow), bonus eggs granted while a winning baby existed, wall-clock UI timers, nest hit-volume swallowing taps on parents, released babies crowding the camera, three-order layouts hiding the deliver button, pink looking violet under show-island light, reversed "½ × ½ = ¼", phone layout.
- Independent science review (report in the shared notes folder): model sound; must-fixes applied (Day 2 baby loophole, Day 3 carrier-naming shortcut, test-cross probability wording, honest out-of-eggs text, Day 4 takeaway, known carriers offered for pure lines, גנום naming clash → creatures renamed פופים, ביצות→ביצים) plus most should-fixes (Day 6 bred-only, pure tags, sex on cards, etc.).
- Day 2 now needs a proven carrier from the wild candidates (budget 10); Day 3 third star needs test-cross evidence; RNG seeds scrambled (nearby seeds gave identical rosters).
- All six days have been won through real clicks (desktop) and Day 1 at 390×844; 45 unit tests pass.

- Fresh-eyes playtest (on a pre-science-fix snapshot) → confusions fixed (see PLAYTEST.md); re-check requested.
- Final build: all six days won through real clicks at 1280×800 and Day 1 at 390×844 in one run, no console errors; 45 unit tests pass. VISUAL_REVIEW.md, PLAYTEST.md, screenshots committed.

## Open / next
- Port 5201/4201 still held by goblin-kitchen (not ours) at the end of the session; dev server left running on 5221.
- Real-GPU FPS and real-phone testing not done.
- Ideas: fur shader, nest interior, island unlock map, carrying a ranch between days.
