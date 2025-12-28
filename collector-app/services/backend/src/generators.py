"""
Text generators for different typing practice modes.
"""

import random
import string
from typing import Callable, Dict

# Top 200 most common English words
TOP_200 = [
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "I",
    "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
    "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
    "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
    "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
    "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
    "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
    "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
    "back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
    "even", "new", "want", "because", "any", "these", "give", "day", "most", "us",
    "is", "was", "are", "been", "has", "had", "were", "said", "did", "having",
    "may", "should", "could", "ought", "might", "must", "can", "shall", "will", "would",
    "am", "being", "does", "do", "made", "making", "makes", "got", "getting", "gets",
    "went", "going", "goes", "came", "coming", "comes", "took", "taking", "takes", "saw",
    "seeing", "sees", "knew", "knowing", "knows", "thought", "thinking", "thinks", "found", "finding",
    "finds", "gave", "giving", "gives", "told", "telling", "tells", "asked", "asking", "asks",
    "worked", "working", "works", "seemed", "seeming", "seems", "felt", "feeling", "feels", "tried",
    "trying", "tries", "left", "leaving", "leaves", "called", "calling", "calls", "put", "putting",
    "puts", "mean", "meaning", "means", "keep", "keeping", "keeps", "let", "letting", "lets",
    "begin", "beginning", "begins", "help", "helping", "helps", "show", "showing", "shows", "heard"
]

# Common trigraphs for practice
TRIGRAPHS = [
    "ing", "the", "and", "tio", "ion", "ent", "for", "her", "ter", "tha",
    "ate", "res", "ere", "con", "ver", "all", "est", "ati", "ted", "hat",
    "ers", "ess", "ave", "ive", "ble", "our", "hin", "com", "per", "one"
]

# Character sets
VOWELS = "aeiou"
CONSONANTS = "bcdfghjklmnpqrstvwxyz"
LOWERCASE = string.ascii_lowercase


def generate_top200(length: int = 20) -> str:
    """
    Generate text from top 200 most common words.

    Args:
        length: Number of words to generate

    Returns:
        Space-separated string of common words
    """
    words = random.choices(TOP_200, k=length)
    return " ".join(words)


def generate_trigraphs(length: int = 15) -> str:
    """
    Generate text emphasizing common trigraphs.

    Args:
        length: Number of words to generate

    Returns:
        Space-separated string of trigraph-based words
    """
    words = []
    for _ in range(length):
        num_trigraphs = random.randint(1, 2)
        word = "".join(random.choices(TRIGRAPHS, k=num_trigraphs))
        words.append(word)
    return " ".join(words)


def generate_nonsense(length: int = 10) -> str:
    """
    Generate pronounceable nonsense words (CVC pattern).

    Args:
        length: Number of words to generate

    Returns:
        Space-separated string of pronounceable nonsense words
    """
    words = []
    for _ in range(length):
        word_length = random.randint(3, 6)
        word = ""
        for i in range(word_length):
            if i % 2 == 0:
                word += random.choice(CONSONANTS)
            else:
                word += random.choice(VOWELS)
        words.append(word)
    return " ".join(words)


def generate_calibration(length: int = 10) -> str:
    """
    Generate pure random character sequences to break muscle memory.

    Args:
        length: Number of words to generate

    Returns:
        Space-separated string of random character sequences
    """
    words = []
    for _ in range(length):
        word_length = random.randint(3, 5)
        word = "".join(random.choices(LOWERCASE, k=word_length))
        words.append(word)
    return " ".join(words)


def generate_trigraph_test() -> str:
    """
    Generate a single random trigraph for isolated testing.

    This is O(1) - just picks 3 random lowercase letters.
    Used for collecting timing data on specific 3-letter combinations.

    Returns:
        A single 3-character string
    """
    # O(1) solution - much better than the O(26^3) approach!
    return "".join(random.choices(LOWERCASE, k=3))


# Generator registry
_GENERATORS: Dict[str, Callable[[], str]] = {
    "top200": generate_top200,
    "trigraphs": generate_trigraphs,
    "nonsense": generate_nonsense,
    "calibration": generate_calibration,
    "trigraph_test": generate_trigraph_test,
}


def generate_text(mode: str) -> str:
    """
    Generate text based on the specified mode.

    Args:
        mode: One of 'top200', 'trigraphs', 'nonsense', 'calibration', 'trigraph_test'

    Returns:
        Generated text string

    Raises:
        ValueError: If mode is not recognized
    """
    if mode not in _GENERATORS:
        valid_modes = list(_GENERATORS.keys())
        raise ValueError(f"Unknown mode: {mode}. Valid modes: {valid_modes}")

    return _GENERATORS[mode]()


def get_available_modes() -> list:
    """Get list of available generation modes."""
    return list(_GENERATORS.keys())
