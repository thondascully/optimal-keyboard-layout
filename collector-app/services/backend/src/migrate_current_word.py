#!/usr/bin/env python3
"""
Migration script to populate current_word for all existing keystrokes.

This script analyzes each session's keystrokes and determines which word
each keystroke belongs to based on position in the raw_text.
"""

import os
import sys

# Add src to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db.connection import get_db
from db.schema import init_schema


def find_word_at_position(text: str, position: int) -> str:
    """
    Find the word at a given character position in text.

    Args:
        text: The full text
        position: Character index (0-based)

    Returns:
        The word containing that position, or empty string if not in a word
    """
    if not text or position < 0 or position >= len(text):
        return ""

    # Find word boundaries
    start = position
    end = position

    # Go backwards to find start of word
    while start > 0 and text[start - 1] not in ' \t\n\r':
        start -= 1

    # Go forwards to find end of word
    while end < len(text) and text[end] not in ' \t\n\r':
        end += 1

    word = text[start:end]

    # Return the word if it's valid (not just whitespace/punctuation)
    return word if word.strip() else ""


def migrate_current_words():
    """Populate current_word for all keystrokes based on session raw_text."""
    db = get_db()

    # Ensure schema is up to date (adds current_word column if missing)
    init_schema(db)

    with db.connection() as conn:
        c = conn.cursor()

        # Get all sessions
        c.execute("SELECT id, raw_text FROM sessions ORDER BY id")
        sessions = c.fetchall()

        total_updated = 0
        total_sessions = len(sessions)

        print(f"Processing {total_sessions} sessions...")

        for session_id, raw_text in sessions:
            if not raw_text:
                continue

            # Get keystrokes for this session in order
            c.execute("""
                SELECT id, key_char
                FROM keystrokes
                WHERE session_id = ?
                ORDER BY id
            """, (session_id,))
            keystrokes = c.fetchall()

            if not keystrokes:
                continue

            # Track position in raw_text as we process keystrokes
            # This assumes keystrokes were typed in order matching raw_text
            text_position = 0
            updates = []

            for ks_id, key_char in keystrokes:
                # Find this character in the text starting from current position
                if key_char and text_position < len(raw_text):
                    # Look for the character in the text
                    found_pos = raw_text.find(key_char, text_position)

                    if found_pos != -1 and found_pos < text_position + 5:
                        # Found it reasonably close to expected position
                        word = find_word_at_position(raw_text, found_pos)
                        text_position = found_pos + 1
                    else:
                        # Character not found or too far, use current position
                        word = find_word_at_position(raw_text, text_position)
                        text_position += 1

                    if word:
                        updates.append((word, ks_id))

            # Batch update for this session
            if updates:
                c.executemany(
                    "UPDATE keystrokes SET current_word = ? WHERE id = ?",
                    updates
                )
                total_updated += len(updates)

        conn.commit()
        print(f"Updated {total_updated} keystrokes across {total_sessions} sessions")


def migrate_current_words_v2():
    """
    Alternative approach: Use keystroke sequence to rebuild words.

    This version builds words by looking at keystroke sequences,
    splitting on spaces and special characters.
    """
    db = get_db()

    # Ensure schema is up to date
    init_schema(db)

    with db.connection() as conn:
        c = conn.cursor()

        # Get all sessions
        c.execute("SELECT id, raw_text FROM sessions ORDER BY id")
        sessions = c.fetchall()

        total_updated = 0

        print(f"Processing {len(sessions)} sessions...")

        for session_id, raw_text in sessions:
            # Get keystrokes for this session in order
            c.execute("""
                SELECT id, key_char, timestamp
                FROM keystrokes
                WHERE session_id = ?
                ORDER BY timestamp, id
            """, (session_id,))
            keystrokes = c.fetchall()

            if not keystrokes:
                continue

            # Build words from keystroke sequence
            current_word_chars = []
            current_word_ids = []
            updates = []

            for ks_id, key_char, _ in keystrokes:
                if key_char in ' \t\n\r':
                    # End of word - update all keystrokes in this word
                    if current_word_chars:
                        word = ''.join(current_word_chars)
                        for word_ks_id in current_word_ids:
                            updates.append((word, word_ks_id))
                    current_word_chars = []
                    current_word_ids = []
                elif key_char:
                    # Add to current word
                    current_word_chars.append(key_char)
                    current_word_ids.append(ks_id)

            # Handle last word if any
            if current_word_chars:
                word = ''.join(current_word_chars)
                for word_ks_id in current_word_ids:
                    updates.append((word, word_ks_id))

            # Batch update
            if updates:
                c.executemany(
                    "UPDATE keystrokes SET current_word = ? WHERE id = ?",
                    updates
                )
                total_updated += len(updates)

        conn.commit()
        print(f"Updated {total_updated} keystrokes")


if __name__ == "__main__":
    print("Migrating current_word field for all keystrokes...")
    print("Using keystroke sequence method (v2)...")
    migrate_current_words_v2()
    print("Migration complete!")
