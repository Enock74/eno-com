import re
from sqlalchemy.orm import Session
from .. import models

# Simple stop words list (expand as needed)
STOP_WORDS = {"a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "in", "is", "it", "of", "on", "or", "the", "to"}

def extract_keywords(text: str) -> set:
    # Lowercase and split into words
    words = re.findall(r'\b[a-z]{3,}\b', text.lower())
    # Remove stop words
    return set(word for word in words if word not in STOP_WORDS)

def find_best_clip(db: Session, caption_text: str):
    caption_keywords = extract_keywords(caption_text)
    if not caption_keywords:
        return None

    all_clips = db.query(models.VideoClip).all()
    best_clip = None
    best_score = -1

    for clip in all_clips:
        clip_keywords = set(clip.keywords.split(','))
        # Count overlapping keywords
        score = len(caption_keywords & clip_keywords)
        if score > best_score:
            best_score = score
            best_clip = clip

    return best_clip