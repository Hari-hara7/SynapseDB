import os, asyncpg
from typing import List, Dict

DATABASE_URL = os.getenv("DATABASE_URL")

async def run_sql(sql: str):
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        rows = await conn.fetch(sql)
        # convert to list of dicts
        res = [dict(r) for r in rows]
        return res
    finally:
        await conn.close()
