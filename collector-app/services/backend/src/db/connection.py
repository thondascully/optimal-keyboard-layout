"""
Database connection management with context manager for automatic cleanup.
"""

import sqlite3
import os
from contextlib import contextmanager
from typing import Generator

# Default database path - can be overridden via environment variable
DEFAULT_DB_PATH = "data/typing_data.db"


class DatabaseConnection:
    """
    Database connection manager with context manager support.

    Usage:
        db = DatabaseConnection()
        with db.connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sessions")
    """

    def __init__(self, db_path: str = None):
        """
        Initialize database connection manager.

        Args:
            db_path: Path to SQLite database file. Defaults to DATA_DIR/typing_data.db
        """
        self.db_path = db_path or os.environ.get('DATABASE_PATH', DEFAULT_DB_PATH)
        self._ensure_directory()

    def _ensure_directory(self) -> None:
        """Ensure the database directory exists."""
        db_dir = os.path.dirname(self.db_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)

    def _create_connection(self) -> sqlite3.Connection:
        """Create a new database connection with standard settings."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        # Enable foreign key support
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    @contextmanager
    def connection(self) -> Generator[sqlite3.Connection, None, None]:
        """
        Context manager for database connections with automatic commit/rollback.

        Usage:
            with db.connection() as conn:
                cursor = conn.cursor()
                cursor.execute("INSERT INTO ...")
                # Auto-commits on success, auto-rollback on exception
        """
        conn = self._create_connection()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    @contextmanager
    def cursor(self) -> Generator[sqlite3.Cursor, None, None]:
        """
        Context manager that provides a cursor directly.

        Usage:
            with db.cursor() as c:
                c.execute("SELECT * FROM sessions")
                results = c.fetchall()
        """
        with self.connection() as conn:
            yield conn.cursor()

    def get_path(self) -> str:
        """Get the database file path."""
        return self.db_path


# Global database instance
_db_instance: DatabaseConnection = None


def get_db() -> DatabaseConnection:
    """
    Get the global database connection manager.
    Creates one if it doesn't exist.
    """
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseConnection()
    return _db_instance


def set_db(db: DatabaseConnection) -> None:
    """
    Set the global database connection manager.
    Useful for testing with a different database.
    """
    global _db_instance
    _db_instance = db
