import os
import uuid
from moviepy.video.io.VideoFileClip import VideoFileClip

def extract_audio(video_path: str, output_dir: str) -> str:
    video = VideoFileClip(video_path)
    if video.audio is None:
        raise ValueError("Video has no audio track")
    audio_filename = f"{uuid.uuid4()}.wav"
    audio_path = os.path.join(output_dir, audio_filename)
    video.audio.write_audiofile(audio_path, logger=None)
    video.close()
    return audio_path