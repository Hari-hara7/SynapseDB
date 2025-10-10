from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import query, upload, metrics

app = FastAPI(title="NL2SQL Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(query.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
