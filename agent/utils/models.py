"""The chat model the travel agent uses (adapted from the HackPrinceton starter).

The starter defaults to Anthropic. We use Gemini because we have a Gemini key.
To switch back, set MODEL_SPEC to {"model": "anthropic:claude-haiku-5-5"} and
put ANTHROPIC_API_KEY in agent/.env.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# agent/.env (next to langgraph.json)
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env", override=True)

from langchain.chat_models import init_chat_model

# langchain-google-genai reads GOOGLE_API_KEY; our Next.js app calls it GEMINI_API_KEY.
if os.environ.get("GEMINI_API_KEY") and not os.environ.get("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]

MODEL_SPEC = {
    "model": "google_genai:" + os.environ.get("GEMINI_MODEL", "gemini-3.5-flash"),
    "temperature": 0.1,
}

model = init_chat_model(**MODEL_SPEC)
