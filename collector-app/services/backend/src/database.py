import sqlite3
import time
from typing import List, Dict, Optional

DB_FILE = "data/typing_data.db"

def get_connection():
    """Get a database connection."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with required tables."""
    conn = get_connection()
    c = conn.cursor()
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            mode TEXT NOT NULL,
            raw_text TEXT NOT NULL,
            valid INTEGER DEFAULT 1
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS keystrokes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            key_char TEXT NOT NULL,
            timestamp REAL NOT NULL,
            prev_key TEXT,
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        )
    ''')
    
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_session_timestamp 
        ON sessions(timestamp)
    ''')
    
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_keystroke_session 
        ON keystrokes(session_id)
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Database initialized")

def save_session(mode: str, raw_text: str, keystrokes: List[Dict]) -> int:
    """
    Save a typing session and its keystrokes to the database.
    Returns the session_id.
    """
    conn = get_connection()
    c = conn.cursor()
    
    try:
        c.execute(
            "INSERT INTO sessions (timestamp, mode, raw_text) VALUES (?, ?, ?)",
            (time.time(), mode, raw_text)
        )
        session_id = c.lastrowid
        
        for ks in keystrokes:
            c.execute(
                """INSERT INTO keystrokes 
                   (session_id, key_char, timestamp, prev_key) 
                   VALUES (?, ?, ?, ?)""",
                (session_id, ks['key'], ks['timestamp'], ks.get('prev_key'))
            )
        
        conn.commit()
        return session_id
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_session(session_id: int) -> Optional[Dict]:
    """
    Retrieve a session and its keystrokes by ID.
    """
    conn = get_connection()
    c = conn.cursor()
    
    try:
        c.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        session = c.fetchone()
        
        if not session:
            return None
        
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
            "keystrokes": [
                {
                    "key": ks["key_char"],
                    "timestamp": ks["timestamp"],
                    "prev_key": ks["prev_key"]
                }
                for ks in keystrokes
            ]
        }
        
    finally:
        conn.close()

def get_all_sessions() -> List[Dict]:
    """
    Retrieve all sessions (without keystrokes).
    """
    conn = get_connection()
    c = conn.cursor()
    
    try:
        c.execute("SELECT * FROM sessions ORDER BY timestamp DESC")
        sessions = c.fetchall()
        return [dict(s) for s in sessions]
    finally:
        conn.close()