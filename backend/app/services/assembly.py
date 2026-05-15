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

def add_fade_to_clip(input_path, output_path, duration, fade_duration=0.3):
    """Add fade in and fade out to a clip for smooth transitions"""
    cmd = [
        'ffmpeg', '-y', '-i', input_path,
        '-vf', f"fade=t=in:st=0:d={fade_duration},fade=t=out:st={duration - fade_duration}:d={fade_duration}",
        '-c:a', 'copy',
        output_path
    ]
    subprocess.run(cmd, check=True, capture_output=True)

def get_ffmpeg_params(resolution: str, quality: str, output_format: str):
    res_map = {"720p": "1280:720", "1080p": "1920:1080", "4k": "3840:2160"}
    scale = res_map.get(resolution, "1920:1080")
    quality_map = {"low": "1M", "medium": "2.5M", "high": "5M"}
    bitrate = quality_map.get(quality, "2.5M")
    ext = "mp4" if output_format == "mp4" else "mov"
    return scale, bitrate, ext

def assemble_video_from_captions(video_id: int, db: Session, options=None):
    if options is None:
        from ..routers.assembly import ExportOptions
        options = ExportOptions()
    
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise ValueError(f"Video with id {video_id} not found")
    
    captions = db.query(models.Caption).filter(models.Caption.video_id == video_id).order_by(models.Caption.start_time).all()
    if not captions:
        raise ValueError("No captions found for this video")
    
    # Get style for this video
    style = db.query(models.CaptionStyle).filter(models.CaptionStyle.video_id == video_id).first()
    if not style:
        style = models.CaptionStyle(
            font="Arial",
            font_size=24,
            font_color="#FFFFFF",
            background_color="#000000",
            position="bottom",
            animation="fade"
        )
    
    clip_paths = []
    for cap in captions:
        duration = cap.end_time - cap.start_time
        if duration <= 0:
            continue
        
        media = media_service.search_best_video(cap.text, target_duration=duration)
        if not media:
            media = media_service.search_best_image(cap.text)
        
        if not media:
            logger.warning(f"No media found for caption: {cap.text}")
            continue
        
        local_path = download_file(media['url'])
        
        if 'duration' not in media:
            temp_video = os.path.join(DOWNLOAD_FOLDER, f"{uuid.uuid4()}.mp4")
            cmd = [
                'ffmpeg', '-y', '-loop', '1', '-i', local_path,
                '-t', str(duration), '-c:v', 'libx264',
                '-vf', 'scale=1920:1080',
                temp_video
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            current_clip_path = temp_video
        else:
            trimmed_path = os.path.join(DOWNLOAD_FOLDER, f"{uuid.uuid4()}.mp4")
            trim_clip(local_path, trimmed_path, duration)
            current_clip_path = trimmed_path
        
        # Apply fade transition if enabled
        if options.transition:
            faded_path = os.path.join(DOWNLOAD_FOLDER, f"{uuid.uuid4()}.mp4")
            add_fade_to_clip(current_clip_path, faded_path, duration)
            clip_paths.append(faded_path)
        else:
            clip_paths.append(current_clip_path)
    
    if not clip_paths:
        raise ValueError("No clips could be created")
    
    concat_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
    for path in clip_paths:
        concat_file.write(f"file '{path}'\n")
    concat_file.close()
    
    # Create subtitle file (using ASS for animations)
    subtitle_file = os.path.join(DOWNLOAD_FOLDER, f"{uuid.uuid4()}.srt")
    create_subtitle_file(captions, subtitle_file)
    
    scale, bitrate, ext = get_ffmpeg_params(options.resolution, options.quality, options.format)
    output_filename = f"outputs/{uuid.uuid4()}.{ext}"
    os.makedirs("outputs", exist_ok=True)
    
    cmd = [
        'ffmpeg', '-y',
        '-f', 'concat', '-safe', '0', '-i', concat_file.name,
        '-i', subtitle_file,
        '-c:v', 'libx264', '-preset', 'medium', '-b:v', bitrate,
        '-vf', f"scale={scale},subtitles={subtitle_file.replace('\\', '/')}",
        '-c:a', 'aac', '-b:a', '128k',
        output_filename
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    
    return output_filename