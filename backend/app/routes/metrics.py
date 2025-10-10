from fastapi import APIRouter
from app import redis_client
router = APIRouter()

@router.get("/metrics")
async def get_metrics():
    hits = await redis_client.get("metrics:cache_hits") or 0
    misses = await redis_client.get("metrics:cache_misses") or 0
    return {"cache_hits": int(hits), "cache_misses": int(misses)}
