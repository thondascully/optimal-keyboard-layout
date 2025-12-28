"""
Database schema definitions and initialization.
"""

from .connection import DatabaseConnection, get_db


# Schema version for future migrations
SCHEMA_VERSION = 1


def init_schema(db: DatabaseConnection = None) -> None:
    """
    Initialize the database schema with all required tables.

    Args:
        db: Database connection manager. Uses global instance if not provided.
    """
    db = db or get_db()

    with db.connection() as conn:
        c = conn.cursor()

        # Sessions table
        c.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                mode TEXT NOT NULL,
                raw_text TEXT NOT NULL,
                valid INTEGER DEFAULT 1,
                label TEXT
            )
        ''')

        # Keystrokes table with foreign key constraint
        c.execute('''
            CREATE TABLE IF NOT EXISTS keystrokes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                key_char TEXT NOT NULL,
                timestamp REAL NOT NULL,
                prev_key TEXT,
                finger TEXT,
                hand TEXT,
                FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )
        ''')

        # Keystroke features table with foreign key constraint
        c.execute('''
            CREATE TABLE IF NOT EXISTS keystroke_features (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                keystroke_id INTEGER NOT NULL,
                finger_from TEXT,
                finger_to TEXT,
                same_hand INTEGER,
                same_finger INTEGER,
                euclidean_distance REAL,
                row_difference INTEGER,
                is_inward INTEGER,
                fitts_law_cost REAL,
                FOREIGN KEY(keystroke_id) REFERENCES keystrokes(id) ON DELETE CASCADE
            )
        ''')

        # Indexes for common queries
        c.execute('''
            CREATE INDEX IF NOT EXISTS idx_session_timestamp
            ON sessions(timestamp)
        ''')

        c.execute('''
            CREATE INDEX IF NOT EXISTS idx_keystroke_session
            ON keystrokes(session_id)
        ''')

        c.execute('''
            CREATE INDEX IF NOT EXISTS idx_keystroke_features
            ON keystroke_features(keystroke_id)
        ''')

        # Run migrations for existing databases
        _run_migrations(c)


def _run_migrations(cursor) -> None:
    """
    Run migrations for existing databases that may be missing columns.
    """
    # Check keystrokes columns
    cursor.execute("PRAGMA table_info(keystrokes)")
    keystroke_columns = {row[1] for row in cursor.fetchall()}

    if 'finger' not in keystroke_columns:
        cursor.execute("ALTER TABLE keystrokes ADD COLUMN finger TEXT")

    if 'hand' not in keystroke_columns:
        cursor.execute("ALTER TABLE keystrokes ADD COLUMN hand TEXT")

    if 'current_word' not in keystroke_columns:
        cursor.execute("ALTER TABLE keystrokes ADD COLUMN current_word TEXT")

    # Check sessions columns
    cursor.execute("PRAGMA table_info(sessions)")
    session_columns = {row[1] for row in cursor.fetchall()}

    if 'label' not in session_columns:
        cursor.execute("ALTER TABLE sessions ADD COLUMN label TEXT")
