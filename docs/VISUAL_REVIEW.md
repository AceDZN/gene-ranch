# Visual review — mockups vs real gameplay

Targets: ChatGPT gpt-image mockups in [visual-targets/](visual-targets/) (prompts and layout notes in [PROMPTS.md](visual-targets/PROMPTS.md)). They are design targets, not evidence. Actual captures: [screenshots/](screenshots/), taken 26 Oct 2026 from the static production build through real mouse clicks (`scripts/playall.mjs`, Playwright + Chromium with SwiftShader software GL, 1280×800 and 390×844). Software GL means no anti-aliasing and softer shadows than a real GPU.

## 1. First 30 seconds — `01-first-30s.png` vs [01-first-30s.jpg](screenshots/01-first-30s.jpg)

| Aspect | Target | Actual | Verdict |
|---|---|---|---|
| Camera | First person, eye height, looking slightly down a meadow; two creatures centre, nest left, barn centre-back | Same framing; nest is centre-right (the egg button owns bottom-left), barn back-right, villager + order board left | Close; nest side mirrored on purpose |
| Creatures | Pink fluffy bunny-like balls with long upright ears and glowing teal rings | Rigged Tripo egg-body tinted pink, procedural long upright ears, white pulsing rings, idle animation; smooth (not furry) | Silhouette and colour match; no fur shader |
| Guide | Big yellow arrow over the nearer creature | Coach pill at top ("לחצו על פופי כדי לשאוב אותו לרשת") + 3D arrow over the target | Match |
| Net gun | Brass + teal vacuum with butterfly-net hoop, bottom-right | Tripo net gun bottom-right | Match; ours is chunkier and its hoop points up |
| HUD | Top-left round teal buttons + 🥚×8 pill; top-right day plaque + stars; order card with teal "הזמנה" header; bottom belt with "+" slots; bottom-left round egg button | All present in the same places; we add a 📊 log button and a hatch-log panel top-left | Match |
| Set dressing | Cherry blossoms, lanterns, floating islands with waterfalls, windmill | Blossom trees with lanterns, distant islets with waterfalls, windmill, fence, mushrooms | Lower detail (procedural low-poly) |

## 2. Punnett square + hatch — `02-punnett-hatch.png` vs [02-punnett-egg-drop.jpg](screenshots/02-punnett-egg-drop.jpg), [03-hatch-card.jpg](screenshots/03-hatch-card.jpg)

- Target: gold allele coins on top/left of a wooden-gold 2×2 with glass cells, hologram babies and genotypes, a gold cell, an egg wobbling between the two parents in the nest, "צפוי / בפועל" panel left.
- Actual: same coin layout, glass cells with phenotype portraits and genotype letters, cells light in turn like a roulette; the speckled egg drops out of the square into the nest between the parents and wobbles; expected-vs-observed bars top-left.
- **Deliberate difference:** the mockup lights the single "true" cell. We light **every cell matching the baby's phenotype** (an upright baby lights EE, Ee, Ee), because a single cell would reveal a genotype nobody could know. The independent science review checked this.
- The square is billboarded and floats ~2 m above the nest; it reads at 1280×800 but is smaller than in the mockup.

## 3. Surprise / consequence — `03-surprise.png` vs [03-hatch-card.jpg](screenshots/03-hatch-card.jpg)

- Target: an unwanted upright baby in eggshells, villager with a sweat drop, orange order card, a cream card with a mini Punnett and "נסו שוב".
- Actual: after each hatch a cream card under the scene shows the mini Punnett with the matching cells highlighted, "אוזניים זקופות = EE / Ee · ¾ מהתאים", the order's odds and a "🥚 ביצה נוספת" button. The villager's sweat drop + frustrated animation play on a *wrong delivery* (not on every non-matching hatch), and the order card doesn't turn orange.
- Difference kept: a non-matching hatch isn't a failure in our design, so no orange alarm.

## 4. Gene card + two traits — `04-gene-card.png` vs [07-day5-two-traits-gene-card.jpg](screenshots/07-day5-two-traits-gene-card.jpg), [08-day5-cold-nest-violet.jpg](screenshots/08-day5-cold-nest-violet.jpg)

- Target: tall card on the right (teal name header, big portrait, rows with allele tiles, "?" in a gold tile, "נשא" badge), two squares side by side and "½ × ½ = ¼".
- Actual: same card structure on the right (smaller), allele tiles with gold "?" tiles, נשא / הומוזיגוט / הטרוזיגוט badges, sex, parents, the (½)ⁿ test-cross note when relevant. Two floating squares for two genes; the order card shows "סיכוי לביצה: ¼ × ½ = ⅛" style products; the hatch card shows both mini squares.
- Difference: the multiplication lives on the order card, not under the squares.

## Other captures

- [06-day4-codominance.jpg](screenshots/06-day4-codominance.jpg): FˢFˢ × FᴰFᴰ — every cell FˢFᴰ, babies show stripes AND spots (not a blend).
- [09-day6-pedigree.jpg](screenshots/09-day6-pedigree.jpg): show island (night palette, crystals, bunting), pedigree board in the world (two-line labels) and as an overlay caught mid fade-in.
- [13-day2-proven-carrier.jpg](screenshots/13-day2-proven-carrier.jpg), [14-day3-pure-line.jpg](screenshots/14-day3-pure-line.jpg): Day 2 proven carrier ready to deliver; Day 3 pure-line delivery.
- [05-day1-win.jpg](screenshots/05-day1-win.jpg), [10-day6-win.jpg](screenshots/10-day6-win.jpg): win cards with stars and the science takeaway.
- [11-phone-hatch.jpg](screenshots/11-phone-hatch.jpg), [12-phone-start.jpg](screenshots/12-phone-start.jpg): 390×844.

## Remaining deviations (honest list)

1. No fur: creatures are smooth Tripo bodies, not the fluffy look of the mockups.
2. The Tripo nest is a flattened straw ring on a procedural stone; up close the weave is coarse and a dark band inside the ring is still visible from some angles.
3. The Punnett square is smaller on screen than in mockup 2, and on phones its top can sit under the order card.
4. Babies that hop out of a full belt can wander close to the camera and cover part of the view.
5. Set dressing is sparser and lower-poly than the painted mockups; lighting is simpler (no bloom, software GL in captures).
6. Name tags float over creatures (not in the mockups) because days refer to creatures by name.
