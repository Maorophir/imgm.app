"""
Profile picture checks: Google Cloud Vision SafeSearch, before a picture is saved.

SafeSearch rates how likely an image is to be adult, racy, violent or medical (gore)
content, from VERY_UNLIKELY to VERY_LIKELY. A picture is refused at BLOCK_AT or above.
Any failure refuses too (fail closed): a picture is only saved after a clean check.

Signs in like Vertex: the Cloud Run service account live, `gcloud auth
application-default login` locally (billed to VERTEX_PROJECT). The first 1,000 checks
a month are free.
"""

import base64
import logging
import os

import google.auth
from google.auth.transport.requests import AuthorizedSession

log = logging.getLogger("imgm_ai.pictures")

VISION_URL = "https://vision.googleapis.com/v1/images:annotate"
LIKELIHOOD = [
    "UNKNOWN",
    "VERY_UNLIKELY",
    "UNLIKELY",
    "POSSIBLE",
    "LIKELY",
    "VERY_LIKELY",
]
# Stricter for nudity; a meme or cartoon ("spoof") is fine
BLOCK_AT = {
    "adult": "POSSIBLE",
    "racy": "LIKELY",
    "violence": "LIKELY",
    "medical": "LIKELY",
}
MAX_BYTES = 300_000  # a 256px picture is ~10-40 KB

_session: AuthorizedSession | None = None


def vision_session() -> AuthorizedSession:
    """A signed-in HTTP session for Google APIs (created once)."""
    global _session
    if _session is None:
        credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        project = os.getenv("VERTEX_PROJECT")
        if project and hasattr(credentials, "with_quota_project"):
            credentials = credentials.with_quota_project(
                project
            )  # local logins need a project to bill
        _session = AuthorizedSession(credentials)
    return _session


def check_image(data: bytes) -> dict:
    """{"allowed": bool, "flagged": [...]} for one image. Raises if the check itself fails."""
    if not data or len(data) > MAX_BYTES:
        return {"allowed": False, "flagged": ["size"]}
    response = vision_session().post(
        VISION_URL,
        json={
            "requests": [
                {
                    "image": {"content": base64.b64encode(data).decode()},
                    "features": [{"type": "SAFE_SEARCH_DETECTION"}],
                }
            ]
        },
        timeout=20,
    )
    response.raise_for_status()
    result = response.json()["responses"][0]
    if "error" in result:
        raise RuntimeError(result["error"].get("message", "Vision error"))
    ratings = result["safeSearchAnnotation"]
    flagged = [
        kind
        for kind, threshold in BLOCK_AT.items()
        if LIKELIHOOD.index(ratings.get(kind, "UNKNOWN")) >= LIKELIHOOD.index(threshold)
    ]
    log.info(
        "Picture check: %s → %s",
        {k: ratings.get(k) for k in BLOCK_AT},
        flagged or "allowed",
    )
    return {"allowed": not flagged, "flagged": flagged}
