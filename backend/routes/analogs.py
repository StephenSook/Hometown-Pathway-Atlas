from __future__ import annotations

from fastapi import APIRouter, HTTPException

from schemas.analog import AnalogsResponse
from services.analog_service import get_analog_service
from services.profile_service import ProfileNotFoundError

router = APIRouter()


@router.get("/api/analogs/{fips}", response_model=AnalogsResponse)
async def get_analogs(fips: str) -> AnalogsResponse:
    svc = get_analog_service()
    try:
        return svc.get_analogs(fips)
    except ProfileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
