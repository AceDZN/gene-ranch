# Gene Ranch — 3D assets

All models generated 2026-10-25/26 in Tripo Studio (https://studio.tripo3d.ai) in the user's Chrome, text-to-3D, **HD Model, H3.1 "Best Quality", 2K texture, PBR on, triangle topology, polycount 20k** (the defaults), exported as GLB with 1k textures. Mockup targets are in `docs/visual-targets/` (see `PROMPTS.md`).

## Credits

- Balance at start: **8065**. Balance at end: **6835**. The account is shared with other crews who were generating at the same time, so the balance difference (1230) is mostly theirs.
- Displayed cost of my tasks: 6 model generations × 30 = **180**, 2 auto-rigs × 20 = **40**, preset animations **0** (no cost shown, and the balance did not change when I applied them). **My total: 220 credits.** No free retries were used, nothing was bought or upgraded.
- Budget used: 6 of 6 model generations, 2 of 2 rig/animation jobs.

## Conventions (all files)

- glTF Y-up, metres-ish but **normalised by Tripo so the largest extent is 1.0**. Scale in code to taste.
- Base at y = 0, centred in X/Z.
- **Front faces +Z** for every model (checked with Blender renders from +Z and +X).
- One mesh, one PBR material (`tripo_mat_*`) with three 1024² JPEG textures (base colour, normal, metallic-roughness). No extensions required (`extensionsUsed: []`).
- Nothing needed optimising: every file is under 2 MB. No gltf-transform processing was applied except where noted (Gnoomie skin-weight fix in Blender).
- Skinned models use the Mixamo skeleton (65 joints, root node `Armature`). **three.js `GLTFLoader` strips the colon from names**: `mixamorig:Head` becomes `mixamorigHead` (use `getObjectByName('mixamorigHead')`). Clips are "in place" (Tripo "Animation stay in Place" on).
- Raw Tripo downloads are kept in `~/Downloads/gene-ranch-originals/models/`.

## gnoomie.glb — Gnoomie base body (hero, rigged)

- Prompt: "A cute chubby round cartoon creature, Pixar style stylized game character. Body shaped like a round beach ball, standing upright on two short stubby feet, two short stubby arms held slightly out to the sides (A-pose). Big shiny round black eyes with white highlights, small happy smile. Plain smooth soft off-white cream fur, single uniform colour, no pattern, no markings. NO ears, NO tail, NO horns, NO antenna, nothing on top of the head. Bald smooth round head merged into the body. Full body, symmetrical, front view." (T-Pose toggle on)
- Tripo task: https://studio.tripo3d.ai/workspace/generate/eddf38c4-dde9-431f-89c9-0bc778d4a5e7 — generate 30 credits; Auto Rig (Humanoid, Mixamo preset) 20 credits; presets idle / jump / cheer / walk 0 credits.
- File: 1,801,572 bytes (1.72 MB), sha256 `c4a81a0acce58d0011ff0a4c8ebae65e9af3c6836e91c3399d76938c58ebcb7f`.
- 19,322 tris, 11,032 verts. bbox x −0.5…0.5 (T-pose arms), y 0…0.909, z −0.31…0.31. Body alone is ≈0.6 wide.
- Joints: 65 Mixamo (`mixamorig:Hips, Spine, Spine1, Spine2, Neck, Head, HeadTop_End, Left/RightShoulder, Arm, ForeArm, Hand + finger bones, Left/RightUpLeg, Leg, Foot, ToeBase, Toe_End`).
- Rest positions (glTF space, metres before scaling):
  - `mixamorig:Head` (−0.002, 0.507, 0.021); `HeadTop_End` y 0.712. The egg mesh continues up to **y ≈ 0.909**, and the `Head` bone drives the whole upper egg (≈4,600 verts), so **attach ears as children of `mixamorigHead` at local offset ≈ (±0.13, +0.37, 0)** (that is the top of the egg); tilt outwards a little.
  - `mixamorig:Spine2` (0.002, 0.378, 0.01).
  - `mixamorig:Hips` (0.014, 0.249, −0.021). Back surface at z ≈ −0.31 → **attach the tail to `mixamorigHips` at local offset ≈ (0, −0.02, −0.29)**.
  - Eyes are on the front (+Z) at y ≈ 0.6–0.72; patterns (stripes/spots) can be a decal/texture blend on the body below y ≈ 0.55 or an overlay shell.
- Clips (seconds): **idle 15.33**, **walk 2.33** (in place), **jump 2.21** (in place hop), **cheer 12.08**. No sleepy preset exists in Tripo's library (searched "sleep"); walk was added instead because it was free. Other free presets that would suit a Gnoomie if wanted later: `dance_01`, `look_around`, `clap`, `wave_goodbye_01`.
- Processing: Tripo's auto-rig weighted the **right forearm/hand to the `RightHandIndex1` finger bone**, so the right arm collapsed into a flat strip in every clip. In Blender 4 (background CLI, no UI) I folded all finger-bone weights into `Left/RightHand` (789 verts; the Gnoomie has mitten hands) and re-exported with all four actions (`export_animation_mode=ACTIONS`). Joint names, clip names, durations and bbox are unchanged. The raw Tripo file is `~/Downloads/gene-ranch-originals/models/gnoomie-tripo-rigged.glb` (sha256 `f90c713b…7b120a`).
- Quality: cute, clean egg-shaped body (taller than the "beach ball" asked for), big glossy eyes, smile, short legs with round feet, plain cream texture that tints well (multiply `material.color`). The arms are thin and the T-pose arms are slightly rotated (the left arm points a bit forward, the right a bit back), so arm motion is a little asymmetric; the right arm is now fine but still a bit thinner near the shoulder in some frames. The cheer clip leans the whole body back a lot; it reads as joy. Ears/tail/pattern all absent as requested.

## villager.glb — grandma farmer (rigged)

- Prompt: "A cheerful chubby grandma farmer villager, stylized cartoon Pixar style game character, full body. Short and round, rosy cheeks, big friendly smile, round glasses, grey curly hair in a bun, wide-brimmed straw hat with a pink flower band, purple plaid shirt with rolled sleeves, cream apron with a pocket, brown skirt, sturdy brown boots. Standing upright in a T-pose with arms straight out to the sides, legs slightly apart, facing front, symmetrical. Clean simple shapes, bright warm colours." (T-Pose on)
- Tripo task: https://studio.tripo3d.ai/workspace/generate/1077eb29-0a21-4f2a-aaff-0a34679b1ea4 — generate 30; Auto Rig (Humanoid, Mixamo) 20; presets 0.
- File: 1,981,644 bytes (1.89 MB), sha256 `5030ff3c76294d3e49a7f31cc5afcf5555ee906508f8776db351b839ee2c9744`. Raw Tripo export, no processing.
- 19,580 tris, 12,230 verts. bbox x −0.5…0.5 (T-pose arms), y 0…1.0, z −0.25…0.25. Faces +Z.
- Joints: same 65 Mixamo joints (root `Armature`).
- Clips: **idle 15.33**, **cheer 12.08** (arms up, hands touch the hat brim), **frustrated_01 3.54** (head-down slump; use it as the "disappointed" reaction next to the sweat-drop).
- Quality: very close to the mockup grandma (straw hat with flower, round glasses, grey curls, purple plaid shirt, yellow-cream apron, brown skirt and boots). Rig looks clean in all three clips. In `cheer` the hands clip slightly into the hat brim.

## barn.glb — barn / hatchery

- Prompt: "A cosy stylized cartoon barn and creature hatchery, Pixar style game asset. Round-ish chubby barn with curved bulging walls painted warm red with cream white trim and cream corner beams, a rounded red roof with soft curves, a small round hay loft window, a golden rooster weather vane on the roof peak. Big wide-open double barn doors on the front showing warm straw inside. Small stone base. Soft rounded shapes, toy-like, clean bright colours. Single building, no ground plane."
- Tripo task: https://studio.tripo3d.ai/workspace/generate/ae94fca4-73e6-4867-8390-7c708136ffb2 — 30 credits.
- File: 1,089,624 bytes (1.04 MB), sha256 `741a3b3081d1fc27b5a19129b509f1f0bac925777280ac98880546c60b4af3c0`. No processing.
- 18,440 tris, 12,995 verts. bbox x ±0.394, y 0…1.0, z ±0.35. Doors face +Z.
- Quality: good, clay-toy look: gambrel red roof with soft shingles, cream X-braced doors standing open with straw inside, round loft window, gold rooster vane, stones at the base. It is a classic gambrel barn, not the round barn of the mockup; the doorway is shallow (not a walkable interior).

## nest.glb — breeding nest

- Prompt: "A big cosy creature breeding nest, stylized cartoon Pixar style game prop. A wide thick woven golden straw nest ring, like a giant bird nest donut, with an empty soft hollow inside big enough for two round creatures. The nest sits on a low round mossy grey stone platform (a flat round stone disc with green moss on top and edges). A few small pink and white flowers and tiny mushrooms around the stone edge. Soft rounded shapes, warm colours. Empty nest, no eggs, no creatures, no ground plane."
- Tripo task: https://studio.tripo3d.ai/workspace/generate/c0d4dec2-c157-46a0-ada9-d2d0f4c6daa1 — 30 credits.
- File: 1,300,116 bytes (1.24 MB), sha256 `86143165a51b2cb0642e26caba107209df4066de1c2b0a9e0fcca404d1d88b40`. No processing.
- 19,533 tris, 15,539 verts. bbox x ±0.5, y 0…0.737, z ±0.498.
- Quality: nice chunky straw texture on a mossy stone disc with mushrooms and flowers. **The straw ring is tall and tilted: its opening faces forward/up (+Z and +Y, ≈45°) rather than straight up**, so from a first-person camera in front of it you see into the hollow (good for the mockup view), but creatures placed "inside" should sit at roughly (0, 0.35, 0.05) (estimate from renders; check in-scene) and may need the ring scaled down in Y (e.g. `scale.y = 0.7`) so they are visible from above. The stone disc is ≈1.0 wide; the mockups put the nest on a taller mossy boulder, which can be a procedural cylinder under it.

## netgun.glb — vacuum net gun (first-person prop)

- Prompt: "A cute stylized cartoon vacuum net gun, handheld toy-like sci-fi tool for catching fluffy creatures, Pixar style game prop. Polished brass body with teal painted panels, a chunky pistol grip with a trigger, a clear glass canister cylinder mounted on top, and a wide funnel mouth at the front with a round butterfly-net hoop and soft mesh. Small brass knobs and a little pressure gauge. Rounded chunky friendly shapes, side view, single object, no hands."
- Tripo task: https://studio.tripo3d.ai/workspace/generate/8b2442d0-cda0-45dd-997b-7b9cfc04467a — 30 credits.
- File: 1,178,980 bytes (1.12 MB), sha256 `7132da25dec9b9cf4c62b0094c78c7f035bb31018723819e6368edefb701dd73`. No processing.
- 19,182 tris, 12,348 verts. bbox x ±0.491, y 0…1.0, z ±0.202.
- Orientation: modelled in side profile — **the brass funnel mouth points to −X**, grip points down (−Y), glass canister on top, the butterfly-net hoop sticks up from above the funnel. For a first-person view-model rotate **`rotation.y = −π/2`** so the funnel points to −Z (camera forward), then put it bottom-right (≈ x +0.35, y −0.35, z −0.6 in camera space at scale ≈0.45) and tilt it up-left a little like the mockups.
- Quality: very good and on-brief (teal + brass, glass canister, funnel, net hoop with mesh, gauge, red trigger). The glass canister is opaque frosted in the texture; give it a separate transparent material or a glow sprite for the "DNA" canister in the mockups if wanted.

## board.glb — village order board

- Prompt: "A cute stylized cartoon village notice board, Pixar style game prop. A wide wooden board panel with a chunky rounded wooden frame mounted on a single thick wooden post, a small pitched shingled roof on top of the board, three blank cream paper cards pinned to the board with red pins, a few little flowers and grass tufts at the base of the post. Warm honey wood, soft rounded toy-like shapes, front view, single object, no text on the papers, no ground plane."
- Tripo task: https://studio.tripo3d.ai/workspace/generate/e4880b30-6d9c-4d61-a44d-0a819b7f5e50 — 30 credits.
- File: 1,039,392 bytes (0.99 MB), sha256 `101b482de3a74ea2ce65314d93c2c96dc2f6d146f218a6642fcbe4e39c13b583`. No processing.
- 18,700 tris, 12,492 verts. bbox x ±0.5, y 0…0.862, z ±0.195. Paper side faces +Z.
- Quality: good: honey-wood frame, brown shingle roof, three blank cream papers with red pins, flowers at the base. It stands on **two short legs**, not one post. The three papers are at roughly x = −0.27, 0, +0.27, y ≈ 0.40–0.66 (estimated from renders, not measured), on the front face — overlay order cards there as planes/CanvasTextures slightly in front of the board.
