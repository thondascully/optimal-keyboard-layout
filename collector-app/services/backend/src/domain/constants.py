"""
Domain constants with documentation.

This module contains magic numbers and configuration values
with explanations of their purpose and derivation.
"""

# Maximum keystroke duration in milliseconds.
# Keystrokes taking longer than this are considered outliers
# (e.g., user was distracted, took a bathroom break, etc.)
# 5 seconds is generous - typical keystrokes are 50-300ms
MAX_KEYSTROKE_DURATION_MS = 5000

# Minimum number of samples required for a pattern to be included
# in statistical analysis. Set to 1 to show all patterns (can filter in UI).
MIN_PATTERN_SAMPLES = 1

# For trigraph_test mode, we only need 1 sample since each session
# is exactly 3 characters - the entire purpose is to capture rare patterns
MIN_PATTERN_SAMPLES_TRIGRAPH_TEST = 1

# Valid typing modes
VALID_MODES = frozenset({
    'top200',
    'trigraphs',
    'nonsense',
    'calibration',
    'trigraph_test',
})

# Valid finger names for annotation
VALID_FINGERS = frozenset({
    'left_pinky',
    'left_ring',
    'left_middle',
    'left_index',
    'left_thumb',
    'right_thumb',
    'right_index',
    'right_middle',
    'right_ring',
    'right_pinky',
    'unknown',
})

# Valid hand names for annotation
VALID_HANDS = frozenset({
    'left',
    'right',
    'unknown',
})
