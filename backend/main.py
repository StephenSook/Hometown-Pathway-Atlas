from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

import vertexai
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routes import analogs, pathway, region, stats

# Configure root logger once at import time. uvicorn's default config
# only attaches handlers to `uvicorn.error` + `uvicorn.access`, leaving
# application loggers (services.*, routes.*) silent under default
# settings. Without this, every Gemini fallback `logger.warning(...)`
# emits nothing visible in Cloud Run logs — quota exhaustion at judging
# time would be invisible until raw stderr inspection. silent-failure-
# hunter audit 2026-05-04 PM CRITICAL.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logging.getLogger("services.gemini_service").setLevel(logging.WARNING)
logging.getLogger("services.auditor").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Initialize Vertex AI once at startup — cheap; no network call until first inference
    vertexai.init(project=settings.gcp_project, location=settings.gcp_location)
    logger.info(
        "Vertex AI initialized — project=%s location=%s",
        settings.gcp_project,
        settings.gcp_location,
    )
    yield
    # Nothing to tear down


app = FastAPI(
    title="Hometown Pathway Atlas API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


app.include_router(region.router)
app.include_router(analogs.router)
app.include_router(pathway.router)
app.include_router(stats.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
