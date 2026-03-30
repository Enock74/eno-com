from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from ..services.translation import translate_captions   # <-- added

router = APIRouter(prefix="/captions", tags=["captions"])

@router.get("/{video_id}", response_model=List[schemas.CaptionResponse])
def get_captions(video_id: int, db: Session = Depends(get_db)):
    captions = db.query(models.Caption).filter(
        models.Caption.video_id == video_id
    ).order_by(models.Caption.start_time).all()
    return captions

# Translation endpoint
@router.post("/translate/{video_id}")
def translate_video_captions(video_id: int, target_lang: str, db: Session = Depends(get_db)):
    try:
        count = translate_captions(video_id, target_lang, db)
        return {"message": f"Translated {count} captions to {target_lang}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))