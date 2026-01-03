"""
Repository for keystroke-related database operations.
"""

from typing import Dict, List, Optional

from ..connection import DatabaseConnection, get_db
from ...keyboard_layout import (
    FINGER_ASSIGNMENTS,
    OVERWRITABLE_LETTERS,
    get_finger,
    get_hand,
)


class KeystrokeRepository:
    """
    Repository for keystroke CRUD operations.
    """

    def __init__(self, db: DatabaseConnection = None):
        """
        Initialize repository with database connection.

        Args:
            db: Database connection manager. Uses global instance if not provided.
        """
        self.db = db or get_db()

    def create_batch(self, session_id: int, keystrokes: List[Dict]) -> int:
        """
        Create multiple keystrokes for a session.

        For non-overwritable letters, automatically assigns default finger/hand
        from FINGER_ASSIGNMENTS. Overwritable letters (e, b, u, i, y) use the
        finger/hand provided by the frontend.

        Args:
            session_id: The session ID
            keystrokes: List of keystroke dicts with 'key', 'timestamp', 'prev_key'

        Returns:
            Number of keystrokes created
        """
        with self.db.connection() as conn:
            c = conn.cursor()
            for ks in keystrokes:
                key_char = ks['key']
                key_lower = key_char.lower()

                # For non-overwritable letters, use default finger assignments
                # For overwritable letters, use what frontend provides
                if key_lower not in OVERWRITABLE_LETTERS:
                    finger = get_finger(key_char)
                    hand = get_hand(key_char)
                else:
                    finger = ks.get('finger')
                    hand = ks.get('hand')

                c.execute(
                    """INSERT INTO keystrokes
                       (session_id, key_char, timestamp, prev_key, finger, hand, current_word)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        session_id,
                        key_char,
                        ks['timestamp'],
                        ks.get('prev_key'),
                        finger,
                        hand,
                        ks.get('current_word'),
                    )
                )
            return len(keystrokes)

    def get_by_session(self, session_id: int) -> List[Dict]:
        """
        Get all keystrokes for a session.

        Args:
            session_id: The session ID

        Returns:
            List of keystroke dicts
        """
        with self.db.cursor() as c:
            c.execute(
                "SELECT * FROM keystrokes WHERE session_id = ? ORDER BY id",
                (session_id,)
            )
            return [
                {
                    "id": row["id"],
                    "session_id": row["session_id"],
                    "key": row["key_char"],
                    "timestamp": row["timestamp"],
                    "prev_key": row["prev_key"],
                    "finger": row["finger"],
                    "hand": row["hand"],
                    "current_word": row["current_word"] if "current_word" in row.keys() else None,
                }
                for row in c.fetchall()
            ]

    def update_finger(self, keystroke_id: int, finger: str, hand: str) -> bool:
        """
        Update finger and hand annotation for a single keystroke.

        Args:
            keystroke_id: The keystroke ID
            finger: Finger name (e.g., 'left_index')
            hand: Hand name ('left' or 'right')

        Returns:
            True if updated, False if not found
        """
        with self.db.connection() as conn:
            c = conn.cursor()
            c.execute(
                "UPDATE keystrokes SET finger = ?, hand = ? WHERE id = ?",
                (finger, hand, keystroke_id)
            )
            return c.rowcount > 0

    def update_fingers_batch(self, session_id: int, annotations: List[Dict]) -> int:
        """
        Update finger annotations for multiple keystrokes in a session.

        Args:
            session_id: The session ID
            annotations: List of dicts with 'keystroke_id', 'finger', 'hand'

        Returns:
            Number of keystrokes updated
        """
        updated = 0
        with self.db.connection() as conn:
            c = conn.cursor()
            for ann in annotations:
                c.execute(
                    "UPDATE keystrokes SET finger = ?, hand = ? WHERE id = ? AND session_id = ?",
                    (ann['finger'], ann['hand'], ann['keystroke_id'], session_id)
                )
                updated += c.rowcount
        return updated

    def delete(self, keystroke_id: int) -> bool:
        """
        Delete a keystroke (features cascade automatically).
        Sets prev_key of next keystroke to NULL to create a breakpoint.

        Args:
            keystroke_id: The keystroke ID

        Returns:
            True if deleted, False if not found
        """
        with self.db.connection() as conn:
            c = conn.cursor()

            # Get the keystroke we're about to delete
            c.execute(
                "SELECT session_id, timestamp FROM keystrokes WHERE id = ?",
                (keystroke_id,)
            )
            deleted_ks = c.fetchone()

            if not deleted_ks:
                return False

            session_id = deleted_ks['session_id']
            deleted_timestamp = deleted_ks['timestamp']

            # Find the next keystroke in the same session
            c.execute(
                """SELECT id FROM keystrokes
                   WHERE session_id = ? AND timestamp > ?
                   ORDER BY timestamp ASC LIMIT 1""",
                (session_id, deleted_timestamp)
            )
            next_ks = c.fetchone()

            # Delete the keystroke (features cascade automatically due to FK)
            c.execute("DELETE FROM keystrokes WHERE id = ?", (keystroke_id,))

            # Update next keystroke's prev_key to NULL to create breakpoint
            if next_ks:
                c.execute(
                    "UPDATE keystrokes SET prev_key = NULL WHERE id = ?",
                    (next_ks['id'],)
                )

            return True

    def get_all_with_session_info(
        self, limit: int = 1000, offset: int = 0
    ) -> Dict:
        """
        Get all keystrokes with session info for data viewing.

        Args:
            limit: Maximum number to return
            offset: Number to skip

        Returns:
            Dict with keystrokes list and statistics
        """
        with self.db.cursor() as c:
            # Total count
            c.execute("SELECT COUNT(*) FROM keystrokes")
            total_count = c.fetchone()[0]

            # Keystrokes with session info
            c.execute(
                """SELECT
                    k.id, k.key_char, k.timestamp, k.prev_key,
                    k.finger, k.hand, k.session_id,
                    s.mode, s.timestamp as session_timestamp
                FROM keystrokes k
                JOIN sessions s ON k.session_id = s.id
                ORDER BY k.id
                LIMIT ? OFFSET ?""",
                (limit, offset)
            )

            keystrokes = [
                {
                    "id": row["id"],
                    "key": row["key_char"],
                    "timestamp": row["timestamp"],
                    "prev_key": row["prev_key"],
                    "finger": row["finger"],
                    "hand": row["hand"],
                    "session_id": row["session_id"],
                    "mode": row["mode"],
                    "session_timestamp": row["session_timestamp"],
                }
                for row in c.fetchall()
            ]

            # Statistics by finger
            c.execute("""
                SELECT finger, COUNT(*) as count
                FROM keystrokes
                WHERE finger IS NOT NULL
                GROUP BY finger
                ORDER BY count DESC
            """)
            by_finger = {row["finger"]: row["count"] for row in c.fetchall()}

            # Statistics by hand
            c.execute("""
                SELECT hand, COUNT(*) as count
                FROM keystrokes
                WHERE hand IS NOT NULL
                GROUP BY hand
                ORDER BY count DESC
            """)
            by_hand = {row["hand"]: row["count"] for row in c.fetchall()}

            # Statistics by key
            c.execute("""
                SELECT key_char, COUNT(*) as count
                FROM keystrokes
                GROUP BY key_char
                ORDER BY count DESC
            """)
            by_key = {row["key_char"]: row["count"] for row in c.fetchall()}

            return {
                "total_count": total_count,
                "keystrokes": keystrokes,
                "statistics": {
                    "by_finger": by_finger,
                    "by_hand": by_hand,
                    "by_key": by_key,
                },
            }

    def get_digraph_details(self, pattern: str) -> Dict:
        """
        Get detailed information about a specific digraph.

        Args:
            pattern: Two-character digraph (e.g., 'th')

        Returns:
            Dict with pattern info, words, distribution
        """
        if len(pattern) != 2:
            raise ValueError("Digraph pattern must be exactly 2 characters")

        with self.db.cursor() as c:
            # Find all occurrences of this digraph
            c.execute(
                """SELECT k1.key_char, k2.key_char, k1.timestamp, k2.timestamp,
                          s.raw_text, k1.session_id
                   FROM keystrokes k1
                   JOIN keystrokes k2 ON k2.session_id = k1.session_id
                       AND k2.id = (
                           SELECT MIN(id) FROM keystrokes
                           WHERE session_id = k1.session_id AND id > k1.id
                       )
                   JOIN sessions s ON k1.session_id = s.id
                   WHERE k1.key_char = ? AND k2.key_char = ?
                   ORDER BY k1.timestamp""",
                (pattern[0], pattern[1])
            )

            occurrences = c.fetchall()

            if not occurrences:
                return {
                    "pattern": pattern,
                    "words": [],
                    "distribution": None,
                    "occurrences": 0,
                }

            # Extract words and times
            words = set()
            times = []

            for row in occurrences:
                text = row[4]
                for word in text.split():
                    if pattern in word.lower():
                        words.add(word)

                duration = row[3] - row[2]
                if 0 < duration < 5000:  # Filter outliers
                    times.append(duration)

            # Create distribution bins
            distribution = self._create_distribution(times)

            return {
                "pattern": pattern,
                "words": list(words)[:50],
                "distribution": distribution,
                "occurrences": len(occurrences),
            }

    def get_trigraph_details(self, pattern: str) -> Dict:
        """
        Get detailed information about a specific trigraph.

        Args:
            pattern: Three-character trigraph (e.g., 'the')

        Returns:
            Dict with pattern info, words, distribution, raw_times
        """
        if len(pattern) != 3:
            raise ValueError("Trigraph pattern must be exactly 3 characters")

        from statistics import median

        with self.db.cursor() as c:
            # Find all occurrences of this trigraph (3 consecutive keystrokes)
            c.execute(
                """SELECT k1.key_char, k2.key_char, k3.key_char,
                          k1.timestamp, k3.timestamp,
                          s.raw_text, k1.session_id
                   FROM keystrokes k1
                   JOIN keystrokes k2 ON k2.session_id = k1.session_id
                       AND k2.id = (
                           SELECT MIN(id) FROM keystrokes
                           WHERE session_id = k1.session_id AND id > k1.id
                       )
                   JOIN keystrokes k3 ON k3.session_id = k1.session_id
                       AND k3.id = (
                           SELECT MIN(id) FROM keystrokes
                           WHERE session_id = k1.session_id AND id > k2.id
                       )
                   JOIN sessions s ON k1.session_id = s.id
                   WHERE k1.key_char = ? AND k2.key_char = ? AND k3.key_char = ?
                   ORDER BY k1.timestamp""",
                (pattern[0], pattern[1], pattern[2])
            )

            occurrences = c.fetchall()

            if not occurrences:
                return {
                    "pattern": pattern,
                    "words": [],
                    "distribution": None,
                    "raw_times": [],
                    "avg_time": 0,
                    "threshold_low": None,
                    "threshold_high": None,
                    "occurrences": 0,
                }

            # Extract words and times
            words = set()
            times = []

            for row in occurrences:
                text = row[5]
                for word in text.split():
                    if pattern in word.lower():
                        words.add(word)

                duration = row[4] - row[3]  # k3.timestamp - k1.timestamp
                if 0 < duration < 5000:  # Filter outliers
                    times.append(duration)

            # Calculate MAD thresholds
            threshold_low = None
            threshold_high = None
            if len(times) >= 3:
                med = median(times)
                deviations = [abs(t - med) for t in times]
                mad = median(deviations)
                if mad > 0:
                    threshold_low = med - 3 * mad
                    threshold_high = med + 3 * mad

            # Create distribution bins
            distribution = self._create_distribution(times)

            avg_time = sum(times) / len(times) if times else 0

            return {
                "pattern": pattern,
                "words": list(words)[:50],
                "distribution": distribution,
                "raw_times": sorted(times),
                "avg_time": round(avg_time, 1),
                "threshold_low": round(threshold_low, 1) if threshold_low else None,
                "threshold_high": round(threshold_high, 1) if threshold_high else None,
                "occurrences": len(occurrences),
            }

    def _create_distribution(self, times: List[float]) -> Optional[Dict]:
        """Create histogram distribution from timing data."""
        if not times:
            return None

        min_time = min(times)
        max_time = max(times)

        if max_time == min_time:
            return {
                "labels": [f"{min_time:.1f}ms"],
                "values": [len(times)],
            }

        bin_count = 10
        bin_size = (max_time - min_time) / bin_count
        bins = [0] * bin_count
        labels = []

        for i in range(bin_count):
            bin_start = min_time + i * bin_size
            bin_end = min_time + (i + 1) * bin_size

            if bin_size < 0.1:
                labels.append(f"{bin_start:.2f}-{bin_end:.2f}ms")
            elif bin_size < 1:
                labels.append(f"{bin_start:.1f}-{bin_end:.1f}ms")
            else:
                labels.append(f"{bin_start:.0f}-{bin_end:.0f}ms")

        for time_val in times:
            bin_idx = min(int((time_val - min_time) / bin_size), bin_count - 1)
            bins[bin_idx] += 1

        return {
            "labels": labels,
            "values": bins,
        }
