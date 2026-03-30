from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.assembly import assemble_video_from_captions

router = APIRouter(prefix="/assembly", tags=["assembly"])

@router.post("/{video_id}")
def assemble_video(video_id: int, db: Session = Depends(get_db)):
    try:
        output_path = assemble_video_from_captions(video_id, db)
        return {"message": "Video assembled successfully", "output_path": output_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))