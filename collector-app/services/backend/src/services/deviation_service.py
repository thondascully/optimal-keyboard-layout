"""
Service for tracking finger deviations in typing.

Identifies cases where the user typed a letter with a different finger
than the expected default finger assignment.
"""

from typing import Dict, List
from ..db.connection import get_db
from ..keyboard_layout import FINGER_ASSIGNMENTS, OVERWRITABLE_LETTERS, get_finger


class DeviationService:
    """
    Service for analyzing finger deviation patterns.

    A deviation occurs when the user types an overwritable letter (e, b, u, i, y)
    with a different finger than the default expected finger.
    """

    def __init__(self):
        self.db = get_db()

    def get_deviations(self, limit: int = 100) -> Dict:
        """
        Get words and keystrokes where finger deviated from expected.

        Returns:
            Dict with deviation stats, words, and detailed instances
        """
        with self.db.cursor() as c:
            # Get all keystrokes for overwritable letters that have finger annotations
            overwritable_list = list(OVERWRITABLE_LETTERS)
            placeholders = ','.join('?' * len(overwritable_list))

            c.execute(f"""
                SELECT
                    k.id,
                    k.key_char,
                    k.finger,
                    k.hand,
                    k.timestamp,
                    k.session_id,
                    k.current_word
                FROM keystrokes k
                WHERE LOWER(k.key_char) IN ({placeholders})
                  AND k.finger IS NOT NULL
                  AND k.finger != ''
                ORDER BY k.id DESC
            """, overwritable_list)

            rows = c.fetchall()

            # Analyze deviations
            deviations = []
            by_letter = {letter: {'total': 0, 'deviated': 0, 'instances': []}
                        for letter in OVERWRITABLE_LETTERS}
            words_with_deviations = {}

            # Column indices: 0=id, 1=key_char, 2=finger, 3=hand, 4=timestamp, 5=session_id, 6=current_word
            for row in rows:
                ks_id, key_char, actual_finger, actual_hand, timestamp, session_id, current_word = row
                key_char = key_char.lower()
                expected_finger = get_finger(key_char)

                by_letter[key_char]['total'] += 1

                # Check if deviated
                if actual_finger != expected_finger:
                    by_letter[key_char]['deviated'] += 1

                    deviation = {
                        'keystroke_id': ks_id,
                        'letter': key_char,
                        'expected_finger': expected_finger,
                        'actual_finger': actual_finger,
                        'session_id': session_id,
                    }

                    # Use the stored current_word
                    word = current_word.lower() if current_word else None
                    if word:
                        deviation['word'] = word
                        if word not in words_with_deviations:
                            words_with_deviations[word] = []
                        words_with_deviations[word].append(deviation)

                    by_letter[key_char]['instances'].append(deviation)
                    deviations.append(deviation)

            # Calculate percentages and prepare summary
            summary = []
            for letter, data in by_letter.items():
                if data['total'] > 0:
                    deviation_rate = (data['deviated'] / data['total']) * 100
                    summary.append({
                        'letter': letter,
                        'total': data['total'],
                        'deviated': data['deviated'],
                        'deviation_rate': round(deviation_rate, 1),
                        'expected_finger': get_finger(letter),
                    })

            # Sort summary by deviation rate descending
            summary.sort(key=lambda x: x['deviation_rate'], reverse=True)

            # Prepare word analysis - aggregate by word
            word_analysis = []
            for word, instances in words_with_deviations.items():
                # Group by which letters deviated and their finger info
                letters_deviated = set(inst['letter'] for inst in instances)
                # Collect unique deviations (letter -> expected/actual finger)
                deviation_details = {}
                for inst in instances:
                    letter = inst['letter']
                    if letter not in deviation_details:
                        deviation_details[letter] = {
                            'expected': inst['expected_finger'],
                            'actual': inst['actual_finger'],
                        }
                word_analysis.append({
                    'word': word,
                    'count': len(instances),
                    'letters_deviated': list(letters_deviated),
                    'deviation_details': deviation_details,
                    'highlighted': self._highlight_word(word, letters_deviated),
                })

            # Sort by count descending
            word_analysis.sort(key=lambda x: x['count'], reverse=True)

            return {
                'summary': summary,
                'total_deviations': len(deviations),
                'words_with_deviations': word_analysis[:limit],
                'recent_deviations': deviations[:50],
                'overwritable_letters': list(OVERWRITABLE_LETTERS),
            }

    def _find_word_for_keystroke(self, text: str, letter: str) -> str:
        """Find a word containing the given letter in the text."""
        words = text.split()
        for word in words:
            if letter in word.lower():
                return word.lower()
        return None

    def _highlight_word(self, word: str, deviated_letters: set) -> List[Dict]:
        """
        Create a highlighted representation of the word.

        Returns list of {char, deviated} for each character.
        """
        result = []
        for char in word:
            result.append({
                'char': char,
                'deviated': char.lower() in deviated_letters,
            })
        return result

    def get_deviation_patterns(self) -> Dict:
        """
        Analyze patterns in finger deviations.

        Looks at what triggers deviations - e.g., previous key, position in word, etc.
        """
        with self.db.cursor() as c:
            overwritable_list = list(OVERWRITABLE_LETTERS)
            placeholders = ','.join('?' * len(overwritable_list))

            # Get deviations with prev_key context
            c.execute(f"""
                SELECT
                    k.key_char,
                    k.prev_key,
                    k.finger as actual_finger
                FROM keystrokes k
                WHERE LOWER(k.key_char) IN ({placeholders})
                  AND k.finger IS NOT NULL
                  AND k.finger != ''
            """, overwritable_list)

            rows = c.fetchall()

            # Analyze by (letter, prev_key) -> deviation pattern
            patterns = {}

            # Column indices: 0=key_char, 1=prev_key, 2=finger
            for row in rows:
                key_char = row[0].lower()
                prev_key = row[1] or 'START'
                actual_finger = row[2]
                expected_finger = get_finger(key_char)

                pattern_key = (key_char, prev_key.lower() if prev_key != 'START' else 'START')

                if pattern_key not in patterns:
                    patterns[pattern_key] = {
                        'letter': key_char,
                        'prev_key': prev_key,
                        'expected_finger': expected_finger,
                        'finger_counts': {},
                        'total': 0,
                    }

                patterns[pattern_key]['total'] += 1
                if actual_finger not in patterns[pattern_key]['finger_counts']:
                    patterns[pattern_key]['finger_counts'][actual_finger] = 0
                patterns[pattern_key]['finger_counts'][actual_finger] += 1

            # Convert to list and filter for patterns with deviations
            pattern_list = []
            for key, data in patterns.items():
                # Check if there's variation in finger usage
                if len(data['finger_counts']) > 1 or (
                    len(data['finger_counts']) == 1 and
                    list(data['finger_counts'].keys())[0] != data['expected_finger']
                ):
                    dominant_finger = max(data['finger_counts'].items(), key=lambda x: x[1])
                    data['dominant_finger'] = dominant_finger[0]
                    data['dominant_count'] = dominant_finger[1]
                    pattern_list.append(data)

            # Sort by total occurrences
            pattern_list.sort(key=lambda x: x['total'], reverse=True)

            return {
                'patterns': pattern_list[:50],
                'total_patterns': len(pattern_list),
            }
