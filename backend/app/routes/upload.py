from fastapi import APIRouter, UploadFile, File, Form
from typing import List
import os, uuid, aiofiles, asyncio
from app.utils.extractor import extract_text_from_file
from app import redis_client

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    results = []
    for f in files:
        fname = f.filename
        ext = os.path.splitext(fname)[1].lower()
        uid = str(uuid.uuid4())
        save_path = os.path.join(UPLOAD_DIR, f"{uid}{ext}")

        # save file
        async with aiofiles.open(save_path, "wb") as out:
            content = await f.read()
            await out.write(content)

        # extract text (sync or async)
        text = await extract_text_from_file(save_path, ext)
        # store metadata in redis for quick retrieval or in DB
        meta = {"id": uid, "filename": fname, "path": save_path, "text_snippet": text[:500]}
        await redis_client.hset("docs", uid, json.dumps(meta))
        results.append(meta)
    return {"uploaded": results}
