from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

import vertexai
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings

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


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
