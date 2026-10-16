# IMGM avatars

24 original characters, drawn for IMGM with Google's Gemini image model
(`gemini-3.1-flash-image` on Vertex AI, 1024px), then shrunk to 256px WebP.
Each is a nod to a kind of game, never a copy of a specific character.

## Style prompt (the same for every avatar)

> Square video game player avatar, an ORIGINAL character (not based on any existing game, film or  franchise character). Head and shoulders, centred, facing the viewer, the head filling about two  thirds of the frame so it reads well when cropped to a small circle. Style: bold flat vector  illustration with clean shapes and a few soft shadows, slightly stylised proportions, confident  and cool. Background: one plain flat warm near-black colour (#1a1815), nothing else in it.  Palette: muted warm neutrals plus ONE accent colour, <accent colour>, used for rim light, eyes or a few  details. No text, no letters, no logo, no watermark, no border.

Then: `The character: <description>.`

## Characters

| file | accent | description |
|---|---|---|
| rogue.webp | #b8f03a | a hooded rogue with a scarf over the lower face, sharp eyes |
| knight.webp | #fbbf24 | a knight in a battered visored helmet with a feather plume |
| mage.webp | #c084fc | a young mage with messy hair and a small glowing diamond-shaped gem on the forehead (a plain shape, not a letter or symbol) |
| pilot.webp | #60a5fa | a space pilot with a cracked helmet visor pushed up, headset |
| ranger.webp | #4ade80 | a forest ranger with braided hair, leaf-shaped cloak clasp |
| cyborg.webp | #d4dae6 | a cyborg with half the face a smooth metal plate, calm smile |
| mechanic.webp | #fbbf24 | a mech engineer with goggles on the forehead and an oil smudge on the cheek |
| witchhunter.webp | #c084fc | an older woman witch hunter with a wide-brimmed hat shading her eyes, grey streak in her hair, stern |
| survivor.webp | #4ade80 | a post-apocalyptic survivor in a battered gas mask and a hood, patched jacket |
| netrunner.webp | #60a5fa | a cyberpunk hacker woman with a shaved side, neon cable implants behind the ear, holographic visor |
| soulknight.webp | #d4dae6 | a weary undead-looking knight in dark rusted armour with a broken crown, dim glowing eyes, dark fantasy |
| viking.webp | #fbbf24 | a red-bearded viking warrior with braids, a fur collar and blue war paint stripes |
| gunslinger.webp | #b8f03a | a weathered gunslinger with a cowboy hat, bandana around the neck and stubble, wild west |
| ronin.webp | #c084fc | a wandering swordsman with a straw hat, tied-back hair and a calm expression |
| bountyhunter.webp | #60a5fa | a space bounty hunter with the helmet off and tucked under one arm, short grey hair, a scar across the eyebrow, a rugged armoured collar with scuffed blue paint |
| elfarcher.webp | #4ade80 | an elf archer woman with long pointed ears, a hood and a quiver strap across the shoulder |
| dwarf.webp | #fbbf24 | a stout dwarf blacksmith with a huge braided beard and soot on the cheeks |
| orc.webp | #b8f03a | a friendly-looking orc warrior with small tusks, green skin and a battle-scarred grin |
| robot.webp | #d4dae6 | a cute boxy companion robot with round glowing eyes and a small antenna |
| alien.webp | #c084fc | a curious alien with big glossy eyes, smooth purple-grey skin and a small crest |
| detective.webp | #d4dae6 | a noir detective woman in a trench coat and fedora, cigarette-free, rain on the brim |
| racer.webp | #60a5fa | a racing driver with an open helmet and fireproof balaclava pulled down, confident grin |
| farmer.webp | #4ade80 | a cheerful cozy-game farmer with freckles, a straw hat and a sprout pinned to the overalls |
| esports.webp | #b8f03a | a young esports player with a big gaming headset, team hoodie and focused eyes |

To add one: generate with the same prompt and a new description, shrink to 256px
WebP, add it to `src/lib/avatarPresets.js`. A redrawn picture needs a new key (the
pictures are cached for a year).
