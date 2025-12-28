"""
Database operations module.

This module provides backward-compatible functions that delegate to the new
repository layer. New code should use the repositories directly.

DEPRECATED: Import from db.repositories instead.
"""

import time
from typing import List, Dict, Optional

from .db.connection import DatabaseConnection, get_db
from .db.schema import init_schema
from .db.repositories import SessionRepository, KeystrokeRepository, FeatureRepository

# Legacy constant for backward compatibility
DB_FILE = "data/typing_data.db"


def get_connection():
    """
    Get a database connection.

    DEPRECATED: Use DatabaseConnection context manager instead.
    """
    db = get_db()
    conn = db._create_connection()
    return conn


def init_db():
    """Initialize the database with required tables."""
    init_schema()
    print("Database initialized")


def save_session(mode: str, raw_text: str, keystrokes: List[Dict]) -> int:
    """
    Save a typing session and its keystrokes to the database.
    Returns the session_id.
    """
    session_repo = SessionRepository()
    keystroke_repo = KeystrokeRepository()

    # Create session and keystrokes in a single transaction
    db = get_db()
    with db.connection() as conn:
        c = conn.cursor()

        # Create session
        c.execute(
            "INSERT INTO sessions (timestamp, mode, raw_text) VALUES (?, ?, ?)",
            (time.time(), mode, raw_text)
        )
        session_id = c.lastrowid

        # Create keystrokes
        for ks in keystrokes:
            c.execute(
                """INSERT INTO keystrokes
                   (session_id, key_char, timestamp, prev_key, finger, hand)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    session_id,
                    ks['key'],
                    ks['timestamp'],
                    ks.get('prev_key'),
                    ks.get('finger'),
                    ks.get('hand'),
                )
            )

        return session_id


def get_session(session_id: int) -> Optional[Dict]:
    """Retrieve a session and its keystrokes by ID."""
    return SessionRepository().get_with_keystrokes(session_id)


def get_all_sessions() -> List[Dict]:
    """Retrieve all sessions (without keystrokes)."""
    return SessionRepository().get_all()


def update_keystroke_finger(keystroke_id: int, finger: str, hand: str) -> bool:
    """Update the finger and hand annotation for a keystroke."""
    return KeystrokeRepository().update_finger(keystroke_id, finger, hand)


def update_session_fingers(session_id: int, finger_annotations: List[Dict]) -> bool:
    """Update finger annotations for multiple keystrokes in a session."""
    KeystrokeRepository().update_fingers_batch(session_id, finger_annotations)
    return True


def get_stats() -> Dict:
    """Get database statistics."""
    return SessionRepository().get_stats()


def delete_session_db(session_id: int) -> bool:
    """Delete a session and its keystrokes (cascades to features)."""
    return SessionRepository().delete(session_id)


def delete_keystroke_db(keystroke_id: int) -> bool:
    """Delete a keystroke and cascade delete to features."""
    return KeystrokeRepository().delete(keystroke_id)


def get_all_keystrokes_data(limit: int = 1000, offset: int = 0) -> Dict:
    """Get all keystrokes with their finger, hand, and session information."""
    return KeystrokeRepository().get_all_with_session_info(limit, offset)


def update_session_label(session_id: int, label: str) -> bool:
    """Update the label for a session."""
    return SessionRepository().update_label(session_id, label)


def get_database_path() -> str:
    """Get the database file path."""
    return get_db().get_path()


def get_digraph_details(pattern: str) -> Dict:
    """Get detailed information about a specific digraph."""
    return KeystrokeRepository().get_digraph_details(pattern)
