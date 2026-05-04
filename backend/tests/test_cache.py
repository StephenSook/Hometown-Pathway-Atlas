"""Tests for NarrativeCache — no network calls."""
import time
import pytest
from services.cache import NarrativeCache


@pytest.fixture
def cache() -> NarrativeCache:
    return NarrativeCache(ttl_seconds=1)  # short TTL for testing


def test_miss_on_empty_cache(cache: NarrativeCache) -> None:
    assert cache.get("12345", "region") is None


def test_set_and_get(cache: NarrativeCache) -> None:
    cache.set("12345", "region", {"narrative": "hello"})
    result = cache.get("12345", "region")
    assert result == {"narrative": "hello"}


def test_different_kinds_are_independent(cache: NarrativeCache) -> None:
    cache.set("12345", "region", {"narrative": "region"})
    cache.set("12345", "analogs", {"tradeoff_explanation": "analogs"})
    assert cache.get("12345", "region") == {"narrative": "region"}
    assert cache.get("12345", "analogs") == {"tradeoff_explanation": "analogs"}


def test_different_fips_are_independent(cache: NarrativeCache) -> None:
    cache.set("12345", "region", {"narrative": "A"})
    cache.set("99999", "region", {"narrative": "B"})
    assert cache.get("12345", "region") == {"narrative": "A"}
    assert cache.get("99999", "region") == {"narrative": "B"}


def test_ttl_expiry(cache: NarrativeCache) -> None:
    cache.set("12345", "region", {"narrative": "hello"})
    time.sleep(1.1)
    assert cache.get("12345", "region") is None


def test_invalidate(cache: NarrativeCache) -> None:
    cache.set("12345", "region", {"narrative": "hello"})
    cache.invalidate("12345", "region")
    assert cache.get("12345", "region") is None


def test_invalidate_nonexistent_is_safe(cache: NarrativeCache) -> None:
    cache.invalidate("00000", "region")  # should not raise


def test_size_after_operations(cache: NarrativeCache) -> None:
    cache.set("11111", "region", {})
    cache.set("22222", "region", {})
    assert cache.size() == 2
    cache.invalidate("11111", "region")
    assert cache.size() == 1
