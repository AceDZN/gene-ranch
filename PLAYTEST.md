# Gene Ranch — playtest and verification log

What was actually checked, how, and what wasn't. Automation can't tell whether the game is fun or whether students learn from it; nothing here claims that.

## Unit tests (`npm test`, vitest)

45 tests, all passing on 26 Oct 2026:

- **Genetics distributions** (8,000 seeded crosses each): Ee×Ee 1:2:1 / 3:1; test-cross 1:1; EE×ee all Ee; FˢFˢ×FᴰFᴰ all "both"; FˢFᴰ×FˢFᴰ 1:2:1; Fˢf×Fᴰf ¼ each (ABO analogue); two genes independent (joint ≈ product); sex 50/50; "¼ ≠ exactly one in four" (P(exactly one floppy in 4) ≈ 0.42); environment changes colour, not genotype; deterministic seeds.
- **Deduction engine:** a floppy baby proves both parents Ee; upright-only test-cross keeps "E ?" with a (½)ⁿ streak; facts constrain cards; honest lens ranges; codominant cards; violet ⇒ pp.
- **Every day** (400 seeds each, playing only through the Game API with what the cards show):
  - Day 1 wins >95% within 8 + 4 bonus eggs; about (¾)⁸ ≈ 10% need the bonus.
  - Day 2: a 3/3/4 test-cross plan wins >85% within 10 eggs. Guessing is impossible (the village needs a proven carrier from the wild candidates). Babies don't count.
  - Day 3: test-crossing wins >85%. Delivering untested pinks fails ≈⅔ of the time, costs 3 eggs, and the message doesn't name the carrier.
  - Day 4: SS×DD always gives "both"; the 1:2:1 family fits in 14 eggs; a family can't start from parents that can't give all three patterns.
  - Day 5: lens odds ¼ vs ⅛ vs 0; the right plan wins >85% in 14 eggs; "breed the prettiest" never wins.
  - Day 6: no lens, hints or auto cards; the pedigree board is enough to deduce Cc Gg / Cc gg; the reasoning plan wins >85% in 10 eggs; "two prettiest" wins 0%; wild creatures can't fill show orders.
- **Plumbing:** hatch timing respects game time; a full belt makes room for a newborn that fits an order; render text.

## Real-click playthroughs (Playwright, `scripts/playall.mjs`)

Static production build, Chromium headless with SwiftShader software GL, real mouse clicks on 3D creatures, the nest and HUD buttons, with time advanced by `window.advanceTime`. The strategy reads only what's on screen.

| Run | Result |
|---|---|
| Days 1–6 at 1280×800 | All six won (3 stars each in the final runs), no console errors |
| Day 1 at 390×844 (phone viewport) | Won, no console errors |

These runs found real bugs, all fixed:
- a belt-overflow trap;
- bonus eggs granted while a winning baby existed;
- the nest's hit volume swallowing taps on parents;
- the deliver button covered when there were three orders;
- pink reading as violet under the show-island light;
- reversed "½ × ½ = ¼";
- stale UI timers.

Real captures are in [docs/screenshots/](docs/screenshots/); see [docs/VISUAL_REVIEW.md](docs/VISUAL_REVIEW.md).

## Independent science review

A separate agent, which didn't design the game, checked the model and every science sentence against the Workbook snapshots. Full report: `gene-ranch-science-review.md` in the shared side-session notes folder. The model was found sound. The must-fixes and should-fixes applied are listed in [CURRICULUM.md](CURRICULUM.md#independent-science-review-26-oct).

## Fresh-eyes playtest

Another agent that hadn't seen the design played the title, Day 1, Day 2 (×3) and Day 3 with deliberate mistakes at 1280×800, plus Day 1 on a 390×844 touch viewport. Report: `gene-ranch-playtest.md` in the shared notes folder. It played a build from *before* the science fixes.

- **Understood in 10 s:** "suck up creatures, put two in the nest, hatch eggs, give grandma what she ordered".
- **Liked:** the first floppy baby lighting its cell, the journal bars, the "grandkids came out blue!" reveal.
- **Confusions and fixes:**

| Confusion | Fix |
|---|---|
| Day 3 marked carriers "⭐ matches" | Pure-pair orders never celebrate; known carriers are never offered |
| Day 2 won by a baby in one egg | Only a proven wild candidate counts |
| Out-of-eggs blamed luck | Per-order odds; 0% pairs are named |
| Stale hatch panel after retry or on the next day | Cleared |
| Phone: hatch panel hidden, egg count missing, nest off-screen, WASD line | Card hides while the hatch panel is up; count on the egg button; view turns to the nest; touch-only intro line |
| "Big ears" day asking for floppy ears | Renamed "סוד האוזניים" |
| Pip "from yesterday" | Now "from the ranch" |
| "ריבוע פאנט" never named | Square labelled |
| Hint silently cost a star | Hint warns |
| Silent pocket overflow | Toast |
| Drag-look too sensitive | Gentler |
| Slow win card | Faster |
| Long runs of identical hatches | Tap the egg again to skip |
| ביצות typo | Fixed |

- **Not changed:** heavy terminology in the first minute (kept, but the intro is shorter); names repeat across days (babies are per-day).

**Re-check** (same playtester, updated build, real clicks):
- **Confirmed fixed:** Day 2 (no baby shortcut; the order offered the wild parent after the first floppy pup); Day 3 offers are honest and the pair verdict doesn't name anyone; fair out-of-eggs on Day 1; the stale panel is gone; on the phone the hatch panel is visible and the view turns to the nest.
- **Still found, then fixed in a last pass** (46 tests pass after it):
  - a Day 3 soft-lock: at 0 eggs you could keep gambling pure pairs for free. Now a wrong pair the village can't test ends the day.
  - confetti for half of an untested pair (now a neutral "waiting for the second" note).
  - egg count hidden before seating.
  - phone start framing.
  - a gentler Day 1 opening line.
- **Not changed:** creatures sometimes face away and name tags can overlap; the Day 3 lens lights a "PP" cell plus "?" cells for a pink baby whose card says "P ?". That's consistent: it could be either, but it may still read oddly.

## Not verified

- **Performance on a real GPU:** FPS was only seen in software GL. No real-GPU or phone FPS number is claimed.
- **Real touch devices:** only a 390×844 Chromium viewport with mouse/touch emulation, not an actual phone.
- **Audio:** WebAudio synth sounds weren't listened to by a person.
- **Long-term behaviour:** `localStorage` progress and learning logs were exercised but not inspected across browsers.
- **Whether it's fun, or whether students learn:** needs real kids.

## Bundle (measured, `npm run build`)

- JS 767 KB (203 KB gzipped).
- CSS 22 KB.
- Rubik woff/woff2 subsets.
- 6 GLB models ≈ 8.4 MB.
- Everything is local; nothing is fetched at runtime.
