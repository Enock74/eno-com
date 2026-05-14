import os
import whisper
import requests
import time
from sqlalchemy.orm import Session
from .. import models
from ..database import SessionLocal
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Determine which transcription method to use
# Use AssemblyAI if API key is set AND we're on Render (or anywhere with internet)
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
USE_ASSEMBLYAI = ASSEMBLYAI_API_KEY is not None and os.getenv("RENDER", False) == "true"

# Whisper model (lazy loaded for local use)
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        logger.info("Loading Whisper tiny model...")
        _whisper_model = whisper.load_model("tiny")
    return _whisper_model

def transcribe_with_whisper(video_id: int, audio_path: str, db: Session):
    """Use local Whisper (for local development)"""
    print(f"DEBUG: Using Whisper for video {video_id}")
    model = get_whisper_model()
    result = model.transcribe(audio_path, word_timestamps=True)
    segments = result["segments"]
    
    for seg in segments:
        caption = models.Caption(
            video_id=video_id,
            start_time=seg["start"],
            end_time=seg["end"],
            text=seg["text"].strip(),
        )
        db.add(caption)
    db.commit()
    print(f"DEBUG: Whisper saved {len(segments)} captions for video {video_id}")

def transcribe_with_assemblyai(video_id: int, audio_path: str, db: Session):
    """Use AssemblyAI API (for deployed backend)"""
    print(f"DEBUG: Using AssemblyAI for video {video_id}")
    
    headers = {"authorization": ASSEMBLYAI_API_KEY}
    
    # 1. Upload
    print("DEBUG: Uploading to AssemblyAI...")
    with open(audio_path, "rb") as f:
        upload_response = requests.post(
            "https://api.assemblyai.com/v2/upload",
            headers=headers,
            data=f
        )
    if upload_response.status_code != 200:
        print(f"Upload failed: {upload_response.text}")
        return
    upload_url = upload_response.json()["upload_url"]
    
    # 2. Request transcription
    transcript_response = requests.post(
        "https://api.assemblyai.com/v2/transcript",
        json={"audio_url": upload_url, "punctuate": True, "format_text": True},
        headers=headers
    )
    if transcript_response.status_code != 200:
        print(f"Transcript request failed: {transcript_response.text}")
        return
    transcript_id = transcript_response.json()["id"]
    
    # 3. Poll for completion
    print("DEBUG: Polling AssemblyAI...")
    while True:
        polling = requests.get(
            f"https://api.assemblyai.com/v2/transcript/{transcript_id}",
            headers=headers
        )
        status = polling.json()["status"]
        if status == "completed":
            break
        elif status == "error":
            print(f"Transcription error: {polling.json().get('error')}")
            return
        time.sleep(3)
    
    # 4. Save results
    data = polling.json()
    paragraphs = data.get("paragraphs", [])
    if paragraphs:
        for para in paragraphs:
            caption = models.Caption(
                video_id=video_id,
                start_time=para["start"] / 1000.0,
                end_time=para["end"] / 1000.0,
                text=para["text"].strip()
            )
            db.add(caption)
    else:
        # Fallback to full text
        caption = models.Caption(
            video_id=video_id,
            start_time=0.0,
            end_time=data["duration"],
            text=data["text"]
        )
        db.add(caption)
    db.commit()
    print(f"DEBUG: AssemblyAI saved {len(paragraphs) if paragraphs else 1} captions for video {video_id}")

def transcribe_audio_and_save(video_id: int, audio_path: str):
    """Main entry point – chooses method based on environment"""
    abs_audio_path = os.path.abspath(audio_path)
    if not os.path.exists(abs_audio_path):
        print(f"ERROR: Audio file not found: {abs_audio_path}")
        return

    db = SessionLocal()
    try:
        if USE_ASSEMBLYAI:
            transcribe_with_assemblyai(video_id, abs_audio_path, db)
        else:
            transcribe_with_whisper(video_id, abs_audio_path, db)
    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
    finally:
        db.close()