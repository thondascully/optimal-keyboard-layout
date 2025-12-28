"""
Pattern service for analyzing typing patterns (digraphs, trigraphs).
"""

from collections import defaultdict
from typing import Dict, List, Optional

from ..db.connection import get_db
from ..domain.constants import (
    MAX_KEYSTROKE_DURATION_MS,
    MIN_PATTERN_SAMPLES,
    MIN_PATTERN_SAMPLES_TRIGRAPH_TEST,
)


class PatternService:
    """
    Service for pattern analysis of typing data.
    """

    def analyze_patterns(self, mode_filter: Optional[str] = None) -> Dict:
        """
        Analyze patterns from keystroke data.

        Args:
            mode_filter: Optional filter by session mode

        Returns:
            Dict with digraph, trigraph, and transition statistics
        """
        db = get_db()

        with db.cursor() as c:
            # Build query with optional mode filter
            keystrokes = self._fetch_keystrokes(c, mode_filter)

            if not keystrokes:
                return {
                    'digraphs': [],
                    'trigraphs': [],
                    'fastest_transitions': [],
                    'slowest_transitions': [],
                }

            # Analyze patterns
            digraph_stats = defaultdict(lambda: {'count': 0, 'total_time': 0, 'times': []})
            trigraph_stats = defaultdict(lambda: {'count': 0, 'total_time': 0, 'times': []})
            transition_stats = defaultdict(lambda: {'count': 0, 'total_time': 0, 'times': []})

            # Track previous keystroke timestamp by session
            prev_ks_by_session = {}

            for i, (key, prev_key, timestamp, session_id, ks_id) in enumerate(keystrokes):
                prev_timestamp = prev_ks_by_session.get(session_id)

                # Analyze digraph
                if prev_key and key:
                    digraph = f"{prev_key}{key}"
                    if prev_timestamp:
                        duration = timestamp - prev_timestamp
                        if 0 < duration < MAX_KEYSTROKE_DURATION_MS:
                            digraph_stats[digraph]['count'] += 1
                            digraph_stats[digraph]['total_time'] += duration
                            digraph_stats[digraph]['times'].append(duration)

                    # Transition stats
                    transition = f"{prev_key}->{key}"
                    if prev_timestamp:
                        duration = timestamp - prev_timestamp
                        if 0 < duration < MAX_KEYSTROKE_DURATION_MS:
                            transition_stats[transition]['count'] += 1
                            transition_stats[transition]['total_time'] += duration
                            transition_stats[transition]['times'].append(duration)

                # Analyze trigraph (need previous two keystrokes in same session)
                if i >= 2 and keystrokes[i-2][3] == session_id:
                    prev_prev_key = keystrokes[i - 2][0]
                    prev_prev_timestamp = keystrokes[i - 2][2]
                    if prev_prev_key and prev_key and key:
                        trigraph = f"{prev_prev_key}{prev_key}{key}"
                        duration = timestamp - prev_prev_timestamp
                        if 0 < duration < MAX_KEYSTROKE_DURATION_MS:
                            trigraph_stats[trigraph]['count'] += 1
                            trigraph_stats[trigraph]['total_time'] += duration
                            trigraph_stats[trigraph]['times'].append(duration)

                # Update previous keystroke for this session
                prev_ks_by_session[session_id] = timestamp

            # Process and return results
            min_count = (
                MIN_PATTERN_SAMPLES_TRIGRAPH_TEST
                if mode_filter == 'trigraph_test'
                else MIN_PATTERN_SAMPLES
            )

            digraphs = self._process_stats(digraph_stats, min_count)
            trigraphs = self._process_stats(trigraph_stats, min_count)
            transitions = self._process_stats(transition_stats, min_count)

            return {
                'digraphs': digraphs[:20],
                'trigraphs': trigraphs[:20],
                'fastest_transitions': transitions[:20],
                'slowest_transitions': list(reversed(transitions[-20:])),
            }

    def _fetch_keystrokes(self, cursor, mode_filter: Optional[str]) -> List:
        """Fetch keystrokes from database with optional mode filter."""
        if mode_filter == 'trigraph_test':
            # For trigraph_test, get all keystrokes including first ones
            query = """
                SELECT k.key_char, k.prev_key, k.timestamp, k.session_id, k.id
                FROM keystrokes k
                JOIN sessions s ON k.session_id = s.id
                WHERE s.mode = ?
                ORDER BY k.session_id, k.id
            """
            cursor.execute(query, (mode_filter,))
        elif mode_filter:
            query = """
                SELECT k.key_char, k.prev_key, k.timestamp, k.session_id, k.id
                FROM keystrokes k
                JOIN sessions s ON k.session_id = s.id
                WHERE k.prev_key IS NOT NULL AND s.mode = ?
                ORDER BY k.session_id, k.id
            """
            cursor.execute(query, (mode_filter,))
        else:
            cursor.execute("""
                SELECT k.key_char, k.prev_key, k.timestamp, k.session_id, k.id
                FROM keystrokes k
                JOIN sessions s ON k.session_id = s.id
                WHERE k.prev_key IS NOT NULL
                ORDER BY k.session_id, k.id
            """)

        return cursor.fetchall()

    def _process_stats(self, stats_dict: Dict, min_count: int) -> List[Dict]:
        """Process raw stats into sorted list with averages."""
        results = []
        for pattern, data in stats_dict.items():
            if data['count'] >= min_count:
                avg_time = data['total_time'] / data['count']
                results.append({
                    'pattern': pattern,
                    'count': data['count'],
                    'avg_time': round(avg_time, 2),
                    'min_time': round(min(data['times']), 2),
                    'max_time': round(max(data['times']), 2),
                })
        return sorted(results, key=lambda x: x['avg_time'])
