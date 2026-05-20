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

def create_ass_subtitle_file(captions, output_path, style):
    """Create ASS subtitle file with animation effects and keyframes"""
    font = style.get('font', 'Arial')
    font_size = style.get('font_size', 24)
    font_color = style.get('font_color', '#FFFFFF').lstrip('#')
    bg_color = style.get('background_color', '#000000').lstrip('#')
    position = style.get('position', 'bottom')
    animation = style.get('animation', 'fade')
    use_keyframes = style.get('use_keyframes', False)
    
    pos_map = {'bottom': '2', 'top': '8', 'center': '5'}
    alignment = pos_map.get(position, '2')
    
    keyframe_effect = ""
    if use_keyframes:
        keyframe_effect = r"{\move(0,0,100,0,0,3000)}"
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("[Script Info]\n")
        f.write("Title: ENOCOM Captions\n")
        f.write("ScriptType: v4.00+\n")
        f.write("WrapStyle: 0\n")
        f.write("PlayResX: 1920\n")
        f.write("PlayResY: 1080\n")
        f.write("ScaledBorderAndShadow: yes\n\n")
        
        f.write("[V4+ Styles]\n")
        f.write("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n")
        
        primary = f"&H00{font_color[4:6]}{font_color[2:4]}{font_color[0:2]}"
        background = f"&H00{bg_color[4:6]}{bg_color[2:4]}{bg_color[0:2]}"
        
        f.write(f"Style: Default,{font},{font_size},{primary},&H00000000,{background},&H00000000,0,0,0,0,100,100,0,0,1,2,0,{alignment},10,10,10,1\n\n")
        
        f.write("[Events]\n")
        f.write("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
        
        for idx, cap in enumerate(captions, start=1):
            start_ts = cap.start_time
            end_ts = cap.end_time
            text = cap.text
            
            def to_ass_time(seconds):
                hours = int(seconds // 3600)
                minutes = int((seconds % 3600) // 60)
                secs = int(seconds % 60)
                cent = int((seconds % 1) * 100)
                return f"{hours}:{minutes:02d}:{secs:02d}.{cent:02d}"
            
            start_ass = to_ass_time(start_ts)
            end_ass = to_ass_time(end_ts)
            
            effect = ""
            if animation == "fade":
                effect = f"{{\\fade(0,255,0,{int((start_ts+0.3)*100)},{int((end_ts-0.3)*100)})}}"
            elif animation == "slide-up":
                effect = r"{\move(0,1080,0,960,0,500)}"
            elif animation == "bounce":
                effect = r"{\t(0,300,\1fscx110\1fscy110)\t(300,600,\1fscx100\1fscy100)\t(600,900,\1fscx105\1fscy105)\t(900,1200,\1fscx100\1fscy100)}"
            elif animation == "zoom-in":
                effect = r"{\fscx50\fscy50\t(0,500,\fscx100\fscy100)}"
            
            if use_keyframes:
                effect += keyframe_effect
            
            f.write(f"Dialogue: 0,{start_ass},{end_ass},Default,,0,0,0,{effect},{text}\n")

def trim_clip(input_path, output_path, duration):
    cmd = [
        'ffmpeg', '-y', '-i', input_path,
        '-t', str(duration), '-c', 'copy',
        output_path
    ]
    subprocess.run(cmd, check=True, capture_output=True)

def add_transition_to_clip(input_path, output_path, duration, transition_type='fade', fade_duration=0.3):
    """Add transition effect to a clip based on transition type"""
    transition_filters = {
        'fade': f"fade=t=in:st=0:d={fade_duration},fade=t=out:st={duration - fade_duration}:d={fade_duration}",
        'dissolve': f"fade=t=in:st=0:d={fade_duration},fade=t=out:st={duration - fade_duration}:d={fade_duration}",
        'wipe': f"fade=t=in:st=0:d={fade_duration},fade=t=out:st={duration - fade_duration}:d={fade_duration}",
        'slide': f"fade=t=in:st=0:d={fade_duration},fade=t=out:st={duration - fade_duration}:d={fade_duration}",
        'zoom': f"fade=t=in:st=0:d={fade_duration},fade=t=out:st={duration - fade_duration}:d={fade_duration}"
    }
    filter_str = transition_filters.get(transition_type, transition_filters['fade'])
    
    cmd = [
        'ffmpeg', '-y', '-i', input_path,
        '-vf', filter_str,
        '-c:a', 'copy',
        output_path
    ]
    subprocess.run(cmd, check=True, capture_output=True)

def get_ffmpeg_params(resolution: str, quality: str, output_format: str, bitrate: float = 2.5):
    res_map = {"720p": "1280:720", "1080p": "1920:1080", "4k": "3840:2160"}
    scale = res_map.get(resolution, "1920:1080")
    
    if bitrate > 0:
        bitrate_str = f"{bitrate}M"
    else:
        quality_map = {"low": "1M", "medium": "2.5M", "high": "5M"}
        bitrate_str = quality_map.get(quality, "2.5M")
    
    ext = "mp4" if output_format == "mp4" else "mov"
    return scale, bitrate_str, ext

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
        
        # Apply transition if enabled
        if options.transition:
            faded_path = os.path.join(DOWNLOAD_FOLDER, f"{uuid.uuid4()}.mp4")
            add_transition_to_clip(current_clip_path, faded_path, duration, options.transition_type)
            clip_paths.append(faded_path)
        else:
            clip_paths.append(current_clip_path)
    
    if not clip_paths:
        raise ValueError("No clips could be created")
    
    concat_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
    for path in clip_paths:
        concat_file.write(f"file '{path}'\n")
    concat_file.close()
    
    # Create ASS subtitle file with animations and keyframes
    subtitle_file = os.path.join(DOWNLOAD_FOLDER, f"{uuid.uuid4()}.ass")
    create_ass_subtitle_file(captions, subtitle_file, style.__dict__)
    
    scale, bitrate_str, ext = get_ffmpeg_params(options.resolution, options.quality, options.format, options.bitrate)
    output_filename = f"outputs/{uuid.uuid4()}.{ext}"
    os.makedirs("outputs", exist_ok=True)
    
    cmd = [
        'ffmpeg', '-y',
        '-f', 'concat', '-safe', '0', '-i', concat_file.name,
        '-c:v', 'libx264', '-preset', 'medium', '-b:v', bitrate_str,
        '-vf', f"scale={scale},ass={subtitle_file.replace('\\', '/')}",
        '-c:a', 'aac', '-b:a', '128k',
        output_filename
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    
    return output_filename