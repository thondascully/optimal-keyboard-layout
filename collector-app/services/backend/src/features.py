"""
Extract biomechanical features from annotated keystroke data.
"""

from typing import Dict, List, Optional
from .keyboard_layout import (
    euclidean_distance, row_difference, is_inward_roll,
    fitts_law_cost, get_finger, get_hand
)

def extract_transition_features(
    key_from: str,
    key_to: str,
    finger_from: Optional[str] = None,
    finger_to: Optional[str] = None,
    hand_from: Optional[str] = None,
    hand_to: Optional[str] = None
) -> Dict:
    """
    Extract biomechanical features for a key transition.
    
    If finger/hand are not provided, uses default layout assignments.
    """
    # Use provided annotations or fall back to layout defaults
    if finger_from is None:
        finger_from = get_finger(key_from)
    if finger_to is None:
        finger_to = get_finger(key_to)
    if hand_from is None:
        hand_from = get_hand(key_from)
    if hand_to is None:
        hand_to = get_hand(key_to)
    
    # Calculate distances
    dist = euclidean_distance(key_from, key_to)
    row_diff = row_difference(key_from, key_to)
    
    # Categorical features
    same_hand = 1 if hand_from == hand_to else 0
    same_finger = 1 if finger_from == finger_to else 0
    
    # Direction
    inward = 0
    if same_hand == 1:
        inward = 1 if is_inward_roll(key_from, key_to, finger_from, finger_to) else 0
    
    # Fitts' Law cost
    fitts_cost = fitts_law_cost(dist)
    
    return {
        'finger_from': finger_from,
        'finger_to': finger_to,
        'same_hand': same_hand,
        'same_finger': same_finger,
        'euclidean_distance': dist,
        'row_difference': row_diff,
        'is_inward': inward,
        'fitts_law_cost': fitts_cost,
    }

def compute_session_features(keystrokes: List[Dict]) -> List[Dict]:
    """
    Compute biomechanical features for all transitions in a session.
    
    keystrokes: List of keystroke dicts with 'key', 'prev_key', 'finger', 'hand'
    Returns: List of feature dicts, one per transition (first keystroke has no features)
    """
    features = []
    
    for i, ks in enumerate(keystrokes):
        if i == 0 or not ks.get('prev_key'):
            # First keystroke has no transition
            features.append(None)
            continue
        
        prev_ks = keystrokes[i - 1]
        
        # Get finger/hand annotations (may be None if not annotated yet)
        finger_from = prev_ks.get('finger')
        finger_to = ks.get('finger')
        hand_from = prev_ks.get('hand')
        hand_to = ks.get('hand')
        
        feature_dict = extract_transition_features(
            key_from=prev_ks['key'],
            key_to=ks['key'],
            finger_from=finger_from,
            finger_to=finger_to,
            hand_from=hand_from,
            hand_to=hand_to
        )
        
        features.append(feature_dict)
    
    return features

def save_features_to_db(session_id: int, keystrokes: List[Dict], features: List[Dict]):
    """
    Save computed features to the database.
    """
    from .database import get_connection
    
    conn = get_connection()
    c = conn.cursor()
    
    try:
        for i, (ks, feat) in enumerate(zip(keystrokes, features)):
            if feat is None:
                continue  # Skip first keystroke
            
            # Check if features already exist
            c.execute(
                "SELECT id FROM keystroke_features WHERE keystroke_id = ?",
                (ks['id'],)
            )
            existing = c.fetchone()
            
            if existing:
                # Update existing
                c.execute("""
                    UPDATE keystroke_features 
                    SET finger_from = ?, finger_to = ?, same_hand = ?, same_finger = ?,
                        euclidean_distance = ?, row_difference = ?, is_inward = ?, fitts_law_cost = ?
                    WHERE keystroke_id = ?
                """, (
                    feat['finger_from'], feat['finger_to'],
                    feat['same_hand'], feat['same_finger'],
                    feat['euclidean_distance'], feat['row_difference'],
                    feat['is_inward'], feat['fitts_law_cost'],
                    ks['id']
                ))
            else:
                # Insert new
                c.execute("""
                    INSERT INTO keystroke_features 
                    (keystroke_id, finger_from, finger_to, same_hand, same_finger,
                     euclidean_distance, row_difference, is_inward, fitts_law_cost)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    ks['id'],
                    feat['finger_from'], feat['finger_to'],
                    feat['same_hand'], feat['same_finger'],
                    feat['euclidean_distance'], feat['row_difference'],
                    feat['is_inward'], feat['fitts_law_cost']
                ))
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

