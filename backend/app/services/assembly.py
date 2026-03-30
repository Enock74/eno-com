import os
import uuid
import requests
import subprocess
import tempfile
from sqlalchemy.orm import Session
from .. import models
from .media_retrieval import MediaRetrievalService
import logging

logger = logging.getLogger(__name__)

media_service = MediaRetrievalService()
DOWNLOAD_FOLDER = "downloads"
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

def download_file(url: str) -> str:
    local_filename = os.path.join(DOWNLOAD_FOLDER, f"{uuid.uuid4()}.mp4")
    with requests.get(url, stream=True) as r:
        r.raise_for_status()
        with open(local_filename, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
    return local_filename

def create_subtitle_file(captions, output_path):
    """Create SRT subtitle file from captions list."""
    with open(output_path, 'w', encoding='utf-8') as f:
        for idx, cap in enumerate(captions, start=1):
            start = cap.start_time
            end = cap.end_time
            def sec_to_srt(t):
                hours = int(t // 3600)
                minutes = int((t % 3600) // 60)
                seconds = int(t % 60)
                millis = int((t % 1) * 1000)
                return f"{hours:02d}:{minutes:02d}:{seconds:02d},{millis:03d}"
            start_str = sec_to_srt(start)
            end_str = sec_to_srt(end)
            f.write(f"{idx}\n{start_str} --> {end_str}\n{cap.text}\n\n")

def trim_clip(input_path, output_path, duration):
    """Trim a video to the first 'duration' seconds using ffmpeg."""
    cmd = [
        'ffmpeg', '-y', '-i', input_path,
        '-t', str(duration), '-c', 'copy',
        output_path
    ]
    subprocess.run(cmd, check=True, capture_output=True)

def assemble_video_from_captions(video_id: int, db: Session):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise ValueError(f"Video with id {video_id} not found")
    
    captions = db.query(models.Caption).filter(models.Caption.video_id == video_id).order_by(models.Caption.start_time).all()
    if not captions:
        raise ValueError("No captions found for this video")
    
    clip_paths = []
    for cap in captions:
        duration = cap.end_time - cap.start_time
        if duration <= 0:
            continue
        
        # Try to get a video
        media = media_service.search_best_video(cap.text, target_duration=duration)
        if not media:
            # No video, try an image
            media = media_service.search_best_image(cap.text)
        
        if not media:
            logger.warning(f"No media found for caption: {cap.text}")
            continue
        
        local_path = download_file(media['url'])
        
        if 'duration' not in media:  # it's an image
            temp_video = os.path.join(DOWNLOAD_FOLDER, f"{uuid.uuid4()}.mp4")
            cmd = [
                'ffmpeg', '-y', '-loop', '1', '-i', local_path,
                '-t', str(duration), '-c:v', 'libx264',
                '-vf', 'scale=1920:1080',  # optional
                temp_video
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            clip_paths.append(temp_video)
        else:  # it's a video
            trimmed_path = os.path.join(DOWNLOAD_FOLDER, f"{uuid.uuid4()}.mp4")
            trim_clip(local_path, trimmed_path, duration)
            clip_paths.append(trimmed_path)
    
    if not clip_paths:
        raise ValueError("No clips could be created")
    
    concat_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
    for path in clip_paths:
        concat_file.write(f"file '{path}'\n")
    concat_file.close()
    
    subtitle_file = os.path.join(DOWNLOAD_FOLDER, f"{uuid.uuid4()}.srt")
    create_subtitle_file(captions, subtitle_file)
    
    output_filename = f"outputs/{uuid.uuid4()}.mp4"
    os.makedirs("outputs", exist_ok=True)
    
    cmd = [
        'ffmpeg', '-y',
        '-f', 'concat', '-safe', '0', '-i', concat_file.name,
        '-i', subtitle_file,
        '-c:v', 'libx264', '-preset', 'medium',
        '-c:a', 'aac',
        '-vf', f"subtitles={subtitle_file.replace('\\', '/')}",
        output_filename
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    
    return output_filename