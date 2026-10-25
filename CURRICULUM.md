# Gene Ranch — curriculum map

Source of truth: Workbook science, grade 9, chapter 8 (תורשה וגנטיקה). Saved snapshots: [docs/curriculum/](docs/curriculum/). Terms in the game follow Workbook: אלל, שולט (דומיננטי), נסוג (רצסיבי), גנוטיפ, פנוטיפ, הומוזיגוט, הטרוזיגוט, נשא, ריבוע פאנט, הכלאת מבחן, קודומיננטיות.

## Model rules (pure TypeScript, `src/genetics/`)

- Every trait is one gene with two allele copies, one from each parent, each parent passing one copy chosen independently 50/50 (`cross()` with a seeded RNG).
- Complete dominance: ears E/e, colour P/p, tail C/c, glow G/g. `EE` and `Ee` look the same.
- Codominance with a recessive null allele, mirroring Workbook's ABO example (Iᴬ, Iᴮ, i): pattern Fˢ (stripes), Fᴰ (spots), f (plain). FˢFᴰ shows **both** patterns, never a blend.
- Genes are independent (no linkage). Two-trait probabilities multiply.
- Sex is 50/50 per egg (shown in the model; it doesn't gate breeding).
- Environment: a `pp` Gnoomie that grows up in the cold nest is violet instead of blue (modelled on the temperature-sensitive pigment of the Himalayan rabbit). Genotype is unchanged; its babies in the warm nest are blue.
- The deduction engine (`deduce.ts`) only uses what a player could know: phenotypes, the hatch pedigree and facts the game states (a village tag, ranch records). Unknown alleles show as `?`. The Punnett lens shows honest ranges for unknown parents (e.g. "floppy 0%–50%").
- After a hatch the lens lights **every** cell matching the baby's phenotype (an upright baby could be EE or Ee), so the game never reveals a genotype the player couldn't know.
- No human disease content. Everything is single-gene Mendelian.

## Days

| Day | Workbook modules | Skill practised | Misconception it checks |
|---|---|---|---|
| 1 · אוזניים גדולות (Big Ears) | [heredity-intro](https://science.workbook.co.il/grade-9/chapter-8/heredity-intro), [mendel-basics](https://science.workbook.co.il/grade-9/chapter-8/mendel-basics), [probability-genetics](https://science.workbook.co.il/grade-9/chapter-8/probability-genetics) | Ee × Ee: genotypes 1:2:1, phenotypes 3:1; the recessive trait reappears | "Two parents who look alike always have babies who look alike"; "¼ means exactly one in every four" (hatch log shows expected vs observed; the bonus basket explains a bad run with (¾)ⁿ) |
| 2 · הנשא הנסתר (Hidden Carrier) | [genotype-phenotype](https://science.workbook.co.il/grade-9/chapter-8/genotype-phenotype), [mendel-basics](https://science.workbook.co.il/grade-9/chapter-8/mendel-basics) (הכלאת מבחן) | Test-cross with ee; one recessive baby proves a carrier | Guessing from looks; "many dominant babies prove it's not a carrier" (the card says it's only (½)ⁿ confidence) |
| 3 · קו טהור (Pure Line) | [genotype-phenotype](https://science.workbook.co.il/grade-9/chapter-8/genotype-phenotype), [mendel-basics](https://science.workbook.co.il/grade-9/chapter-8/mendel-basics) | Homozygous vs heterozygous; PP vs Pp look identical; test-cross builds confidence | "Dominant = pure"; delivering untested pinks fails ~⅔ of the time with a grand-baby consequence |
| 4 · פסים וגם נקודות (Stripes and Spots) | [codominance-blood](https://science.workbook.co.il/grade-9/chapter-8/codominance-blood) | Codominance: FˢFˢ × FᴰFᴰ → all FˢFᴰ; FˢFᴰ × FˢFᴰ → 1:2:1 phenotypes | "The baby is a blend of the parents"; "every cross gives 3:1" |
| 5 · שתי תכונות (Two Traits) | [probability-genetics](https://science.workbook.co.il/grade-9/chapter-8/probability-genetics), [genetic-variation](https://science.workbook.co.il/grade-9/chapter-8/genetic-variation), [heredity-environment](https://science.workbook.co.il/grade-9/chapter-8/heredity-environment) | Two independent genes, one square each, multiply (½ × ½ = ¼ beats ¼ × ½ = ⅛); environment changes phenotype | "Genotype changes with the environment" (violet parent → blue babies in the warm nest); "breed the prettiest" (EE parent can never give floppy) |
| 6 · התערוכה (The Show) — transfer | all of the above | New traits (tail, glow), no hints, no lens, no auto-filled cards: read a pedigree board, deduce Cc/Gg, choose crosses within 10 eggs | "Dominant = more common" (glow is dominant but 1 in 20); a constant "two prettiest" strategy is mathematically unable to win |

Context modules (not played directly): [dna-structure](https://science.workbook.co.il/grade-9/chapter-8/dna-structure), [chromosomes](https://science.workbook.co.il/grade-9/chapter-8/chromosomes), [mutations](https://science.workbook.co.il/grade-9/chapter-8/mutations).

## Simplifications (stated, not hidden)

- Fictional creatures and genes; real-world analogies (ABO, Himalayan rabbit) are named in the code and here, not claimed as Gnoomie facts.
- Each Gnoomie can be either parent; sex is shown per egg but doesn't restrict pairs.
- The violet effect is all-or-nothing and fixed at hatch time; real temperature effects are graded.

## Learning events

Logged locally only (`localStorage` key `gene-ranch-learning`, last 60 day-attempts): day id, attempt, action, detail, outcome and whether a hint had been used. Delivery outcomes distinguish `proved` (the card already showed the genotype) from `unproved` (a lucky guess) and `wrong-guess`. The first breeding pair of each day is logged as `useful` or `not-useful` (unaided decision quality). Nothing leaves the device.
