"""
Pattern analysis for typing data.
Analyzes digraphs, trigraphs, and other patterns from keystroke data.
"""

from typing import Dict, List, Tuple
from collections import defaultdict
from .database import get_connection

def analyze_patterns() -> Dict:
    """
    Analyze patterns from all keystroke data.
    Returns statistics for digraphs, trigraphs, and transitions.
    """
    conn = get_connection()
    c = conn.cursor()
    
    try:
        # Get all keystrokes with their timestamps, ordered by session and id
        # Only get valid keystrokes (not deleted)
        c.execute("""
            SELECT k.key_char, k.prev_key, k.timestamp, k.session_id, k.id
            FROM keystrokes k
            JOIN sessions s ON k.session_id = s.id
            WHERE k.prev_key IS NOT NULL
            ORDER BY k.session_id, k.id
        """)
        
        keystrokes = c.fetchall()
        
        if not keystrokes:
            return {
                'digraphs': [],
                'trigraphs': [],
                'fastest_transitions': [],
                'slowest_transitions': []
            }
        
        # Analyze digraphs (two-letter patterns)
        digraph_stats = defaultdict(lambda: {'count': 0, 'total_time': 0, 'times': []})
        
        # Analyze trigraphs (three-letter patterns)
        trigraph_stats = defaultdict(lambda: {'count': 0, 'total_time': 0, 'times': []})
        
        # Track transitions
        transition_stats = defaultdict(lambda: {'count': 0, 'total_time': 0, 'times': []})
        
        # Process keystrokes - need to get previous keystroke from same session
        prev_ks_by_session = {}
        
        for i, (key, prev_key, timestamp, session_id, ks_id) in enumerate(keystrokes):
            # Get previous keystroke timestamp from same session
            prev_timestamp = prev_ks_by_session.get(session_id)
            
            # Digraph: prev_key -> key
            if prev_key and key:
                digraph = f"{prev_key}{key}"
                if prev_timestamp:
                    duration = timestamp - prev_timestamp
                    if duration > 0 and duration < 5000:  # Filter outliers
                        digraph_stats[digraph]['count'] += 1
                        digraph_stats[digraph]['total_time'] += duration
                        digraph_stats[digraph]['times'].append(duration)
                
                # Transition stats
                transition = f"{prev_key}→{key}"
                if prev_timestamp:
                    duration = timestamp - prev_timestamp
                    if duration > 0 and duration < 5000:
                        transition_stats[transition]['count'] += 1
                        transition_stats[transition]['total_time'] += duration
                        transition_stats[transition]['times'].append(duration)
            
            # Trigraph: need previous two keystrokes
            if i >= 2 and keystrokes[i-2][3] == session_id:  # Same session
                prev_prev_key = keystrokes[i - 2][0]
                prev_prev_timestamp = keystrokes[i - 2][2]
                if prev_prev_key and prev_key and key:
                    trigraph = f"{prev_prev_key}{prev_key}{key}"
                    duration = timestamp - prev_prev_timestamp
                    if duration > 0 and duration < 5000:
                        trigraph_stats[trigraph]['count'] += 1
                        trigraph_stats[trigraph]['total_time'] += duration
                        trigraph_stats[trigraph]['times'].append(duration)
            
            # Update previous keystroke for this session
            prev_ks_by_session[session_id] = timestamp
        
        # Calculate averages and sort
        def process_stats(stats_dict, min_count=3):
            results = []
            for pattern, data in stats_dict.items():
                if data['count'] >= min_count:
                    avg_time = data['total_time'] / data['count']
                    results.append({
                        'pattern': pattern,
                        'count': data['count'],
                        'avg_time': round(avg_time, 2),
                        'min_time': round(min(data['times']), 2),
                        'max_time': round(max(data['times']), 2)
                    })
            return sorted(results, key=lambda x: x['avg_time'])
        
        digraphs = process_stats(digraph_stats)
        trigraphs = process_stats(trigraph_stats)
        transitions = process_stats(transition_stats)
        
        # Get fastest and slowest
        fastest_digraphs = digraphs[:20] if len(digraphs) > 20 else digraphs
        fastest_trigraphs = trigraphs[:20] if len(trigraphs) > 20 else trigraphs
        fastest_transitions = transitions[:20] if len(transitions) > 20 else transitions
        slowest_transitions = list(reversed(transitions[-20:])) if len(transitions) > 20 else list(reversed(transitions))
        
        return {
            'digraphs': fastest_digraphs,
            'trigraphs': fastest_trigraphs,
            'fastest_transitions': fastest_transitions,
            'slowest_transitions': slowest_transitions
        }
        
    finally:
        conn.close()

