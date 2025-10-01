"""
FastAPI server for DeepDetect inference.

Start:  uvicorn api.main:app --host 0.0.0.0 --port 8000
Docs:   http://localhost:8000/docs
"""

import tempfile
import time
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from deepdetect.inference.pipeline import DeepDetectPipeline

app = FastAPI(
    title="DeepDetect API",
    description="Multi-domain deepfake detection service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline: DeepDetectPipeline | None = None

IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff", ".tif",
    ".gif", ".ico", ".svg", ".heic", ".heif", ".avif", ".raw",
    ".cr2", ".nef", ".arw", ".dng", ".jfif", ".pjpeg", ".pjp",
}
VIDEO_EXTENSIONS = {
    ".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv", ".wmv",
    ".m4v", ".mpg", ".mpeg", ".3gp", ".3g2", ".ts", ".mts",
    ".vob", ".ogv", ".asf",
}


@app.on_event("startup")
def startup():
    global pipeline
    print("Loading DeepDetect pipeline...")
    pipeline = DeepDetectPipeline()
    print("Pipeline ready.")


@app.get("/health")
def health():
    return {
        "status": "ok" if pipeline is not None else "loading",
        "model": "CompleteAttentionModel",
        "domains": ["spatial", "frequency", "semantic"],
    }


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    """Upload an image or video for deepfake analysis."""
    if pipeline is None:
        raise HTTPException(503, "Model is still loading")

    suffix = Path(file.filename or "upload").suffix.lower()
    if suffix not in IMAGE_EXTENSIONS | VIDEO_EXTENSIONS:
        raise HTTPException(
            400,
            f"Unsupported file type: {suffix}. "
            f"Accepted: {', '.join(sorted(IMAGE_EXTENSIONS | VIDEO_EXTENSIONS))}",
        )

    # Save upload to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        start = time.time()

        if suffix in IMAGE_EXTENSIONS:
            result = pipeline.analyze_image(tmp_path)
        else:
            result = pipeline.analyze_video(tmp_path)

        elapsed = round(time.time() - start, 2)
        response = result.to_dict()
        response["processing_time_seconds"] = elapsed
        return response

    except ValueError as e:
        raise HTTPException(422, str(e))
    finally:
        Path(tmp_path).unlink(missing_ok=True)
