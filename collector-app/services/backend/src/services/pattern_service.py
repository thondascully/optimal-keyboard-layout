"""
Pattern service for analyzing typing patterns (digraphs, trigraphs).
"""

from collections import defaultdict
from statistics import median
from typing import Dict, List, Optional

from ..db.connection import get_db
from ..domain.constants import (
    MAX_KEYSTROKE_DURATION_MS,
    MIN_PATTERN_SAMPLES,
    MIN_PATTERN_SAMPLES_TRIGRAPH_TEST,
)


def compute_mad(values: List[float]) -> float:
    """Compute Median Absolute Deviation."""
    if not values:
        return 0.0
    med = median(values)
    deviations = [abs(v - med) for v in values]
    return median(deviations)


def filter_outliers_mad(times: List[float], threshold: float = 3.0) -> tuple:
    """
    Filter outliers using MAD (Median Absolute Deviation).
    Values more than `threshold` MAD away from the median are excluded.

    Returns:
        Tuple of (filtered_times, excluded_times, median, mad, threshold_low, threshold_high)
    """
    if len(times) < 3:
        return times, [], median(times) if times else 0, 0, 0, float('inf')

    med = median(times)
    mad = compute_mad(times)

    # MAD of 0 means all values are identical
    if mad == 0:
        return times, [], med, 0, med, med

    # Calculate thresholds
    threshold_low = med - threshold * mad
    threshold_high = med + threshold * mad

    filtered = [t for t in times if threshold_low <= t <= threshold_high]
    excluded = [t for t in times if t < threshold_low or t > threshold_high]

    return filtered, excluded, med, mad, threshold_low, threshold_high


def filter_outliers_trimmed(times: List[float], trim_percent: float = 0.2) -> tuple:
    """
    Filter outliers using trimmed mean (drop top and bottom X%).

    Returns:
        Tuple of (filtered_times, excluded_times)
    """
    if len(times) <= 3:
        return times, []

    sorted_times = sorted(times)
    n = len(sorted_times)
    trim_count = int(n * trim_percent)

    if trim_count == 0:
        return times, []

    filtered = sorted_times[trim_count:-trim_count] if trim_count > 0 else sorted_times
    excluded = sorted_times[:trim_count] + sorted_times[-trim_count:]

    return filtered, excluded


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
                if i >= 2:
                    prev_ks = keystrokes[i - 1]
                    prev_prev_ks = keystrokes[i - 2]
                    # All three keystrokes must be in the same session
                    if prev_prev_ks[3] == session_id and prev_ks[3] == session_id:
                        prev_prev_key = prev_prev_ks[0]  # key_char from 2 ago
                        prev_key_actual = prev_ks[0]     # key_char from 1 ago
                        prev_prev_timestamp = prev_prev_ks[2]
                        if prev_prev_key and prev_key_actual and key:
                            trigraph = f"{prev_prev_key}{prev_key_actual}{key}"
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
        """Fetch keystrokes from database with optional mode filter.

        Always includes all keystrokes (including first ones with prev_key=NULL)
        to ensure proper trigraph analysis. Digraph filtering is handled in analysis.
        """
        if mode_filter:
            query = """
                SELECT k.key_char, k.prev_key, k.timestamp, k.session_id, k.id
                FROM keystrokes k
                JOIN sessions s ON k.session_id = s.id
                WHERE s.mode = ?
                ORDER BY k.session_id, k.id
            """
            cursor.execute(query, (mode_filter,))
        else:
            cursor.execute("""
                SELECT k.key_char, k.prev_key, k.timestamp, k.session_id, k.id
                FROM keystrokes k
                JOIN sessions s ON k.session_id = s.id
                ORDER BY k.session_id, k.id
            """)

        return cursor.fetchall()

    def _process_stats(self, stats_dict: Dict, min_count: int) -> List[Dict]:
        """Process raw stats into sorted list with filtered averages."""
        results = []
        for pattern, data in stats_dict.items():
            if data['count'] >= min_count:
                times = data['times']

                # Apply outlier filtering for samples > 3
                if len(times) > 3:
                    filtered, excluded, med, mad, thresh_low, thresh_high = filter_outliers_mad(times)
                else:
                    filtered = times
                    excluded = []
                    med = median(times) if times else 0
                    mad = 0
                    thresh_low = 0
                    thresh_high = float('inf')

                # Calculate filtered average
                if filtered:
                    filtered_avg = sum(filtered) / len(filtered)
                else:
                    filtered_avg = sum(times) / len(times)

                # Raw average for comparison
                raw_avg = data['total_time'] / data['count']

                results.append({
                    'pattern': pattern,
                    'count': data['count'],
                    'avg_time': round(filtered_avg, 2),  # Use filtered average
                    'raw_avg_time': round(raw_avg, 2),   # Keep raw for reference
                    'min_time': round(min(times), 2),
                    'max_time': round(max(times), 2),
                    'median_time': round(med, 2),
                    'mad': round(mad, 2),
                    'filtered_count': len(filtered),
                    'excluded_count': len(excluded),
                })
        return sorted(results, key=lambda x: x['avg_time'])

    def get_all_patterns_detailed(self, mode_filter: Optional[str] = None) -> Dict:
        """
        Get all digraphs and trigraphs with detailed timing distribution data.

        Returns all patterns with their raw times for visualization.
        """
        db = get_db()

        with db.cursor() as c:
            keystrokes = self._fetch_keystrokes(c, mode_filter)

            if not keystrokes:
                return {'digraphs': [], 'trigraphs': []}

            digraph_stats = defaultdict(lambda: {'times': []})
            trigraph_stats = defaultdict(lambda: {'times': []})
            prev_ks_by_session = {}

            for i, (key, prev_key, timestamp, session_id, ks_id) in enumerate(keystrokes):
                prev_timestamp = prev_ks_by_session.get(session_id)

                if prev_key and key:
                    digraph = f"{prev_key}{key}"
                    if prev_timestamp:
                        duration = timestamp - prev_timestamp
                        if 0 < duration < MAX_KEYSTROKE_DURATION_MS:
                            digraph_stats[digraph]['times'].append(duration)

                if i >= 2:
                    prev_ks = keystrokes[i - 1]
                    prev_prev_ks = keystrokes[i - 2]
                    if prev_prev_ks[3] == session_id and prev_ks[3] == session_id:
                        prev_prev_key = prev_prev_ks[0]
                        prev_key_actual = prev_ks[0]
                        prev_prev_timestamp = prev_prev_ks[2]
                        if prev_prev_key and prev_key_actual and key:
                            trigraph = f"{prev_prev_key}{prev_key_actual}{key}"
                            duration = timestamp - prev_prev_timestamp
                            if 0 < duration < MAX_KEYSTROKE_DURATION_MS:
                                trigraph_stats[trigraph]['times'].append(duration)

                prev_ks_by_session[session_id] = timestamp

            # Process with full distribution info
            digraphs = self._process_detailed(digraph_stats)
            trigraphs = self._process_detailed(trigraph_stats)

            return {
                'digraphs': digraphs,
                'trigraphs': trigraphs,
                'total_digraphs': len(digraphs),
                'total_trigraphs': len(trigraphs),
            }

    def _process_detailed(self, stats_dict: Dict) -> List[Dict]:
        """Process stats with full timing distribution for visualization."""
        results = []
        for pattern, data in stats_dict.items():
            times = data['times']
            if not times:
                continue

            # Apply MAD filtering
            if len(times) > 3:
                filtered, excluded, med, mad, thresh_low, thresh_high = filter_outliers_mad(times)
            else:
                filtered = times
                excluded = []
                med = median(times) if times else 0
                mad = 0
                thresh_low = 0
                thresh_high = float('inf')

            # Calculate stats
            filtered_avg = sum(filtered) / len(filtered) if filtered else 0
            raw_avg = sum(times) / len(times)

            # Create histogram bins (8 bins for cleaner look)
            sorted_times = sorted(times)
            bins = self._create_histogram_bins(sorted_times, thresh_low, thresh_high)

            results.append({
                'pattern': pattern,
                'count': len(times),
                'avg_time': round(filtered_avg, 1),
                'raw_avg_time': round(raw_avg, 1),
                'median_time': round(med, 1),
                'mad': round(mad, 1),
                'min_time': round(min(times), 1),
                'max_time': round(max(times), 1),
                'threshold_low': round(thresh_low, 1) if thresh_low > 0 else None,
                'threshold_high': round(thresh_high, 1) if thresh_high < float('inf') else None,
                'filtered_count': len(filtered),
                'excluded_count': len(excluded),
                'distribution': bins,
                'raw_times': [round(t, 1) for t in sorted_times],
            })

        return sorted(results, key=lambda x: x['avg_time'])

    def _create_histogram_bins(self, sorted_times: List[float], thresh_low: float, thresh_high: float, num_bins: int = 8) -> List[Dict]:
        """Create histogram bins with proper labels."""
        if not sorted_times:
            return []

        if len(sorted_times) == 1:
            return [{'label': f"{sorted_times[0]:.0f}ms", 'count': 1, 'in_range': True}]

        min_t, max_t = sorted_times[0], sorted_times[-1]
        range_t = max_t - min_t

        # If range is very small, use fewer bins
        if range_t < 10:
            num_bins = min(num_bins, max(2, int(range_t)))

        bin_size = range_t / num_bins if range_t > 0 else 1

        bins = []
        for i in range(num_bins):
            bin_start = min_t + i * bin_size
            bin_end = min_t + (i + 1) * bin_size

            # Count samples in this bin
            if i == num_bins - 1:
                count = sum(1 for t in sorted_times if bin_start <= t <= bin_end)
            else:
                count = sum(1 for t in sorted_times if bin_start <= t < bin_end)

            # Determine if bin midpoint is within MAD threshold
            bin_mid = (bin_start + bin_end) / 2
            in_range = thresh_low <= bin_mid <= thresh_high if thresh_high < float('inf') else True

            # Format label based on range size
            if bin_size >= 10:
                label = f"{bin_start:.0f}-{bin_end:.0f}"
            elif bin_size >= 1:
                label = f"{bin_start:.0f}-{bin_end:.0f}"
            else:
                label = f"{bin_start:.1f}-{bin_end:.1f}"

            bins.append({
                'label': label,
                'count': count,
                'in_range': in_range,
                'start': round(bin_start, 1),
                'end': round(bin_end, 1),
            })

        return bins
