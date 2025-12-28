"""
Session service for business logic around typing sessions.
"""

from typing import Dict, List, Optional

from ..db.repositories import SessionRepository, KeystrokeRepository
from .feature_service import FeatureService


class SessionService:
    """
    Service for session-related business logic.

    Coordinates operations across repositories and other services.
    """

    def __init__(
        self,
        session_repo: SessionRepository = None,
        keystroke_repo: KeystrokeRepository = None,
        feature_service: 'FeatureService' = None,
    ):
        """
        Initialize service with dependencies.

        Args:
            session_repo: Session repository (creates default if not provided)
            keystroke_repo: Keystroke repository (creates default if not provided)
            feature_service: Feature service (creates default if not provided)
        """
        self.session_repo = session_repo or SessionRepository()
        self.keystroke_repo = keystroke_repo or KeystrokeRepository()
        self.feature_service = feature_service or FeatureService()

    def create_session(
        self,
        mode: str,
        raw_text: str,
        keystrokes: List[Dict],
    ) -> int:
        """
        Create a new typing session with keystrokes.

        Args:
            mode: Typing mode (top200, trigraphs, etc.)
            raw_text: The text that was typed
            keystrokes: List of keystroke dicts

        Returns:
            The created session ID
        """
        # Import here to use the transaction in database.py
        from ..database import save_session
        return save_session(mode, raw_text, keystrokes)

    def get_session(self, session_id: int) -> Optional[Dict]:
        """
        Get a session with its keystrokes.

        Args:
            session_id: The session ID

        Returns:
            Session dict with keystrokes, or None if not found
        """
        return self.session_repo.get_with_keystrokes(session_id)

    def get_all_sessions(self, limit: int = None) -> List[Dict]:
        """
        Get all sessions (without keystrokes).

        Args:
            limit: Maximum number to return

        Returns:
            List of session dicts
        """
        return self.session_repo.get_all(limit)

    def delete_session(self, session_id: int) -> bool:
        """
        Delete a session and all associated data.

        Args:
            session_id: The session ID

        Returns:
            True if deleted, False if not found
        """
        return self.session_repo.delete(session_id)

    def update_label(self, session_id: int, label: Optional[str]) -> bool:
        """
        Update the label for a session.

        Args:
            session_id: The session ID
            label: New label (or None to remove)

        Returns:
            True if updated, False if not found
        """
        return self.session_repo.update_label(session_id, label)

    def update_finger_annotations(
        self,
        session_id: int,
        annotations: List[Dict],
        compute_features: bool = True,
    ) -> Dict:
        """
        Update finger annotations for keystrokes in a session.

        This is the decoupled version of the old /update_fingers endpoint.
        Optionally computes biomechanical features after updating.

        Args:
            session_id: The session ID
            annotations: List of dicts with 'keystroke_id', 'finger', 'hand'
            compute_features: Whether to compute features after updating

        Returns:
            Dict with update status and counts
        """
        # Update annotations
        updated_count = self.keystroke_repo.update_fingers_batch(
            session_id, annotations
        )

        result = {
            "status": "updated",
            "session_id": session_id,
            "annotations_count": updated_count,
        }

        # Optionally compute features
        if compute_features:
            session = self.session_repo.get_with_keystrokes(session_id)
            if session:
                features_count = self.feature_service.compute_and_save_for_session(
                    session_id, session['keystrokes']
                )
                result["features_count"] = features_count

        return result

    def get_stats(self) -> Dict:
        """
        Get aggregate statistics about sessions and keystrokes.

        Returns:
            Dict with various statistics
        """
        return self.session_repo.get_stats()
