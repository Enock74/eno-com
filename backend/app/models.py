from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    videos = relationship("Video", back_populates="user")

class Video(Base):
    __tablename__ = "videos"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    file_path = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="videos")
    captions = relationship("Caption", back_populates="video")
    style = relationship("CaptionStyle", back_populates="video", uselist=False)  # one-to-one

class Caption(Base):
    __tablename__ = "captions"
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"))
    start_time = Column(Float)
    end_time = Column(Float)
    text = Column(Text)
    video = relationship("Video", back_populates="captions")
    translations = relationship("TranslatedCaption", back_populates="caption")  # <-- added

class VideoClip(Base):
    __tablename__ = "video_clips"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    keywords = Column(Text)
    duration = Column(Float)
    file_path = Column(String)
    resolution = Column(String)

class CaptionStyle(Base):
    __tablename__ = "caption_styles"
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), unique=True)
    font = Column(String, default="Arial")
    font_size = Column(Integer, default=24)
    font_color = Column(String, default="#FFFFFF")
    background_color = Column(String, default="#000000")
    position = Column(String, default="bottom")  # bottom, top, center
    animation = Column(String, default="fade")   # fade, slide, bounce, pop
    video = relationship("Video", back_populates="style")

class TranslatedCaption(Base):
    __tablename__ = "translated_captions"
    id = Column(Integer, primary_key=True, index=True)
    caption_id = Column(Integer, ForeignKey("captions.id"))
    language = Column(String, index=True)  # e.g., 'fr', 'es', 'sw'
    text = Column(Text)
    caption = relationship("Caption", back_populates="translations")