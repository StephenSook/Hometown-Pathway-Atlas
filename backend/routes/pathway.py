from __future__ import annotations

from fastapi import APIRouter

from schemas.pathway import PathwayResponse
from services.pathway_service import get_pathway_service

router = APIRouter()


@router.get("/api/pathway/{fips}", response_model=PathwayResponse)
async def get_pathway(fips: str) -> PathwayResponse:
    svc = get_pathway_service()
    return svc.get_pathway(fips)
