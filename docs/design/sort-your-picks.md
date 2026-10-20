# Play Next · Sort your picks (design, not built yet)

A feedback screen for Play Next's 5 picks, replacing the per-card "Played it" and
"Not for me" buttons, which each start their own search.

Open `sort-your-picks.html` in a browser for the clickable preview (real picks
from a test chat, covers embedded).

## Decided
- **Layout:** desktop shows all 5 cards side by side (A); phones deal them one at
  a time (B).
- **Cards:** collectible cards in the pick's rank frame (#1 Legendary gold foil,
  #2 Epic, #3 Rare, #4 and #5 plain), laid out like the review cards: title with
  the IMGM score as a big number ("Unrated" without reviews), genre · year ·
  hours, inset art, a tier line, the "why" in plain (not italic) text, and the
  Hall of Fame rank in the footer when the game has one.
- **Choices per card:** Keep it / Played it / Not for me. "Played it" asks
  "Did you like it?" (thumbs up or down). Untouched cards count as Keep it.
- **Add to Backlog:** a separate toggle per card, saved right away; hidden on
  cards marked Played or Not for me.
- **Done:** every card kept means no search. Otherwise ONE search replaces only
  the played or rejected games. All of them are remembered for the chat, and
  "loved it" / "didn't enjoy it" goes into the message so the replacements lean
  toward the loved ones. Example message:
  "I already played Unpacking (loved it). Portal 2 isn't for me. Keep A Little
  to the Left, Beacon Pines, A Short Hike and replace the other 2."
- The old per-card "Played it" and "Not for me" buttons go away; the pick cards
  keep only "Add to Backlog".

## Still to settle
- Final polish of the card (the user wants to revisit it).
- Where "Sort your picks" opens from (a button under the picks).
