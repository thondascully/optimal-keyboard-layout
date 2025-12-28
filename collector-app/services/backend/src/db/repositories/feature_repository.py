"""
Repository for keystroke feature database operations.
"""

from typing import Dict, List, Optional

from ..connection import DatabaseConnection, get_db


class FeatureRepository:
    """
    Repository for keystroke feature CRUD operations.
    """

    def __init__(self, db: DatabaseConnection = None):
        """
        Initialize repository with database connection.

        Args:
            db: Database connection manager. Uses global instance if not provided.
        """
        self.db = db or get_db()

    def save_batch(self, keystroke_features: List[Dict]) -> int:
        """
        Save or update features for multiple keystrokes.

        Args:
            keystroke_features: List of dicts with 'keystroke_id' and feature fields

        Returns:
            Number of features saved/updated
        """
        saved = 0
        with self.db.connection() as conn:
            c = conn.cursor()

            for feat in keystroke_features:
                if feat is None:
                    continue

                keystroke_id = feat['keystroke_id']

                # Check if features already exist
                c.execute(
                    "SELECT id FROM keystroke_features WHERE keystroke_id = ?",
                    (keystroke_id,)
                )
                existing = c.fetchone()

                if existing:
                    # Update existing
                    c.execute(
                        """UPDATE keystroke_features
                           SET finger_from = ?, finger_to = ?,
                               same_hand = ?, same_finger = ?,
                               euclidean_distance = ?, row_difference = ?,
                               is_inward = ?, fitts_law_cost = ?
                           WHERE keystroke_id = ?""",
                        (
                            feat['finger_from'], feat['finger_to'],
                            feat['same_hand'], feat['same_finger'],
                            feat['euclidean_distance'], feat['row_difference'],
                            feat['is_inward'], feat['fitts_law_cost'],
                            keystroke_id,
                        )
                    )
                else:
                    # Insert new
                    c.execute(
                        """INSERT INTO keystroke_features
                           (keystroke_id, finger_from, finger_to,
                            same_hand, same_finger, euclidean_distance,
                            row_difference, is_inward, fitts_law_cost)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            keystroke_id,
                            feat['finger_from'], feat['finger_to'],
                            feat['same_hand'], feat['same_finger'],
                            feat['euclidean_distance'], feat['row_difference'],
                            feat['is_inward'], feat['fitts_law_cost'],
                        )
                    )
                saved += 1

        return saved

    def get_by_keystroke(self, keystroke_id: int) -> Optional[Dict]:
        """
        Get features for a specific keystroke.

        Args:
            keystroke_id: The keystroke ID

        Returns:
            Feature dict or None if not found
        """
        with self.db.cursor() as c:
            c.execute(
                "SELECT * FROM keystroke_features WHERE keystroke_id = ?",
                (keystroke_id,)
            )
            row = c.fetchone()

            if not row:
                return None

            return dict(row)

    def get_by_session(self, session_id: int) -> List[Dict]:
        """
        Get all features for keystrokes in a session.

        Args:
            session_id: The session ID

        Returns:
            List of feature dicts
        """
        with self.db.cursor() as c:
            c.execute(
                """SELECT kf.*
                   FROM keystroke_features kf
                   JOIN keystrokes k ON kf.keystroke_id = k.id
                   WHERE k.session_id = ?
                   ORDER BY k.id""",
                (session_id,)
            )
            return [dict(row) for row in c.fetchall()]

    def delete_by_keystroke(self, keystroke_id: int) -> bool:
        """
        Delete features for a keystroke.

        Args:
            keystroke_id: The keystroke ID

        Returns:
            True if deleted, False if not found
        """
        with self.db.connection() as conn:
            c = conn.cursor()
            c.execute(
                "DELETE FROM keystroke_features WHERE keystroke_id = ?",
                (keystroke_id,)
            )
            return c.rowcount > 0

    def delete_by_session(self, session_id: int) -> int:
        """
        Delete all features for keystrokes in a session.

        Args:
            session_id: The session ID

        Returns:
            Number of features deleted
        """
        with self.db.connection() as conn:
            c = conn.cursor()
            c.execute(
                """DELETE FROM keystroke_features
                   WHERE keystroke_id IN (
                       SELECT id FROM keystrokes WHERE session_id = ?
                   )""",
                (session_id,)
            )
            return c.rowcount
