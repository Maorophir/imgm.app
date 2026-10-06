"""
Chat with the agent from the terminal, from imgm-ai/:
    uv run python -m imgm_ai                    then type your questions
    uv run python -m imgm_ai "your question"    the first question, then keep chatting

The agent remembers the conversation (one thread_id per run). Type "quit" to stop,
or "/no 2" to say "Not for me" to card 2 (it's replaced and never suggested again).
The logged-in player is TEST_USER_ID from .env (leave it out to test a logged-out visitor).
"""

import os
import sys
from uuid import uuid4

from imgm_ai.agent.graph import graph
from imgm_ai.agent.state import Preferences, new_turn, not_for_me_turn

EXAMPLE_PREFERENCES: Preferences = {
    # "platforms": ["Nintendo Switch"],
    # "moods": ["cozy"],
    # "play_style": "coop",
    # "loved_games": ["Stardew Valley"],
    # "avoid": ["horror"],
}


def print_cards(result: dict) -> None:
    """Print the cards, as the website will receive them."""
    recommendations = result.get("recommendations")
    print("\n" + "═" * 70)
    if result.get("check_problems"):
        print("⚠ Still failing checks:", result["check_problems"])
    if recommendations:
        print(recommendations.intro, "\n")
        for number, card in enumerate(recommendations.games, start=1):
            label = "BEST PICK" if card.best_pick else "         "
            print(
                f"{number}. [{label}] {card.title} (id {card.game_id})\n               {card.why}\n"
            )
        if recommendations.follow_up:
            print(recommendations.follow_up)
    print("═" * 70 + "\n")


def main() -> None:
    """Chat with the agent: every question continues the same conversation."""
    user_id = os.getenv("TEST_USER_ID")
    # One thread_id = one conversation (a save slot). Same id on every turn,
    # so the checkpointer loads what was said before.
    config = {"configurable": {"user_id": user_id, "thread_id": str(uuid4())}}
    print(
        f"Player: {user_id or 'not logged in'} · 'quit' to stop · '/no 2' = not for me\n"
    )

    first_question = " ".join(sys.argv[1:])
    first_turn = True
    while True:
        question = first_question or input("You: ").strip()
        first_question = ""
        if question.lower() in ("", "quit", "exit"):
            break
        if not sys.stdin.isatty():
            print(question)  # piped in from a file: show what was "typed"

        if question.startswith("/no"):
            # "Not for me" on one of the last cards: remember it and ask for a swap
            cards = graph.get_state(config).values.get("recommendations")
            number = question.removeprefix("/no").strip()
            if (
                not cards
                or not number.isdigit()
                or not 1 <= int(number) <= len(cards.games)
            ):
                print(
                    "Use /no followed by a card number from the last answer, e.g. /no 2\n"
                )
                continue
            card = cards.games[int(number) - 1]
            print(f"→ Not for me: {card.title}")
            turn_input = not_for_me_turn(card.game_id, card.title)
        else:
            # The new question (appended to the history) + fresh per-answer fields.
            # Preferences are set once, on the first turn, and then remembered.
            turn_input = new_turn(question, EXAMPLE_PREFERENCES if first_turn else None)
            first_turn = False

        result = graph.invoke(turn_input, config=config)
        print_cards(result)

        # Peek into the save slot: how much the agent now remembers
        saved = graph.get_state(config).values
        rejected = ", ".join(g["title"] for g in saved.get("rejected", [])) or "none"
        print(
            f"(memory: {len(saved['messages'])} messages · "
            f"fix_attempts={saved.get('fix_attempts', 0)} · not for me: {rejected})\n"
        )


if __name__ == "__main__":
    main()
