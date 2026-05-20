from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from ..services.media_retrieval import MediaRetrievalService

router = APIRouter(prefix="/clips", tags=["clips"])

# Initialize media service
media_service = MediaRetrievalService()

@router.post("/", response_model=schemas.VideoClipResponse)
def create_clip(clip: schemas.VideoClipCreate, db: Session = Depends(get_db)):
    db_clip = models.VideoClip(**clip.dict())
    db.add(db_clip)
    db.commit()
    db.refresh(db_clip)
    return db_clip

@router.get("/", response_model=List[schemas.VideoClipResponse])
def list_clips(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    clips = db.query(models.VideoClip).offset(skip).limit(limit).all()
    return clips

@router.get("/{clip_id}", response_model=schemas.VideoClipResponse)
def get_clip(clip_id: int, db: Session = Depends(get_db)):
    clip = db.query(models.VideoClip).filter(models.VideoClip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    return clip

@router.put("/{clip_id}", response_model=schemas.VideoClipResponse)
def update_clip(clip_id: int, clip_update: schemas.VideoClipUpdate, db: Session = Depends(get_db)):
    db_clip = db.query(models.VideoClip).filter(models.VideoClip.id == clip_id).first()
    if not db_clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    for key, value in clip_update.dict(exclude_unset=True).items():
        setattr(db_clip, key, value)
    db.commit()
    db.refresh(db_clip)
    return db_clip

@router.delete("/{clip_id}")
def delete_clip(clip_id: int, db: Session = Depends(get_db)):
    db_clip = db.query(models.VideoClip).filter(models.VideoClip.id == clip_id).first()
    if not db_clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    db.delete(db_clip)
    db.commit()
    return {"message": "Clip deleted"}

# Search for media from Pexels/Pixabay with thumbnails
@router.get("/search")
def search_media(q: str, media_type: str = "video", db: Session = Depends(get_db)):
    """Search for media from Pexels/Pixabay with thumbnails"""
    items = media_service.search_with_thumbnails(q, media_type)
    return {"results": items}

# Legacy search for local clips
@router.post("/search/local")
def search_local_clip(caption_text: str, db: Session = Depends(get_db)):
    from ..services.clip_retrieval import find_best_clip
    clip = find_best_clip(db, caption_text)
    if not clip:
        return {"message": "No matching clip found"}
    return clip