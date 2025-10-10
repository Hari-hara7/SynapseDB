import asyncio
from typing import Optional
import PyPDF2
import docx
import pandas as pd
import aiofiles

async def extract_text_from_file(path: str, ext: str) -> str:
    ext = ext.lower()
    if ext == ".pdf":
        return extract_pdf(path)
    if ext in [".docx"]:
        return extract_docx(path)
    if ext in [".csv"]:
        return extract_csv(path)
    if ext in [".txt"]:
        async with aiofiles.open(path, "r", encoding="utf-8", errors="ignore") as f:
            return await f.read()
    return ""

def extract_pdf(path: str) -> str:
    text = []
    with open(path, "rb") as fh:
        reader = PyPDF2.PdfReader(fh)
        for page in reader.pages:
            text.append(page.extract_text() or "")
    return "\n".join(text)

def extract_docx(path: str) -> str:
    doc = docx.Document(path)
    return "\n".join([p.text for p in doc.paragraphs])

def extract_csv(path: str) -> str:
    df = pd.read_csv(path, nrows=1000)
    return df.to_csv(index=False)
