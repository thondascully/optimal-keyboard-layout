"""
Coverage service for tracking finger pair sample coverage.

Tracks how many samples exist for each of the 64 finger pair combinations
to ensure adequate data for PITF model training.
"""

from collections import defaultdict
from typing import Dict, List, Optional, Tuple

from ..db.connection import get_db
from ..keyboard_layout import get_finger, FINGER_ASSIGNMENTS
from ..domain.constants import MAX_KEYSTROKE_DURATION_MS


# All possible fingers (excluding thumb for now)
FINGERS = [
    'left_pinky', 'left_ring', 'left_middle', 'left_index',
    'right_index', 'right_middle', 'right_ring', 'right_pinky',
]

# Minimum samples needed per finger pair for statistical robustness
MIN_SAMPLES_PER_PAIR = 5
TARGET_SAMPLES_PER_PAIR = 8

# Total trigraph targets
MIN_TOTAL_TRIGRAPHS = 400
TARGET_TOTAL_TRIGRAPHS = 500


class CoverageService:
    """
    Service for analyzing and tracking finger pair coverage.
    """

    def get_coverage(self, mode_filter: Optional[str] = 'trigraph_test') -> Dict:
        """
        Get coverage statistics for all finger pairs.

        Args:
            mode_filter: Session mode to filter by (default: trigraph_test)

        Returns:
            Dict with coverage matrix, gaps, and summary stats
        """
        db = get_db()

        with db.cursor() as c:
            # Get all trigraphs from trigraph_test sessions
            if mode_filter:
                c.execute("""
                    SELECT k.key_char, k.prev_key, k.timestamp, k.finger, k.session_id
                    FROM keystrokes k
                    JOIN sessions s ON k.session_id = s.id
                    WHERE s.mode = ?
                    ORDER BY k.session_id, k.id
                """, (mode_filter,))
            else:
                c.execute("""
                    SELECT k.key_char, k.prev_key, k.timestamp, k.finger, k.session_id
                    FROM keystrokes k
                    ORDER BY k.session_id, k.id
                """)

            keystrokes = c.fetchall()

        # Build finger pair counts from bigrams within trigraphs
        pair_counts = defaultdict(lambda: {'count': 0, 'times': []})
        trigraph_count = 0
        prev_ks = {}  # Track previous keystroke per session

        for row in keystrokes:
            key = row['key_char']
            prev_key = row['prev_key']
            timestamp = row['timestamp']
            session_id = row['session_id']

            # Get fingers (from annotation or default mapping)
            finger = row['finger'] or get_finger(key)
            prev_finger = get_finger(prev_key) if prev_key else None

            if prev_key and prev_finger and finger:
                # This is a valid bigram transition
                if prev_finger in FINGERS and finger in FINGERS:
                    pair_key = (prev_finger, finger)

                    # Calculate duration if we have previous timestamp
                    if session_id in prev_ks:
                        duration = timestamp - prev_ks[session_id]
                        if 0 < duration < MAX_KEYSTROKE_DURATION_MS:
                            pair_counts[pair_key]['count'] += 1
                            pair_counts[pair_key]['times'].append(duration)

            prev_ks[session_id] = timestamp

        # Count unique trigraphs (sessions in trigraph_test mode = trigraph count)
        with db.cursor() as c:
            if mode_filter:
                c.execute(
                    "SELECT COUNT(*) FROM sessions WHERE mode = ?",
                    (mode_filter,)
                )
            else:
                c.execute("SELECT COUNT(*) FROM sessions")
            trigraph_count = c.fetchone()[0]

        # Build coverage matrix
        coverage_matrix = self._build_coverage_matrix(pair_counts)

        # Identify gaps (under-sampled pairs)
        gaps = self._identify_gaps(pair_counts)

        # Calculate summary stats
        total_pairs = len(FINGERS) * len(FINGERS)
        covered_pairs = len([p for p in pair_counts.values() if p['count'] >= MIN_SAMPLES_PER_PAIR])
        well_covered_pairs = len([p for p in pair_counts.values() if p['count'] >= TARGET_SAMPLES_PER_PAIR])

        return {
            'matrix': coverage_matrix,
            'gaps': gaps,
            'summary': {
                'total_trigraphs': trigraph_count,
                'target_trigraphs': TARGET_TOTAL_TRIGRAPHS,
                'min_trigraphs': MIN_TOTAL_TRIGRAPHS,
                'trigraph_progress': min(100, round(trigraph_count / TARGET_TOTAL_TRIGRAPHS * 100, 1)),
                'total_pairs': total_pairs,
                'covered_pairs': covered_pairs,
                'well_covered_pairs': well_covered_pairs,
                'pair_coverage_percent': round(covered_pairs / total_pairs * 100, 1),
                'min_samples_per_pair': MIN_SAMPLES_PER_PAIR,
                'target_samples_per_pair': TARGET_SAMPLES_PER_PAIR,
            },
            'fingers': FINGERS,
        }

    def _build_coverage_matrix(self, pair_counts: Dict) -> List[List[Dict]]:
        """Build 8x8 matrix of finger pair coverage."""
        matrix = []
        for from_finger in FINGERS:
            row = []
            for to_finger in FINGERS:
                pair_key = (from_finger, to_finger)
                data = pair_counts.get(pair_key, {'count': 0, 'times': []})

                avg_time = None
                if data['times']:
                    avg_time = round(sum(data['times']) / len(data['times']), 1)

                status = 'missing'  # 0 samples
                if data['count'] >= TARGET_SAMPLES_PER_PAIR:
                    status = 'good'  # 8+ samples
                elif data['count'] >= MIN_SAMPLES_PER_PAIR:
                    status = 'adequate'  # 5-7 samples
                elif data['count'] > 0:
                    status = 'low'  # 1-4 samples

                row.append({
                    'from': from_finger,
                    'to': to_finger,
                    'count': data['count'],
                    'avg_time': avg_time,
                    'status': status,
                })
            matrix.append(row)
        return matrix

    def _identify_gaps(self, pair_counts: Dict) -> List[Dict]:
        """Identify finger pairs that need more samples."""
        gaps = []
        for from_finger in FINGERS:
            for to_finger in FINGERS:
                pair_key = (from_finger, to_finger)
                data = pair_counts.get(pair_key, {'count': 0})

                if data['count'] < MIN_SAMPLES_PER_PAIR:
                    needed = MIN_SAMPLES_PER_PAIR - data['count']
                    gaps.append({
                        'from': from_finger,
                        'to': to_finger,
                        'current': data['count'],
                        'needed': needed,
                        'priority': 'high' if data['count'] == 0 else 'medium',
                    })

        # Sort by priority (missing first, then low count)
        gaps.sort(key=lambda x: (0 if x['priority'] == 'high' else 1, x['current']))
        return gaps

    def get_keys_for_finger(self, finger: str) -> List[str]:
        """Get all keys assigned to a specific finger."""
        return [key for key, f in FINGER_ASSIGNMENTS.items() if f == finger]

    def suggest_trigraphs_for_gap(self, from_finger: str, to_finger: str, count: int = 5) -> List[str]:
        """
        Generate trigraph suggestions that would cover a specific finger pair gap.

        Args:
            from_finger: Starting finger
            to_finger: Ending finger
            count: Number of suggestions

        Returns:
            List of suggested trigraphs
        """
        import random

        from_keys = self.get_keys_for_finger(from_finger)
        to_keys = self.get_keys_for_finger(to_finger)

        if not from_keys or not to_keys:
            return []

        # Generate trigraphs where the 1st->2nd OR 2nd->3rd transition uses this pair
        suggestions = []
        all_keys = list(FINGER_ASSIGNMENTS.keys())

        for _ in range(count * 2):  # Generate extras to filter
            # Option 1: pair is in position 1-2
            k1 = random.choice(from_keys)
            k2 = random.choice(to_keys)
            k3 = random.choice(all_keys)
            trigraph1 = f"{k1}{k2}{k3}"

            # Option 2: pair is in position 2-3
            k0 = random.choice(all_keys)
            trigraph2 = f"{k0}{k1}{k2}"

            suggestions.extend([trigraph1, trigraph2])

        # Remove duplicates and limit
        unique = list(set(suggestions))
        random.shuffle(unique)
        return unique[:count]
