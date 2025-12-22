from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import time

from .database import init_db, save_session, get_session, get_all_sessions
from .generators import generate_text

app = FastAPI(title="FlowCollector API", version="1.0.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

class Keystroke(BaseModel):
    key: str
    timestamp: float
    prev_key: Optional[str] = None

class SessionData(BaseModel):
    mode: str
    raw_text: str
    keystrokes: List[Keystroke]

@app.get("/")
def read_root():
    return {
        "message": "FlowCollector API",
        "version": "1.0.0",
        "endpoints": ["/generate/{mode}", "/submit_session", "/health"]
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": time.time()}

@app.get("/generate/{mode}")
def generate_typing_text(mode: str):
    """
    Generate text for typing practice based on mode.
    Modes: top200, trigraphs, nonsense, calibration
    """
    try:
        text = generate_text(mode)
        return {"text": text, "mode": mode}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/submit_session")
def submit_session(data: SessionData):
    """
    Save a completed typing session to the database.
    """
    try:
        session_id = save_session(
            mode=data.mode,
            raw_text=data.raw_text,
            keystrokes=[k.dict() for k in data.keystrokes]
        )
        return {
            "status": "saved",
            "session_id": session_id,
            "keystroke_count": len(data.keystrokes)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save session: {str(e)}")

@app.get("/session/{session_id}")
def get_session_data(session_id: int):
    """
    Retrieve a session by ID.
    """
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.get("/sessions")
def list_sessions(limit: int = 50):
    """
    List all sessions (without full keystroke data).
    """
    sessions = get_all_sessions()
    return {
        "total": len(sessions),
        "sessions": sessions[:limit]
    }

@app.get("/stats")
def get_stats():
    """
    Get database statistics.
    """
    import sqlite3
    from .database import DB_FILE
    
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    c.execute("SELECT COUNT(*) FROM sessions")
    session_count = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM keystrokes")
    keystroke_count = c.fetchone()[0]
    
    c.execute("SELECT mode, COUNT(*) as count FROM sessions GROUP BY mode")
    mode_dist = {row[0]: row[1] for row in c.fetchall()}
    
    c.execute("SELECT SUM(LENGTH(raw_text)) FROM sessions")
    total_chars = c.fetchone()[0] or 0
    
    conn.close()
    
    return {
        "total_sessions": session_count,
        "total_keystrokes": keystroke_count,
        "total_characters": total_chars,
        "sessions_by_mode": mode_dist
    }

@app.delete("/session/{session_id}")
def delete_session(session_id: int):
    """
    Delete a session and its keystrokes.
    """
    import sqlite3
    from .database import DB_FILE
    
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    try:
        c.execute("DELETE FROM keystrokes WHERE session_id = ?", (session_id,))
        
        c.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        
        if c.rowcount == 0:
            conn.close()
            raise HTTPException(status_code=404, detail="Session not found")
        
        conn.commit()
        return {"status": "deleted", "session_id": session_id}
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()