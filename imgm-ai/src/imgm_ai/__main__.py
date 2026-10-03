"""
Talk to the agent from the terminal, from imgm-ai/:
    uv run python -m imgm_ai "your question"

The logged-in player is TEST_USER_ID from .env (leave it out to test a logged-out visitor).
"""

import os
import sys

from langchain_core.messages import HumanMessage

from imgm_ai.agent.graph import graph
from imgm_ai.agent.state import Preferences

EXAMPLE_PREFERENCES: Preferences = {
    # "platforms": ["Nintendo Switch"],
    # "moods": ["cozy"],
    # "play_style": "coop",
    # "loved_games": ["Stardew Valley"],
    # "avoid": ["horror"],
}


def main() -> None:
    """Run one question through the agent and print the conversation and the cards."""
    question = (
        " ".join(sys.argv[1:])
        or "Based on my reviews, recommend a game for me, i want it to be beautiful and not easy"
    )
    user_id = os.getenv("TEST_USER_ID")
    print(f"Player: {user_id or 'not logged in'}\n")

    result = graph.invoke(
        {
            "messages": [HumanMessage(content=question)],
            "preferences": EXAMPLE_PREFERENCES,  # try {} to test a brand-new player
        },
        # The private channel: tools can read it, the model can't see it
        config={"configurable": {"user_id": user_id}},
    )
    for message in result["messages"]:
        message.pretty_print()

    # The cards, as the website will receive them
    recommendations = result.get("recommendations")
    print("\n" + "═" * 70)
    if result.get("check_problems"):
        print("⚠ Still failing checks:", result["check_problems"])
    if recommendations:
        print(recommendations.intro, "\n")
        for card in recommendations.games:
            label = "BEST PICK" if card.best_pick else "         "
            print(
                f"[{label}] {card.title} (id {card.game_id})\n            {card.why}\n"
            )
        if recommendations.follow_up:
            print(recommendations.follow_up)


if __name__ == "__main__":
    main()
