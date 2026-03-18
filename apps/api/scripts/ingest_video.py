"""Video ingestion pipeline — process a video file into scenes, frames, and embeddings.

Usage:
    cd apps/api
    python scripts/ingest_video.py \
        --input /path/to/video.mp4 \
        --title "My Video Title" \
        --description "Optional description"

Pipeline steps:
1. Split video into scene chunks (fixed intervals or scene detection)
2. Extract representative frames per chunk
3. Generate CLIP embeddings for each scene
4. Insert records into Postgres
5. Add vectors to FAISS index

Requires: ffmpeg installed, CLIP model available
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import subprocess
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import async_session, engine, Base
from app.models import Video, Scene, SceneFrame
from app.services.clip_service import get_clip_service
from app.services.faiss_service import get_faiss_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DEFAULT_SCENE_DURATION = 5.0  # seconds per chunk
FRAMES_PER_SCENE = 3


def get_video_duration(path: str) -> float:
    """Get video duration in seconds using ffprobe."""
    cmd = [
        "ffprobe", "-v", "quiet", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return float(result.stdout.strip())


def extract_frame(video_path: str, timestamp_sec: float) -> Image.Image | None:
    """Extract a single frame from video at given timestamp."""
    cap = cv2.VideoCapture(video_path)
    cap.set(cv2.CAP_PROP_POS_MSEC, timestamp_sec * 1000)
    ret, frame = cap.read()
    cap.release()
    if not ret:
        return None
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    return Image.fromarray(frame_rgb)


def split_into_scenes(duration: float, chunk_sec: float = DEFAULT_SCENE_DURATION) -> list[tuple[float, float]]:
    """Split video duration into fixed-length scene chunks."""
    scenes = []
    start = 0.0
    while start < duration:
        end = min(start + chunk_sec, duration)
        if end - start > 0.5:  # Skip very short tail segments
            scenes.append((round(start, 2), round(end, 2)))
        start = end
    return scenes


async def ingest(video_path: str, title: str, description: str = "", file_url: str = ""):
    """Run the full ingestion pipeline for one video."""
    logger.info("Ingesting: %s", video_path)

    clip = get_clip_service()
    faiss_svc = get_faiss_service()

    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    duration = get_video_duration(video_path)
    logger.info("Duration: %.1fs", duration)

    scene_intervals = split_into_scenes(duration)
    logger.info("Splitting into %d scenes (%.1fs chunks)", len(scene_intervals), DEFAULT_SCENE_DURATION)

    all_embeddings = []
    scene_data = []

    for idx, (start, end) in enumerate(scene_intervals):
        logger.info("  Scene %d: %.1f–%.1fs", idx, start, end)

        # Extract frames
        frames = []
        frame_timestamps = []
        for f_idx in range(FRAMES_PER_SCENE):
            t = start + (end - start) * (f_idx / max(FRAMES_PER_SCENE - 1, 1))
            img = extract_frame(video_path, t)
            if img:
                frames.append(img)
                frame_timestamps.append(round(t, 2))

        # CLIP embed: average of frame embeddings for this scene
        if frames:
            frame_embeddings = clip.encode_images(frames)
            scene_embedding = frame_embeddings.mean(axis=0)
            scene_embedding /= np.linalg.norm(scene_embedding)
        else:
            scene_embedding = np.zeros(clip.dim, dtype=np.float32)

        all_embeddings.append(scene_embedding)
        scene_data.append({
            "index": idx,
            "start": start,
            "end": end,
            "frames": frames,
            "frame_timestamps": frame_timestamps,
        })

    # Add to FAISS
    faiss_start_id = faiss_svc.count
    embedding_matrix = np.stack(all_embeddings)
    faiss_ids = faiss_svc.add(embedding_matrix)
    faiss_svc.save()

    # Insert into DB
    async with async_session() as db:
        video = Video(
            title=title,
            description=description,
            file_url=file_url or video_path,
            duration_seconds=duration,
            status="processed",
        )
        db.add(video)
        await db.flush()

        for sd, fid in zip(scene_data, faiss_ids):
            scene = Scene(
                video_id=video.id,
                scene_index=sd["index"],
                start_time_sec=sd["start"],
                end_time_sec=sd["end"],
                metadata_json={"description": f"Scene {sd['index']} of {title}"},
                faiss_vector_id=fid,
            )
            db.add(scene)
            await db.flush()

            for f_idx, ts in enumerate(sd["frame_timestamps"]):
                # In production, upload frames to Cloudinary here
                frame = SceneFrame(
                    scene_id=scene.id,
                    frame_url=f"file://{video_path}#t={ts}",
                    frame_index=f_idx,
                    timestamp_sec=ts,
                )
                db.add(frame)

        await db.commit()

    logger.info("Ingestion complete: %s — %d scenes, %d FAISS vectors", title, len(scene_data), len(faiss_ids))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest a video into VibeSearch")
    parser.add_argument("--input", required=True, help="Path to video file")
    parser.add_argument("--title", required=True, help="Video title")
    parser.add_argument("--description", default="", help="Video description")
    parser.add_argument("--url", default="", help="Public URL for the video (optional)")
    args = parser.parse_args()

    asyncio.run(ingest(args.input, args.title, args.description, args.url))
