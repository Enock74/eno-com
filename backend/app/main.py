from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware   # added for CORS
from .database import engine, Base
from . import models
from .routers import videos, captions, styles, clips, assembly

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ENOCOM Video Editor", version="0.1.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(videos.router)
app.include_router(captions.router)
app.include_router(styles.router)
app.include_router(clips.router)
app.include_router(assembly.router)

@app.get("/")
def read_root():
    return {"message": "ENOCOM Video Editor API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}