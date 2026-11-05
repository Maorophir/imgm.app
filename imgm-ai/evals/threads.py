"""
Earlier exchanges for the screen eval: the player's earlier message, Play Next's reply to
it, and whether games were suggested. Real replies from production traces (2026-10/11),
except the Hebrew one, written to match.
"""

from imgm_ai.agent.nodes import DECLINES

IT_TAKES_TWO = "a game like it takes two"
PALWORLD = "give me a game like palworld"
COZY = "a short cozy game for tonight"
HEBREW_HORROR = "תמליץ לי על משחק אימה טוב"  # "recommend me a good horror game"
WEATHER = "whats the weather in new york atm ?"
HELLO = "hello"
WHAT_DO_YOU_DO = "hey what do you do ?"

IT_TAKES_TWO_REPLY = """If you loved the inventive co-op mechanics, shifting playstyles, and heartfelt partner dynamic of It Takes Two, there are some fantastic adventures built entirely around two-player teamwork.

Best Pick: Portal 2 - The gold standard of two-player puzzle-platforming, featuring a dedicated co-op campaign where you and a friend each control a testing bot with complementary portal guns. It takes about 10.4h to beat and hits the exact sweet spot of clever, laugh-out-loud cooperative problem-solving that made It Takes Two such a joy.

Also worth a look:
2. Split Fiction - Hazelight Studios' follow-up to It Takes Two delivers another dedicated split-screen journey packed with creative platforming and action-fantasy set pieces (about 15.6h to beat). One IMGM player rated it 7/10 and noted it is a "nice game to pass the time with your partner" where they had a lot of fun playing together.
3. Unravel Two - You play as two yarn creatures physically tied together by a thread, having to coordinate your swings, wall jumps, and puzzle solutions across vibrant natural landscapes (about 5.4h to beat). It captures the cozy, emotional charm of It Takes Two with approachable yet deeply satisfying teamwork mechanics.
4. Sackboy: A Big Adventure - A gorgeous 3D platformer running about 13.3h to beat that shines brightly in co-op, offering creative level design, infectious music levels, and playful joint interactions. It brings the same high-energy variety and lighthearted charm for your next co-op night.
5. A Way Out - The prison-break thriller from Hazelight that paved the way for It Takes Two, built entirely from the ground up for mandatory two-player split-screen (about 6.3h to beat). It trades whimsical magic for cinematic grit, requiring you and your partner to coordinate distractions, timing, and escapes in real time.

Honorable mentions:
- Grounded (Miniaturized survival co-op) - If you loved the sense of wonder from exploring an oversized world as a shrunken character, this survival adventure delivers that theme in spades with up to four friends.

Are you looking for another mandatory two-player story adventure, or are you open to broader puzzle and platforming games you can enjoy solo as well?"""

PALWORLD_REPLY = """If you fell in love with Palworld's mix of creature taming, open-world survival crafting, and base automation, there are some fantastic ways to chase that exact loop.

Best Pick: Ark: Survival Evolved - This is the direct mechanical blueprint Palworld was built on, swapping cartoon critters for prehistoric beasts. You explore a dangerous open sandbox, tame and breed wild dinosaurs, build massive fortified settlements, and mount your creatures equipped with heavy firepower to take on boss arenas.

Also worth a look:
2. Craftopia - PocketPair's game made right before Palworld, blending open-world hack-and-slash action, farming, factory automation, and whimsical sandbox chaos. It has that exact same playful, anything-goes DNA, letting you automate production lines and explore fantastical biomes.
3. Slime Rancher - If your favorite part of Palworld is collecting adorable companions and running a bustling ranch to manage them, this vibrant first-person sandbox takes about 18.5 hours to beat. You explore an alien frontier, capture quirky slimes, breed hybrids, and automate your corral systems.
4. Grounded - A polished survival crafting adventure that clocks in around 48.5 hours to beat, shrinking you down into a backyard filled with hostile bugs. It mirrors Palworld's satisfying progression curve of gathering resources, crafting tiered gear, building elaborate multi-story bases, and conquering tough environmental threats.
5. Valheim - A stellar Norse survival sandbox that takes about 25 hours to beat, sharing Palworld's compulsive loop of wilderness survival, building, and defeating massive summoned bosses to unlock new tech tiers. You can explore procedural biomes, construct grand settlements, and even tame wild boars and wolves to help defend your home.

Honorable mentions:
- Cassette Beasts (Creature collection with deep combat) - A monster-taming RPG that takes about 32.5 hours to beat, focusing on recording beasts, fusing them in battle, and open-world exploration.
- Dragon Quest Builders 2 (Sandbox base building with villagers) - A charming 50-hour RPG where you harvest materials, design sprawling settlements, and recruit NPCs to run your towns.

Which side of Palworld do you want to lean into most: the taming and base automation, or the open-world survival and boss fights?"""

COZY_REPLY = """Here are five delightful, bite-sized cozy games you can easily start and finish in a single evening.

Best Pick: A Short Hike - Taking about 2.5 hours to beat, this is the ultimate cozy evening escape as you explore a peaceful provincial park, glide from hilltops, and chat with charming animal campers at your own pace. There is zero combat, no pressure, and just the pure, heartwarming joy of wandering toward the mountain summit before heading to bed.

Also worth a look:
2. Unpacking - Clocking in at about 3 hours, this zen puzzle experience has you pulling possessions out of boxes to decorate bedrooms and apartments across major life milestones, telling an intimate, touching story purely through environmental storytelling.
3. Donut County - At just over 2 hours long, this hilarious physics puzzler puts you in control of an ever-growing hole in the ground swallowing up adorable trash and quirky animal townsfolk with charming pastel visuals and witty banter.
4. Gris - Around 4 hours long, this gorgeous watercolor platformer offers gentle puzzles, breathtaking music, and a quiet, emotionally soothing journey through grief where it is impossible to fail or die.
5. Florence - An interactive graphic novel that takes just about 40 minutes to finish, beautifully capturing the highs, tender routines, and heartaches of young love through simple, clever micro-puzzles.

Honorable mentions:
- Lil Gator Game ("Playful childhood playground adventure") - Runs about 3.5 hours and captures the carefree joy of running around an island crafting silly cardboard gear with friends.

What gaming platform are you planning to curl up with tonight?"""

HEBREW_HORROR_REPLY = """הנה חמישה משחקי אימה שיחזיקו אתכם על קצה הכיסא.

הבחירה הטובה ביותר: Resident Evil 2 - רימייק מפחיד ומלוטש, כ-9 שעות, עם מתח מתמיד ותחנת משטרה שלא תשכחו.

שווה לבדוק גם:
2. Alien: Isolation - חייזר אחד שצד אתכם בתחנת חלל, כ-20 שעות של פחד אמיתי.
3. Dead Space - אימה בחלל עם אווירה כבדה, כ-12 שעות.
4. Outlast - בלי נשק, רק מצלמה וריצה, כ-5 שעות.
5. Amnesia: The Bunker - בונקר חשוך ומפלצת אחת, כ-6 שעות.

אתם מעדיפים אימה עם יריות, או אימה שבה אפשר רק לברוח?"""

HELLO_REPLY = """Hey there, welcome to IMGM! I am Play Next, and I am here to help you track down your next favorite game. Tell me what kind of mood you are in—whether it is a specific genre, a title you recently loved, how much time you want to spend, or if you are playing solo or with friends—and I will pick out five great recommendations for you."""

WHAT_DO_YOU_DO_REPLY = """Hey there! I am Play Next, the game recommendation assistant for IMGM, and my whole job is helping you find your next favorite video game.

Tell me a bit about what you are in the mood for—like a favorite genre, a game you loved recently, how much time you have, or whether you are playing solo or with friends—and I will track down five great games for you."""

# The earlier message → (Play Next's reply, were games suggested so far)
THREADS = {
    IT_TAKES_TWO: (IT_TAKES_TWO_REPLY, True),
    PALWORLD: (PALWORLD_REPLY, True),
    COZY: (COZY_REPLY, True),
    HEBREW_HORROR: (HEBREW_HORROR_REPLY, True),
    WEATHER: (DECLINES["english"], False),
    HELLO: (HELLO_REPLY, False),
    WHAT_DO_YOU_DO: (WHAT_DO_YOU_DO_REPLY, False),
}
