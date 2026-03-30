import os
import shutil
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..services.video_processing import extract_audio
from ..services.speech_recognition import transcribe_audio_and_save

router = APIRouter(prefix="/videos", tags=["videos"])

UPLOAD_DIR = "uploads"
AUDIO_DIR = "uploads/audio"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

@router.post("/upload", response_model=schemas.VideoUploadResponse)
async def upload_video(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
):
    print("DEBUG: Upload endpoint called", flush=True)

    if not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")

    file_ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4()}{file_ext}"
    video_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    audio_path = extract_audio(video_path, AUDIO_DIR)

    db_video = models.Video(
        user_id=1,
        name=file.filename,
        file_path=video_path,
    )
    db.add(db_video)
    db.commit()
    db.refresh(db_video)

    if background_tasks:
        print("DEBUG: Adding background task", flush=True)
        background_tasks.add_task(transcribe_audio_and_save, db_video.id, audio_path)
        print("DEBUG: Background task added", flush=True)

    return {"video_id": db_video.id, "filename": file.filename, "audio_path": audio_path}