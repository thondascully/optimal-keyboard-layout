"""
Feature service for computing and managing biomechanical features.
"""

from typing import Dict, List, Optional

from ..db.repositories import FeatureRepository
from ..keyboard_layout import (
    euclidean_distance, row_difference, is_inward_roll,
    fitts_law_cost, get_finger, get_hand
)


class FeatureService:
    """
    Service for biomechanical feature computation and management.
    """

    def __init__(self, feature_repo: FeatureRepository = None):
        """
        Initialize service with dependencies.

        Args:
            feature_repo: Feature repository (creates default if not provided)
        """
        self.feature_repo = feature_repo or FeatureRepository()

    def extract_transition_features(
        self,
        key_from: str,
        key_to: str,
        finger_from: Optional[str] = None,
        finger_to: Optional[str] = None,
        hand_from: Optional[str] = None,
        hand_to: Optional[str] = None,
    ) -> Dict:
        """
        Extract biomechanical features for a key transition.

        Args:
            key_from: Starting key
            key_to: Ending key
            finger_from: Finger used for starting key (uses default if None)
            finger_to: Finger used for ending key (uses default if None)
            hand_from: Hand used for starting key (uses default if None)
            hand_to: Hand used for ending key (uses default if None)

        Returns:
            Dict with computed features
        """
        # Use provided annotations or fall back to layout defaults
        if finger_from is None:
            finger_from = get_finger(key_from)
        if finger_to is None:
            finger_to = get_finger(key_to)
        if hand_from is None:
            hand_from = get_hand(key_from)
        if hand_to is None:
            hand_to = get_hand(key_to)

        # Calculate distances
        dist = euclidean_distance(key_from, key_to)
        row_diff = row_difference(key_from, key_to)

        # Categorical features
        same_hand = 1 if hand_from == hand_to else 0
        same_finger = 1 if finger_from == finger_to else 0

        # Direction (only applicable for same-hand transitions)
        inward = 0
        if same_hand == 1:
            inward = 1 if is_inward_roll(key_from, key_to, finger_from, finger_to) else 0

        # Fitts' Law cost
        fitts_cost = fitts_law_cost(dist)

        return {
            'finger_from': finger_from,
            'finger_to': finger_to,
            'same_hand': same_hand,
            'same_finger': same_finger,
            'euclidean_distance': dist,
            'row_difference': row_diff,
            'is_inward': inward,
            'fitts_law_cost': fitts_cost,
        }

    def compute_session_features(self, keystrokes: List[Dict]) -> List[Optional[Dict]]:
        """
        Compute biomechanical features for all transitions in a session.

        Args:
            keystrokes: List of keystroke dicts with 'key', 'prev_key', 'finger', 'hand'

        Returns:
            List of feature dicts (None for first keystroke which has no transition)
        """
        features = []

        for i, ks in enumerate(keystrokes):
            if i == 0 or not ks.get('prev_key'):
                features.append(None)
                continue

            prev_ks = keystrokes[i - 1]

            feature_dict = self.extract_transition_features(
                key_from=prev_ks['key'],
                key_to=ks['key'],
                finger_from=prev_ks.get('finger'),
                finger_to=ks.get('finger'),
                hand_from=prev_ks.get('hand'),
                hand_to=ks.get('hand'),
            )

            features.append(feature_dict)

        return features

    def compute_and_save_for_session(
        self,
        session_id: int,
        keystrokes: List[Dict],
    ) -> int:
        """
        Compute and save features for a session's keystrokes.

        Args:
            session_id: The session ID
            keystrokes: List of keystroke dicts

        Returns:
            Number of features saved
        """
        features = self.compute_session_features(keystrokes)

        # Add keystroke_id to each feature dict
        features_with_ids = []
        for ks, feat in zip(keystrokes, features):
            if feat is not None:
                feat['keystroke_id'] = ks['id']
                features_with_ids.append(feat)

        return self.feature_repo.save_batch(features_with_ids)

    def check_annotations_complete(self, keystrokes: List[Dict]) -> List[int]:
        """
        Check if all keystrokes have finger/hand annotations.

        Args:
            keystrokes: List of keystroke dicts

        Returns:
            List of indices that are missing annotations (empty if all complete)
        """
        missing = []
        for i, ks in enumerate(keystrokes):
            if not ks.get('finger') or not ks.get('hand'):
                missing.append(i)
        return missing
