# Gene Ranch — progress

## 2026-10-25 / 26 (night)

- Read COMMON.md, BUILD_HANDOFF.md, curriculum snapshots. Wrote GAME_IDENTITY.md.
- Visual helper (Chrome): 4 ChatGPT gameplay mockups in `docs/visual-targets/` + 6 Tripo models in `public/models/` (rigged Gnoomie with idle/walk/jump/cheer, rigged villager with idle/cheer/frustrated, barn, nest, net gun, board). 6/6 generations, 2/2 rigs, 220 displayed credits. Details in ASSETS.md.
- Pure-TS genetics model + deduction engine + six authored days; vitest suite (distributions, solvability within egg budgets, failing guess/constant strategies). Tests found that babies overflowing the 6-slot belt had to be re-caught; Day 5 budget raised 12 → 14.
- Three.js scene: floating island, sky, Tripo props with procedural fallbacks, Gnoomies (Tripo body + procedural ears/tail/antenna/patterns), 3D Punnett lens, egg + hatch sequence, net gun, particles, WebAudio SFX, Hebrew RTL HUD and overlays.
- Port 5201 is held by another project's Vite server (goblin-kitchen, not ours). Dev server temporarily on 5221 (`.claude/launch.json` → `gene-ranch-alt`); reported to the lead session.
- Honesty fix: after a hatch the lens lights every cell matching the baby's phenotype instead of the single "true" cell, so an upright baby's EE/Ee stays hidden.

## Next
- Headless playthroughs of each day with real clicks; screenshots vs mockups; VISUAL_REVIEW.md.
- Science review + fresh-eyes playtest; fix confusions.
