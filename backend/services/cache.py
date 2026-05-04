"""FIPS-keyed in-memory narrative cache with TTL and schema version guard."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

# Bump this whenever a response schema field is added/removed/renamed so stale
# cached objects are automatically evicted rather than causing downstream errors.
_CACHE_SCHEMA_VERSION = 1


class NarrativeCache:
    """In-memory cache keyed by (fips, kind). kind is 'region' or 'analogs'.
    TTL defaults to 86400s (24 hours) — adequate for container lifetime.
    """

    def __init__(self, ttl_seconds: int = 86_400) -> None:
        self._ttl = ttl_seconds
        self._store: dict[tuple[str, str], tuple[Any, float, int]] = {}

    def _now(self) -> float:
        return datetime.now(timezone.utc).timestamp()

    def get(self, fips: str, kind: str) -> Any | None:
        key = (fips, kind)
        if key not in self._store:
            return None
        value, expires_at, version = self._store[key]
        if self._now() > expires_at:
            del self._store[key]
            return None
        if version != _CACHE_SCHEMA_VERSION:
            logger.info("Cache entry %s/%s has stale schema version %d, evicting", fips, kind, version)
            del self._store[key]
            return None
        return value

    def set(self, fips: str, kind: str, value: Any) -> None:
        self._store[(fips, kind)] = (value, self._now() + self._ttl, _CACHE_SCHEMA_VERSION)

    def invalidate(self, fips: str, kind: str) -> None:
        self._store.pop((fips, kind), None)

    def size(self) -> int:
        now = self._now()
        expired = [k for k, (_, exp, _v) in self._store.items() if now > exp]
        for k in expired:
            del self._store[k]
        return len(self._store)


_cache = NarrativeCache()


def get_narrative_cache() -> NarrativeCache:
    return _cache
