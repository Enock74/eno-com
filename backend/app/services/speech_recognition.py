import os
import requests
import time
from sqlalchemy.orm import Session
from .. import models
from ..database import SessionLocal
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
ASSEMBLYAI_UPLOAD_URL = "https://api.assemblyai.com/v2/upload"
ASSEMBLYAI_TRANSCRIPT_URL = "https://api.assemblyai.com/v2/transcript"

def transcribe_audio_and_save(video_id: int, audio_path: str):
    if not ASSEMBLYAI_API_KEY:
        logger.error("ASSEMBLYAI_API_KEY not set. Cannot transcribe.")
        return

    print(f"DEBUG: Starting AssemblyAI transcription for video {video_id}, audio {audio_path}")
    
    # 1. Upload the audio file
    headers = {"authorization": ASSEMBLYAI_API_KEY}
    with open(audio_path, "rb") as f:
        upload_response = requests.post(ASSEMBLYAI_UPLOAD_URL, headers=headers, data=f)
    if upload_response.status_code != 200:
        print(f"Upload failed: {upload_response.text}")
        return
    upload_url = upload_response.json()["upload_url"]
    
    # 2. Request transcription (with word timestamps and paragraphs for sentence grouping)
    transcript_request = {
        "audio_url": upload_url,
        "word_boost": [],
        "boost_param": "high",
        "punctuate": True,
        "format_text": True,
        "auto_chapters": False,
        "paragraphs": True  # groups words into sentences
    }
    transcript_response = requests.post(ASSEMBLYAI_TRANSCRIPT_URL, json=transcript_request, headers=headers)
    if transcript_response.status_code != 200:
        print(f"Transcription request failed: {transcript_response.text}")
        return
    transcript_id = transcript_response.json()["id"]
    
    # 3. Poll until complete
    while True:
        polling_response = requests.get(f"{ASSEMBLYAI_TRANSCRIPT_URL}/{transcript_id}", headers=headers)
        status = polling_response.json()["status"]
        if status == "completed":
            break
        elif status == "error":
            error = polling_response.json().get("error", "Unknown error")
            print(f"Transcription error: {error}")
            return
        time.sleep(3)
    
    # 4. Get results – use paragraphs (sentences) if available, otherwise words
    data = polling_response.json()
    paragraphs = data.get("paragraphs", [])
    
    db = SessionLocal()
    try:
        if paragraphs:
            for para in paragraphs:
                start = para["start"] / 1000.0   # convert ms to seconds
                end = para["end"] / 1000.0
                text = para["text"].strip()
                if not text:
                    continue
                caption = models.Caption(
                    video_id=video_id,
                    start_time=start,
                    end_time=end,
                    text=text
                )
                db.add(caption)
        else:
            # Fallback: use full transcript as a single caption
            full_text = data["text"]
            duration = data["duration"]  # in seconds
            caption = models.Caption(
                video_id=video_id,
                start_time=0.0,
                end_time=duration,
                text=full_text
            )
            db.add(caption)
        db.commit()
        print(f"DEBUG: Saved {len(paragraphs) if paragraphs else 1} captions for video {video_id}")
    except Exception as e:
        print(f"ERROR saving captions: {e}")
        db.rollback()
    finally:
        db.close()