from __future__ import annotations

from fastapi import APIRouter, HTTPException

from schemas.region import RegionResponse, ZipRequest
from services.profile_service import ProfileNotFoundError, ZipNotFoundError, get_profile_service

router = APIRouter()


@router.post("/api/region", response_model=RegionResponse)
async def get_region(body: ZipRequest) -> RegionResponse:
    svc = get_profile_service()
    try:
        return svc.get_profile_by_zip(body.zip)
    except ZipNotFoundError:
        raise HTTPException(status_code=404, detail=f"ZIP {body.zip!r} not found")
    except ProfileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
