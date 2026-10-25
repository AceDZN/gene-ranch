# Gene Ranch — gameplay mockup targets

Generated 2026-10-25 (~23:20–23:40 IST) with ChatGPT image generation (gpt-image) in the user's Chrome, one chat:
**https://chatgpt.com/c/6ade724d-0a48-83eb-b5a5-cece8daa7593**

All four images are 1672×941 (≈16:9) PNG. They are **design targets, not evidence of the implemented game**. Copy the layout, camera, palette and HUD hierarchy; do not copy the generated Hebrew text verbatim (it is mostly right here, but check every string). Originals (and the rejected first versions of 02 and 04) are in `~/Downloads/gene-ranch-originals/`.

Note: ChatGPT drew the Gnoomies as fluffy pink bunny-like puffballs with long rabbit ears. In the game the base body is the Tripo cream egg-body (`public/models/gnoomie.glb`) with procedural ears; keep the mockups' **fluffy pink, huge glossy eyes, open-mouth smile** feel and make the upright ears tall and the floppy ears droop down past the cheeks so the two phenotypes read from 10 m.

## Shared look (all four)

- **Palette:** sky gradient lilac `#c9a6e8` → peach/pink `#f6b6c8` → warm gold near the sun `#ffd38a`; grass saturated spring green `#7cc45a` with yellow sun-lit tips; cherry-blossom pinks `#f4a6c8`; barn red `#b8423c` with cream trim `#f3e6cc`; straw gold `#e2b65c`; moss `#7a9a3a`; grey-mauve stone. Gnoomies hot-pink fur `#f39bb8`. Blue Gnoomie (04) sky blue `#5ab8f0`.
- **HUD material:** cream panels `#fbf1dc` with a slightly darker cream rim, soft drop shadow, large radius (≈16–24 px); teal accent `#1e9e9a`/`#22b3a8` for buttons and header pills; gold `#f5b82e` for stars and highlights; orange `#f59a2a` for "attention" outlines. Text dark brown `#3b2a1e`, Rubik bold, RTL.
- **Top-left (all):** three 56 px round teal buttons with white icons, left→right: pause, sound, yellow lightbulb (hint); right of them a cream pill "🥚 × N" (egg icon + count in LTR).
- **Top-right (all):** cream plaque "יום N · אוזניים גדולות" (≈260×80 px at 1672 w), row of 3 gold star slots under the text (empty = pale outline, earned = filled gold).
- **Right edge under the plaque (01–03):** order card ≈150×180 px: teal pill header "הזמנה", picture of the wanted Gnoomie (floppy pink), two-line Hebrew caption, grey progress pill "0/1".
- **Bottom-centre (all):** creature belt — wide cream pill ≈420×90 px, 5 round slots (≈70 px). Empty slots are cream discs with a "+" ; filled slots show a Gnoomie face on a teal disc with a glowing teal ring; the selected one is raised ~12 px with sparkle ticks (04).
- **Bottom-left (01–03):** big round egg button ≈130 px: peach/coral disc, thick teal glowing ring, big speckled egg icon, cream label pill "ביצה חדשה!" overlapping its bottom edge.
- **Bottom-right (01–03):** first-person net gun in the right hand, entering from the bottom-right corner and pointing up-left, occupying ≈25% width × 45% height: brass rings, teal body bands, a glass canister with a glowing teal DNA helix inside, a brass butterfly-net hoop with white mesh at the front (upper end), a small bunny decal on the grip, the player's hand visible at the very corner.
- **Lighting:** golden hour, low sun on the right/back-right horizon, warm rim light on fur, soft long shadows toward the camera-left, pink bloom, floating islands with waterfalls and a windmill on the right horizon, cherry-blossom tree framing the top-left.

## 01-first-30s.png — first 30 seconds

**Prompt (exact):**
> Create an image: a 16:9 landscape (1536x864) in-game screenshot of a polished 3D first-person browser game called "Gene Ranch" (Hebrew UI, right-to-left), for 13-year-olds, Pixar / Slime Rancher quality, cozy and bouncy. Scene: a pastel floating-island creature ranch at golden hour, peach and lilac sky, cotton-candy clouds below the island edge, warm low sun, long soft shadows, lush grass, mushrooms, little wooden fences, blossoms, a windmill in the distance. Camera: first person at eye height. In the player's right hand at the bottom-right corner: a cute brass-and-teal vacuum net gun with a glass canister and a butterfly-net mouth. In front on the grass: two fluffy chubby round pink creatures called Gnoomies (beach-ball body, stubby feet and arms, huge shiny eyes, tiny smile, tall upright pointy ears) hopping, each standing in a glowing teal ring on the ground, with a big bouncing yellow arrow above one of them. To the left side: a wooden woven-straw breeding nest on a mossy round stone platform, glowing softly. Behind: a round red-and-cream barn with a weather vane. HUD in Hebrew, RTL, rounded Rubik-style font, cream panels with soft shadows and teal/coral accents: top-right a cream day plaque reading "יום 1 · אוזניים גדולות" with 3 empty star outlines below it; under it an order card showing a picture of a Gnoomie with floppy droopy ears; top-left a row of three round teal buttons (pause, sound, lightbulb hint) and an egg counter "🥚 × 8"; bottom-centre a creature belt of 5 round portrait slots, the rightmost one filled with a pink Gnoomie face and glowing; bottom-left a big round pulsing egg button. Clean, readable, game-like, not a worksheet.

First roll, accepted.

**Layout:**
- Camera: first person, eye height ≈1.6 m, pitched ≈8–10° down, FOV ≈60–65°. Horizon at ≈40% from the top.
- Left third, 4–5 m away: straw nest (golden woven ring, warm inner glow + sparkles) on a big mossy grey boulder platform ≈1 m tall; wooden arrow sign on a post above it "קן רבייה" with a small DNA icon. Pink mushrooms and flowers in the left foreground.
- Centre-back, ≈15 m: red barn with arched cream trim, open lit doorway, round sign "Gene Ranch" with bunny-ear + DNA logo, rooster weather vane, small silo/tower to its right. Wooden fence running across the mid-ground left→right.
- Centre: two pink upright-eared Gnoomies mid-hop, each on a glowing teal ground ring (ring ≈1.2× body width). Near one at ≈4 m (centre, slightly right), far one at ≈7 m (centre-left). Big glossy yellow down-arrow bobbing ≈0.6 m above the **near** one.
- Right: fence, flowers, windmill at ≈40 m on a hill, floating islands with waterfalls on the far right, sun just above the horizon right of centre.
- HUD: as in "Shared look". Day plaque with 3 empty stars; order card "הזמנה" with floppy pink Gnoomie, "0/1"; egg counter "× 8"; belt with 4 empty "+" slots on the left and the **rightmost** slot filled (RTL: first slot is on the right) with a glowing teal ring; egg button bottom-left.

## 02-punnett-hatch.png — core mid-play (Punnett square + egg)

**Prompt (exact, first message):**
> Great, keep exactly the same game, art style, HUD style, palette and Gnoomie design. Now create image 2 (16:9, 1536x864): the core mid-play moment. First-person camera a bit closer to the breeding nest, slightly looking up. Centre: the woven straw breeding nest on its mossy stone platform with TWO Gnoomies sitting inside it, one pink with tall upright ears and one pink with floppy droopy ears, looking up excitedly. Floating above them in the air: a big glowing glass-and-brass 2x2 Punnett square (four glass cells in a brass frame). Along its top edge two glowing round tiles with the letters "E" and "e", along its left side two glowing tiles "E" and "e". Each of the 4 cells shows a tiny translucent hologram of a baby Gnoomie (upright ears in 3 cells, floppy ears in 1 cell) with genotype letters underneath: EE, Ee, Ee, ee. One cell (Ee) glows bright gold like a roulette winner and a speckled pastel egg is dropping out of it. Below, on the straw, a speckled egg wobbling with sparkles and motion lines. HUD same as before: top-right day plaque with 1 filled star, order card below it; top-left round buttons and egg counter × 7; bottom-centre creature belt with 3 filled portraits; bottom-left egg button glowing. Add a small cream panel on the left side titled "צפוי / בפועל" with two pairs of short horizontal bars (upright vs floppy ears icons, expected 3/4 vs 1/4 and observed counts). Net gun visible bottom-right. Golden hour, sparkles, fun, readable.

**Edit (exact, second message — accepted result):**
> Almost perfect. One genetics fix: both parents in the nest must be the same kind, since this is an Ee x Ee cross. Make BOTH Gnoomies sitting in the nest pink with tall upright ears (no floppy-eared parent). Keep everything else identical: same Punnett square with E/e tiles and EE, Ee, Ee, ee cells, the gold Ee cell with the egg dropping, the expected/observed panel, the HUD, the net gun, the camera and lighting. 16:9.

(The first version had one floppy parent, which contradicts an Ee × Ee square; kept only as `02-punnett-hatch-v1-mixed-parents.png` in originals.)

**Layout:**
- Camera: first person, ≈2.5 m from the nest, eye level with the nest rim, looking slightly up. Nest fills the lower-centre ≈45% width; mossy boulder under it reaches the bottom edge behind the belt.
- Nest: two pink **upright-eared** Gnoomies sitting side by side (left and right), mouths open, looking up; a pink-speckled egg wobbling between them (curved motion ticks) with sparkles.
- Punnett square: floating ≈1.2 m above the nest, centred slightly left of the screen centre, ≈280×240 px. Chunky rounded brass frame, four glass cells (light blue tint) each with a pink baby hologram + bold genotype text: top-left **EE**, top-right **Ee**, bottom-left **Ee** (this cell glows gold, with a curved gold arrow + sparkle trail down to the egg), bottom-right **ee** (floppy baby). Allele tiles are glowing gold coins: top "E" (over left column) and "e" (over right column); left side "E" (top row) and "e" (bottom row).
- Left panel "צפוי / בפועל" ≈210×190 px under the top-left buttons: two rows, each with a Gnoomie face icon (upright / floppy), "צפוי: 3/4" / "צפוי: 1/4" in dark text, a teal progress bar (75% / 25%), and "בפועל: 3" / "בפועל: 1" with the number in green.
- HUD: plaque with **1 gold star**, order card unchanged, egg counter "× 7", belt: 3 "+" slots on the left, 3 filled slots on the right (two upright, one floppy), egg button bottom-left glowing.
- Barn left-background, windmill + floating islands + sun right-background; net gun bottom-right.

## 03-surprise.png — consequence moment (wrong baby, funny, recoverable)

**Prompt (exact):**
> Perfect. Same game, same style, HUD, palette and Gnoomie design. Now image 3 (16:9, 1536x864): the funny consequence moment when the hatch did NOT match the order. First-person camera at eye height, net gun bottom-right. Centre-left on the straw nest: a freshly hatched tiny baby pink Gnoomie with tall UPRIGHT ears, blinking with big eyes, sitting among cracked speckled eggshell pieces, little sparkles and feathers puffing around. Right of centre, a few metres away: a wooden village order board on a post with a little roof, and next to it a cheerful chubby grandma farmer villager with a wide straw hat, glasses, apron and rosy cheeks, holding a picture of a floppy-eared Gnoomie, with a big comic blue sweat-drop on her head and an awkward funny smile (not angry). HUD: the order card at top-right (the floppy-eared Gnoomie picture) now has a thick ORANGE outline and a small orange "!" badge; day plaque above it; top-left round buttons and egg counter × 6; creature belt bottom-centre with 4 portraits. Bottom-centre above the belt: a friendly cream explanation card with rounded corners showing a mini 2x2 Punnett square (E e / E e, the ee cell highlighted), one short Hebrew line and a big teal rounded button "נסו שוב ↻". Nothing should look like a red X or a failed test: warm, funny, recoverable, golden hour.

First roll, accepted.

**Layout:**
- Camera: first person at eye height, nest ≈2.5 m away on the left, villager ≈4 m away right of centre.
- Left 40%: nest on mossy boulder; a baby pink **upright-eared** Gnoomie sitting in it, between two half-eggshells (pink speckles), yellow "surprise" tick marks around its head and sparkles. Barn with lit doorway behind it, cherry tree + lantern top-left.
- Centre-right: wooden order board on a post (little shingled roof, sign "הזמנה" on top, pinned paper with a floppy pink Gnoomie drawing), ≈1.8 m tall. Immediately right of it: grandma villager (≈1.5 m) — wide straw hat with pink flower band, round glasses, grey curls, rosy cheeks, purple plaid shirt, cream apron with bunny patch and tool pocket, eyes squeezed in an awkward grin, one hand scratching the hat, the other holding a paper with a floppy Gnoomie; big blue comic sweat-drop beside her head.
- Explanation card: centred horizontally, just above the belt, ≈600×130 px, cream, rounded. Left part: mini Punnett square (top letters "E e", side "E e"; cells EE, Ee / Ee, **ee** with the ee cell yellow-highlighted). Middle: 3 short Hebrew lines (cross produced upright ears; floppy needs ee). Right part (RTL start): big teal pill button "נסו שוב ↻" ≈200×60 px.
- HUD: order card on the right gets a thick **orange** outline + orange circle "!" badge at its top-right corner (no red anywhere). Plaque with 1 star; egg counter "× 6"; belt: 2 "+" slots + 3 filled (two upright, one floppy); egg button bottom-left; net gun bottom-right.

## 04-gene-card.png — HUD close-up (gene cards + two-trait odds)

**Prompt (exact, first message):**
> Love it. Same game and style. Now image 4 (16:9, 1536x864): a HUD close-up. The ranch scene (nest, barn, Gnoomies, golden-hour sky) is softly blurred and slightly dimmed behind. On the RIGHT edge, a tall cream rounded gene-card panel with a teal header for the selected Gnoomie: a big round portrait of a pink upright-eared Gnoomie at the top; below it three trait rows, each with a clear icon (ears icon, colour drop icon, pattern/stripes icon) and the phenotype in Hebrew; next to the ears row large genotype letter tiles "E" and "?" (the unknown allele shown as a glowing question-mark tile). Next to that panel, slightly overlapping on its left, a second smaller gene card for another Gnoomie with genotype tiles "E e" and a round purple badge reading "נשא" (carrier). In the CENTRE-LEFT, a floating glass-and-brass two-trait panel: two small 2x2 Punnett squares side by side, the right one for ears (E e / E e with tiny ear holograms) and the left one for colour (pink vs blue, letters B b with tiny colour swatches), one cell highlighted in each, and underneath a big readable formula "½ × ½ = ¼" in an LTR box with a small baby Gnoomie icon. Keep top-left round buttons, top-right day plaque "יום 3" with stars, and the creature belt at the bottom with one portrait raised and glowing (the selected one). Clean, big, readable, playful, not a worksheet.

**Edit (exact, second message — accepted result):**
> Great layout, keep it exactly. One genetics fix so the math is correct: both small Punnett squares must be test crosses. Colour square: top letters "B b", side letters "b b", cells Bb, Bb, bb, bb (two pink, two blue), with one bb (blue) cell highlighted. Ears square: top letters "E e", side letters "e e", cells Ee, Ee, ee, ee (two upright, two floppy), with one ee (floppy) cell highlighted. The formula stays "½ × ½ = ¼" and the little baby icon next to it is a BLUE Gnoomie with FLOPPY ears. Everything else identical (gene cards, E ? tiles, נשא badge, HUD, belt, blurred ranch). 16:9.

(The first version used Bb×Bb and Ee×Ee squares with "½ × ½ = ¼", which is wrong; kept only as `04-gene-card-v1-wrong-math.png` in originals. "B/b" for colour is a placeholder letter chosen for the mockup — use whatever symbol the curriculum/design settles on.)

**Layout:**
- Background: ranch (barn, blossoms, mushrooms, windmill) Gaussian-blurred (~12 px) and dimmed ~15%.
- **Right panel (selected Gnoomie, "גנומי א׳")**: x ≈ 70–97% width, y ≈ 18–85% height. Gold glowing outline; teal pill header with the name; big pink upright-eared Gnoomie portrait with yellow sparkle ticks; then three cream rows, each ≈60 px high, icon on the right (RTL), label + value in the middle:
  - ears icon — "אוזניים: גדולות" — two square letter tiles on the left: cream "**E**" and gold glowing "**?**".
  - pink drop icon — "צבע: ורוד".
  - striped circle icon — "דוגמה: חלק".
- **Second card ("גנומי ב׳")**: x ≈ 54–70%, y ≈ 25–65%, slightly behind the right panel. Teal header, upright pink Gnoomie portrait with purple glow, tiles "**E**" "**e**", purple pill badge "**נשא**".
- **Two-trait panel**: x ≈ 5–52%, y ≈ 15–75%. Thick rounded brass frame, cream inside. Two titled squares, RTL order: right = "אוזניים (E/e)" with ear icon; left = "צבע (B/b)" with drop icon. Colour square: top "B b", side "b b"; cells Bb (pink swatch), Bb (pink), bb (blue), **bb (blue, gold highlight)**. Ears square: top "E e", side "e e"; cells Ee, Ee (upright icons), ee, **ee (floppy, gold highlight)**. Under both, a wide cream bar with big LTR text "½ × ½ = ¼" (the ¼ in a gold tile) and a small blue floppy-eared baby Gnoomie icon.
- HUD: top-left buttons + "× 6"; plaque "יום 3 · …" with 2 gold stars + 1 empty; belt bottom-centre (2 "+", then three filled, the middle filled one raised and glowing = selected). No egg button and no net gun in this view.
