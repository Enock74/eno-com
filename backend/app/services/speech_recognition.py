import whisper
import os
import logging
from .. import models
from ..database import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

model = whisper.load_model("tiny")   # changed from "base" to reduce memory

def transcribe_audio_and_save(video_id: int, audio_path: str):
    print(f"DEBUG: Starting transcription for video_id={video_id}, audio_path={audio_path}", flush=True)
    abs_audio_path = os.path.abspath(audio_path)
    if not os.path.exists(abs_audio_path):
        print(f"ERROR: Audio file not found: {abs_audio_path}", flush=True)
        return

    try:
        result = model.transcribe(abs_audio_path, word_timestamps=True)
        segments = result["segments"]
        print(f"DEBUG: Transcription got {len(segments)} segments", flush=True)

        db = SessionLocal()
        try:
            for seg in segments:
                caption = models.Caption(
                    video_id=video_id,
                    start_time=seg["start"],
                    end_time=seg["end"],
                    text=seg["text"].strip(),
                )
                db.add(caption)
            db.commit()
            print(f"DEBUG: Saved {len(segments)} captions for video {video_id}", flush=True)
        finally:
            db.close()
    except Exception as e:
        print(f"ERROR: {e}", flush=True)