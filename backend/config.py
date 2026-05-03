from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # GCP / Vertex AI
    gcp_project: str = os.getenv("GOOGLE_CLOUD_PROJECT", "pathway-atlas-hackathon")
    gcp_location: str = "us-central1"
    gemini_model: str = "gemini-2.5-flash"

    # Data paths (resolved relative to this file's directory at import time)
    data_dir: Path = Path(__file__).parent / "data" / "processed"

    @property
    def county_profiles_path(self) -> Path:
        return self.data_dir / "county_profiles.parquet"

    @property
    def similarity_matrix_path(self) -> Path:
        return self.data_dir / "similarity_matrix.parquet"

    @property
    def zip_crosswalk_path(self) -> Path:
        return self.data_dir / "zip_county_crosswalk.parquet"

    # CORS
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
