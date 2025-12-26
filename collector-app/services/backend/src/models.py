"""
Pydantic models for API request/response validation.
"""

from pydantic import BaseModel
from typing import List, Optional

class Keystroke(BaseModel):
    key: str
    timestamp: float
    prev_key: Optional[str] = None

class SessionData(BaseModel):
    mode: str
    raw_text: str
    keystrokes: List[Keystroke]

class FingerAnnotation(BaseModel):
    keystroke_id: int
    finger: str
    hand: str

class FingerAnnotationsUpdate(BaseModel):
    session_id: int
    annotations: List[FingerAnnotation]

class SessionLabelUpdate(BaseModel):
    label: Optional[str] = None

