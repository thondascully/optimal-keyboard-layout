"""
Keyboard layout configuration for QWERTY.

Defines key positions, finger assignments, and hand assignments.
Used for computing biomechanical features of typing patterns.
"""

import math
from typing import Tuple

# Standard key width and height in cm
KEY_SIZE_CM = 1.9

# Standard QWERTY layout key positions (in cm, relative to home row)
# Format: (row_offset, column_offset) where row 0 is home row
KEY_POSITIONS = {
    # Top row (row -1)
    'q': (-1, -4.5), 'w': (-1, -3.0), 'e': (-1, -1.5), 'r': (-1, 0), 't': (-1, 1.5),
    'y': (-1, 3.0), 'u': (-1, 4.5), 'i': (-1, 6.0), 'o': (-1, 7.5), 'p': (-1, 9.0),

    # Home row (row 0)
    'a': (0, -4.5), 's': (0, -3.0), 'd': (0, -1.5), 'f': (0, 0), 'g': (0, 1.5),
    'h': (0, 3.0), 'j': (0, 4.5), 'k': (0, 6.0), 'l': (0, 7.5), ';': (0, 9.0),

    # Bottom row (row 1)
    'z': (1, -4.5), 'x': (1, -3.0), 'c': (1, -1.5), 'v': (1, 0), 'b': (1, 1.5),
    'n': (1, 3.0), 'm': (1, 4.5), ',': (1, 6.0), '.': (1, 7.5), '/': (1, 9.0),

    # Space bar (approximate center)
    ' ': (2, 0),
}

# User-defined finger assignments
# These reflect the user's actual typing style, not standard touch typing
FINGER_ASSIGNMENTS = {
    # Left hand
    'q': 'left_ring', 'a': 'left_ring', 'z': 'left_ring',
    'w': 'left_middle', 's': 'left_middle', 'x': 'left_index',
    'e': 'left_middle', 'd': 'left_index', 'c': 'left_index',
    'r': 'left_index', 't': 'left_index', 'f': 'left_index', 'g': 'left_index',
    'v': 'left_index', 'b': 'right_index',

    # Right hand
    'y': 'right_index', 'u': 'right_index', 'h': 'right_index', 'j': 'right_index',
    'n': 'right_index', 'm': 'right_index',
    'i': 'right_middle', 'k': 'right_index',
    'o': 'right_middle', 'l': 'right_middle',
    'p': 'right_ring',

    # Other keys (keep existing assignments for punctuation)
    '.': 'right_ring',
    ',': 'right_middle',
    ';': 'right_pinky', '/': 'right_pinky',

    # Space (typically right thumb, but can vary)
    ' ': 'right_thumb',
}

# Letters that can be typed with different fingers depending on context
# These are manually annotated and should NOT be overwritten by migration scripts
OVERWRITABLE_LETTERS = {'e', 'b', 'u', 'i', 'y', 'k'}

# Hand assignments (derived from finger assignments)
HAND_ASSIGNMENTS = {
    key: 'left' if finger.startswith('left') else 'right'
    for key, finger in FINGER_ASSIGNMENTS.items()
}


def get_key_position(key: str) -> Tuple[float, float]:
    """
    Get the (row, column) position of a key in cm.

    Args:
        key: The key character

    Returns:
        Tuple of (row_offset, column_offset) in cm
    """
    key_lower = key.lower()
    return KEY_POSITIONS.get(key_lower, (0, 0))


def get_finger(key: str) -> str:
    """
    Get the finger assignment for a key.

    Args:
        key: The key character

    Returns:
        Finger name (e.g., 'left_index') or 'unknown'
    """
    key_lower = key.lower()
    return FINGER_ASSIGNMENTS.get(key_lower, 'unknown')


def get_hand(key: str) -> str:
    """
    Get the hand assignment for a key.

    Args:
        key: The key character

    Returns:
        Hand name ('left', 'right') or 'unknown'
    """
    key_lower = key.lower()
    return HAND_ASSIGNMENTS.get(key_lower, 'unknown')


def euclidean_distance(key1: str, key2: str) -> float:
    """
    Calculate Euclidean distance between two keys in cm.

    Args:
        key1: First key character
        key2: Second key character

    Returns:
        Distance in cm
    """
    pos1 = get_key_position(key1)
    pos2 = get_key_position(key2)

    row_diff = (pos1[0] - pos2[0]) * KEY_SIZE_CM
    col_diff = (pos1[1] - pos2[1]) * KEY_SIZE_CM

    return math.sqrt(row_diff ** 2 + col_diff ** 2)


def row_difference(key1: str, key2: str) -> int:
    """
    Get the absolute row difference between two keys.

    Args:
        key1: First key character
        key2: Second key character

    Returns:
        Absolute row difference (0, 1, 2, or 3)
    """
    pos1 = get_key_position(key1)
    pos2 = get_key_position(key2)
    return abs(int(pos1[0] - pos2[0]))


def is_inward_roll(key1: str, key2: str, finger1: str, finger2: str) -> bool:
    """
    Determine if the movement is an inward roll (toward thumb).

    For left hand: moving right is inward
    For right hand: moving left is inward

    Args:
        key1: Starting key
        key2: Ending key
        finger1: Finger for starting key
        finger2: Finger for ending key

    Returns:
        True if this is an inward roll, False otherwise
    """
    pos1 = get_key_position(key1)
    pos2 = get_key_position(key2)

    hand1 = finger1.split('_')[0] if '_' in finger1 else finger1
    hand2 = finger2.split('_')[0] if '_' in finger2 else finger2

    # Both keys should be on same hand for a roll
    if hand1 != hand2:
        return False

    if hand1 == 'left':
        # Left hand: moving right (increasing column) is inward
        return pos2[1] > pos1[1]
    else:
        # Right hand: moving left (decreasing column) is inward
        return pos2[1] < pos1[1]


def fitts_law_cost(distance: float, key_width: float = KEY_SIZE_CM) -> float:
    """
    Calculate Fitts' Law cost: log2(1 + distance / key_width).

    Fitts' Law models the time to move to a target based on
    distance to target and target width.

    Args:
        distance: Distance to travel in cm
        key_width: Width of target key in cm

    Returns:
        Fitts' Law index of difficulty
    """
    return math.log2(1 + distance / key_width)


def validate_mappings() -> dict:
    """
    Validate that all keys have both position and finger mappings.

    Returns:
        Dict with validation results:
        - 'valid': bool indicating if all mappings are complete
        - 'missing_positions': list of keys without positions
        - 'missing_fingers': list of keys without finger assignments
    """
    all_keys = set(KEY_POSITIONS.keys()) | set(FINGER_ASSIGNMENTS.keys())

    missing_positions = [k for k in all_keys if k not in KEY_POSITIONS]
    missing_fingers = [k for k in all_keys if k not in FINGER_ASSIGNMENTS]

    return {
        'valid': len(missing_positions) == 0 and len(missing_fingers) == 0,
        'missing_positions': missing_positions,
        'missing_fingers': missing_fingers,
    }
