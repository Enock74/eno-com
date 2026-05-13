import requests
import time
import os
from sqlalchemy.orm import Session
from .. import models
from ..database import SessionLocal

ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
ASSEMBLYAI_UPLOAD_URL = "https://api.assemblyai.com/v2/upload"
ASSEMBLYAI_TRANSCRIPT_URL = "https://api.assemblyai.com/v2/transcript"

def transcribe_audio_and_save(video_id: int, audio_path: str):
    print(f"DEBUG: Starting AssemblyAI transcription for video {video_id}")
    
    # Upload file
    headers = {"authorization": ASSEMBLYAI_API_KEY}
    with open(audio_path, "rb") as f:
        response = requests.post(ASSEMBLYAI_UPLOAD_URL, headers=headers, data=f)
    upload_url = response.json()["upload_url"]
    
    # Request transcription
    transcript_response = requests.post(
        ASSEMBLYAI_TRANSCRIPT_URL,
        json={"audio_url": upload_url},
        headers=headers
    )
    transcript_id = transcript_response.json()["id"]
    
    # Poll for completion
    while True:
        polling_response = requests.get(f"{ASSEMBLYAI_TRANSCRIPT_URL}/{transcript_id}", headers=headers)
        status = polling_response.json()["status"]
        if status == "completed":
            break
        elif status == "error":
            print("Transcription error")
            return
        time.sleep(3)
    
    # Get segments
    segments = polling_response.json()["words"]  # or use "utterances" for sentences
    # Convert to our caption format (group words into sentences? simpler: use full transcript)
    full_text = polling_response.json()["text"]
    # AssemblyAI doesn't give sentence timestamps by default, so we'll create a single caption
    # For better segmentation, you can use the "utterances" endpoint if you enable speaker diarization.
    # For now, we'll create one caption for the whole video (not ideal but works).
    db = SessionLocal()
    try:
        caption = models.Caption(
            video_id=video_id,
            start_time=0.0,
            end_time=polling_response.json()["duration"],
            text=full_text
        )
        db.add(caption)
        db.commit()
    finally:
        db.close()