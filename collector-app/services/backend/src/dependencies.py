"""
Dependency injection for FastAPI endpoints.

This module provides factory functions for services and repositories,
enabling easy dependency injection and testing.
"""

from functools import lru_cache

from .db.connection import DatabaseConnection, get_db
from .db.repositories import SessionRepository, KeystrokeRepository, FeatureRepository
from .services import SessionService, PatternService, FeatureService


# Repository factories
def get_session_repository() -> SessionRepository:
    """Get session repository instance."""
    return SessionRepository(get_db())


def get_keystroke_repository() -> KeystrokeRepository:
    """Get keystroke repository instance."""
    return KeystrokeRepository(get_db())


def get_feature_repository() -> FeatureRepository:
    """Get feature repository instance."""
    return FeatureRepository(get_db())


# Service factories
def get_feature_service() -> FeatureService:
    """Get feature service instance."""
    return FeatureService(get_feature_repository())


def get_session_service() -> SessionService:
    """Get session service instance."""
    return SessionService(
        session_repo=get_session_repository(),
        keystroke_repo=get_keystroke_repository(),
        feature_service=get_feature_service(),
    )


def get_pattern_service() -> PatternService:
    """Get pattern service instance."""
    return PatternService()
