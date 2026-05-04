from __future__ import annotations

from fastapi import APIRouter, HTTPException

from schemas.pathway import PathwayResponse
from services.pathway_service import PathwayNotFoundError, get_pathway_service

router = APIRouter()


@router.get("/api/pathway/{fips}", response_model=PathwayResponse)
async def get_pathway(fips: str) -> PathwayResponse:
    svc = get_pathway_service()
    try:
        return svc.get_pathway(fips)
    except PathwayNotFoundError:
        raise HTTPException(status_code=404, detail=f"FIPS {fips!r} not found")
