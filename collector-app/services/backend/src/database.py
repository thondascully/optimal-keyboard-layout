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
            finger TEXT,
            hand TEXT,
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        )
    ''')
    
    # Migrate existing keystrokes table to add finger and hand columns if they don't exist
    # Check if columns exist by querying table info
    c.execute("PRAGMA table_info(keystrokes)")
    columns = [row[1] for row in c.fetchall()]  # Column names are in index 1
    
    if 'finger' not in columns:
        try:
            c.execute("ALTER TABLE keystrokes ADD COLUMN finger TEXT")
            print("✅ Added 'finger' column to keystrokes table")
        except sqlite3.OperationalError as e:
            print(f"⚠️  Could not add 'finger' column: {e}")
    else:
        print("✅ 'finger' column already exists")
    
    if 'hand' not in columns:
        try:
            c.execute("ALTER TABLE keystrokes ADD COLUMN hand TEXT")
            print("✅ Added 'hand' column to keystrokes table")
        except sqlite3.OperationalError as e:
            print(f"⚠️  Could not add 'hand' column: {e}")
    else:
        print("✅ 'hand' column already exists")
    
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
            FOREIGN KEY(keystroke_id) REFERENCES keystrokes(id)
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
    
    c.execute('''
        CREATE INDEX IF NOT EXISTS idx_keystroke_features 
        ON keystroke_features(keystroke_id)
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
                   (session_id, key_char, timestamp, prev_key, finger, hand) 
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (session_id, ks['key'], ks['timestamp'], ks.get('prev_key'), 
                 ks.get('finger'), ks.get('hand'))
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
                    "id": ks["id"],
                    "key": ks["key_char"],
                    "timestamp": ks["timestamp"],
                    "prev_key": ks["prev_key"],
                    "finger": ks["finger"] if "finger" in ks.keys() else None,
                    "hand": ks["hand"] if "hand" in ks.keys() else None
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

def update_keystroke_finger(keystroke_id: int, finger: str, hand: str):
    """
    Update the finger and hand annotation for a keystroke.
    """
    conn = get_connection()
    c = conn.cursor()
    
    try:
        c.execute(
            "UPDATE keystrokes SET finger = ?, hand = ? WHERE id = ?",
            (finger, hand, keystroke_id)
        )
        conn.commit()
        return c.rowcount > 0
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def update_session_fingers(session_id: int, finger_annotations: List[Dict]):
    """
    Update finger annotations for multiple keystrokes in a session.
    finger_annotations: List of {keystroke_id, finger, hand}
    """
    conn = get_connection()
    c = conn.cursor()
    
    try:
        for annotation in finger_annotations:
            c.execute(
                "UPDATE keystrokes SET finger = ?, hand = ? WHERE id = ? AND session_id = ?",
                (annotation['finger'], annotation['hand'], annotation['keystroke_id'], session_id)
            )
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_stats() -> Dict:
    """
    Get database statistics.
    """
    conn = get_connection()
    c = conn.cursor()
    
    try:
        c.execute("SELECT COUNT(*) FROM sessions")
        session_count = c.fetchone()[0]
        
        c.execute("SELECT COUNT(*) FROM keystrokes")
        keystroke_count = c.fetchone()[0]
        
        c.execute("SELECT mode, COUNT(*) as count FROM sessions GROUP BY mode")
        mode_dist = {row[0]: row[1] for row in c.fetchall()}
        
        c.execute("SELECT SUM(LENGTH(raw_text)) FROM sessions")
        total_chars = c.fetchone()[0] or 0
        
        return {
            "total_sessions": session_count,
            "total_keystrokes": keystroke_count,
            "total_characters": total_chars,
            "sessions_by_mode": mode_dist
        }
    finally:
        conn.close()

def delete_session_db(session_id: int) -> bool:
    """
    Delete a session and its keystrokes (cascades to features).
    Returns True if deleted, False if not found.
    """
    conn = get_connection()
    c = conn.cursor()
    
    try:
        # Get keystroke IDs first
        c.execute("SELECT id FROM keystrokes WHERE session_id = ?", (session_id,))
        keystroke_ids = [row[0] for row in c.fetchall()]
        
        # Delete features for these keystrokes
        if keystroke_ids:
            placeholders = ','.join('?' * len(keystroke_ids))
            c.execute(f"DELETE FROM keystroke_features WHERE keystroke_id IN ({placeholders})", keystroke_ids)
        
        # Delete keystrokes
        c.execute("DELETE FROM keystrokes WHERE session_id = ?", (session_id,))
        
        # Delete session
        c.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        
        if c.rowcount == 0:
            return False
        
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def delete_keystroke_db(keystroke_id: int) -> bool:
    """
    Delete a keystroke and cascade delete to features.
    Sets the prev_key of the next keystroke to NULL to create a breakpoint.
    Returns True if deleted, False if not found.
    """
    conn = get_connection()
    c = conn.cursor()
    
    try:
        # First, get the keystroke we're about to delete to find its prev_key and session
        c.execute("SELECT prev_key, session_id, timestamp FROM keystrokes WHERE id = ?", (keystroke_id,))
        deleted_ks = c.fetchone()
        
        if not deleted_ks:
            return False
        
        deleted_prev_key = deleted_ks['prev_key']
        session_id = deleted_ks['session_id']
        deleted_timestamp = deleted_ks['timestamp']
        
        # Find the next keystroke in the same session (by timestamp order)
        # This is the keystroke that currently has prev_key pointing to the deleted keystroke
        c.execute("""
            SELECT id FROM keystrokes 
            WHERE session_id = ? AND timestamp > ? 
            ORDER BY timestamp ASC 
            LIMIT 1
        """, (session_id, deleted_timestamp))
        next_ks = c.fetchone()
        
        # Delete features first (cascade)
        c.execute("DELETE FROM keystroke_features WHERE keystroke_id = ?", (keystroke_id,))
        
        # Delete keystroke
        c.execute("DELETE FROM keystrokes WHERE id = ?", (keystroke_id,))
        
        if c.rowcount == 0:
            return False
        
        # Update the next keystroke's prev_key to NULL to create a breakpoint
        # This prevents connecting the keystrokes before and after the deleted one
        if next_ks:
            c.execute("""
                UPDATE keystrokes 
                SET prev_key = NULL 
                WHERE id = ?
            """, (next_ks['id'],))
        
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_database_path() -> str:
    """Get the database file path."""
    return DB_FILE

def get_digraph_details(pattern: str) -> Dict:
    """
    Get detailed information about a specific digraph.
    Pattern should be 2 characters (e.g., "th", "er")
    """
    conn = get_connection()
    c = conn.cursor()
    
    try:
        # Find all occurrences of this digraph (consecutive keystrokes)
        c.execute("""
            SELECT k1.key_char, k2.key_char, k1.timestamp, k2.timestamp, 
                   s.raw_text, k1.session_id, k1.id, k2.id
            FROM keystrokes k1
            JOIN keystrokes k2 ON k2.session_id = k1.session_id 
                AND k2.id = (SELECT MIN(id) FROM keystrokes WHERE session_id = k1.session_id AND id > k1.id)
            JOIN sessions s ON k1.session_id = s.id
            WHERE k1.key_char = ? AND k2.key_char = ?
            ORDER BY k1.timestamp
        """, (pattern[0], pattern[1]))
        
        occurrences = c.fetchall()
        
        if not occurrences:
            return {
                "pattern": pattern,
                "words": [],
                "distribution": None,
                "occurrences": 0
            }
        
        # Extract words containing this digraph
        words = set()
        times = []
        
        for row in occurrences:
            text = row[4]
            # Find words containing this digraph
            for word in text.split():
                if pattern in word.lower():
                    words.add(word)
            
            # Calculate duration
            if len(row) > 3:
                duration = row[3] - row[2]
                if duration > 0 and duration < 5000:
                    times.append(duration)
        
        # Create distribution bins
        distribution = None
        if times:
            min_time = min(times)
            max_time = max(times)
            bin_count = 10
            
            # Determine appropriate bin size and precision
            # For very small values (< 1ms), use 0.01ms buckets
            # For larger values, use appropriate precision
            if max_time < 1.0:
                # Use 0.01ms buckets for sub-millisecond values
                bin_size = 0.01
                # Calculate how many bins we need
                range_size = max_time - min_time
                if range_size == 0:
                    range_size = max_time if max_time > 0 else 0.1
                actual_bin_count = min(int(range_size / bin_size) + 1, 20)  # Cap at 20 bins
                if actual_bin_count < 5:
                    actual_bin_count = 5  # Minimum 5 bins
                
                bins = [0] * actual_bin_count
                labels = []
                
                for i in range(actual_bin_count):
                    bin_start = min_time + i * bin_size
                    bin_end = min_time + (i + 1) * bin_size
                    labels.append(f"{bin_start:.2f}-{bin_end:.2f}ms")
                
                for time_val in times:
                    bin_idx = min(int((time_val - min_time) / bin_size), actual_bin_count - 1) if bin_size > 0 else 0
                    bins[bin_idx] += 1
            elif max_time == min_time:
                # Handle edge case where all times are the same
                bin_size = max_time / bin_count if max_time > 0 else 1
                bins = [0] * bin_count
                # Put all values in the first bin
                bins[0] = len(times)
                labels = []
                for i in range(bin_count):
                    bin_start = i * bin_size
                    bin_end = (i + 1) * bin_size
                    if bin_size < 1:
                        labels.append(f"{bin_start:.2f}-{bin_end:.2f}ms")
                    else:
                        labels.append(f"{bin_start:.1f}-{bin_end:.1f}ms")
            else:
                bin_size = (max_time - min_time) / bin_count
                bins = [0] * bin_count
                labels = []
                
                for i in range(bin_count):
                    bin_start = min_time + i * bin_size
                    bin_end = min_time + (i + 1) * bin_size
                    # Use 2 decimal places for small values (< 1ms), 1 for medium, 0 for large
                    if bin_size < 0.1:
                        labels.append(f"{bin_start:.2f}-{bin_end:.2f}ms")
                    elif bin_size < 1:
                        labels.append(f"{bin_start:.1f}-{bin_end:.1f}ms")
                    else:
                        labels.append(f"{bin_start:.0f}-{bin_end:.0f}ms")
                
                for time_val in times:
                    bin_idx = min(int((time_val - min_time) / bin_size), bin_count - 1) if bin_size > 0 else 0
                    bins[bin_idx] += 1
            
            distribution = {
                "labels": labels,
                "values": bins
            }
        
        return {
            "pattern": pattern,
            "words": list(words)[:50],  # Limit to 50 words
            "distribution": distribution,
            "occurrences": len(occurrences)
        }
    finally:
        conn.close()