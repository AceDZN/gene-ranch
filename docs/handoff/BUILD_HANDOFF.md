# Gene Ranch — חוות הגנים — build handoff

Read `../COMMON.md` first (especially "Lesson from round 1"). Repo `/Users/acedzn/dev/AceDZN-exp/gene-ranch` → public `AceDZN/gene-ranch`, port 5201 (preview 4201).

## Promise

Slime Rancher with real genetics. On a floating island ranch you catch fluffy creatures ("גנומים", Gnoomies) with a vacuum net, pair them in the breeding barn, hatch eggs and fill colourful orders from the village. Every visible trait comes from a pair of alleles, and dominant alleles hide recessive ones, so two plain parents can hatch a surprise curly-tailed baby — they were carriers all along. The fun is collecting cute creatures, the gamble of every hatch, and the "aha" of finally breeding the rare one on purpose. You learn genetics because guessing wastes eggs and days.

Map evidence: Bugsnax × Niche — related ✓, density 0.655 (second emptiest this round); Slime Rancher × Niche ✓ 0.705. Not a certified gap. See IDEAS.md.

## Curriculum (Workbook grade 9, chapter 8)

[heredity-intro](https://science.workbook.co.il/grade-9/chapter-8/heredity-intro), [mendel-basics](https://science.workbook.co.il/grade-9/chapter-8/mendel-basics), [genotype-phenotype](https://science.workbook.co.il/grade-9/chapter-8/genotype-phenotype), [probability-genetics](https://science.workbook.co.il/grade-9/chapter-8/probability-genetics), [codominance-blood](https://science.workbook.co.il/grade-9/chapter-8/codominance-blood), [genetic-variation](https://science.workbook.co.il/grade-9/chapter-8/genetic-variation), [heredity-environment](https://science.workbook.co.il/grade-9/chapter-8/heredity-environment); context [dna-structure](https://science.workbook.co.il/grade-9/chapter-8/dna-structure), [chromosomes](https://science.workbook.co.il/grade-9/chapter-8/chromosomes), [mutations](https://science.workbook.co.il/grade-9/chapter-8/mutations).

Rules: each trait = one gene with two alleles, one inherited from each parent at random (independent 50/50 per parent); dominant capital letter (T) masks recessive (t); TT and Tt share a phenotype, tt shows the recessive; homozygous/heterozygous; Punnett square; Tt × Tt → genotypes 1:2:1, phenotypes 3:1; Tt × tt → 1:1 (test-cross reveals a hidden carrier); codominance (Workbook's ABO example: Iᴬ and Iᴮ both expressed, i recessive) — in-game a stripes allele and a spots allele that both show; sex 50/50 per egg; environment can change a phenotype (e.g., coat colour that depends on diet/temperature in one late order) — genotype unchanged.

Scientific qualifications: traits are independent (separate genes, no linkage) unless a level explicitly says otherwise; probabilities are per offspring — a 1/4 chance doesn't guarantee 1 in every 4 eggs (the game must show real randomness with a seeded RNG, and a hatch log comparing expected vs observed counts); keep everything Mendelian single-gene; no human disease content.

Misconceptions to catch: "dominant = more common/stronger"; "two parents who look alike always have babies who look alike"; "1/4 means exactly one of every four"; "the baby is a blend of the parents" (except the codominance trait, which is both, not a blend); "genotype changes with the environment".

## Core loop

1. **Catch:** first-person, vacuum net. Wild Gnoomies roam meadows with visible traits (ear shape, colour, tail curl, pattern). Catching is quick and cheerful, not a chore.
2. **Inspect:** a gene scanner (unlocked early) shows a creature's phenotype card; its genotype is **hidden** unless known from pedigree or deduced — this is the detective layer. Known/deduced alleles fill in on the card.
3. **Pair:** put two creatures in a breeding pen; a Punnett lens projects the square in 3D above them, with predicted genotype and phenotype odds.
4. **Hatch:** eggs wobble and pop with juicy effects; babies' phenotypes reveal; the hatch log tracks expected vs observed.
5. **Orders:** a village board asks for specific creatures (phenotype, sometimes a guaranteed pure-breeding pair, sometimes "a carrier"). Limited eggs per day turns probability into strategy. Rewards unlock pens, the scanner, new islands.

## Five days + transfer (vertical slice)

1. **Big Ears.** One trait, dominant/recessive: breed a floppy-eared (recessive) baby from two upright-eared parents you're told are carriers. First egg is likely upright — keep going.
2. **The Hidden Carrier.** Two upright-eared wild Gnoomies; which is Tt? Use a test-cross with a floppy (tt) partner. A floppy baby proves a carrier.
3. **Pure Line.** The farmer wants a pair that always breeds blue (bb × bb, recessive) — or for a dominant trait, prove TT by test-cross results. Teaches homozygous.
4. **Stripes AND Spots.** Codominance: breed a creature showing both patterns (like AB blood). The Punnett square gives 1:2:1 phenotypes here, not 3:1.
5. **Two Traits.** Orders combine ear shape and colour (independent genes; keep squares separate per trait, multiply probabilities). One environment order: a colour that changes in the cold pen — same genotype.
6. **Transfer: The Show.** No hints, no Punnett lens: a new island with new traits and a pedigree board; deduce genotypes and fill three orders within an egg budget. A constant strategy (always breed the two prettiest) must fail.

## Rules to keep authoritative (pure TS + tests)

- Creatures carry a genotype per gene; phenotype derives from genotype (+ environment flag for the one plastic trait). Gamete selection and egg outcomes come from a seeded RNG; tests verify distributions over many trials and that each order is achievable within its budget with correct reasoning.
- The Punnett lens is computed from genotypes the player knows; unknown alleles show as "?" and the lens shows conditional odds honestly.

## 3D, camera, art

- First-person with a visible net/scanner in hand; cozy pace, no combat. Pens, a barn and a hatchery on a pastel floating island; warm sunset light.
- Visual thesis: soft, rounded, Pixar-ish creatures with crisp readable traits (big ears vs floppy, solid vs striped vs spotted, curly vs straight tail) built as **procedural trait parts attached to a Tripo base body** so every genotype combination renders correctly; a big floating 3D Punnett square with eggs in its cells.
- Tripo candidates (≤ 6): Gnoomie base body (rigged — idle, hop, happy, sleepy; AI animation for a hatch wiggle), the barn/hatchery, the breeding pen, the vacuum net + scanner, a villager order-giver (rigged, optional), an island set piece. Trait parts (ears, tails, patterns via textures/decals) are procedural so genetics stays exact.

## Acceptance

First 30 seconds: catch a Gnoomie, drop two into a pen, see the Punnett square, hatch an egg, cheer. Day 2 cannot be solved by guessing within its egg budget except by luck that the hatch log calls out. The transfer day is solvable without hints and fails a constant strategy.
