"""
Extract biomechanical features from annotated keystroke data.

DEPRECATED: Use services.FeatureService instead.
This module is kept for backward compatibility.
"""

from typing import Dict, List, Optional

from .services.feature_service import FeatureService

# Create a default service instance for backward compatibility
_service = FeatureService()


def extract_transition_features(
    key_from: str,
    key_to: str,
    finger_from: Optional[str] = None,
    finger_to: Optional[str] = None,
    hand_from: Optional[str] = None,
    hand_to: Optional[str] = None
) -> Dict:
    """
    Extract biomechanical features for a key transition.

    DEPRECATED: Use FeatureService.extract_transition_features() instead.
    """
    return _service.extract_transition_features(
        key_from, key_to, finger_from, finger_to, hand_from, hand_to
    )


def compute_session_features(keystrokes: List[Dict]) -> List[Dict]:
    """
    Compute biomechanical features for all transitions in a session.

    DEPRECATED: Use FeatureService.compute_session_features() instead.
    """
    return _service.compute_session_features(keystrokes)


def save_features_to_db(session_id: int, keystrokes: List[Dict], features: List[Dict]):
    """
    Save computed features to the database.

    DEPRECATED: Use FeatureService.compute_and_save_for_session() instead.
    """
    from .db.repositories import FeatureRepository

    repo = FeatureRepository()

    # Add keystroke_id to each feature dict
    features_with_ids = []
    for ks, feat in zip(keystrokes, features):
        if feat is not None:
            feat['keystroke_id'] = ks['id']
            features_with_ids.append(feat)

    repo.save_batch(features_with_ids)
