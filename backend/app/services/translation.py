from deep_translator import GoogleTranslator
from sqlalchemy.orm import Session
from .. import models

def translate_captions(video_id: int, target_lang: str, db: Session):
    captions = db.query(models.Caption).filter(models.Caption.video_id == video_id).all()
    if not captions:
        raise ValueError("No captions found for this video")
    
    translator = GoogleTranslator(source='auto', target=target_lang)
    count = 0
    for cap in captions:
        # Check if translation already exists
        existing = db.query(models.TranslatedCaption).filter(
            models.TranslatedCaption.caption_id == cap.id,
            models.TranslatedCaption.language == target_lang
        ).first()
        if existing:
            continue
        translated_text = translator.translate(cap.text)
        new_trans = models.TranslatedCaption(
            caption_id=cap.id,
            language=target_lang,
            text=translated_text
        )
        db.add(new_trans)
        count += 1
    db.commit()
    return count