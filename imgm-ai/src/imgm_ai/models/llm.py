import os

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_ollama import ChatOllama

load_dotenv()


def get_model():
    return (
        ChatGoogleGenerativeAI(
            model="gemini-3.8-flash", thinking_level="low", timeout=60
        )
        if os.environ.get("LLM_PROVIDER") == "gemini"
        else ChatOllama(model="gemma4:e4b", num_ctx=8192)
    )


if __name__ == "__main__":
    llm = get_model()
    response = llm.invoke("Hi from imgm the new gen game reviews site !")
    print(response.content)
