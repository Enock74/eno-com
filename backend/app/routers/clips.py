from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/clips", tags=["clips"])

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
    from ..services.clip_retrieval import find_best_clip

@router.post("/search")
def search_clip(caption_text: str, db: Session = Depends(get_db)):
    clip = find_best_clip(db, caption_text)
    if not clip:
        return {"message": "No matching clip found"}
    return clip