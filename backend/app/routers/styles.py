from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/styles", tags=["styles"])

@router.get("/{video_id}", response_model=schemas.CaptionStyleResponse)
def get_style(video_id: int, db: Session = Depends(get_db)):
    style = db.query(models.CaptionStyle).filter(models.CaptionStyle.video_id == video_id).first()
    if not style:
        # Return default style if not set
        return schemas.CaptionStyleResponse(
            id=0,
            video_id=video_id,
            font="Arial",
            font_size=24,
            font_color="#FFFFFF",
            background_color="#000000",
            position="bottom",
            animation="fade"
        )
    return style

@router.post("/{video_id}", response_model=schemas.CaptionStyleResponse)
def create_or_update_style(video_id: int, style_data: schemas.CaptionStyleCreate, db: Session = Depends(get_db)):
    db_style = db.query(models.CaptionStyle).filter(models.CaptionStyle.video_id == video_id).first()
    if db_style:
        for key, value in style_data.dict().items():
            setattr(db_style, key, value)
    else:
        db_style = models.CaptionStyle(video_id=video_id, **style_data.dict())
        db.add(db_style)
    db.commit()
    db.refresh(db_style)
    return db_style