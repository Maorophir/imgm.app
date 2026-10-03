"""
Masks casual swearing in review quotes the agent sees, in the website's style:
"fucking" → "f***ing", "shit" → "s***".

Reviews can contain swearing (the site allows it, masked by default; slurs are
blocked when posting). The agent quotes reviews, so quotes are masked BEFORE the
model reads them: what the model never sees, it can never repeat.

A short, curated list on purpose: gaming text is full of innocent words that
naive filters break ("cockpit", "Dickens", "Scunthorpe"), so only unambiguous
words are matched.
"""

import re

# Stems that may appear inside a longer word ("motherfucker", "bullshit", "shitty")
_ANYWHERE = r"f+u+c+k+|sh[i1!]+t+"
# Words that must start the word, to avoid hitting innocent words
_WORD_START = r"bitch|cunt|asshole|bastard|whore|slut|twat|wank|pussy"

_SWEARING = re.compile(rf"(?:{_ANYWHERE})|\b(?:{_WORD_START})", re.IGNORECASE)


def _mask(match: re.Match) -> str:
    word = match.group(0)
    return word[0] + "*" * (len(word) - 1)


def mask_profanity(text: str) -> str:
    """The text with swearing masked: first letter kept, the rest as stars."""
    return _SWEARING.sub(_mask, text)
