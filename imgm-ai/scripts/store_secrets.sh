#!/usr/bin/env bash
# Stores Play Next's production secrets in Google Secret Manager, in the project gcloud
# is set to (gcloud config get-value project). Run it from imgm-ai/:
#     bash scripts/store_secrets.sh
#
# Every value is typed or pasted at a HIDDEN prompt: never shown on screen, never in
# shell history. Leave a prompt empty (just press Enter) to keep what's already stored.
# Running it again adds a new version of each secret you fill in (older ones stay).
set -euo pipefail

PROJECT=$(gcloud config get-value project 2>/dev/null)
echo "Storing secrets in project: $PROJECT"
echo

# put NAME VALUE: create the secret, or add a new version if it already exists
put() {
  if gcloud secrets describe "$1" >/dev/null 2>&1; then
    printf '%s' "$2" | gcloud secrets versions add "$1" --data-file=- >/dev/null
  else
    printf '%s' "$2" | gcloud secrets create "$1" --data-file=- --replication-policy=automatic >/dev/null
  fi
  echo "  saved: $1"
}

# ask PROMPT: read a value without showing it
ask() {
  local value
  read -rsp "$1: " value
  echo >&2
  printf '%s' "$value"
}

# store NAME PROMPT: ask, and save unless left empty
store() {
  local value
  value=$(ask "$2")
  if [ -n "$value" ]; then put "$1" "$value"; else echo "  skipped: $1"; fi
}

echo "1/6 Gemini keys"
store imgm-ai-gemini-free-key "Production FREE Gemini key (the old GEMINI_FREE_API_KEY, not the dev one)"
store imgm-ai-gemini-paid-key "PAID Gemini key (GEMINI_PAID_API_KEY)"

echo "2/6 Tavily"
store imgm-ai-tavily-key "Tavily API key (TAVILY_API_KEY)"

echo "3/6 The AI database (Neon project imgm-ai)"
store imgm-ai-vector-database-url "imgm-ai's connection string (Neon > imgm-ai > Connect, pooled)"

echo "4/6 The agent's read-only login to IMGM's database"
owner_url=$(ask "IMGM's normal connection string (Neon > your IMGM project > Connect, pooled)")
agent_password=$(ask "imgm_agent's password (the one you generated)")
if [ -n "$owner_url" ] && [ -n "$agent_password" ]; then
  # Same address, but user imgm_agent and its password, encoded so characters like
  # / + = can't break the string. Printed only into the variable, never to the screen.
  readonly_url=$(OWNER_URL="$owner_url" AGENT_PASSWORD="$agent_password" python3 -c '
import os
from urllib.parse import quote, urlsplit, urlunsplit
url = urlsplit(os.environ["OWNER_URL"])
host = url.netloc.rsplit("@", 1)[-1]
netloc = "imgm_agent:" + quote(os.environ["AGENT_PASSWORD"], safe="") + "@" + host
print(urlunsplit((url.scheme, netloc, url.path, url.query, url.fragment)))
')
  put imgm-ai-readonly-database-url "$readonly_url"
else
  echo "  skipped: imgm-ai-readonly-database-url"
fi

echo "5/6 LangSmith (optional: traces of every production run)"
store imgm-ai-langsmith-key "LangSmith API key (LANGSMITH_API_KEY), or Enter to skip"

echo "6/6 The internal key between Express and the AI service"
if gcloud secrets describe imgm-ai-internal-key >/dev/null 2>&1; then
  echo "  kept: imgm-ai-internal-key (already exists)"
else
  internal_key=$(openssl rand -hex 32)
  put imgm-ai-internal-key "$internal_key"
  echo
  echo "  Copy this into Render (imgm-server > Environment) as INTERNAL_API_KEY:"
  echo "  $internal_key"
  echo "  (Shown only this once. To see it again: gcloud secrets versions access latest --secret imgm-ai-internal-key)"
fi

echo
echo "Done. Stored secrets:"
gcloud secrets list --filter="name~imgm-ai-" --format="value(name)" | sed 's/^/  /'
