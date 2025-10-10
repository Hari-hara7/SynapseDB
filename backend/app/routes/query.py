
from fastapi import APIRouter, Request
from pydantic import BaseModel
import time, json, html
from app.utils.llm_client import generate_sql
from app.utils.extractor import sanitize_sql
from app import redis_client  # aioredis instance (see below)
from app.lib.db import run_sql  # simple exec wrapper that runs SQL and returns rows

router = APIRouter()

class QueryIn(BaseModel):
    question: str

@router.post("/query")
async def query_endpoint(payload: QueryIn):
    question = payload.question.strip()
    if not question:
        return {"error": "Question required"}

    # Build schema snippet: you can fetch DB schema or include cached schema
    schema = await run_sql("""SELECT table_name FROM information_schema.tables WHERE table_schema='public'""")
    # For speed, you might cache schema in redis; omitted here for brevity

    prompt = f"""
Convert the user's question into a safe PostgreSQL SELECT query.

Schema:
{schema}

Rules:
- Output only SQL SELECT statement (no DML/DDL).
- Add LIMIT 1000 if not present.
Question: "{question}"
"""

    cache_key = "querycache:" + question.lower()
    cached = await redis_client.get(cache_key)
    start = time.time()

    if cached:
        # track cache hit
        await redis_client.incr("metrics:cache_hits")
        elapsed = time.time() - start
        return {"sql": cached.decode(), "data": json.loads(cached.decode()), "from_cache": True, "metrics": {"response_time": elapsed}}

    # cache miss
    await redis_client.incr("metrics:cache_misses")

    sql = await generate_sql(prompt)
    if not sql:
        # fallback: return empty with friendly message
        return {"sql": "", "data": [], "message": "LLM failed to produce SQL. Try a simpler prompt."}

    sql = sanitize_sql(sql)  # strip comments, enforce SELECT, add LIMIT if needed

    # run SQL safely
    rows = await run_sql(sql)
    elapsed = time.time() - start

    # cache result for short TTL
    try:
        await redis_client.set(cache_key, json.dumps(rows), ex=60*5)  # cache 5 minutes
    except Exception:
        pass

    return {"sql": sql, "data": rows, "metrics": {"response_time": elapsed}}
