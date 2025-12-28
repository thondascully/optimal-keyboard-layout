"""
Migration script to update all existing keystrokes with correct finger assignments.
EXCLUDES overwritable letters (e, b, u, i, y) which are manually annotated.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.database import get_connection
from src.keyboard_layout import FINGER_ASSIGNMENTS, OVERWRITABLE_LETTERS, get_hand


def migrate_finger_assignments():
    """
    Update all keystrokes with the correct finger assignments from FINGER_ASSIGNMENTS.
    Skips overwritable letters (e, b, u, i, y) which have manual annotations.
    """
    conn = get_connection()
    c = conn.cursor()

    try:
        # Get all keystrokes that are NOT overwritable letters
        overwritable_placeholders = ','.join('?' * len(OVERWRITABLE_LETTERS))
        c.execute(f"""
            SELECT id, key_char, finger, hand
            FROM keystrokes
            WHERE LOWER(key_char) NOT IN ({overwritable_placeholders})
        """, tuple(OVERWRITABLE_LETTERS))

        keystrokes = c.fetchall()
        print(f"Found {len(keystrokes)} keystrokes to check (excluding overwritable letters: {OVERWRITABLE_LETTERS})")

        updated_count = 0
        skipped_unknown = 0
        already_correct = 0

        for row in keystrokes:
            keystroke_id = row[0]
            key_char = row[1]
            current_finger = row[2]
            current_hand = row[3]

            key_lower = key_char.lower()

            # Get expected finger and hand
            expected_finger = FINGER_ASSIGNMENTS.get(key_lower, 'unknown')
            expected_hand = get_hand(key_char)

            # Skip if finger is 'unknown'
            if expected_finger == 'unknown':
                skipped_unknown += 1
                continue

            # Check if update is needed
            if current_finger == expected_finger and current_hand == expected_hand:
                already_correct += 1
                continue

            # Update the keystroke
            c.execute("""
                UPDATE keystrokes
                SET finger = ?, hand = ?
                WHERE id = ?
            """, (expected_finger, expected_hand, keystroke_id))

            updated_count += 1

        conn.commit()
        print(f"Migration complete:")
        print(f"  Updated: {updated_count} keystrokes")
        print(f"  Already correct: {already_correct} keystrokes")
        print(f"  Skipped (unknown): {skipped_unknown} keystrokes")

        # Also count how many overwritable letters we preserved
        c.execute(f"""
            SELECT COUNT(*) FROM keystrokes
            WHERE LOWER(key_char) IN ({overwritable_placeholders})
        """, tuple(OVERWRITABLE_LETTERS))
        preserved_count = c.fetchone()[0]
        print(f"  Preserved (overwritable): {preserved_count} keystrokes")

        return updated_count

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    print("Migrating finger assignments for existing data...")
    print(f"Overwritable letters (will be skipped): {OVERWRITABLE_LETTERS}")
    print()
    count = migrate_finger_assignments()
    print(f"\nDone! Updated {count} keystrokes.")
