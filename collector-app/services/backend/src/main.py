"""
FastAPI application for the Collector API.

This is a thin API layer that delegates business logic to services.
"""

import os
import shutil
import time
from typing import Optional
from urllib.parse import unquote

from fastapi import FastAPI, HTTPException, File, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .db.schema import init_schema
from .db.connection import get_db
from .models import SessionData, FingerAnnotationsUpdate, SessionLabelUpdate
from .generators import generate_text, get_available_modes
from .dependencies import (
    get_session_service,
    get_pattern_service,
    get_feature_service,
    get_keystroke_repository,
    get_coverage_service,
    get_deviation_service,
)
from .services import SessionService, PatternService, FeatureService, CoverageService, DeviationService
from .db.repositories import KeystrokeRepository
from .generators import generate_stratified_trigraph, generate_stratified_batch

# Create FastAPI app
app = FastAPI(
    title="Collector API",
    version="2.0.0",
    description="API for collecting and analyzing typing data",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    """Initialize database on startup."""
    init_schema()


# --- Health & Info Endpoints ---

@app.get("/")
def read_root():
    """API information and available endpoints."""
    return {
        "message": "Collector API",
        "version": "2.0.0",
        "endpoints": get_available_modes(),
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": time.time()}


# --- Text Generation ---

@app.get("/generate/{mode}")
def generate_typing_text(mode: str):
    """
    Generate text for typing practice.

    Args:
        mode: One of 'top200', 'trigraphs', 'nonsense', 'calibration', 'trigraph_test'
    """
    try:
        text = generate_text(mode)
        return {"text": text, "mode": mode}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Session Management ---

@app.post("/submit_session")
def submit_session(
    data: SessionData,
    service: SessionService = Depends(get_session_service),
):
    """Save a completed typing session."""
    try:
        session_id = service.create_session(
            mode=data.mode,
            raw_text=data.raw_text,
            keystrokes=[k.dict() for k in data.keystrokes],
        )
        return {
            "status": "saved",
            "session_id": session_id,
            "keystroke_count": len(data.keystrokes),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save session: {str(e)}")


@app.get("/session/{session_id}")
def get_session_data(
    session_id: int,
    service: SessionService = Depends(get_session_service),
):
    """Retrieve a session by ID."""
    session = service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.get("/sessions")
def list_sessions(
    limit: int = 50,
    service: SessionService = Depends(get_session_service),
):
    """List all sessions (without full keystroke data)."""
    sessions = service.get_all_sessions(limit=limit)
    return {"total": len(sessions), "sessions": sessions}


@app.put("/session/{session_id}/label")
def update_session_label_endpoint(
    session_id: int,
    label_data: SessionLabelUpdate,
    service: SessionService = Depends(get_session_service),
):
    """Update the label for a session."""
    try:
        label_text = label_data.label if label_data.label else None
        success = service.update_label(session_id, label_text)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"status": "updated", "session_id": session_id, "label": label_text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update label: {str(e)}")


@app.delete("/session/{session_id}")
def delete_session(
    session_id: int,
    service: SessionService = Depends(get_session_service),
):
    """Delete a session and its keystrokes."""
    try:
        result = service.delete_session(session_id)
        if not result:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"status": "deleted", "session_id": session_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Finger Annotations & Features ---

@app.post("/update_fingers")
def update_fingers(
    data: FingerAnnotationsUpdate,
    service: SessionService = Depends(get_session_service),
):
    """
    Update finger annotations for keystrokes in a session.
    Automatically computes biomechanical features after updating.
    """
    try:
        result = service.update_finger_annotations(
            session_id=data.session_id,
            annotations=[ann.dict() for ann in data.annotations],
            compute_features=True,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update fingers: {str(e)}")


@app.post("/compute_features/{session_id}")
def compute_features(
    session_id: int,
    session_service: SessionService = Depends(get_session_service),
    feature_service: FeatureService = Depends(get_feature_service),
):
    """
    Compute and save biomechanical features for a session.
    Requires finger annotations to be complete.
    """
    try:
        session = session_service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Check for missing annotations
        missing = feature_service.check_annotations_complete(session['keystrokes'])
        if missing:
            return {
                "status": "incomplete",
                "message": f"Missing finger annotations for {len(missing)} keystrokes",
                "missing_indices": missing,
            }

        # Compute features
        features_count = feature_service.compute_and_save_for_session(
            session_id, session['keystrokes']
        )
        return {
            "status": "computed",
            "session_id": session_id,
            "features_count": features_count,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute features: {str(e)}")


# --- Statistics & Patterns ---

@app.get("/stats")
def get_stats_endpoint(service: SessionService = Depends(get_session_service)):
    """Get database statistics."""
    try:
        return service.get_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@app.get("/patterns")
def get_patterns(
    mode: Optional[str] = None,
    service: PatternService = Depends(get_pattern_service),
):
    """
    Get pattern analysis (digraphs, trigraphs, fastest/slowest transitions).

    Args:
        mode: Optional filter by session mode
    """
    try:
        return service.analyze_patterns(mode_filter=mode)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze patterns: {str(e)}")


@app.get("/digraph/{pattern}")
def get_digraph_details_endpoint(
    pattern: str,
    repo: KeystrokeRepository = Depends(get_keystroke_repository),
):
    """Get detailed information about a specific digraph."""
    pattern = unquote(pattern)

    if len(pattern) != 2:
        raise HTTPException(status_code=400, detail="Digraph must be exactly 2 characters")

    try:
        return repo.get_digraph_details(pattern)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get digraph details: {str(e)}")


@app.get("/trigraph/{pattern}")
def get_trigraph_details_endpoint(
    pattern: str,
    repo: KeystrokeRepository = Depends(get_keystroke_repository),
):
    """Get detailed information about a specific trigraph."""
    pattern = unquote(pattern)

    if len(pattern) != 3:
        raise HTTPException(status_code=400, detail="Trigraph must be exactly 3 characters")

    try:
        return repo.get_trigraph_details(pattern)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get trigraph details: {str(e)}")


@app.get("/patterns/detailed")
def get_patterns_detailed(
    mode: Optional[str] = None,
    service: PatternService = Depends(get_pattern_service),
):
    """
    Get all digraphs and trigraphs with detailed distribution data.

    Returns patterns with raw timing arrays, histogram bins, MAD filtering info,
    and threshold visualization data.
    """
    try:
        return service.get_all_patterns_detailed(mode_filter=mode)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get detailed patterns: {str(e)}")


# --- Coverage Tracking (for PITF Model Training) ---

@app.get("/coverage")
def get_coverage(
    mode: Optional[str] = 'trigraph_test',
    service: CoverageService = Depends(get_coverage_service),
):
    """
    Get finger pair coverage statistics.

    Returns a matrix showing how many samples exist for each of the 64
    finger pair combinations, along with gaps that need more data.

    Args:
        mode: Session mode to filter by (default: trigraph_test)
    """
    try:
        return service.get_coverage(mode_filter=mode)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get coverage: {str(e)}")


@app.get("/generate/stratified")
def generate_stratified_trigraphs(
    count: int = 10,
    service: CoverageService = Depends(get_coverage_service),
):
    """
    Generate trigraphs that target under-sampled finger pairs.

    Uses coverage gaps to generate trigraphs that will fill in missing data.

    Args:
        count: Number of trigraphs to generate (default: 10)
    """
    try:
        # Get current coverage to find gaps
        coverage = service.get_coverage(mode_filter='trigraph_test')
        gaps = coverage.get('gaps', [])

        # Generate trigraphs targeting gaps
        batch = generate_stratified_batch(gaps, batch_size=count)

        return {
            'trigraphs': batch,
            'gaps_targeted': len(set((t['target_from'], t['target_to']) for t in batch if t.get('target_pair'))),
            'total_gaps': len(gaps),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate stratified trigraphs: {str(e)}")


@app.get("/generate/stratified/single")
def generate_single_stratified_trigraph(
    from_finger: Optional[str] = None,
    to_finger: Optional[str] = None,
    service: CoverageService = Depends(get_coverage_service),
):
    """
    Generate a single trigraph, optionally targeting a specific finger pair.

    If no target is specified, uses the highest-priority coverage gap.

    Args:
        from_finger: Source finger (e.g., 'left_index')
        to_finger: Target finger (e.g., 'right_middle')
    """
    try:
        if from_finger and to_finger:
            # Use specified target
            trigraph = generate_stratified_trigraph((from_finger, to_finger))
            return {
                'trigraph': trigraph,
                'target_from': from_finger,
                'target_to': to_finger,
                'mode': 'targeted',
            }
        else:
            # Use highest-priority gap
            coverage = service.get_coverage(mode_filter='trigraph_test')
            gaps = coverage.get('gaps', [])

            if gaps:
                gap = gaps[0]  # Highest priority
                trigraph = generate_stratified_trigraph((gap['from'], gap['to']))
                return {
                    'trigraph': trigraph,
                    'target_from': gap['from'],
                    'target_to': gap['to'],
                    'mode': 'gap_filling',
                    'gap_priority': gap['priority'],
                }
            else:
                # No gaps - generate random
                from .generators import generate_trigraph_test
                return {
                    'trigraph': generate_trigraph_test(),
                    'target_from': None,
                    'target_to': None,
                    'mode': 'random',
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate trigraph: {str(e)}")


# --- Keystroke Management ---

@app.get("/keystrokes/data")
def get_keystrokes_data(
    limit: int = 1000,
    offset: int = 0,
    repo: KeystrokeRepository = Depends(get_keystroke_repository),
):
    """Get all keystrokes data with finger, hand, and session information."""
    try:
        return repo.get_all_with_session_info(limit=limit, offset=offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get keystrokes data: {str(e)}")


@app.delete("/keystroke/{keystroke_id}")
def delete_keystroke(
    keystroke_id: int,
    repo: KeystrokeRepository = Depends(get_keystroke_repository),
):
    """Delete a keystroke and cascade delete to features."""
    try:
        result = repo.delete(keystroke_id)
        if not result:
            raise HTTPException(status_code=404, detail="Keystroke not found")
        return {"status": "deleted", "keystroke_id": keystroke_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/session/{session_id}/crop")
def crop_session(
    session_id: int,
    crop_start: int,
    crop_end: int,
    repo: KeystrokeRepository = Depends(get_keystroke_repository),
):
    """
    Crop a session's keystrokes to only keep those between start and end indices.
    Deletes keystrokes outside the range and updates prev_key for the new first keystroke.
    """
    try:
        keystrokes = repo.get_by_session(session_id)
        if not keystrokes:
            raise HTTPException(status_code=404, detail="Session not found or has no keystrokes")

        # Validate indices
        if crop_start < 0 or crop_end < crop_start or crop_end >= len(keystrokes):
            raise HTTPException(status_code=400, detail="Invalid crop indices")

        # Get IDs of keystrokes to delete (before start and after end)
        ids_to_delete = []
        for i, ks in enumerate(keystrokes):
            if i < crop_start or i > crop_end:
                ids_to_delete.append(ks['id'])

        # Delete keystrokes outside range
        deleted_count = 0
        for ks_id in ids_to_delete:
            if repo.delete(ks_id):
                deleted_count += 1

        return {
            "status": "cropped",
            "session_id": session_id,
            "deleted_count": deleted_count,
            "remaining_count": crop_end - crop_start + 1,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to crop session: {str(e)}")


# --- Finger Deviation Analysis ---

@app.get("/deviations")
def get_finger_deviations(
    limit: int = 100,
    service: DeviationService = Depends(get_deviation_service),
):
    """
    Get finger deviation analysis.

    Shows words where the user typed overwritable letters (e, b, u, i, y)
    with a different finger than expected, highlighting which letters deviated.
    """
    try:
        return service.get_deviations(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get deviations: {str(e)}")


@app.get("/deviations/patterns")
def get_deviation_patterns(
    service: DeviationService = Depends(get_deviation_service),
):
    """
    Get patterns in finger deviations.

    Analyzes what triggers deviations - e.g., which previous keys lead
    to using a different finger for overwritable letters.
    """
    try:
        return service.get_deviation_patterns()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get deviation patterns: {str(e)}")


# --- Database Management ---

@app.get("/database/download")
def download_database():
    """Download the database file."""
    db_path = get_db().get_path()
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="Database file not found")

    return FileResponse(
        db_path,
        media_type="application/x-sqlite3",
        filename="typing_data.db",
    )


@app.post("/database/upload")
def upload_database(file: UploadFile = File(...)):
    """Upload and replace the database file."""
    db_path = get_db().get_path()

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
