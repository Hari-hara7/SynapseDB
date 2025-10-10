import os
import time
from typing import Optional
import logging

# Replace with correct import for the Python Gemini client:
# from google.generativeai import client  # example placeholder
# OR use httpx to call the REST API directly

GEMINI_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.5-flash"

logger = logging.getLogger(__name__)

async def generate_sql(prompt: str, timeout: int = 20) -> Optional[str]:
    """
    Call Gemini-2.5-flash (async or via httpx) and return generated SQL string.
    Implement retries for transient errors and ensure we return text only.
    """
    import httpx
    url = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent".format(model=MODEL_NAME)
    headers = {"Authorization": f"Bearer {GEMINI_KEY}"}
    payload = {"input": {"text": prompt}}
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(url, json=payload, headers=headers)
            r.raise_for_status()
            data = r.json()
            # safe extraction: check common fields
            sql = None
            # Try multiple possible paths depending on SDK
            if "candidates" in data:
                try:
                    sql = data["candidates"][0]["content"][0]["text"]
                except Exception:
                    sql = None
            if not sql and "output" in data:
                sql = data.get("output", None)
            if not sql and "response" in data:
                # older: response.text
                sql = data["response"].get("text")
            if sql:
                return sql
            return None
    except httpx.HTTPStatusError as e:
        logger.error("LLM HTTP error: %s", e)
        return None
    except Exception as e:
        logger.exception("LLM error")
        return None
