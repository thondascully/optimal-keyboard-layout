"""
Script to set default finger assignments for all existing keystrokes
that don't already have finger/hand assignments.
Only updates keystrokes where finger IS NULL or empty.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.database import get_connection
from src.keyboard_layout import get_finger, get_hand

def set_default_fingers():
    """
    Set default finger and hand assignments for all keystrokes
    that don't already have them assigned.
    """
    conn = get_connection()
    c = conn.cursor()
    
    try:
        # Get all keystrokes without finger assignments
        c.execute("""
            SELECT id, key_char 
            FROM keystrokes 
            WHERE finger IS NULL OR finger = ''
        """)
        
        keystrokes = c.fetchall()
        print(f"Found {len(keystrokes)} keystrokes without finger assignments")
        
        updated_count = 0
        skipped_count = 0
        
        for row in keystrokes:
            keystroke_id = row[0]
            key_char = row[1]
            
            # Get default finger and hand
            finger = get_finger(key_char)
            hand = get_hand(key_char)
            
            # Skip if finger is 'unknown'
            if finger == 'unknown':
                skipped_count += 1
                continue
            
            # Update the keystroke
            c.execute("""
                UPDATE keystrokes 
                SET finger = ?, hand = ? 
                WHERE id = ?
            """, (finger, hand, keystroke_id))
            
            updated_count += 1
        
        conn.commit()
        print(f"✅ Updated {updated_count} keystrokes with default finger assignments")
        print(f"⚠️  Skipped {skipped_count} keystrokes (unknown finger)")
        
        return updated_count
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("Setting default finger assignments for existing data...")
    count = set_default_fingers()
    print(f"Done! Updated {count} keystrokes.")

