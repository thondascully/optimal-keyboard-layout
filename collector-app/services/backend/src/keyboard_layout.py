"""
Keyboard layout configuration for QWERTY.
Defines key positions, finger assignments, and hand assignments.
"""

# Standard QWERTY layout key positions (in cm, relative to home row)
# Format: (row_offset, column_offset) where row 0 is home row
KEY_POSITIONS = {
    # Top row
    'q': (-1, -4.5), 'w': (-1, -3.0), 'e': (-1, -1.5), 'r': (-1, 0), 't': (-1, 1.5),
    'y': (-1, 3.0), 'u': (-1, 4.5), 'i': (-1, 6.0), 'o': (-1, 7.5), 'p': (-1, 9.0),
    
    # Home row
    'a': (0, -4.5), 's': (0, -3.0), 'd': (0, -1.5), 'f': (0, 0), 'g': (0, 1.5),
    'h': (0, 3.0), 'j': (0, 4.5), 'k': (0, 6.0), 'l': (0, 7.5), ';': (0, 9.0),
    
    # Bottom row
    'z': (1, -4.5), 'x': (1, -3.0), 'c': (1, -1.5), 'v': (1, 0), 'b': (1, 1.5),
    'n': (1, 3.0), 'm': (1, 4.5), ',': (1, 6.0), '.': (1, 7.5), '/': (1, 9.0),
    
    # Space bar (approximate center)
    ' ': (1, 0),
}

# Standard finger assignments for QWERTY
# Fingers: pinky, ring, middle, index (left and right)
FINGER_ASSIGNMENTS = {
    # Left hand
    'q': 'left_pinky', 'a': 'left_pinky', 'z': 'left_pinky',
    'w': 'left_ring', 's': 'left_ring', 'x': 'left_ring',
    'e': 'left_middle', 'd': 'left_middle', 'c': 'left_middle',
    'r': 'left_index', 't': 'left_index', 'f': 'left_index', 'g': 'left_index',
    'v': 'left_index', 'b': 'left_index',
    
    # Right hand
    'y': 'right_index', 'u': 'right_index', 'h': 'right_index', 'j': 'right_index',
    'n': 'right_index', 'm': 'right_index',
    'i': 'right_middle', 'k': 'right_middle', ',': 'right_middle',
    'o': 'right_ring', 'l': 'right_ring', '.': 'right_ring',
    'p': 'right_pinky', ';': 'right_pinky', '/': 'right_pinky',
    
    # Space (typically right thumb, but can vary)
    ' ': 'right_thumb',
}

# Hand assignments
HAND_ASSIGNMENTS = {
    key: 'left' if finger.startswith('left') else 'right'
    for key, finger in FINGER_ASSIGNMENTS.items()
}

def get_key_position(key: str) -> tuple:
    """Get the (row, column) position of a key in cm."""
    key_lower = key.lower()
    return KEY_POSITIONS.get(key_lower, (0, 0))

def get_finger(key: str) -> str:
    """Get the finger assignment for a key."""
    key_lower = key.lower()
    return FINGER_ASSIGNMENTS.get(key_lower, 'unknown')

def get_hand(key: str) -> str:
    """Get the hand assignment for a key."""
    key_lower = key.lower()
    return HAND_ASSIGNMENTS.get(key_lower, 'unknown')

def euclidean_distance(key1: str, key2: str) -> float:
    """Calculate Euclidean distance between two keys in cm."""
    pos1 = get_key_position(key1)
    pos2 = get_key_position(key2)
    
    # Standard key width is ~1.9cm, row height is ~1.9cm
    row_diff = (pos1[0] - pos2[0]) * 1.9
    col_diff = (pos1[1] - pos2[1]) * 1.9
    
    return (row_diff ** 2 + col_diff ** 2) ** 0.5

def row_difference(key1: str, key2: str) -> int:
    """Get the row difference between two keys."""
    pos1 = get_key_position(key1)
    pos2 = get_key_position(key2)
    return abs(pos1[0] - pos2[0])

def is_inward_roll(key1: str, key2: str, finger1: str, finger2: str) -> bool:
    """
    Determine if the movement is an inward roll (toward thumb).
    For left hand: moving right is inward
    For right hand: moving left is inward
    """
    pos1 = get_key_position(key1)
    pos2 = get_key_position(key2)
    hand1 = finger1.split('_')[0]  # 'left' or 'right'
    hand2 = finger2.split('_')[0]
    
    # Both keys should be on same hand
    if hand1 != hand2:
        return False
    
    if hand1 == 'left':
        # Left hand: moving right (increasing column) is inward
        return pos2[1] > pos1[1]
    else:
        # Right hand: moving left (decreasing column) is inward
        return pos2[1] < pos1[1]

def fitts_law_cost(distance: float, key_width: float = 1.9) -> float:
    """
    Calculate Fitts' Law cost: log2(1 + distance / key_width)
    """
    import math
    return math.log2(1 + distance / key_width)

