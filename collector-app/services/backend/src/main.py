from fastapi import FastAPI, HTTPException, File, UploadFile, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import time

from .database import (
    init_db, save_session, get_session, get_all_sessions,
    update_session_fingers, get_stats, delete_session_db,
    delete_keystroke_db, get_digraph_details, get_all_keystrokes_data,
    update_session_label
)
from .generators import generate_text
from .features import compute_session_features, save_features_to_db
from .pattern_analysis import analyze_patterns
from .models import SessionData, FingerAnnotationsUpdate, SessionLabelUpdate

app = FastAPI(title="Collector API", version="1.0.0")


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

@app.get("/")
def read_root():
    return {
        "message": "Collector API",
        "version": "1.0.0",
        "endpoints": [
            "/generate/{mode}", 
            "/submit_session", 
            "/session/{session_id}",
            "/update_fingers",
            "/compute_features/{session_id}",
            "/patterns",
            "/digraph/{pattern}",
            "/keystroke/{keystroke_id}",
            "/database/download",
            "/database/upload",
            "/health"
        ]
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
def get_stats_endpoint():
    """
    Get database statistics.
    """
    try:
        return get_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@app.get("/keystrokes/data")
def get_keystrokes_data(limit: int = 1000, offset: int = 0):
    """
    Get all keystrokes data with finger, hand, and session information.
    Useful for data validation and viewing.
    """
    try:
        return get_all_keystrokes_data(limit=limit, offset=offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get keystrokes data: {str(e)}")

@app.put("/session/{session_id}/label")
def update_session_label_endpoint(session_id: int, label_data: SessionLabelUpdate):
    """
    Update the label for a session.
    Body: {"label": "string"} or {"label": null} to remove label
    """
    try:
        label_text = label_data.label if label_data.label else None
        success = update_session_label(session_id, label_text)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"status": "updated", "session_id": session_id, "label": label_text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update session label: {str(e)}")

@app.delete("/session/{session_id}")
def delete_session(session_id: int):
    """
    Delete a session and its keystrokes (cascades to features).
    """
    try:
        result = delete_session_db(session_id)
        if not result:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"status": "deleted", "session_id": session_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/update_fingers")
def update_fingers(data: FingerAnnotationsUpdate):
    """
    Update finger and hand annotations for keystrokes in a session.
    After updating, automatically computes biomechanical features.
    """
    try:
        # Update finger annotations
        update_session_fingers(
            session_id=data.session_id,
            finger_annotations=[ann.dict() for ann in data.annotations]
        )
        
        # Retrieve updated session
        session = get_session(data.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Compute and save features
        features = compute_session_features(session['keystrokes'])
        save_features_to_db(data.session_id, session['keystrokes'], features)
        
        return {
            "status": "updated",
            "session_id": data.session_id,
            "annotations_count": len(data.annotations)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update fingers: {str(e)}")

@app.post("/compute_features/{session_id}")
def compute_features(session_id: int):
    """
    Compute and save biomechanical features for a session.
    Requires finger annotations to be complete.
    """
    try:
        session = get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check if all keystrokes have finger annotations
        missing_annotations = [
            i for i, ks in enumerate(session['keystrokes'])
            if not ks.get('finger') or not ks.get('hand')
        ]
        
        if missing_annotations:
            return {
                "status": "incomplete",
                "message": f"Missing finger annotations for {len(missing_annotations)} keystrokes",
                "missing_indices": missing_annotations
            }
        
        # Compute features
        features = compute_session_features(session['keystrokes'])
        save_features_to_db(session_id, session['keystrokes'], features)
        
        return {
            "status": "computed",
            "session_id": session_id,
            "features_count": len([f for f in features if f is not None])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute features: {str(e)}")

@app.get("/patterns")
def get_patterns():
    """
    Get pattern analysis (digraphs, trigraphs, fastest/slowest transitions).
    """
    try:
        patterns = analyze_patterns()
        return patterns
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze patterns: {str(e)}")

@app.get("/digraph/{pattern}")
def get_digraph_details_endpoint(pattern: str):
    """
    Get detailed information about a specific digraph.
    Pattern should be 2 characters (e.g., "th", "er")
    """
    from urllib.parse import unquote
    
    # Decode URL-encoded pattern
    pattern = unquote(pattern)
    
    if len(pattern) != 2:
        raise HTTPException(status_code=400, detail="Digraph pattern must be exactly 2 characters")
    
    try:
        return get_digraph_details(pattern)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get digraph details: {str(e)}")

@app.delete("/keystroke/{keystroke_id}")
def delete_keystroke(keystroke_id: int):
    """
    Delete a keystroke and cascade delete to features.
    This will exclude the keystroke from all pattern calculations.
    """
    try:
        result = delete_keystroke_db(keystroke_id)
        if not result:
            raise HTTPException(status_code=404, detail="Keystroke not found")
        return {"status": "deleted", "keystroke_id": keystroke_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/database/download")
def download_database():
    """
    Download the database file.
    """
    from fastapi.responses import FileResponse
    from .database import get_database_path
    import os
    
    db_path = get_database_path()
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="Database file not found")
    
    return FileResponse(
        db_path,
        media_type="application/x-sqlite3",
        filename="typing_data.db"
    )

@app.post("/database/upload")
def upload_database(file: UploadFile = File(...)):
    """
    Upload and replace the database file.
    """
    from .database import get_database_path
    import shutil
    import os
    
    db_path = get_database_path()
    
    try:
        # Backup current database
        if os.path.exists(db_path):
            backup_path = f"{db_path}.backup"
            shutil.copy2(db_path, backup_path)
        
        # Save uploaded file
        with open(db_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return {"status": "uploaded", "message": "Database uploaded successfully"}
    except Exception as e:
        # Restore backup if upload failed
        backup_path = f"{db_path}.backup"
        if os.path.exists(backup_path):
            shutil.copy2(backup_path, db_path)
        raise HTTPException(status_code=500, detail=f"Failed to upload database: {str(e)}")