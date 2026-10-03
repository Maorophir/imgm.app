"""
Review answers in plain words, for the RAG index.

The database stores short option keys ("tears", "dark_souls", "coop"). The website
shows them as jokes ("I cried (don't tell anyone)"). An embedding matches MEANING,
so for search we describe each answer plainly: "an emotional story that made me cry".

Keys come from imgm-server/src/lib/reviewOptions.js. An answer missing here (or
"na", not applicable) is simply left out of the text.
"""

CHECKLIST_PHRASES = {
    "graphics": {
        "ms_paint": "very ugly graphics",
        "potato": "rough, low-end graphics",
        "decent": "decent graphics",
        "pretty": "pretty graphics",
        "screenshot": "stunning, beautiful graphics",
        "reality": "breathtaking, photorealistic graphics",
    },
    "gameplay": {
        "dont": "terrible gameplay",
        "paint_dry": "boring gameplay",
        "fine": "average gameplay",
        "good": "good gameplay",
        "great": "great gameplay",
        "one_more": "addictive one-more-round gameplay",
    },
    "audio": {
        "deaf": "terrible audio",
        "mute": "forgettable audio",
        "okay": "okay audio",
        "good": "good audio",
        "repeat": "a soundtrack worth listening to on repeat",
        "eargasm": "an incredible soundtrack and sound design",
    },
    "story": {
        "none": "no real story",
        "lore": "a light story, mostly lore",
        "average": "an average story",
        "good": "a good story",
        "tears": "an emotional story that made me cry",
        "life": "an unforgettable story that stays with you",
    },
    "difficulty": {
        "press_w": "very easy",
        "easy": "easy",
        "learn_master": "easy to learn, hard to master",
        "brain": "needs thinking and strategy",
        "hard": "hard",
        "dark_souls": "brutally difficult, Dark Souls level",
    },
    "grind": {
        "none": "no grinding",
        "optional": "grinding only for completionists",
        "average": "some grinding",
        "lots": "a lot of grinding",
        "second_life": "an endless grind",
    },
    "game_length": {
        "coffee": "very short, done in one sitting",
        "short": "short",
        "average": "average length",
        "long": "long",
        "infinity": "endless, can be played forever",
    },
    "bugs": {
        "terrarium": "very buggy",
        "annoying": "annoying bugs",
        "minor": "minor bugs",
        "none": "no bugs",
    },
    "pc_requirements": {
        "toaster": "runs on any PC",
        "potato": "runs on weak PCs",
        "decent": "needs a decent PC",
        "fast": "needs a fast PC",
        "rich": "needs a high-end PC",
        "nasa": "needs a top-end PC",
    },
    "worth_price": {
        "never": "not worth the money",
        "free": "only worth it if free",
        "sale": "worth it on sale",
        "full": "worth full price",
    },
    "replay": {
        "once": "not worth replaying",
        "someday": "might replay someday",
        "already": "very replayable",
    },
}

GOT_GOOD_PHRASES = {
    "never": "it never got good",
    "many_hours": "it gets good after many hours",
    "few_hours": "it gets good after a few hours",
    "instantly": "fun from the very first minute",
}

COMPLETION_PHRASES = {
    "playing": "still playing",
    "finished": "finished it",
    "completed_100": "100% completed it",
    "dropped": "dropped it",
}

PLAY_STYLE_PHRASES = {
    "solo": "played solo",
    "coop": "played co-op with friends",
    "online": "played online",
}


def checklist_verdicts(review: dict) -> list[str]:
    """The review's checklist answers as plain phrases, in checklist order."""
    return [
        phrases[review[field]]
        for field, phrases in CHECKLIST_PHRASES.items()
        if review.get(field) in phrases
    ]


def how_they_played(review: dict) -> list[str]:
    """How the reviewer played: style, hours, how far they got."""
    parts = []
    if review.get("play_style") in PLAY_STYLE_PHRASES:
        parts.append(PLAY_STYLE_PHRASES[review["play_style"]])
    if review.get("hours_played") is not None:
        parts.append(f"{review['hours_played']} hours")
    if review.get("completion_status") in COMPLETION_PHRASES:
        parts.append(COMPLETION_PHRASES[review["completion_status"]])
    return parts
