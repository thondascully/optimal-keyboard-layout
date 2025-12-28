"""
Repository for session-related database operations.
"""

import time
from typing import Dict, List, Optional

from ..connection import DatabaseConnection, get_db


class SessionRepository:
    """
    Repository for session CRUD operations.
    """

    def __init__(self, db: DatabaseConnection = None):
        """
        Initialize repository with database connection.

        Args:
            db: Database connection manager. Uses global instance if not provided.
        """
        self.db = db or get_db()

    def create(self, mode: str, raw_text: str) -> int:
        """
        Create a new session.

        Args:
            mode: Typing mode (top200, trigraphs, etc.)
            raw_text: The text that was typed

        Returns:
            The created session ID
        """
        with self.db.connection() as conn:
            c = conn.cursor()
            c.execute(
                "INSERT INTO sessions (timestamp, mode, raw_text) VALUES (?, ?, ?)",
                (time.time(), mode, raw_text)
            )
            return c.lastrowid

    def get_by_id(self, session_id: int) -> Optional[Dict]:
        """
        Get a session by ID (without keystrokes).

        Args:
            session_id: The session ID

        Returns:
            Session dict or None if not found
        """
        with self.db.cursor() as c:
            c.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
            row = c.fetchone()

            if not row:
                return None

            return {
                "id": row["id"],
                "timestamp": row["timestamp"],
                "mode": row["mode"],
                "raw_text": row["raw_text"],
                "valid": row["valid"],
                "label": row["label"] if "label" in row.keys() else None,
            }

    def get_with_keystrokes(self, session_id: int) -> Optional[Dict]:
        """
        Get a session with all its keystrokes.

        Args:
            session_id: The session ID

        Returns:
            Session dict with keystrokes list, or None if not found
        """
        with self.db.cursor() as c:
            # Get session
            c.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
            session = c.fetchone()

            if not session:
                return None

            # Get keystrokes
            c.execute(
                "SELECT * FROM keystrokes WHERE session_id = ? ORDER BY id",
                (session_id,)
            )
            keystrokes = c.fetchall()

            return {
                "id": session["id"],
                "timestamp": session["timestamp"],
                "mode": session["mode"],
                "raw_text": session["raw_text"],
                "valid": session["valid"],
                "label": session["label"] if "label" in session.keys() else None,
                "keystrokes": [
                    {
                        "id": ks["id"],
                        "key": ks["key_char"],
                        "timestamp": ks["timestamp"],
                        "prev_key": ks["prev_key"],
                        "finger": ks["finger"] if "finger" in ks.keys() else None,
                        "hand": ks["hand"] if "hand" in ks.keys() else None,
                    }
                    for ks in keystrokes
                ]
            }

    def get_all(self, limit: int = None) -> List[Dict]:
        """
        Get all sessions (without keystrokes).

        Args:
            limit: Maximum number of sessions to return

        Returns:
            List of session dicts
        """
        with self.db.cursor() as c:
            if limit:
                c.execute(
                    "SELECT * FROM sessions ORDER BY timestamp DESC LIMIT ?",
                    (limit,)
                )
            else:
                c.execute("SELECT * FROM sessions ORDER BY timestamp DESC")

            return [dict(row) for row in c.fetchall()]

    def update_label(self, session_id: int, label: Optional[str]) -> bool:
        """
        Update the label for a session.

        Args:
            session_id: The session ID
            label: New label value (or None to remove)

        Returns:
            True if updated, False if session not found
        """
        with self.db.connection() as conn:
            c = conn.cursor()
            c.execute(
                "UPDATE sessions SET label = ? WHERE id = ?",
                (label, session_id)
            )
            return c.rowcount > 0

    def delete(self, session_id: int) -> bool:
        """
        Delete a session (keystrokes and features cascade automatically).

        Args:
            session_id: The session ID

        Returns:
            True if deleted, False if not found
        """
        with self.db.connection() as conn:
            c = conn.cursor()
            c.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
            return c.rowcount > 0

    def get_stats(self) -> Dict:
        """
        Get aggregate statistics about sessions and keystrokes.

        Returns:
            Dict with various statistics
        """
        with self.db.cursor() as c:
            # Session count
            c.execute("SELECT COUNT(*) FROM sessions")
            session_count = c.fetchone()[0]

            # Keystroke count
            c.execute("SELECT COUNT(*) FROM keystrokes")
            keystroke_count = c.fetchone()[0]

            # Mode distribution
            c.execute("SELECT mode, COUNT(*) as count FROM sessions GROUP BY mode")
            mode_dist = {row[0]: row[1] for row in c.fetchall()}

            # Total characters
            c.execute("SELECT SUM(LENGTH(raw_text)) FROM sessions")
            total_chars = c.fetchone()[0] or 0

            # Date range
            c.execute("SELECT MIN(timestamp), MAX(timestamp) FROM sessions")
            date_range = c.fetchone()
            first_session_date = date_range[0] if date_range[0] else None
            last_session_date = date_range[1] if date_range[1] else None

            # Averages
            avg_keystrokes = round(keystroke_count / session_count, 1) if session_count > 0 else 0
            avg_chars = round(total_chars / session_count, 1) if session_count > 0 else 0

            # Unique digraphs
            c.execute("""
                SELECT COUNT(DISTINCT prev_key || key_char)
                FROM keystrokes
                WHERE prev_key IS NOT NULL AND prev_key != ''
            """)
            unique_digraphs = c.fetchone()[0] or 0

            # Sessions with features
            c.execute("""
                SELECT COUNT(DISTINCT k.session_id)
                FROM keystroke_features kf
                JOIN keystrokes k ON kf.keystroke_id = k.id
            """)
            sessions_with_features = c.fetchone()[0] or 0

            # Total features
            c.execute("SELECT COUNT(*) FROM keystroke_features")
            total_features = c.fetchone()[0] or 0

            return {
                "total_sessions": session_count,
                "total_keystrokes": keystroke_count,
                "total_characters": total_chars,
                "sessions_by_mode": mode_dist,
                "avg_keystrokes_per_session": avg_keystrokes,
                "avg_characters_per_session": avg_chars,
                "first_session_date": first_session_date,
                "last_session_date": last_session_date,
                "unique_digraphs": unique_digraphs,
                "sessions_with_features": sessions_with_features,
                "total_features": total_features,
            }
