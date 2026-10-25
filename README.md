# Gene Ranch — חוות הגנים

A first-person 3D creature ranch for Hebrew-speaking grade-9 science students (Israeli curriculum, per [Workbook](https://science.workbook.co.il) grade 9, chapter 8 — heredity). Vacuum up fluffy **Gnoomies**, sit two in the breeding nest, watch a floating Punnett square spin, and hatch eggs to fill village orders. Every trait follows real Mendelian rules with real (seeded) randomness, so guessing wastes eggs and reasoning wins.

Three.js + Vite + TypeScript, Hebrew RTL UI (bundled Rubik font), Tripo-generated rigged models. No backend, no accounts, no network calls at runtime.

## Run

```bash
npm install
npm run dev        # http://127.0.0.1:5201 (strictPort)
npm test           # vitest: genetics distributions + every day's solvability
npm run build      # static bundle in dist/ (relative base, works from any sub-path)
npm run preview    # http://127.0.0.1:4201
```

Useful URL parameters: `?day=3` (start on a day), `&skipintro=1`, `&seed=42` (deterministic eggs).

Note (Oct 2026): another local project was occupying 5201/4201 during development, so this build was tested on 5221 (dev) and 4221 (preview); `.claude/launch.json` has both configs.

## Controls

| Action | Mouse / touch | Keyboard |
|---|---|---|
| Catch a Gnoomie (vacuum net) | tap it | — |
| Put the selected Gnoomie in the nest | tap the nest, or "🪺 לקן" on its card | N |
| Take a parent back | tap it in the nest | — |
| Lay / hatch an egg | big egg button | Space / E |
| Select a creature in the belt | tap its portrait | 1–6 |
| Deliver to an order | "📦 מסרו" on the order card, or tap the board | — |
| Look around | drag | ← → |
| Walk (optional) | tap the ground | WASD / ↑ ↓ |
| Hint (days 1–5) | 💡 | H |
| Pause | ⏸ | Esc / P |

Mute and reduced-motion toggles are on the title and pause screens.

## What's implemented

- Six days: 1 Big Ears (Ee × Ee, 3:1), 2 Hidden Carrier (test-cross), 3 Pure Line (homozygous vs carrier), 4 Stripes and Spots (codominance, 1:2:1), 5 Two Traits (independent genes multiply; cold nest changes colour, not genes), 6 The Show — a no-hint transfer day on a new island with new traits and a pedigree board. See [CURRICULUM.md](CURRICULUM.md).
- Pure-TS genetics (`src/genetics/`) with a seeded RNG, a deduction engine that only shows what the player can know ("E ?"), and an honest Punnett lens (ranges for unknown parents; after a hatch it lights every cell matching the baby's phenotype rather than revealing the genotype).
- Consequences instead of "wrong" popups: a surprise baby, a sweating villager, a village test that returns your "carrier", grand-babies that turn blue, out-of-eggs with an odds explanation.
- Hatch log (expected vs observed), learning-event log in `localStorage`, star ratings (finish / no wrong delivery / no hints).
- Tripo models: rigged Gnoomie (idle/walk/cheer) with procedural ears, tails, antenna and stripe/spot patterns so every genotype renders exactly; rigged villager (idle/cheer/frustrated); barn, nest, net gun, order board. See [ASSETS.md](ASSETS.md).
- Test hooks: `window.render_game_to_text()`, deterministic `window.advanceTime(ms)`; `scripts/play.mjs` plays a day through real mouse clicks with Playwright and saves screenshots.

Not implemented / planned: island unlock map, more traits per day, saving a ranch between days (each day starts from an authored roster), multiple languages.

## Deploy (Vercel)

It's a static Vite site. In Vercel: import `AceDZN/gene-ranch`, framework preset **Vite**, build `npm run build`, output `dist` (also pinned in `vercel.json`). The bundle uses a relative base, so it also works inside a sub-path such as `science-games.workbook.co.il/gene-ranch/`. Nothing has been deployed yet.

## Docs

[GAME_IDENTITY.md](GAME_IDENTITY.md) · [CURRICULUM.md](CURRICULUM.md) · [ASSETS.md](ASSETS.md) · [progress.md](progress.md) · [PLAYTEST.md](PLAYTEST.md) · [docs/VISUAL_REVIEW.md](docs/VISUAL_REVIEW.md) · mockups in [docs/visual-targets/](docs/visual-targets/) · handoff in [docs/handoff/](docs/handoff/).
