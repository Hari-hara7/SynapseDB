import aioredis, os
redis_client = None

async def init_redis():
    global redis_client
    url = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis_client = await aioredis.from_url(url, encoding="utf-8", decode_responses=True)

# call init_redis in startup event (omitted for brevity)
