from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from ..services.translation import translate_captions

router = APIRouter(prefix="/captions", tags=["captions"])

@router.get("/{video_id}", response_model=List[schemas.CaptionResponse])
def get_captions(video_id: int, db: Session = Depends(get_db)):
    captions = db.query(models.Caption).filter(
        models.Caption.video_id == video_id
    ).order_by(models.Caption.order_index, models.Caption.start_time).all()
    return captions

@router.put("/{caption_id}", response_model=schemas.CaptionResponse)
def update_caption(caption_id: int, caption_update: schemas.CaptionUpdate, db: Session = Depends(get_db)):
    db_caption = db.query(models.Caption).filter(models.Caption.id == caption_id).first()
    if not db_caption:
        raise HTTPException(status_code=404, detail="Caption not found")
    if caption_update.text is not None:
        db_caption.text = caption_update.text
    if caption_update.start_time is not None:
        db_caption.start_time = caption_update.start_time
    if caption_update.end_time is not None:
        db_caption.end_time = caption_update.end_time
    db.commit()
    db.refresh(db_caption)
    return db_caption

@router.post("/reorder")
def reorder_captions(video_id: int, caption_ids: List[int], db: Session = Depends(get_db)):
    """Reorder captions by providing a list of caption IDs in the new order"""
    for idx, caption_id in enumerate(caption_ids):
        db.query(models.Caption).filter(models.Caption.id == caption_id).update({"order_index": idx})
    db.commit()
    return {"message": "Captions reordered successfully"}

@router.post("/split/{caption_id}", response_model=List[schemas.CaptionResponse])
def split_caption(caption_id: int, split_request: schemas.SplitRequest, db: Session = Depends(get_db)):
    db_caption = db.query(models.Caption).filter(models.Caption.id == caption_id).first()
    if not db_caption:
        raise HTTPException(status_code=404, detail="Caption not found")
    split_time = split_request.split_time
    if not (db_caption.start_time < split_time < db_caption.end_time):
        raise HTTPException(status_code=400, detail="Split time must be between start and end")
    new_caption = models.Caption(
        video_id=db_caption.video_id,
        start_time=split_time,
        end_time=db_caption.end_time,
        text=db_caption.text,
        order_index=db_caption.order_index + 1
    )
    db_caption.end_time = split_time
    db.add(new_caption)
    db.commit()
    db.refresh(db_caption)
    db.refresh(new_caption)
    return [db_caption, new_caption]

@router.post("/merge", response_model=schemas.CaptionResponse)
def merge_captions(merge_request: schemas.MergeRequest, db: Session = Depends(get_db)):
    cap1 = db.query(models.Caption).filter(models.Caption.id == merge_request.caption_id1).first()
    cap2 = db.query(models.Caption).filter(models.Caption.id == merge_request.caption_id2).first()
    if not cap1 or not cap2:
        raise HTTPException(status_code=404, detail="One or both captions not found")
    if cap1.video_id != cap2.video_id:
        raise HTTPException(status_code=400, detail="Captions must belong to same video")
    if cap1.start_time > cap2.start_time:
        cap1, cap2 = cap2, cap1
    merged_text = cap1.text + " " + cap2.text
    cap1.end_time = cap2.end_time
    cap1.text = merged_text
    db.delete(cap2)
    db.commit()
    db.refresh(cap1)
    return cap1

@router.delete("/{caption_id}", response_model=dict)
def delete_caption(caption_id: int, db: Session = Depends(get_db)):
    db_caption = db.query(models.Caption).filter(models.Caption.id == caption_id).first()
    if not db_caption:
        raise HTTPException(status_code=404, detail="Caption not found")
    db.delete(db_caption)
    db.commit()
    return {"message": "Caption deleted"}

@router.post("/translate/{video_id}")
def translate_video_captions(video_id: int, target_lang: str, db: Session = Depends(get_db)):
    try:
        count = translate_captions(video_id, target_lang, db)
        return {"message": f"Translated {count} captions to {target_lang}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))