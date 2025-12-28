"""
Pattern analysis for typing data.

DEPRECATED: Use services.PatternService instead.
This module is kept for backward compatibility.
"""

from typing import Dict

from .services.pattern_service import PatternService

# Create a default service instance for backward compatibility
_service = PatternService()


def analyze_patterns(mode_filter: str = None) -> Dict:
    """
    Analyze patterns from keystroke data.

    DEPRECATED: Use PatternService.analyze_patterns() instead.
    """
    return _service.analyze_patterns(mode_filter)
