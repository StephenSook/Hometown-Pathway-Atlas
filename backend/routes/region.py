from __future__ import annotations

from fastapi import APIRouter, HTTPException

from schemas.region import RegionResponse, ZipRequest
from services.gemini_service import get_gemini_service
from services.profile_service import ProfileNotFoundError, ZipNotFoundError, get_profile_service

router = APIRouter()


@router.post("/api/region", response_model=RegionResponse)
async def get_region(body: ZipRequest) -> RegionResponse:
    profile_svc = get_profile_service()
    try:
        region = profile_svc.get_profile_by_zip(body.zip)
    except ZipNotFoundError:
        raise HTTPException(status_code=404, detail=f"ZIP {body.zip!r} not found")
    except ProfileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return get_gemini_service().enrich_region(region)
