from pydantic import BaseModel

class VideoUploadResponse(BaseModel):
    video_id: int
    filename: str
    audio_path: str

class CaptionResponse(BaseModel):
    id: int
    video_id: int
    start_time: float
    end_time: float
    text: str

class CaptionUpdate(BaseModel):
    text: str | None = None
    start_time: float | None = None
    end_time: float | None = None

class SplitRequest(BaseModel):
    split_time: float

class MergeRequest(BaseModel):
    caption_id1: int
    caption_id2: int

class CaptionStyleBase(BaseModel):
    font: str = "Arial"
    font_size: int = 24
    font_color: str = "#FFFFFF"
    background_color: str = "#000000"
    position: str = "bottom"
    animation: str = "fade"

class CaptionStyleCreate(CaptionStyleBase):
    pass

class CaptionStyleUpdate(CaptionStyleBase):
    pass

class CaptionStyleResponse(CaptionStyleBase):
    id: int
    video_id: int

# Video Clip Schemas
class VideoClipBase(BaseModel):
    title: str
    description: str | None = None
    keywords: str  # comma-separated
    duration: float
    file_path: str
    resolution: str | None = None

class VideoClipCreate(VideoClipBase):
    pass

class VideoClipUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    keywords: str | None = None
    duration: float | None = None
    file_path: str | None = None
    resolution: str | None = None

class VideoClipResponse(VideoClipBase):
    id: int