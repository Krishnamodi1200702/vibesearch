"""Video ingestion service — processes an uploaded video into indexed scenes.

Pipeline:
1. Get video duration via ffprobe
2. Split into scene chunks (fixed time intervals)
3. Extract representative frames per scene via OpenCV
4. Compute CLIP embeddings per scene (average of frame embeddings)
5. Insert Scene + SceneFrame records into Postgres
6. Add embeddings to FAISS index
7. Update video status to 'processed'

Runs in a background thread to avoid blocking the request.
"""

from __future__ import annotations

import asyncio
import logging
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np
from PIL import Image

from app.core.config import get_settings
from app.core.database import async_session
from app.models import Video, Scene, SceneFrame
from app.services.clip_service import get_clip_service
from app.services.faiss_service import get_faiss_service

logger = logging.getLogger(__name__)
settings = get_settings()

SCENE_DURATION_SEC = 5.0
FRAMES_PER_SCENE = 3

# Thread pool for CPU-heavy work (frame extraction, CLIP encoding)
_executor = ThreadPoolExecutor(max_workers=2)


def _get_duration(video_path: str) -> float:
    """Get video duration in seconds using ffprobe."""
    try:
        cmd = [
            "ffprobe", "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            video_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return float(result.stdout.strip())
    except Exception as e:
        logger.warning("ffprobe failed for %s: %s — estimating from OpenCV", video_path, e)
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        cap.release()
        return frames / fps if fps > 0 else 0.0


def _extract_frame(video_path: str, timestamp_sec: float) -> Image.Image | None:
    """Extract a single frame at given timestamp."""
    cap = cv2.VideoCapture(video_path)
    cap.set(cv2.CAP_PROP_POS_MSEC, timestamp_sec * 1000)
    ret, frame = cap.read()
    cap.release()
    if not ret:
        return None
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


def _save_frame(image: Image.Image, video_id: str, scene_idx: int, frame_idx: int) -> str:
    """Save a frame to disk and return the relative URL path."""
    frames_dir = Path(settings.frames_dir) / video_id
    frames_dir.mkdir(parents=True, exist_ok=True)
    filename = f"s{scene_idx:03d}_f{frame_idx:02d}.jpg"
    filepath = frames_dir / filename
    image.save(str(filepath), "JPEG", quality=85)
    # Return a URL path that will be served by FastAPI static files
    return f"/static/frames/{video_id}/{filename}"


def _process_video_sync(video_path: str, video_id: str) -> dict:
    """Synchronous heavy processing — runs in thread pool.

    Returns a dict with:
      duration, scenes: [{start, end, frames: [PIL.Image], embeddings: np.array, frame_paths: [str]}]
    """
    clip = get_clip_service()

    duration = _get_duration(video_path)
    logger.info("Video %s duration: %.1fs", video_id, duration)

    # Split into scenes
    scene_intervals = []
    start = 0.0
    while start < duration:
        end = min(start + SCENE_DURATION_SEC, duration)
        if end - start > 0.5:
            scene_intervals.append((round(start, 2), round(end, 2)))
        start = end

    all_scene_data = []

    for idx, (s_start, s_end) in enumerate(scene_intervals):
        frames = []
        frame_timestamps = []
        frame_paths = []

        for f_idx in range(FRAMES_PER_SCENE):
            t = s_start + (s_end - s_start) * (f_idx / max(FRAMES_PER_SCENE - 1, 1))
            t = round(t, 2)
            img = _extract_frame(video_path, t)
            if img:
                frames.append(img)
                frame_timestamps.append(t)
                path = _save_frame(img, video_id, idx, f_idx)
                frame_paths.append((path, f_idx, t))

        # CLIP embed: average of frame embeddings
        if frames:
            frame_embeddings = clip.encode_images(frames)
            scene_embedding = frame_embeddings.mean(axis=0)
            scene_embedding /= np.linalg.norm(scene_embedding)
        else:
            scene_embedding = np.zeros(clip.dim, dtype=np.float32)

        all_scene_data.append({
            "index": idx,
            "start": s_start,
            "end": s_end,
            "embedding": scene_embedding,
            "frame_paths": frame_paths,
        })

    return {
        "duration": duration,
        "scenes": all_scene_data,
    }


async def process_video(video_id: uuid.UUID):
    """Main async entrypoint — processes a video and updates the DB."""
    logger.info("Starting ingestion for video %s", video_id)

    # Fetch video record
    async with async_session() as db:
        from sqlalchemy import select
        stmt = select(Video).where(Video.id == video_id)
        result = await db.execute(stmt)
        video = result.scalar_one_or_none()

        if not video:
            logger.error("Video %s not found", video_id)
            return

        if not video.storage_path:
            logger.error("Video %s has no storage_path", video_id)
            return

        video_path = video.storage_path
        vid_str = str(video_id)

        # Set status to processing
        video.status = "processing"
        video.processing_error = None
        await db.commit()

    try:
        # Run heavy processing in thread pool
        loop = asyncio.get_event_loop()
        proc_result = await loop.run_in_executor(
            _executor, _process_video_sync, video_path, vid_str
        )

        duration = proc_result["duration"]
        scene_data = proc_result["scenes"]

        # Add embeddings to FAISS
        faiss_svc = get_faiss_service()
        if scene_data:
            embedding_matrix = np.stack([s["embedding"] for s in scene_data])
            faiss_ids = faiss_svc.add(embedding_matrix)
            faiss_svc.save()
        else:
            faiss_ids = []

        # Insert scene + frame records into DB
        async with async_session() as db:
            stmt = select(Video).where(Video.id == video_id)
            result = await db.execute(stmt)
            video = result.scalar_one_or_none()

            if not video:
                return

            for sd, fid in zip(scene_data, faiss_ids):
                scene = Scene(
                    video_id=video_id,
                    scene_index=sd["index"],
                    start_time_sec=sd["start"],
                    end_time_sec=sd["end"],
                    transcript_text=None,
                    metadata_json={"description": f"Scene {sd['index'] + 1} of {video.title}"},
                    faiss_vector_id=fid,
                )
                db.add(scene)
                await db.flush()

                for frame_url, f_idx, ts in sd["frame_paths"]:
                    frame = SceneFrame(
                        scene_id=scene.id,
                        frame_url=frame_url,
                        frame_index=f_idx,
                        timestamp_sec=ts,
                    )
                    db.add(frame)

            video.duration_seconds = duration
            video.scene_count = len(scene_data)
            video.status = "processed"
            video.processed_at = datetime.now(timezone.utc)
            video.processing_error = None
            # Set file_url to the served path
            video.file_url = f"/static/uploads/{Path(video.storage_path).name}"

            await db.commit()

        logger.info("Ingestion complete for video %s — %d scenes", video_id, len(scene_data))

    except Exception as e:
        logger.exception("Ingestion failed for video %s", video_id)
        async with async_session() as db:
            stmt = select(Video).where(Video.id == video_id)
            result = await db.execute(stmt)
            video = result.scalar_one_or_none()
            if video:
                video.status = "failed"
                video.processing_error = str(e)[:500]
                await db.commit()


async def rebuild_faiss_index():
    """Rebuild the entire FAISS index from all scene embeddings in DB.

    Used after deleting videos to keep FAISS IDs consistent.
    """
    from sqlalchemy import select, update
    faiss_svc = get_faiss_service()
    clip = get_clip_service()

    logger.info("Rebuilding FAISS index…")
    faiss_svc.reset()

    async with async_session() as db:
        # Get all scenes ordered by creation
        stmt = select(Scene).order_by(Scene.created_at)
        result = await db.execute(stmt)
        scenes = result.scalars().all()

        if not scenes:
            faiss_svc.save()
            logger.info("FAISS index rebuilt — 0 vectors")
            return

        # For each scene, we need its embedding. Since we don't store raw vectors
        # in the DB, we re-encode from frames. For scenes without frames, use a
        # zero vector (they won't match well, but won't crash).
        # For efficiency in MVP, we'll just assign sequential IDs
        # and mark the scenes accordingly.

        # NOTE: In a real system you'd store embeddings in the DB or a separate
        # numpy file. For now, we re-compute from stored frames.
        from sqlalchemy.orm import selectinload
        stmt2 = select(Scene).options(selectinload(Scene.frames)).order_by(Scene.created_at)
        result2 = await db.execute(stmt2)
        scenes_with_frames = result2.scalars().all()

        embeddings = []
        scene_ids = []

        for scene in scenes_with_frames:
            if scene.frames:
                images = []
                for frame in sorted(scene.frames, key=lambda f: f.frame_index)[:3]:
                    # Try to load frame from disk
                    frame_path = frame.frame_url.replace("/static/frames/", str(Path(settings.frames_dir)) + "/")
                    try:
                        img = Image.open(frame_path)
                        images.append(img)
                    except Exception:
                        continue

                if images:
                    vecs = clip.encode_images(images)
                    emb = vecs.mean(axis=0)
                    emb /= np.linalg.norm(emb)
                else:
                    emb = np.zeros(clip.dim, dtype=np.float32)
            else:
                emb = np.zeros(clip.dim, dtype=np.float32)

            embeddings.append(emb)
            scene_ids.append(scene.id)

        if embeddings:
            matrix = np.stack(embeddings)
            faiss_ids = faiss_svc.add(matrix)
            faiss_svc.save()

            # Update scene faiss_vector_id mapping
            for scene_uuid, new_fid in zip(scene_ids, faiss_ids):
                await db.execute(
                    update(Scene).where(Scene.id == scene_uuid).values(faiss_vector_id=new_fid)
                )
            await db.commit()

        logger.info("FAISS index rebuilt — %d vectors", faiss_svc.count)
