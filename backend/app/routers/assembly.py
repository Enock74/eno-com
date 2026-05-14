from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..services.assembly import assemble_video_from_captions

router = APIRouter(prefix="/assembly", tags=["assembly"])

class ExportOptions(BaseModel):
    resolution: str = "1080p"
    quality: str = "medium"
    format: str = "mp4"

@router.post("/{video_id}")
def assemble_video(video_id: int, options: ExportOptions = None, db: Session = Depends(get_db)):
    if options is None:
        options = ExportOptions()
    try:
        output_path = assemble_video_from_captions(video_id, db, options)
        return {"message": "Video assembled successfully", "output_path": output_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))